import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { apiOk, apiError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params;
  const { searchParams } = new URL(req.url);
  const personId = searchParams.get('person_id');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

  if (!personId) return apiError('person_id required', 400);

  const db = createServerClient();

  // Get faces for this person in this event, join with photos ordered by quality
  const { data, error } = await db
    .from('faces')
    .select('photo_id, confidence, photos(id, storage_path, thumb_path, width, height, quality_score, quality_meta, taken_at, moment_id)')
    .eq('event_id', eventId)
    .eq('person_id', personId)
    .eq('photos.status', 'done')
    .order('photos(quality_score)', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    // Fallback: simple join without ordering by nested column
    const { data: faces, error: err2 } = await db
      .from('faces')
      .select('photo_id, confidence')
      .eq('event_id', eventId)
      .eq('person_id', personId)
      .limit(limit);

    if (err2) return apiError(err2.message, 500);

    const photoIds = (faces ?? []).map((f) => f.photo_id);
    if (photoIds.length === 0) return apiOk({ photos: [] });

    const { data: photos, error: err3 } = await db
      .from('photos')
      .select('id, storage_path, thumb_path, width, height, quality_score, quality_meta, taken_at, moment_id')
      .in('id', photoIds)
      .eq('status', 'done')
      .order('quality_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (err3) return apiError(err3.message, 500);
    return apiOk({ photos: photos ?? [] });
  }

  const photos = (data ?? [])
    .map((row) => {
      const p = Array.isArray(row.photos) ? row.photos[0] : row.photos;
      return p ? { ...p, face_confidence: row.confidence } : null;
    })
    .filter(Boolean)
    .sort((a, b) => ((b?.quality_score ?? 0) - (a?.quality_score ?? 0)));

  return apiOk({ photos });
}
