import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/album
 * Returns the personal album for a person in this event.
 * Query params:
 *   person_id  – required: whose album to fetch
 *   moment_id  – optional: filter by moment
 *   limit      – default 50
 *   offset     – default 0
 *
 * Returns photos the person appears in, excluding hidden ones.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  const sp = req.nextUrl.searchParams;
  const person_id = sp.get("person_id");
  const moment_id = sp.get("moment_id");
  const limit     = Math.min(Number(sp.get("limit") ?? 50), 200);
  const offset    = Number(sp.get("offset") ?? 0);

  if (!person_id) return apiError("person_id query param required");

  // Get the user linked to this person (if any)
  const { data: person } = await db
    .from("people")
    .select("user_id, opted_out")
    .eq("id", person_id)
    .eq("event_id", eventId)
    .single();

  if (!person) return apiError("Person not found in this event", 404);
  if (person.opted_out) return apiError("This person has opted out of face matching", 403);

  // Build face → photo join
  let facesQuery = db
    .from("faces")
    .select("photo_id")
    .eq("event_id", eventId)
    .eq("person_id", person_id);

  const { data: faceRows, error: facesErr } = await facesQuery;
  if (facesErr) return apiError(facesErr.message, 500);

  const photoIds = [...new Set((faceRows ?? []).map((f: { photo_id: string }) => f.photo_id))];

  if (photoIds.length === 0) {
    return apiOk({ photos: [], total: 0, limit, offset, person });
  }

  // Fetch photos, excluding hidden ones for this user
  let photosQuery = db
    .from("photos")
    .select("*, moments(id, name)")
    .eq("event_id", eventId)
    .in("id", photoIds)
    .eq("status", "done")
    .order("taken_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (moment_id) photosQuery = photosQuery.eq("moment_id", moment_id);

  const { data: photos, error: photosErr } = await photosQuery;
  if (photosErr) return apiError(photosErr.message, 500);

  // Filter out hidden photos if user is linked
  let visiblePhotos = photos ?? [];
  if (person.user_id) {
    const { data: hiddenRows } = await db
      .from("hidden_photos")
      .select("photo_id")
      .eq("user_id", person.user_id);

    const hiddenSet = new Set((hiddenRows ?? []).map((h: { photo_id: string }) => h.photo_id));
    visiblePhotos = visiblePhotos.filter((p) => !hiddenSet.has(p.id));
  }

  return apiOk({
    photos: visiblePhotos,
    total: photoIds.length,
    limit,
    offset,
    person,
  });
}
