import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError, joinUrl, qrPayload } from "@/lib/api-helpers";

/**
 * POST /api/join
 * Body: { join_code, name }
 *
 * Flow:
 *  1. Look up event by join_code (must not be expired).
 *  2. Create a guest user record.
 *  3. Add them to event_members with:
 *     - status = 'pending'  if require_approval = true
 *     - status = 'approved' otherwise
 *  4. Return { user, event, member_status, join_url, qr_payload }.
 */
export async function POST(req: NextRequest) {
  const db = createServerClient();

  let body: { join_code?: string; name?: string };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { join_code, name } = body;
  if (!join_code || !name) return apiError("join_code and name are required");

  // 1. Find event
  const { data: event, error: eventErr } = await db
    .from("events")
    .select("id, name, type, require_approval, expires_at, join_code, accent, upload_mode")
    .eq("join_code", join_code.trim().toUpperCase())
    .single();

  if (eventErr || !event) return apiError("Invalid join code", 404);

  // Check expiry
  if (new Date(event.expires_at) < new Date()) {
    return apiError("This event has expired", 410);
  }

  // 2. Create guest user
  const { data: user, error: userErr } = await db
    .from("users")
    .insert({ name: name.trim(), is_guest: true })
    .select()
    .single();

  if (userErr || !user) return apiError(userErr?.message ?? "Failed to create user", 500);

  const member_status = event.require_approval ? "pending" : "approved";

  // 3. Add event member
  const { error: memberErr } = await db
    .from("event_members")
    .insert({
      event_id: event.id,
      user_id:  user.id,
      role:     "guest",
      status:   member_status,
    });

  if (memberErr) return apiError(memberErr.message, 500);

  return apiOk({
    user,
    event,
    member_status,
    pending_approval: member_status === "pending",
    join_url:   joinUrl(event.join_code),
    qr_payload: qrPayload(event.join_code),
  }, 201);
}

/**
 * GET /api/join?code=<join_code>
 * Returns public event metadata for the join page (no auth required).
 */
export async function GET(req: NextRequest) {
  const db = createServerClient();
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return apiError("code query param required");

  const { data: event, error } = await db
    .from("events")
    .select("id, name, type, accent, expires_at, require_approval, cover_url")
    .eq("join_code", code.trim().toUpperCase())
    .single();

  if (error || !event) return apiError("Event not found", 404);
  if (new Date(event.expires_at) < new Date()) return apiError("Event has expired", 410);

  return apiOk({ event });
}
