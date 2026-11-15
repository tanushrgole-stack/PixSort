import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError, joinUrl, qrPayload } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/join-link
 * Returns the join URL and QR payload for an event.
 * Caller must be a host or approved member.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return apiError("user_id required");

  // Verify membership
  const { data: member } = await db
    .from("event_members")
    .select("role, status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (!member || member.status !== "approved") return apiError("Forbidden", 403);

  const { data: event } = await db
    .from("events")
    .select("join_code, name, type, accent")
    .eq("id", eventId)
    .single();

  if (!event) return apiError("Event not found", 404);

  return apiOk({
    join_code:  event.join_code,
    join_url:   joinUrl(event.join_code),
    qr_payload: qrPayload(event.join_code),
  });
}
