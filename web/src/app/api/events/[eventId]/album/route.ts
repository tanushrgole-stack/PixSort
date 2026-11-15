import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/album
 *
 * Personal album endpoint — paginated, with moment + solo/group filters.
 *
 * Query params:
 *   person_id  – required: whose album to fetch
 *   moment_id  – optional: filter to one moment  (e.g. only Sangeet)
 *   filter     – "all" | "solo" | "group"  (default "all")
 *   limit      – default 50, max 200
 *   offset     – default 0
 *   sort       – "newest" | "oldest"  (default "newest")
 *
 * Returns:
 *   { photos, total, page_total, limit, offset, has_more, person, moments_summary }
 *   where moments_summary = [{moment_id, name, count}] for the sidebar filter.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();
  const sp = req.nextUrl.searchParams;

  const person_id = sp.get("person_id");
  const moment_id = sp.get("moment_id");
  const filter    = (sp.get("filter") ?? "all") as "all" | "solo" | "group";
  const limit     = Math.min(Number(sp.get("limit") ?? "50"), 200);
  const offset    = Number(sp.get("offset") ?? "0");
  const sort      = sp.get("sort") === "oldest" ? true : false; // ascending = oldest

  if (!person_id) return apiError("person_id query param required");

  // ── Verify person exists and hasn't opted out ──────────────────────────
  const { data: person } = await db
    .from("people")
    .select("id, user_id, name, face_enrolled, opted_out, face_thumbnail_path")
    .eq("id", person_id)
    .eq("event_id", eventId)
    .single();

  if (!person) return apiError("Person not found in this event", 404);
  if (person.opted_out) return apiError("This person has opted out of face matching", 403);

  // ── Collect all photo IDs this person appears in ──────────────────────
  const { data: faceRows, error: facesErr } = await db
    .from("faces")
    .select("photo_id")
    .eq("event_id", eventId)
    .eq("person_id", person_id)
    .not("photo_id", "is", null);

  if (facesErr) return apiError(facesErr.message, 500);

  let photoIds = [...new Set((faceRows ?? []).map((f: { photo_id: string }) => f.photo_id))];

  if (photoIds.length === 0) {
    return apiOk({
      photos: [], total: 0, page_total: 0, limit, offset,
      has_more: false, person, moments_summary: [],
    });
  }

  // ── solo / group filter ───────────────────────────────────────────────
  // Count distinct person_ids per photo to determine solo (=1) vs group (>1)
  if (filter === "solo" || filter === "group") {
    const { data: faceCountRows } = await db
      .from("faces")
      .select("photo_id, person_id")
      .in("photo_id", photoIds)
      .not("person_id", "is", null);

    const faceCountPerPhoto: Record<string, Set<string>> = {};
    for (const f of (faceCountRows ?? [])) {
      if (!faceCountPerPhoto[f.photo_id]) faceCountPerPhoto[f.photo_id] = new Set();
      faceCountPerPhoto[f.photo_id].add(f.person_id);
    }

    if (filter === "solo") {
      photoIds = photoIds.filter((id) => (faceCountPerPhoto[id]?.size ?? 0) === 1);
    } else {
      photoIds = photoIds.filter((id) => (faceCountPerPhoto[id]?.size ?? 0) > 1);
    }
  }

  // ── Hidden photos exclusion ────────────────────────────────────────────
  if (person.user_id) {
    const { data: hiddenRows } = await db
      .from("hidden_photos")
      .select("photo_id")
      .eq("user_id", person.user_id);
    const hiddenSet = new Set((hiddenRows ?? []).map((h: { photo_id: string }) => h.photo_id));
    photoIds = photoIds.filter((id) => !hiddenSet.has(id));
  }

  const total = photoIds.length;

  if (total === 0) {
    return apiOk({ photos: [], total: 0, page_total: 0, limit, offset, has_more: false, person, moments_summary: [] });
  }

  // ── Fetch paginated photos ─────────────────────────────────────────────
  let photosQuery = db
    .from("photos")
    .select("id, storage_path, thumb_path, taken_at, width, height, moment_id, status, uploaded_by, moments(id, name)")
    .eq("event_id", eventId)
    .in("id", photoIds)
    .eq("status", "done")
    .order("taken_at", { ascending: sort })
    .range(offset, offset + limit - 1);

  if (moment_id) photosQuery = photosQuery.eq("moment_id", moment_id);

  const { data: photos, error: photosErr } = await photosQuery;
  if (photosErr) return apiError(photosErr.message, 500);

  // ── Moments summary (for sidebar pill filters) ─────────────────────────
  const { data: momentSummaryRows } = await db
    .from("photos")
    .select("moment_id, moments(id, name)")
    .in("id", photoIds)
    .eq("status", "done")
    .not("moment_id", "is", null);

  const momentCount: Record<string, { name: string; count: number }> = {};
  for (const row of (momentSummaryRows ?? [])) {
    const mid = row.moment_id as string;
    const mname = (row.moments as { name: string } | null)?.name ?? "";
    if (!momentCount[mid]) momentCount[mid] = { name: mname, count: 0 };
    momentCount[mid].count++;
  }
  const moments_summary = Object.entries(momentCount).map(([id, v]) => ({
    moment_id: id, name: v.name, count: v.count,
  }));

  return apiOk({
    photos: photos ?? [],
    total,
    page_total: (photos ?? []).length,
    limit,
    offset,
    has_more: offset + limit < total,
    person,
    moments_summary,
  });
}
