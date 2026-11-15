# PixSort

> **AI-Powered Event Photo Sorting & Shared Memory Albums**  
> Host creates an event (wedding, trip, party, birthday, corporate fest), guests upload to a shared pool, and background AI extracts face embeddings to instantly build each guest their personal album.

See [PROJECT.md](PROJECT.md) for the full product specification, architecture, theme guidelines, privacy model, and phase roadmap.

---

## Repository Structure

```text
PixSort/
├── PROJECT.md          # Full project specification & roadmap
├── README.md           # Setup & run guide
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules
├── web/                # Next.js (App Router) + TypeScript + Tailwind + Framer Motion
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts  # Sunset Memories design palette
│   ├── tsconfig.json
│   └── src/
│       ├── app/            # App Router pages & layout
│       ├── lib/            # Supabase client helpers
│       └── types/          # Core TypeScript data models
└── ai/                 # Python FastAPI + InsightFace CPU service
    ├── requirements.txt
    ├── Dockerfile
    └── app/
        ├── main.py         # FastAPI application entrypoint
        ├── config.py       # Pydantic environment configuration
        ├── worker.py       # Background queue worker scaffold
        ├── api/routes.py   # Face detection & comparison endpoints
        └── services/       # InsightFace model wrapper (CPU)
```

---

## Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env` in the root (or create specific `.env.local` files):

```bash
cp .env.example .env
```

Fill in your Supabase project credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. Running the Web App (`/web`)

**Prerequisites:** Node.js 18+ (tested on Node 20 / 22) and npm/pnpm/yarn.

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

The web application will be live at [http://localhost:3000](http://localhost:3000).

---

### 3. Running the AI Service (`/ai`)

**Prerequisites:** Python 3.10+ (recommended Python 3.11).

```bash
# Navigate to ai directory
cd ai

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

#### Running the Background Worker (Scaffold)
```bash
cd ai
source venv/bin/activate
python app/worker.py
```

#### Running AI Service with Docker
```bash
cd ai
docker build -t pixsort-ai .
docker run -p 8000:8000 --env-file ../.env pixsort-ai
```

---

## Roadmap

- **Phase 1 (MVP)**: Events creation, guest join (no accounts), upload pool, background face sorting, selfie scan, personal album, ZIP download.
- **Phase 2**: Moments (sub-albums), All Photos view, People view, "Not me" corrections, duplicate cleanup, favorites.
- **Phase 3**: Best-photo ranking, timeline/map view, highlight reel, consent controls, photographer mode.
