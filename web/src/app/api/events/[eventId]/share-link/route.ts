import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { apiOk, apiError } from '@/lib/api-helpers';

/** POST /api/events/[eventId]/share-link  → create or regenerate */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params;
  const body = await req.json().catch(() => ({}));
  const { user_id, label } = body;
  if (!user_id) return apiError('user_id required', 400);

  const db = createServerClient();

  // Delete any existing link for this user+event (regenerate)
  await db.from('share_links').delete().eq('event_id', eventId).eq('user_id', user_id);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('share_links')
    .insert({ event_id: eventId, user_id, label: label ?? null, expires_at: expiresAt })
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return apiOk({
    token: data.token,
    url: `${base}/share/${data.token}`,
    expires_at: data.expires_at,
    view_count: 0,
  }, 201);
}

/** GET /api/events/[eventId]/share-link?token=X  → verify */
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return apiError('token required', 400);

  const db = createServerClient();
  const { data, error } = await db
    .from('share_links')
    .select('id, event_id, user_id, label, expires_at, view_count')
    .eq('token', token)
    .single();

  if (error || !data) return apiError('Invalid or expired link', 404);

  if (new Date(data.expires_at) < new Date()) {
    return apiError('Link has expired', 410);
  }

  return apiOk(data);
}
