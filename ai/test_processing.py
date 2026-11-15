#!/usr/bin/env python3
"""
test_processing.py — seed 50 sample photos and run the AI processing pipeline.

Usage:
  cd ai
  python test_processing.py

What it does:
  1. Downloads 50 free sample images from picsum.photos (JPEGs).
  2. Uploads each to Supabase storage under the seed wedding event.
  3. Inserts photo DB rows with status='pending'.
  4. Runs process_photo() on each one (synchronously) and prints results.
  5. Runs face clustering at the end.
  6. Prints a final progress summary.

Requires:
  - .env with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  - venv activated with requirements.txt installed
  - InsightFace model downloaded (or will run in stub mode)
"""

import sys
import time
import httpx
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pixsort.test")

# ── Load .env ────────────────────────────────────────────────────────────────
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

from app.config import settings
from app.services.db import get_db
from app.services.face_detector import face_detector
from app.services.processor import process_photo
from app.services.clustering import cluster_faces_for_event

SEED_EVENT_ID = "10000000-0000-0000-0000-000000000001"
SEED_USER_ID  = "00000000-0000-0000-0000-000000000001"
BUCKET        = "photos"
NUM_PHOTOS    = 50
IMAGE_SIZE    = 400   # picsum image dimension


def download_sample_image(index: int) -> bytes | None:
    url = f"https://picsum.photos/seed/{index}/{IMAGE_SIZE}/{IMAGE_SIZE}"
    try:
        resp = httpx.get(url, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        return resp.content
    except Exception as e:
        logger.error(f"Failed to download image {index}: {e}")
        return None


def upload_to_supabase(db, content: bytes, path: str) -> bool:
    try:
        db.storage.from_(BUCKET).upload(
            path,
            content,
            {"content-type": "image/jpeg", "x-upsert": "true"},
        )
        return True
    except Exception as e:
        logger.error(f"Storage upload failed for {path}: {e}")
        return False


def insert_photo_record(db, storage_path: str) -> str | None:
    res = db.table("photos").insert({
        "event_id":     SEED_EVENT_ID,
        "uploaded_by":  SEED_USER_ID,
        "storage_path": f"{BUCKET}/{storage_path}",
        "status":       "pending",
    }).execute()
    rows = res.data or []
    return rows[0]["id"] if rows else None


def main():
    logger.info("═══════════════════════════════════════════")
    logger.info("   PixSort — Processing Pipeline Test      ")
    logger.info(f"   Seeding {NUM_PHOTOS} sample photos…    ")
    logger.info("═══════════════════════════════════════════")

    # Validate config
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.error(
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
        )
        sys.exit(1)

    db = get_db()
    face_detector.load_model()

    photo_ids: list[str] = []

    # ── Phase 1: Download + upload + insert ──────────────────────────────────
    logger.info(f"\n[Phase 1] Downloading and uploading {NUM_PHOTOS} images…\n")
    for i in range(1, NUM_PHOTOS + 1):
        logger.info(f"  [{i:02d}/{NUM_PHOTOS}] Downloading picsum seed {i}…")
        content = download_sample_image(i)
        if content is None:
            continue

        storage_path = f"{SEED_EVENT_ID}/{SEED_USER_ID}/test_{i:03d}.jpg"

        if not upload_to_supabase(db, content, storage_path):
            continue

        photo_id = insert_photo_record(db, storage_path)
        if photo_id:
            photo_ids.append(photo_id)
            logger.info(f"           ✓ photo_id={photo_id}")
        else:
            logger.warning(f"           ✗ failed to insert DB record for image {i}")

    logger.info(f"\n  Inserted {len(photo_ids)} photo records.\n")

    # ── Phase 2: Run processing pipeline ────────────────────────────────────
    logger.info(f"[Phase 2] Running face detection + phash on {len(photo_ids)} photos…\n")
    results = {"done": 0, "failed": 0, "total_faces": 0, "dups": 0}

    for idx, photo_id in enumerate(photo_ids, 1):
        t0 = time.time()
        result = process_photo(photo_id)
        elapsed = time.time() - t0

        status = result.get("status", "failed")
        faces  = result.get("faces_found", 0)
        phash  = result.get("phash", "")
        is_dup = phash.startswith("dup:") if phash else False

        logger.info(
            f"  [{idx:02d}/{len(photo_ids)}] id={photo_id[:8]}… | "
            f"status={status} | faces={faces} | dup={'yes' if is_dup else 'no'} | "
            f"{elapsed:.1f}s"
        )
        if status == "done":
            results["done"] += 1
            results["total_faces"] += faces
            if is_dup:
                results["dups"] += 1
        else:
            results["failed"] += 1

    # ── Phase 3: Final clustering pass ───────────────────────────────────────
    logger.info(f"\n[Phase 3] Running face clustering for event {SEED_EVENT_ID}…\n")
    cluster_result = cluster_faces_for_event(
        SEED_EVENT_ID,
        threshold=settings.clustering_threshold,
    )

    # ── Summary ──────────────────────────────────────────────────────────────
    logger.info("\n═══════════════════════════════════════════")
    logger.info("   Test Results")
    logger.info("═══════════════════════════════════════════")
    logger.info(f"  Photos uploaded :  {len(photo_ids)}")
    logger.info(f"  Processed OK    :  {results['done']}")
    logger.info(f"  Failed          :  {results['failed']}")
    logger.info(f"  Faces detected  :  {results['total_faces']}")
    logger.info(f"  Duplicates      :  {results['dups']}")
    logger.info(f"  Faces clustered :  {cluster_result.get('assigned', 0)}")
    logger.info(f"  New people      :  {cluster_result.get('new_people', 0)}")
    logger.info("═══════════════════════════════════════════")


if __name__ == "__main__":
    main()
