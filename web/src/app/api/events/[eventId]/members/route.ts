import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/members
 * Returns all members (optionally filter by status).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  const status = req.nextUrl.searchParams.get("status"); // 'pending' | 'approved' | null

  let query = db
    .from("event_members")
    .select("user_id, role, status, joined_at, users(id, name, is_guest)")
    .eq("event_id", eventId);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);

  return apiOk({ members: data ?? [] });
}

/**
 * PATCH /api/events/[eventId]/members
 * Body: { host_id, user_id, action: "approve"|"reject"|"assign_uploader"|"revoke_uploader" }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { host_id, user_id, action } = body;

  if (!host_id || !user_id || !action) {
    return apiError("host_id, user_id, and action are required");
  }

  // Verify caller is host
  const { data: hostMember } = await db
    .from("event_members")
    .select("role, status")
    .eq("event_id", eventId)
    .eq("user_id", host_id)
    .single();

  if (!hostMember || hostMember.role !== "host" || hostMember.status !== "approved") {
    return apiError("Forbidden", 403);
  }

  switch (action) {
    case "approve": {
      const { error } = await db
        .from("event_members")
        .update({ status: "approved" })
        .eq("event_id", eventId)
        .eq("user_id", user_id);
      if (error) return apiError(error.message, 500);
      return apiOk({ updated: true, action: "approved" });
    }

    case "reject": {
      const { error } = await db
        .from("event_members")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user_id)
        .neq("role", "host"); // never remove host
      if (error) return apiError(error.message, 500);
      return apiOk({ updated: true, action: "rejected" });
    }

    case "assign_uploader": {
      const { error } = await db
        .from("event_members")
        .update({ role: "uploader" })
        .eq("event_id", eventId)
        .eq("user_id", user_id)
        .neq("role", "host");
      if (error) return apiError(error.message, 500);
      return apiOk({ updated: true, action: "assigned_uploader" });
    }

    case "revoke_uploader": {
      const { error } = await db
        .from("event_members")
        .update({ role: "guest" })
        .eq("event_id", eventId)
        .eq("user_id", user_id)
        .eq("role", "uploader");
      if (error) return apiError(error.message, 500);
      return apiOk({ updated: true, action: "revoked_uploader" });
    }

    default:
      return apiError("Unknown action. Use: approve | reject | assign_uploader | revoke_uploader");
  }
}
