import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ userId: string }> };

/**
 * GET /api/users/[userId]
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await params;
  const db = createServerClient();

  const { data, error } = await db
    .from("users")
    .select("id, name, is_guest, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) return apiError("User not found", 404);
  return apiOk({ user: data });
}

/**
 * PATCH /api/users/[userId]
 * Body: { name? }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await params;
  const db = createServerClient();

  let body: { name?: string };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  if (!body.name) return apiError("name is required");

  const { data, error } = await db
    .from("users")
    .update({ name: body.name.trim() })
    .eq("id", userId)
    .select("id, name, is_guest, created_at")
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk({ user: data });
}
