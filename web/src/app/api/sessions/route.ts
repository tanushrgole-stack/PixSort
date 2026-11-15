import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

/**
 * POST /api/sessions
 * Body: { user_id, event_id, device_label? }
 * Creates a persistent guest session and returns its opaque token.
 */
export async function POST(req: NextRequest) {
  const db = createServerClient();

  let body: { user_id?: string; event_id?: string; device_label?: string };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { user_id, event_id, device_label } = body;
  if (!user_id || !event_id) return apiError("user_id and event_id required");

  // Verify user is a member of the event
  const { data: member } = await db
    .from("event_members")
    .select("status")
    .eq("user_id", user_id)
    .eq("event_id", event_id)
    .single();

  if (!member) return apiError("User is not a member of this event", 403);

  const { data: session, error } = await db
    .from("guest_sessions")
    .insert({ user_id, event_id, device_label: device_label ?? null })
    .select("token, id")
    .single();

  if (error || !session) return apiError(error?.message ?? "Failed to create session", 500);

  return apiOk({ token: session.token, session_id: session.id }, 201);
}
