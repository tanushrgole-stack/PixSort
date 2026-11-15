# PixSort - Project Specification

## Concept
Host creates an event (type: wedding/trip/party/birthday/family/college/corporate) and shares a join link/QR. Host chooses upload mode: everyone can upload, or only selected uploaders (e.g. photographer). Photos go to a shared "All Photos" pool, optionally tagged to a "moment" (sub-album like Haldi, Sangeet, Reception, Day 1). AI face detection/clustering runs in the background after upload. Each guest joins with just a name (no account needed), scans their face (selfie + simple liveness check) and gets a personal album (solo + group photos), filterable by moment. Scanning can happen before or after uploads; albums fill in as processing finishes. Must handle events with thousands of photos and hundreds of guests.

## Stack
- **Web**: Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion (mobile-first, PWA-friendly).
- **Database & Storage**: Supabase (Postgres + pgvector + storage; anonymous/guest sessions + optional host login).
- **AI Service**: Python FastAPI service with InsightFace (CPU) for face detection and embeddings.
- **Queue/Worker**: Background processing via a simple queue worker.

## Design
- **Theme**: Warm "Sunset Memories" theme.
  - **Light Mode (Default)**:
    - Background: `#FFF7F0` (cream)
    - Surface: `#FFFFFF`
    - Primary Coral: `#FF6B4A`
    - Accent Golden: `#FFB703`
    - Soft Rose: `#FFD9CC`
    - Text: `#2B2118`
  - **Dark Mode (Warm)**:
    - Background: `#1F1612`
    - Surface: `#2B1F19`
    - Accents: Coral `#FF6B4A` / Golden `#FFB703`
    - Text: `#FFF1E6`
- **Typography**:
  - Headings: Fraunces (warm serif)
  - Body: Inter (clean readable sans-serif)
- **Visual Style**: Rounded corners, soft shadows, warm gradients, gentle animations. Photos are the hero.
- **Per-Event Accent Presets**: Presets tailored by event type (e.g. wedding: rose-gold/maroon, trip: sunset orange, birthday: golden yellow).

## Privacy
- Events are private (accessible via link/QR only).
- Optional host approval to join.
- Store embeddings, not guest selfies.
- Users can opt out, delete face data, and hide photos of themselves.
- Events auto-expire (default 30 days, host-configurable).

## Phases
- **Phase 1: MVP**
  - Events management & event types
  - Join via link/QR (name only, no auth required)
  - Photo uploading (upload modes)
  - Face sorting & background embedding pipeline
  - Selfie scan with simple liveness check
  - Personal album (solo + group photos)
  - ZIP album download
- **Phase 2**
  - Moments (sub-albums)
  - All Photos view
  - People view
  - "Not me" false match resolution
  - Duplicate photo cleanup
  - Favorites
  - Live updates ("new photos of you")
- **Phase 3**
  - Best-photo ranking
  - Timeline & map view
  - Highlight reel generator
  - Granular consent controls
  - Shareable personal links
  - Dedicated photographer mode
