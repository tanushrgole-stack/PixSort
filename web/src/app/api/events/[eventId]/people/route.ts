import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/people
 *
 * Returns people list with face thumbnail paths.
 * Paginated + filterable.
 *
 * Query params:
 *   enrolled_only  – "true" to only show face-enrolled people
 *   limit          – default 50
 *   offset         – default 0
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();
  const sp = req.nextUrl.searchParams;

  const enrolled_only = sp.get("enrolled_only") === "true";
  const limit  = Math.min(Number(sp.get("limit") ?? "50"), 200);
  const offset = Number(sp.get("offset") ?? "0");

  let query = db
    .from("people")
    .select("id, name, face_enrolled, opted_out, face_thumbnail_path, user_id, users(name)", { count: "exact" })
    .eq("event_id", eventId)
    .eq("opted_out", false)
    .order("created_at")
    .range(offset, offset + limit - 1);

  if (enrolled_only) query = query.eq("face_enrolled", true);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  // For each person, attach the photo count
  const peopleWithCounts = await Promise.all(
    (data ?? []).map(async (person: { id: string; [key: string]: unknown }) => {
      const { count: photoCount } = await db
        .from("faces")
        .select("photo_id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("person_id", person.id)
        .not("photo_id", "is", null);

      return { ...person, photo_count: photoCount ?? 0 };
    })
  );

  return apiOk({
    people: peopleWithCounts,
    total: count ?? 0,
    limit,
    offset,
    has_more: offset + limit < (count ?? 0),
  });
}

/**
 * PATCH /api/events/[eventId]/people
 * Body: { person_id, user_id, opted_out?, face_enrolled?, name? }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: { person_id?: string; user_id?: string; opted_out?: boolean; face_enrolled?: boolean; name?: string };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { person_id, user_id, ...updates } = body;
  if (!person_id || !user_id) return apiError("person_id and user_id required");

  const allowed = ["opted_out", "face_enrolled", "name"];
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  if (Object.keys(patch).length === 0) return apiError("No valid fields");

  // If opting out, also delete all face assignments for this person
  if (patch.opted_out === true) {
    await db.from("faces").update({ person_id: null }).eq("person_id", person_id);
  }

  const { data, error } = await db
    .from("people")
    .update(patch)
    .eq("id", person_id)
    .eq("event_id", eventId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk({ person: data });
}
