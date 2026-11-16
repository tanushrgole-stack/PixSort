import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { apiOk, apiError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get('photo_id');
  if (!photoId) return apiError('photo_id required', 400);

  const db = createServerClient();
  const { data, error } = await db
    .from('photo_comments')
    .select('id, user_id, user_name, content, reaction, created_at')
    .eq('photo_id', photoId)
    .order('created_at', { ascending: true });

  if (error) return apiError(error.message, 500);
  return apiOk({ comments: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const body = await req.json().catch(() => ({}));
  const { photo_id, user_id, user_name, content, reaction } = body;

  if (!photo_id || !user_id) return apiError('photo_id and user_id required', 400);
  if (!content && !reaction) return apiError('content or reaction required', 400);

  const db = createServerClient();
  const { data, error } = await db
    .from('photo_comments')
    .insert({ photo_id, user_id, user_name: user_name ?? 'Guest', content: content ?? null, reaction: reaction ?? null })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk({ comment: data }, 201);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get('comment_id');
  const userId = searchParams.get('user_id');

  if (!commentId || !userId) return apiError('comment_id and user_id required', 400);

  const db = createServerClient();
  const { error } = await db
    .from('photo_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) return apiError(error.message, 500);
  return apiOk({ deleted: true });
}
