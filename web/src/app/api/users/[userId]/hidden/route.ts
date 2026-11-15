import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { apiOk, apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ userId: string }> };

/**
 * GET /api/users/[userId]/hidden
 * Returns photo IDs hidden by this user.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await params;
  const db = createServerClient();

  const { data, error } = await db
    .from("hidden_photos")
    .select("photo_id, created_at")
    .eq("user_id", userId);

  if (error) return apiError(error.message, 500);
  return apiOk({ hidden: data ?? [] });
}

/**
 * POST /api/users/[userId]/hidden
 * Body: { photo_id }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await params;
  const db = createServerClient();

  let body: { photo_id?: string };
  try { body = await req.json(); } catch { return apiError("Invalid JSON"); }

  if (!body.photo_id) return apiError("photo_id required");

  const { error } = await db
    .from("hidden_photos")
    .insert({ user_id: userId, photo_id: body.photo_id });

  if (error?.code === "23505") return apiOk({ already_hidden: true });
  if (error) return apiError(error.message, 500);

  return apiOk({ hidden: true }, 201);
}

/**
 * DELETE /api/users/[userId]/hidden
 * Body: { photo_id }
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { userId } = await params;
  const db = createServerClient();

  let body: { photo_id?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  if (!body.photo_id) return apiError("photo_id required");

  const { error } = await db
    .from("hidden_photos")
    .delete()
    .eq("user_id", userId)
    .eq("photo_id", body.photo_id);

  if (error) return apiError(error.message, 500);
  return apiOk({ unhidden: true });
}
