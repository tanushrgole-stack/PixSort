-- ============================================================
-- PixSort Seed Script
-- Run AFTER 001_initial_schema.sql.
-- Creates two demo users, two events (wedding + trip),
-- moments, and a couple of members for each.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- SEED USERS
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.users (id, name, is_guest) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Tanush (Host)',  FALSE),
  ('00000000-0000-0000-0000-000000000002', 'Priya (Guest)',  TRUE),
  ('00000000-0000-0000-0000-000000000003', 'Rahul (Host)',   FALSE),
  ('00000000-0000-0000-0000-000000000004', 'Sneha (Guest)',  TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- SEED EVENTS
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.events (id, name, type, host_id, join_code, accent, upload_mode, require_approval, expires_at)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Tanush & Priya Wedding',
    'wedding',
    '00000000-0000-0000-0000-000000000001',
    'WEDD2025',
    '#B76E79',          -- Rose gold for wedding
    'selected',
    FALSE,
    NOW() + INTERVAL '90 days'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Goa Trip 2025',
    'trip',
    '00000000-0000-0000-0000-000000000003',
    'GOATRIP5',
    '#FF6B4A',          -- Sunset orange for trip
    'everyone',
    FALSE,
    NOW() + INTERVAL '30 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- SEED EVENT MEMBERS
-- ─────────────────────────────────────────────────────────────

-- Wedding: host + a guest
INSERT INTO public.event_members (event_id, user_id, role, status) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'host',     'approved'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'guest',    'approved')
ON CONFLICT DO NOTHING;

-- Trip: host + a guest
INSERT INTO public.event_members (event_id, user_id, role, status) VALUES
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'host',     'approved'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'guest',    'approved')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- SEED MOMENTS
-- Wedding default moments
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.moments (event_id, name, "order") VALUES
  ('10000000-0000-0000-0000-000000000001', 'Haldi',     1),
  ('10000000-0000-0000-0000-000000000001', 'Mehendi',   2),
  ('10000000-0000-0000-0000-000000000001', 'Sangeet',   3),
  ('10000000-0000-0000-0000-000000000001', 'Wedding',   4),
  ('10000000-0000-0000-0000-000000000001', 'Reception', 5)
ON CONFLICT DO NOTHING;

-- Trip default moments
INSERT INTO public.moments (event_id, name, "order") VALUES
  ('10000000-0000-0000-0000-000000000002', 'Day 1',     1),
  ('10000000-0000-0000-0000-000000000002', 'Day 2',     2),
  ('10000000-0000-0000-0000-000000000002', 'Day 3',     3),
  ('10000000-0000-0000-0000-000000000002', 'Beach Day', 4)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- SEED PEOPLE  (one enrolled person per event)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.people (event_id, user_id, name, face_enrolled) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Priya',  FALSE),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'Sneha',  FALSE)
ON CONFLICT DO NOTHING;
