import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/moments
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  const { data, error } = await db
    .from("moments")
    .select("*")
    .eq("event_id", eventId)
    .order("order");

  if (error) return apiError(error.message, 500);
  return apiOk({ moments: data ?? [] });
}

/**
 * POST /api/events/[eventId]/moments
 * Body: { host_id, name, order? }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: { host_id?: string; name?: string; order?: number };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { host_id, name, order } = body;
  if (!host_id || !name) return apiError("host_id and name are required");

  // Verify host
  const { data: hostMember } = await db
    .from("event_members")
    .select("role, status")
    .eq("event_id", eventId)
    .eq("user_id", host_id)
    .single();

  if (!hostMember || hostMember.role !== "host" || hostMember.status !== "approved") {
    return apiError("Forbidden", 403);
  }

  // Auto-assign next order if not provided
  let nextOrder = order;
  if (nextOrder === undefined) {
    const { data: last } = await db
      .from("moments")
      .select("order")
      .eq("event_id", eventId)
      .order("order", { ascending: false })
      .limit(1)
      .single();
    nextOrder = last ? (last.order as number) + 1 : 1;
  }

  const { data, error } = await db
    .from("moments")
    .insert({ event_id: eventId, name, order: nextOrder })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk({ moment: data }, 201);
}

/**
 * PATCH /api/events/[eventId]/moments
 * Body: { host_id, moment_id, name?, order? }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: { host_id?: string; moment_id?: string; name?: string; order?: number };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  const { host_id, moment_id, ...updates } = body;
  if (!host_id || !moment_id) return apiError("host_id and moment_id are required");

  const { data: hostMember } = await db
    .from("event_members")
    .select("role, status")
    .eq("event_id", eventId)
    .eq("user_id", host_id)
    .single();

  if (!hostMember || hostMember.role !== "host" || hostMember.status !== "approved") {
    return apiError("Forbidden", 403);
  }

  const patch = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ["name", "order"].includes(k))
  );
  if (Object.keys(patch).length === 0) return apiError("No valid fields");

  const { data, error } = await db
    .from("moments")
    .update(patch)
    .eq("id", moment_id)
    .eq("event_id", eventId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk({ moment: data });
}

/**
 * DELETE /api/events/[eventId]/moments
 * Body: { host_id, moment_id }
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const db = createServerClient();

  let body: { host_id?: string; moment_id?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const { host_id, moment_id } = body;
  if (!host_id || !moment_id) return apiError("host_id and moment_id required");

  const { data: hostMember } = await db
    .from("event_members")
    .select("role, status")
    .eq("event_id", eventId)
    .eq("user_id", host_id)
    .single();

  if (!hostMember || hostMember.role !== "host" || hostMember.status !== "approved") {
    return apiError("Forbidden", 403);
  }

  const { error } = await db
    .from("moments")
    .delete()
    .eq("id", moment_id)
    .eq("event_id", eventId);

  if (error) return apiError(error.message, 500);
  return apiOk({ deleted: true });
}
