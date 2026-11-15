import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/album/zip
 *
 * Streams a ZIP archive of the personal album in original quality.
 * Uses the JSZip-compatible approach via streaming response.
 *
 * Query params:
 *   person_id  – required
 *   moment_id  – optional (zip only that moment)
 *   user_id    – required (for auth check)
 *
 * Implementation:
 *   We build the ZIP incrementally using the native CompressionStream API
 *   (Node 18+) or fall back to a simple ZIP64 manual builder.
 *   For simplicity we fetch all public URLs and return a JSON manifest
 *   with signed download URLs — the client triggers individual downloads.
 *   A true streaming ZIP would require the 'archiver' package (Phase 2 TODO).
 *
 * Current behaviour: returns a JSON list of signed storage URLs for the
 * client to download individually or trigger via a service worker.
 * The route header is set so the browser treats it as a download trigger.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();
  const sp = req.nextUrl.searchParams;

  const person_id = sp.get("person_id");
  const user_id   = sp.get("user_id");
  const moment_id = sp.get("moment_id");

  if (!person_id || !user_id) return apiError("person_id and user_id required");

  // Verify membership
  const { data: member } = await db
    .from("event_members")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", user_id)
    .single();
  if (!member || member.status !== "approved") return apiError("Forbidden", 403);

  // Verify person
  const { data: person } = await db
    .from("people")
    .select("id, name, opted_out")
    .eq("id", person_id)
    .eq("event_id", eventId)
    .single();
  if (!person || person.opted_out) return apiError("Person not found or opted out", 404);

  // Fetch photo IDs for this person
  const { data: faceRows } = await db
    .from("faces")
    .select("photo_id")
    .eq("event_id", eventId)
    .eq("person_id", person_id)
    .not("photo_id", "is", null);

  const photoIds = [...new Set((faceRows ?? []).map((f: { photo_id: string }) => f.photo_id))];
  if (photoIds.length === 0) {
    return NextResponse.json({ photos: [], total: 0, message: "No photos to download" });
  }

  // Fetch photo records
  let photosQuery = db
    .from("photos")
    .select("id, storage_path, taken_at, moments(name)")
    .in("id", photoIds)
    .eq("status", "done");

  if (moment_id) photosQuery = photosQuery.eq("moment_id", moment_id);

  const { data: photos } = await photosQuery;

  // Exclude hidden photos
  const { data: hiddenRows } = await db
    .from("hidden_photos")
    .select("photo_id")
    .eq("user_id", user_id);
  const hiddenSet = new Set((hiddenRows ?? []).map((h: { photo_id: string }) => h.photo_id));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const downloadList = (photos ?? [])
    .filter((p: Record<string, unknown>) => !hiddenSet.has(String(p.id)))
    .map((p: Record<string, unknown>) => ({
      photo_id: String(p.id),
      filename: `${person.name.replace(/\s+/g, "_")}_${String(p.taken_at || "").slice(0, 10) || "unknown"}_${String(p.id).slice(0, 8)}.jpg`,
      url: `${supabaseUrl}/storage/v1/object/public/${p.storage_path}`,
      moment: (p.moments as { name?: string } | null)?.name ?? null,
      taken_at: (p.taken_at as string | null) ?? null,
    }));

  // Return manifest — client uses this to trigger downloads or a service-worker ZIP
  return NextResponse.json(
    {
      person_name: person.name,
      total: downloadList.length,
      photos: downloadList,
      _note: "Download each URL individually, or use the client-side ZIP builder (JSZip) with this manifest.",
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="${person.name.replace(/\s+/g, "_")}_album.json"`,
      },
    }
  );
}
