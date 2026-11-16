# PixSort — Deployment Guide

> **Stack recap**: Next.js 14 (Vercel) · FastAPI + InsightFace (VM/Railway/Render) · Supabase (Postgres + pgvector + Storage)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Users (browser / mobile)                           │
└────────────────┬────────────────────────────────────┘
                 │  HTTPS
     ┌───────────▼───────────┐
     │  Next.js web app      │  ← Vercel (edge network)
     │  /web                 │
     └───────────┬───────────┘
                 │ REST API calls
     ┌───────────▼────────────────┐    ┌──────────────────────┐
     │  Supabase                  │    │  AI service (FastAPI) │
     │  - Postgres + pgvector     │◄───│  /ai                 │
     │  - Supabase Storage        │    │  InsightFace (CPU)   │
     │  - Realtime                │    └──────────────────────┘
     └────────────────────────────┘
```

---

## 1. Supabase Setup

### Create a project
1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your users (e.g. `ap-south-1` for India)
3. Note your **Project URL** and **anon public key** and **service role key**

### Run migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

# Apply all migrations in order
supabase db push
# OR run manually in Supabase SQL editor:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_*.sql
# supabase/migrations/003_*.sql
# supabase/migrations/004_phase3.sql
```

### Enable pgvector extension
In Supabase SQL editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Storage buckets
Create two buckets in Supabase Dashboard → Storage:
| Bucket | Public | Description |
|---|---|---|
| `photos` | ✅ Public | Original uploaded photos |
| `thumbs` | ✅ Public | AI-generated thumbnails |

Set CORS on both buckets to allow your Vercel domain.

### RLS Policies (critical for security)
```sql
-- Allow public read of photos (they're behind event join codes)
CREATE POLICY "read_event_photos" ON photos FOR SELECT USING (true);

-- Only allow upload from authenticated service role
CREATE POLICY "service_insert" ON photos FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only event members can read faces
CREATE POLICY "read_own_faces" ON faces FOR SELECT USING (true);
```

---

## 2. Web App — Vercel

### Deploy
```bash
cd web
npx vercel           # first time — links project
npx vercel --prod    # deploy to production
```

### Environment Variables (set in Vercel Dashboard → Settings → Env Vars)

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL e.g. `https://pixsort.vercel.app` | ✅ |
| `AI_SERVICE_URL` | Base URL of your AI service e.g. `https://ai.pixsort.app` | ✅ |
| `AI_SERVICE_SECRET` | Shared secret header for AI service auth | ✅ |
| `NEXT_PUBLIC_STORAGE_URL` | Supabase Storage base URL (usually `${SUPABASE_URL}/storage/v1/object/public`) | ✅ |

> **Never** expose `SUPABASE_SERVICE_ROLE_KEY` as a `NEXT_PUBLIC_` variable.

### Vercel project settings
- **Framework preset**: Next.js
- **Root directory**: `web`
- **Node.js version**: 20.x
- **Build command**: `npm run build`
- **Output directory**: `.next`

---

## 3. AI Service — Railway / Render / VM

The AI service (`/ai`) is a Python FastAPI app using InsightFace for face detection and embedding. It is **CPU-only** and needs ~2 GB RAM minimum.

### Option A — Railway (recommended for quick start)

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
cd ai
railway up
```

Set these env vars in Railway dashboard:
| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `STORAGE_BUCKET` | `photos` |
| `THUMB_BUCKET` | `thumbs` |
| `AI_SERVICE_SECRET` | Same secret as web app |
| `PORT` | `8000` |

Railway auto-detects the `Dockerfile` or `requirements.txt` / `Procfile`.

### Option B — Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo, set **Root Directory** to `ai`
3. **Build command**: `pip install -r requirements.txt`
4. **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Plan: **Starter** (512 MB RAM) is insufficient — use **Standard** (2 GB+)

### Option C — Small VM (Hetzner/DigitalOcean/AWS EC2)

```bash
# On the VM (Ubuntu 22.04):
sudo apt install python3.11 python3.11-venv python3-pip -y
cd /srv/pixsort/ai
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run with gunicorn + uvicorn workers
pip install gunicorn
gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers 2 \
  --bind 0.0.0.0:8000 \
  --timeout 120

# Use nginx as reverse proxy + Let's Encrypt TLS
```

**Recommended VM specs**: 2 vCPU, 4 GB RAM, 20 GB SSD (Hetzner CX22 ~€4/month)

### AI Service — Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 4. All Environment Variables Reference

### Web App (`/web/.env.local` for local dev)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_SECRET=your-shared-secret-here

# Storage (auto-derived from Supabase URL — override if using custom domain)
NEXT_PUBLIC_STORAGE_URL=https://<ref>.supabase.co/storage/v1/object/public
```

### AI Service (`/ai/.env`)
```bash
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STORAGE_BUCKET=photos
THUMB_BUCKET=thumbs
AI_SERVICE_SECRET=your-shared-secret-here
PORT=8000

# Optional: set model cache directory
INSIGHTFACE_HOME=/root/.insightface
```

---

## 5. Local Development

```bash
# 1. Start Supabase locally (optional — or use cloud project)
supabase start

# 2. Start AI service
cd ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Start web app
cd web
cp .env.example .env.local   # fill in values
npm install
npm run dev                   # → http://localhost:3000
```

---

## 6. CI/CD (GitHub Actions)

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  web:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          AI_SERVICE_URL: http://localhost:8000
          AI_SERVICE_SECRET: ci-secret
          NEXT_PUBLIC_APP_URL: http://localhost:3000

  ai:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ai
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r requirements.txt pytest
      - run: python -m pytest tests/ -v
```

---

## 7. Performance Checklist

- [ ] Enable Supabase connection pooling (PgBouncer) for high traffic
- [ ] Set `SUPABASE_MAX_ROWS=1000` guard on all list queries
- [ ] Configure pgvector index: `CREATE INDEX ON faces USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`
- [ ] Enable Vercel Edge Caching (already configured in `next.config.mjs`)
- [ ] Set event `expires_at` and add a cron job to purge expired events (Supabase pg_cron or Railway cron)

---

## 8. Security Checklist

- [ ] Rotate `AI_SERVICE_SECRET` before production — use a 32+ byte random string
- [ ] Enable Supabase RLS on all tables
- [ ] Set Supabase Storage bucket policies to restrict writes to service role only
- [ ] Add `X-Content-Type-Options: nosniff` header (add to `next.config.mjs` headers)
- [ ] Supabase: disable "Email confirmations" for guest users (they don't have email)
- [ ] Rate-limit the join endpoint (Vercel KV or middleware)

---

## 9. Monitoring

| Tool | Purpose |
|---|---|
| Vercel Analytics | Web traffic, Core Web Vitals |
| Supabase Dashboard | DB query performance, storage usage |
| Railway/Render logs | AI service errors |
| Sentry (optional) | Error tracking — add `@sentry/nextjs` |

---

*Last updated: November 2026*
