-- ============================================================
-- Phase 3 Migration
-- ============================================================

-- ── Photo quality scores & EXIF GPS ─────────────────────────
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS quality_score FLOAT;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS quality_meta  JSONB;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS exif_lat      FLOAT;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS exif_lng      FLOAT;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS exif_alt      FLOAT;

-- ── Shareable read-only album links ─────────────────────────
CREATE TABLE IF NOT EXISTS public.share_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL REFERENCES public.events(id)  ON DELETE CASCADE,
  user_id     TEXT        NOT NULL,
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  label       TEXT,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  view_count  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Photo comments / reactions ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.photo_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id   UUID        NOT NULL REFERENCES public.photos(id)   ON DELETE CASCADE,
  user_id    TEXT        NOT NULL,
  user_name  TEXT        NOT NULL DEFAULT 'Guest',
  content    TEXT,
  reaction   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Privacy / consent columns on users ──────────────────────
-- (users table may not exist as a separate entity; use a standalone table)
CREATE TABLE IF NOT EXISTS public.user_privacy (
  user_id              TEXT        PRIMARY KEY,
  face_opt_out         BOOLEAN     NOT NULL DEFAULT FALSE,
  consent_at           TIMESTAMPTZ,
  delete_requested_at  TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
