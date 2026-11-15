import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * POST /api/events/[eventId]/faces/report
 * Body: { face_id, photo_id, reporter_id, person_id?, kind: "not_me"|"add_me" }
 *
 * "not_me": removes the wrong person assignment from that face.
 * "add_me": assigns that face to the reporter's person record.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: {
    face_id?: string;
    photo_id?: string;
    reporter_id?: string;
    person_id?: string;
    kind?: "not_me" | "add_me";
  };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { face_id, photo_id, reporter_id, person_id, kind } = body;
  if (!face_id || !photo_id || !reporter_id || !kind) {
    return apiError("face_id, photo_id, reporter_id, and kind are required");
  }
  if (!["not_me", "add_me"].includes(kind)) {
    return apiError("kind must be 'not_me' or 'add_me'");
  }

  // Record the report
  await db.from("face_reports").insert({
    face_id, photo_id, event_id: eventId, reporter_id, person_id: person_id ?? null, kind,
  });

  if (kind === "not_me") {
    const { error } = await db.from("faces").update({ person_id: null }).eq("id", face_id);
    if (error) return apiError(error.message, 500);
    return apiOk({ updated: true, action: "face_unlinked" });
  }

  // "add_me" — find reporter's person in this event
  if (!person_id) {
    const { data: personRow } = await db
      .from("people")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", reporter_id)
      .single();
    if (!personRow) return apiError("Reporter has no person record in this event. Enroll first.", 404);

    const { error } = await db.from("faces").update({ person_id: personRow.id }).eq("id", face_id);
    if (error) return apiError(error.message, 500);
    return apiOk({ updated: true, action: "face_assigned", person_id: personRow.id });
  }

  const { error } = await db.from("faces").update({ person_id }).eq("id", face_id);
  if (error) return apiError(error.message, 500);
  return apiOk({ updated: true, action: "face_assigned" });
}
