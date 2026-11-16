import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { apiOk, apiError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  if (!userId) return apiError('user_id required', 400);

  const db = createServerClient();

  // Verify uploader/host role
  const { data: member } = await db
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!member || !['host', 'uploader'].includes(member.role)) {
    return apiError('Forbidden', 403);
  }

  // Total photos in event
  const { count: totalEvent } = await db
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  // Photos uploaded by this user
  const { count: uploadedByMe } = await db
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('uploaded_by', userId);

  // Status breakdown
  const statuses = ['pending', 'processing', 'done', 'failed'] as const;
  const breakdown: Record<string, number> = {};

  for (const s of statuses) {
    const { count } = await db
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', s);
    breakdown[s] = count ?? 0;
  }

  // Recent 20 uploads by this user
  const { data: recentUploads } = await db
    .from('photos')
    .select('id, storage_path, thumb_path, status, taken_at, moment_id')
    .eq('event_id', eventId)
    .eq('uploaded_by', userId)
    .order('taken_at', { ascending: false })
    .limit(20);

  // Moments coverage (which moments have photos)
  const { data: moments } = await db
    .from('moments')
    .select('id, name, order_index')
    .eq('event_id', eventId)
    .order('order_index', { ascending: true });

  const coveragePromises = (moments ?? []).map(async (m) => {
    const { count } = await db
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('moment_id', m.id);
    return { ...m, photo_count: count ?? 0 };
  });
  const momentsCoverage = await Promise.all(coveragePromises);

  return apiOk({
    uploaded_by_me: uploadedByMe ?? 0,
    total_event: totalEvent ?? 0,
    processing_breakdown: breakdown,
    recent_uploads: recentUploads ?? [],
    moments_coverage: momentsCoverage,
  });
}
