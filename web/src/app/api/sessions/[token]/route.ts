import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ token: string }> };

/**
 * GET /api/sessions/[token]
 * Resolves an opaque resume token → user/event session data.
 * Used when a guest opens a "continue on another device" link.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const db = createServerClient();

  const { data: session, error } = await db
    .from("guest_sessions")
    .select("*, users(id, name, is_guest), events(id, name, type, accent, join_code)")
    .eq("token", token)
    .single();

  if (error || !session) return apiError("Session not found or expired", 404);

  // Bump last_seen_at
  await db
    .from("guest_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("token", token);

  // Fetch person for this user/event
  const { data: person } = await db
    .from("people")
    .select("id, name, face_enrolled, opted_out")
    .eq("user_id", session.user_id)
    .eq("event_id", session.event_id)
    .single();

  // Fetch member status
  const { data: member } = await db
    .from("event_members")
    .select("role, status")
    .eq("user_id", session.user_id)
    .eq("event_id", session.event_id)
    .single();

  return apiOk({
    userId:       session.user_id,
    eventId:      session.event_id,
    token:        session.token,
    name:         (session.users as { name: string }).name,
    personId:     person?.id ?? null,
    memberStatus: member?.status ?? "pending",
    event:        session.events,
    createdAt:    session.created_at,
  });
}

/**
 * DELETE /api/sessions/[token]
 * Revoke a session (sign out from a device).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const db = createServerClient();

  const { error } = await db
    .from("guest_sessions")
    .delete()
    .eq("token", token);

  if (error) return apiError(error.message, 500);
  return apiOk({ revoked: true });
}
