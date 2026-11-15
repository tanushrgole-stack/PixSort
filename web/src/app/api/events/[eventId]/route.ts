import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError, joinUrl, qrPayload } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

// ─────────────────────────────────────────────────
// GET /api/events/[eventId]
// ─────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  const { data: event, error } = await db
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error || !event) return apiError("Event not found", 404);

  const { data: moments } = await db
    .from("moments")
    .select("*")
    .eq("event_id", eventId)
    .order("order");

  const { data: members } = await db
    .from("event_members")
    .select("user_id, role, status, joined_at, users(id, name, is_guest)")
    .eq("event_id", eventId);

  return apiOk({
    event,
    moments: moments ?? [],
    members: members ?? [],
    join_url: joinUrl(event.join_code),
    qr_payload: qrPayload(event.join_code),
  });
}

// ─────────────────────────────────────────────────
// PATCH /api/events/[eventId]
// Body: Partial<{ name, cover_url, upload_mode, require_approval, expires_at, accent }>
// Only the host may update.
// ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { host_id, ...updates } = body as Record<string, unknown> & { host_id?: string };
  if (!host_id) return apiError("host_id required to authorise update");

  // Verify caller is host
  const { data: member } = await db
    .from("event_members")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", host_id)
    .eq("status", "approved")
    .single();

  if (!member || member.role !== "host") return apiError("Forbidden", 403);

  const allowed = ["name","cover_url","upload_mode","require_approval","expires_at","accent"];
  const patch = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(patch).length === 0) return apiError("No valid fields to update");

  const { data, error } = await db
    .from("events")
    .update(patch)
    .eq("id", eventId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk({ event: data });
}

// ─────────────────────────────────────────────────
// DELETE /api/events/[eventId]
// Body: { host_id }
// ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: { host_id?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  if (!body.host_id) return apiError("host_id required");

  const { data: member } = await db
    .from("event_members")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", body.host_id)
    .eq("status", "approved")
    .single();

  if (!member || member.role !== "host") return apiError("Forbidden", 403);

  const { error } = await db.from("events").delete().eq("id", eventId);
  if (error) return apiError(error.message, 500);

  return apiOk({ deleted: true });
}
