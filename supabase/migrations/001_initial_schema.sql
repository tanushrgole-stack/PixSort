-- ============================================================
-- PixSort — Supabase SQL Migration
-- Run this in the Supabase SQL editor or via supabase db push.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- 0b. CUSTOM TYPES
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE event_type_enum AS ENUM (
    'wedding','trip','party','birthday','family','college','corporate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE upload_mode_enum AS ENUM ('everyone','selected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_role_enum AS ENUM ('host','uploader','guest');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_status_enum AS ENUM ('approved','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE photo_status_enum AS ENUM ('pending','processing','done','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  is_guest    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. EVENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             event_type_enum NOT NULL,
  cover_url        TEXT,
  host_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  join_code        TEXT NOT NULL UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  accent           TEXT NOT NULL DEFAULT '#FF6B4A',
  upload_mode      upload_mode_enum NOT NULL DEFAULT 'everyone',
  require_approval BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 3. EVENT MEMBERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_members (
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       member_role_enum   NOT NULL DEFAULT 'guest',
  status     member_status_enum NOT NULL DEFAULT 'approved',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- 4. MOMENTS  (sub-albums per event)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.moments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  "order"     INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, name)
);

-- ─────────────────────────────────────────────────────────────
-- 5. PHOTOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  moment_id     UUID REFERENCES public.moments(id) ON DELETE SET NULL,
  uploaded_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  storage_path  TEXT NOT NULL,
  thumb_path    TEXT,
  taken_at      TIMESTAMPTZ,
  width         INT,
  height        INT,
  phash         TEXT,
  status        photo_status_enum NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_event_id    ON public.photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_moment_id   ON public.photos(moment_id);
CREATE INDEX IF NOT EXISTS idx_photos_status      ON public.photos(status);

-- ─────────────────────────────────────────────────────────────
-- 6. PEOPLE  (one record per person per event)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.people (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name           TEXT NOT NULL DEFAULT 'Unknown',
  face_enrolled  BOOLEAN NOT NULL DEFAULT FALSE,
  opted_out      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_people_event_id ON public.people(event_id);
CREATE INDEX IF NOT EXISTS idx_people_user_id  ON public.people(user_id);

-- ─────────────────────────────────────────────────────────────
-- 7. FACES  (embedding per detected face in a photo)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id   UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  embedding  vector(512) NOT NULL,
  bbox       JSONB NOT NULL,          -- {x, y, width, height}
  person_id  UUID REFERENCES public.people(id) ON DELETE SET NULL,
  confidence FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faces_photo_id  ON public.faces(photo_id);
CREATE INDEX IF NOT EXISTS idx_faces_event_id  ON public.faces(event_id);
CREATE INDEX IF NOT EXISTS idx_faces_person_id ON public.faces(person_id);

-- HNSW index for approximate-nearest-neighbor face similarity search
CREATE INDEX IF NOT EXISTS idx_faces_embedding_hnsw
  ON public.faces USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─────────────────────────────────────────────────────────────
-- 8. FAVORITES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photo_id   UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, photo_id)
);

-- ─────────────────────────────────────────────────────────────
-- 9. HIDDEN PHOTOS  (user hides photos of themselves)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hidden_photos (
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photo_id   UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, photo_id)
);

-- ─────────────────────────────────────────────────────────────
-- 10. HELPER FUNCTION — updated_at trigger
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 11. HELPER FUNCTION — resolved_user_id()
-- Returns the UUID from the JWT claim (anon + authed sessions).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolved_user_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'pixsort_user_id')::UUID,
    (auth.jwt() ->> 'sub')::UUID
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 12. HELPER FUNCTION — is_approved_member(event_id)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_approved_member(p_event_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_members em
    WHERE em.event_id = p_event_id
      AND em.user_id  = public.resolved_user_id()
      AND em.status   = 'approved'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 13. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- USERS -------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_read"  ON public.users
  FOR SELECT USING (id = public.resolved_user_id());

CREATE POLICY "users_own_update" ON public.users
  FOR UPDATE USING (id = public.resolved_user_id());

-- EVENTS ------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_approved_member_read" ON public.events
  FOR SELECT USING (public.is_approved_member(id));

CREATE POLICY "events_host_insert" ON public.events
  FOR INSERT WITH CHECK (host_id = public.resolved_user_id());

CREATE POLICY "events_host_update" ON public.events
  FOR UPDATE USING (host_id = public.resolved_user_id());

CREATE POLICY "events_host_delete" ON public.events
  FOR DELETE USING (host_id = public.resolved_user_id());

-- EVENT MEMBERS -----------------------------------------------
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "em_member_read" ON public.event_members
  FOR SELECT USING (public.is_approved_member(event_id));

CREATE POLICY "em_self_insert" ON public.event_members
  FOR INSERT WITH CHECK (user_id = public.resolved_user_id());

CREATE POLICY "em_host_manage" ON public.event_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.event_members h
      WHERE h.event_id = event_members.event_id
        AND h.user_id  = public.resolved_user_id()
        AND h.role     = 'host'
        AND h.status   = 'approved'
    )
  );

-- MOMENTS -----------------------------------------------------
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moments_member_read" ON public.moments
  FOR SELECT USING (public.is_approved_member(event_id));

CREATE POLICY "moments_host_write" ON public.moments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.event_members h
      WHERE h.event_id = moments.event_id
        AND h.user_id  = public.resolved_user_id()
        AND h.role     = 'host'
        AND h.status   = 'approved'
    )
  );

-- PHOTOS ------------------------------------------------------
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photos_member_read" ON public.photos
  FOR SELECT USING (public.is_approved_member(event_id));

CREATE POLICY "photos_uploader_insert" ON public.photos
  FOR INSERT WITH CHECK (
    public.is_approved_member(event_id)
    AND (
      -- upload_mode = 'everyone'
      EXISTS (SELECT 1 FROM public.events e
              WHERE e.id = event_id AND e.upload_mode = 'everyone')
      OR
      -- upload_mode = 'selected' → must be uploader or host
      EXISTS (
        SELECT 1 FROM public.event_members em
        WHERE em.event_id = event_id
          AND em.user_id  = public.resolved_user_id()
          AND em.role IN ('host','uploader')
          AND em.status = 'approved'
      )
    )
  );

-- PEOPLE ------------------------------------------------------
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "people_member_read" ON public.people
  FOR SELECT USING (public.is_approved_member(event_id));

CREATE POLICY "people_self_write" ON public.people
  FOR ALL USING (user_id = public.resolved_user_id());

CREATE POLICY "people_host_write" ON public.people
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.event_members h
      WHERE h.event_id = people.event_id
        AND h.user_id  = public.resolved_user_id()
        AND h.role     = 'host'
        AND h.status   = 'approved'
    )
  );

-- FACES -------------------------------------------------------
ALTER TABLE public.faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faces_member_read" ON public.faces
  FOR SELECT USING (public.is_approved_member(event_id));

-- FAVORITES ---------------------------------------------------
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_own" ON public.favorites
  FOR ALL USING (user_id = public.resolved_user_id());

-- HIDDEN PHOTOS -----------------------------------------------
ALTER TABLE public.hidden_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hidden_own" ON public.hidden_photos
  FOR ALL USING (user_id = public.resolved_user_id());
