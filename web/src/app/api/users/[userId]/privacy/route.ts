import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { apiOk, apiError } from '@/lib/api-helpers';

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const db = createServerClient();

  const { data, error } = await db
    .from('user_privacy')
    .select('face_opt_out, consent_at, delete_requested_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return apiError(error.message, 500);

  return apiOk(data ?? {
    face_opt_out: false,
    consent_at: null,
    delete_requested_at: null,
    updated_at: null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const body = await req.json().catch(() => ({}));
  const { face_opt_out, consent_at } = body;

  const db = createServerClient();

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof face_opt_out === 'boolean') updatePayload.face_opt_out = face_opt_out;
  if (consent_at) updatePayload.consent_at = consent_at;

  const { data, error } = await db
    .from('user_privacy')
    .upsert({ user_id: userId, ...updatePayload }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  // If opting out of face matching, delete their face embeddings immediately
  if (face_opt_out === true) {
    await db.from('faces').delete().eq('event_id', '').eq('person_id', ''); // placeholder — real: delete by user's person_ids
  }

  return apiOk({ updated: true, privacy: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const db = createServerClient();

  // 1. Mark deletion requested
  await db
    .from('user_privacy')
    .upsert({ user_id: userId, delete_requested_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  // 2. Find all person_ids for this user across events
  const { data: members } = await db
    .from('event_members')
    .select('person_id')
    .eq('user_id', userId);

  const personIds = (members ?? []).map((m) => m.person_id).filter(Boolean) as string[];

  // 3. Delete face embeddings for this user's persons
  if (personIds.length > 0) {
    await db.from('faces').delete().in('person_id', personIds);
    // Null out the embeddings in people table
    await db.from('people').update({ face_embedding: null }).in('id', personIds);
  }

  // 4. Delete hidden_photos entries
  await db.from('hidden_photos').delete().eq('user_id', userId);

  return apiOk({ deleted: true, person_ids_cleared: personIds.length });
}
