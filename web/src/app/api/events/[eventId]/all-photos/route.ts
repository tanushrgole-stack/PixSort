import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/all-photos
 *
 * All photos in an event visible to an approved member.
 * Paginated + filterable by moment, solo/group, uploader.
 *
 * Query params:
 *   user_id    – required (for hidden exclusion)
 *   moment_id  – optional
 *   filter     – "all" | "solo" | "group"
 *   uploader_id– optional
 *   limit      – default 50, max 200
 *   offset     – default 0
 *   sort       – "newest" | "oldest"
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();
  const sp = req.nextUrl.searchParams;

  const user_id    = sp.get("user_id");
  const moment_id  = sp.get("moment_id");
  const filter     = (sp.get("filter") ?? "all") as "all" | "solo" | "group";
  const uploader_id = sp.get("uploader_id");
  const limit      = Math.min(Number(sp.get("limit") ?? "50"), 200);
  const offset     = Number(sp.get("offset") ?? "0");
  const ascending  = sp.get("sort") === "oldest";

  if (!user_id) return apiError("user_id required");

  // Verify membership
  const { data: member } = await db
    .from("event_members")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", user_id)
    .single();

  if (!member || member.status !== "approved") return apiError("Forbidden", 403);

  // Count query first (for total)
  let baseQuery = db
    .from("photos")
    .select("id, storage_path, thumb_path, taken_at, width, height, moment_id, status, uploaded_by, moments(id, name), users(name)")
    .eq("event_id", eventId)
    .eq("status", "done");

  if (moment_id)   baseQuery = baseQuery.eq("moment_id", moment_id);
  if (uploader_id) baseQuery = baseQuery.eq("uploaded_by", uploader_id);

  // For solo/group we need face counts
  if (filter !== "all") {
    const { data: allPhotos } = await baseQuery;
    const allIds = (allPhotos ?? []).map((p: { id: string }) => p.id);

    const { data: faceCounts } = await db
      .from("faces")
      .select("photo_id, person_id")
      .in("photo_id", allIds)
      .not("person_id", "is", null);

    const perPhoto: Record<string, Set<string>> = {};
    for (const f of (faceCounts ?? [])) {
      if (!perPhoto[f.photo_id]) perPhoto[f.photo_id] = new Set();
      perPhoto[f.photo_id].add(f.person_id);
    }

    let filteredIds = allIds.filter((id: string) => {
      const count = perPhoto[id]?.size ?? 0;
      return filter === "solo" ? count === 1 : count > 1;
    });

    // Exclude hidden
    const { data: hiddenRows } = await db
      .from("hidden_photos")
      .select("photo_id")
      .eq("user_id", user_id);
    const hiddenSet = new Set((hiddenRows ?? []).map((h: { photo_id: string }) => h.photo_id));
    filteredIds = filteredIds.filter((id: string) => !hiddenSet.has(id));

    const total = filteredIds.length;
    const pageIds = filteredIds.slice(offset, offset + limit);
    const photos = (allPhotos ?? []).filter((p: { id: string }) => pageIds.includes(p.id));

    return apiOk({ photos, total, page_total: photos.length, limit, offset, has_more: offset + limit < total });
  }

  // Simple path — no solo/group filter
  const { data: hiddenRows } = await db
    .from("hidden_photos")
    .select("photo_id")
    .eq("user_id", user_id);
  const hiddenSet = new Set((hiddenRows ?? []).map((h: { photo_id: string }) => h.photo_id));

  const { data: photos, error } = await baseQuery
    .order("taken_at", { ascending })
    .range(offset, offset + limit - 1);

  if (error) return apiError(error.message, 500);

  const visible = (photos ?? []).filter((p: { id: string }) => !hiddenSet.has(p.id));

  // total count (approximate without hidden — for pagination)
  const { count } = await db
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "done");

  return apiOk({
    photos: visible,
    total: count ?? 0,
    page_total: visible.length,
    limit,
    offset,
    has_more: offset + limit < (count ?? 0),
  });
}
