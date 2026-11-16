import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { apiOk, apiError } from '@/lib/api-helpers';

/** GET /api/share/[token]  → resolve share link, return public album */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;
  const db = createServerClient();

  const { data: link, error: linkErr } = await db
    .from('share_links')
    .select('id, event_id, user_id, label, expires_at, view_count')
    .eq('token', token)
    .single();

  if (linkErr || !link) return apiError('Invalid or not found', 404);
  if (new Date(link.expires_at) < new Date()) return apiError('Link has expired', 410);

  // Bump view count
  await db.from('share_links').update({ view_count: link.view_count + 1 }).eq('id', link.id);

  // Load event info
  const { data: event } = await db
    .from('events')
    .select('id, title, type')
    .eq('id', link.event_id)
    .single();

  // Find the person for this user in this event
  const { data: personData } = await db
    .from('event_members')
    .select('person_id: people(id, name, face_thumb_url)')
    .eq('event_id', link.event_id)
    .eq('user_id', link.user_id)
    .maybeSingle();

  const person = (personData?.person_id as unknown) as { id: string; name: string; face_thumb_url: string | null } | null;

  let photos: unknown[] = [];
  if (person?.id) {
    const { data: faces } = await db
      .from('faces')
      .select('photo_id')
      .eq('event_id', link.event_id)
      .eq('person_id', person.id);

    const photoIds = (faces ?? []).map((f) => f.photo_id);
    if (photoIds.length > 0) {
      const { data: p } = await db
        .from('photos')
        .select('id, storage_path, thumb_path, width, height, taken_at, moment_id')
        .in('id', photoIds)
        .eq('status', 'done')
        .order('taken_at', { ascending: true });
      photos = p ?? [];
    }
  }

  return apiOk({
    event,
    person,
    label: link.label,
    expires_at: link.expires_at,
    view_count: link.view_count + 1,
    photos,
  });
}
