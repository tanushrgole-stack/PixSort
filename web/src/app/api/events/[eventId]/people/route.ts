import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/people
 * Returns all people (enrolled or auto-detected) for an event.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  const { data, error } = await db
    .from("people")
    .select("*, users(id, name)")
    .eq("event_id", eventId)
    .order("created_at");

  if (error) return apiError(error.message, 500);
  return apiOk({ people: data ?? [] });
}

/**
 * PATCH /api/events/[eventId]/people
 * Body: { person_id, user_id, opted_out?, face_enrolled? }
 * Used to link a person record to a user, or to opt out.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: {
    person_id?: string;
    user_id?: string;
    opted_out?: boolean;
    face_enrolled?: boolean;
  };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { person_id, user_id, ...updates } = body;
  if (!person_id || !user_id) return apiError("person_id and user_id required");

  // Only the linked user (or host) may update. Here we trust user_id from body
  // (replace with JWT check in Phase 2).
  const allowed = ["opted_out", "face_enrolled", "name"];
  const patch = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(patch).length === 0) return apiError("No valid fields");

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
