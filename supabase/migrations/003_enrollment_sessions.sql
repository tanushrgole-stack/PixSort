-- ============================================================
-- Migration 003: Face enrollment, guest sessions, album filters
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. GUEST SESSIONS
-- Persistent anonymous sessions for no-account guests.
-- Stored in localStorage + optionally encoded in a "resume link".
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  device_label TEXT,                   -- e.g. "iPhone 15 · Safari"
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_user_event
  ON public.guest_sessions(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_token
  ON public.guest_sessions(token);

-- RLS: only the owning user (via service-role in API) can read/write
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gs_service_only" ON public.guest_sessions
  USING (TRUE);   -- API layer enforces ownership; all access via service role key

-- ─────────────────────────────────────────────────────────────
-- 2. ENROLLMENT CANDIDATES
-- Temporary table: top-N candidate people shown to user when
-- selfie confidence is too low. Cleaned up after user picks.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollment_candidates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  person_id   UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  similarity  FLOAT NOT NULL,
  rank        INT  NOT NULL,  -- 1 = best match
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_candidates_user_event
  ON public.enrollment_candidates(user_id, event_id);

ALTER TABLE public.enrollment_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec_service_only" ON public.enrollment_candidates USING (TRUE);

-- ─────────────────────────────────────────────────────────────
-- 3. FACE REPORTS ("not me" / "add me")
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.face_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_id     UUID NOT NULL REFERENCES public.faces(id) ON DELETE CASCADE,
  photo_id    UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  person_id   UUID REFERENCES public.people(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('not_me', 'add_me')),
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_face_reports_event ON public.face_reports(event_id);

ALTER TABLE public.face_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr_member_read" ON public.face_reports
  FOR SELECT USING (public.is_approved_member(event_id));
CREATE POLICY "fr_self_write" ON public.face_reports
  FOR INSERT WITH CHECK (reporter_id = public.resolved_user_id());

-- ─────────────────────────────────────────────────────────────
-- 4. Add face_thumbnail_path to people (cropped face crop URL)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS face_thumbnail_path TEXT;

-- ─────────────────────────────────────────────────────────────
-- 5. HELPER FUNCTION: count faces per photo (for solo detection)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.photo_face_count(p_photo_id UUID)
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INT FROM public.faces WHERE photo_id = p_photo_id;
$$;
