import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/photos
 * Query params:
 *   moment_id  – filter by moment
 *   person_id  – filter to photos containing this person (via faces table)
 *   status     – filter by processing status
 *   limit      – default 50
 *   offset     – default 0
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  const sp = req.nextUrl.searchParams;
  const moment_id = sp.get("moment_id");
  const person_id = sp.get("person_id");
  const status    = sp.get("status");
  const limit     = Math.min(Number(sp.get("limit") ?? 50), 200);
  const offset    = Number(sp.get("offset") ?? 0);

  if (person_id) {
    // Fetch photos via faces join
    const { data, error } = await db
      .from("faces")
      .select("photos(*, moments(id, name))")
      .eq("event_id", eventId)
      .eq("person_id", person_id)
      .range(offset, offset + limit - 1);

    if (error) return apiError(error.message, 500);
    const photos = (data ?? []).map((r: { photos: unknown }) => r.photos).filter(Boolean);
    return apiOk({ photos, limit, offset });
  }

  let query = db
    .from("photos")
    .select("*, moments(id, name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (moment_id) query = query.eq("moment_id", moment_id);
  if (status)    query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);

  return apiOk({ photos: data ?? [], limit, offset });
}

/**
 * POST /api/events/[eventId]/photos
 * Body: { uploaded_by, storage_path, thumb_path?, moment_id?, width?, height?, phash?, taken_at? }
 * Registers a new photo record (actual file already uploaded to Supabase Storage).
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { uploaded_by, storage_path, thumb_path, moment_id, width, height, phash, taken_at } = body as {
    uploaded_by?: string;
    storage_path?: string;
    thumb_path?: string;
    moment_id?: string;
    width?: number;
    height?: number;
    phash?: string;
    taken_at?: string;
  };

  if (!uploaded_by || !storage_path) return apiError("uploaded_by and storage_path are required");

  // Verify uploader is an approved member with upload rights
  const { data: member } = await db
    .from("event_members")
    .select("role, status")
    .eq("event_id", eventId)
    .eq("user_id", uploaded_by)
    .single();

  if (!member || member.status !== "approved") return apiError("Forbidden", 403);

  // Check upload_mode
  const { data: event } = await db
    .from("events")
    .select("upload_mode")
    .eq("id", eventId)
    .single();

  if (!event) return apiError("Event not found", 404);

  if (event.upload_mode === "selected" && !["host","uploader"].includes(member.role)) {
    return apiError("Only designated uploaders can add photos to this event", 403);
  }

  const { data: photo, error } = await db
    .from("photos")
    .insert({
      event_id: eventId,
      uploaded_by,
      storage_path,
      thumb_path: thumb_path ?? null,
      moment_id:  moment_id ?? null,
      width:      width ?? null,
      height:     height ?? null,
      phash:      phash ?? null,
      taken_at:   taken_at ?? null,
      status:     "pending",
    })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk({ photo }, 201);
}

/**
 * PATCH /api/events/[eventId]/photos
 * Move photos to a different moment.
 * Body: { photo_ids: string[], moment_id: string | null, host_id?: string, user_id?: string }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: { photo_ids?: string[]; moment_id?: string | null; host_id?: string; user_id?: string };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { photo_ids, moment_id } = body;
  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return apiError("photo_ids array required");
  }

  const { data, error } = await db
    .from("photos")
    .update({ moment_id: moment_id ?? null })
    .eq("event_id", eventId)
    .in("id", photo_ids)
    .select("id, moment_id");

  if (error) return apiError(error.message, 500);
  return apiOk({ updated: true, photos: data });
}

/**
 * DELETE /api/events/[eventId]/photos
 * Delete photo(s) from the event.
 * Body: { photo_ids: string[], host_id?: string, user_id?: string }
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: { photo_ids?: string[]; host_id?: string; user_id?: string };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { photo_ids, host_id, user_id } = body;
  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return apiError("photo_ids array required");
  }

  const callerId = host_id || user_id;
  if (callerId) {
    // Check if caller is host or the one who uploaded
    const { data: member } = await db
      .from("event_members")
      .select("role")
      .eq("event_id", eventId)
      .eq("user_id", callerId)
      .single();

    if (member?.role !== "host") {
      // Non-host can only delete their own uploads
      const { error } = await db
        .from("photos")
        .delete()
        .eq("event_id", eventId)
        .eq("uploaded_by", callerId)
        .in("id", photo_ids);
      if (error) return apiError(error.message, 500);
      return apiOk({ deleted: true });
    }
  }

  const { error } = await db
    .from("photos")
    .delete()
    .eq("event_id", eventId)
    .in("id", photo_ids);

  if (error) return apiError(error.message, 500);
  return apiOk({ deleted: true });
}
