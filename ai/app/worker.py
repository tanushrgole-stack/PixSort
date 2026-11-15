"""
Robust background queue worker.

Polls Supabase for photos with status='pending', processes them in batches,
and handles failures gracefully so one bad photo never blocks the queue.

Restart-safe: on startup any photos stuck in status='processing' (from a
previous crash) are reset back to 'pending' so they are retried.

Concurrency: single-threaded to stay within CPU InsightFace constraints.
batch_size controls how many photos are pulled per poll cycle.
"""
import time
import logging
import signal
import sys

from app.services.face_detector import face_detector
from app.services.processor import process_photo
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pixsort.ai.worker")

_running = True


def _handle_signal(sig, frame):
    global _running
    logger.info(f"Worker received signal {sig}, shutting down gracefully…")
    _running = False


def _reset_stuck_photos(db) -> int:
    """Reset any photos stuck in 'processing' back to 'pending' on startup."""
    res = (
        db.table("photos")
        .update({"status": "pending"})
        .eq("status", "processing")
        .execute()
    )
    count = len(res.data or [])
    if count:
        logger.info(f"[worker] Reset {count} stuck 'processing' photo(s) to 'pending'.")
    return count


def _fetch_pending_batch(db, batch_size: int) -> list:
    res = (
        db.table("photos")
        .select("id, event_id, storage_path")
        .eq("status", "pending")
        .order("created_at")
        .limit(batch_size)
        .execute()
    )
    return res.data or []


def _get_retry_count(db, photo_id: str) -> int:
    """Read retry count from a lightweight meta column (we reuse phash prefix 'retry:N')."""
    res = db.table("photos").select("phash").eq("id", photo_id).single().execute()
    phash = (res.data or {}).get("phash", "") or ""
    if phash.startswith("retry:"):
        try:
            return int(phash.split(":")[1])
        except ValueError:
            pass
    return 0


def _increment_retry(db, photo_id: str, current: int):
    db.table("photos").update({"phash": f"retry:{current + 1}"}).eq("id", photo_id).execute()


def process_batch(db, batch: list) -> dict:
    success = failed = skipped = 0
    for photo in batch:
        pid = photo["id"]
        retries = _get_retry_count(db, pid)
        if retries >= settings.worker_max_retries:
            logger.warning(f"[worker] Photo {pid} exceeded max retries, marking failed.")
            db.table("photos").update({"status": "failed"}).eq("id", pid).execute()
            skipped += 1
            continue
        try:
            result = process_photo(pid)
            if result["status"] == "done":
                success += 1
            else:
                _increment_retry(db, pid, retries)
                failed += 1
        except Exception as exc:
            logger.error(f"[worker] Unhandled error for photo {pid}: {exc}", exc_info=True)
            _increment_retry(db, pid, retries)
            # Reset to pending so it will be retried
            db.table("photos").update({"status": "pending"}).eq("id", pid).execute()
            failed += 1
    return {"success": success, "failed": failed, "skipped": skipped}


def run_worker_loop():
    global _running

    signal.signal(signal.SIGINT,  _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    logger.info("═══════════════════════════════════════")
    logger.info("   PixSort AI Worker starting up…      ")
    logger.info("═══════════════════════════════════════")

    # Load InsightFace model
    face_detector.load_model()

    # Connect to Supabase
    try:
        from app.services.db import get_db
        db = get_db()
    except RuntimeError as e:
        logger.error(f"[worker] Cannot connect to Supabase: {e}")
        logger.warning("[worker] Running without DB — processing loop will be a no-op.")
        db = None

    # Reset stuck photos
    if db:
        _reset_stuck_photos(db)

    logger.info(
        f"[worker] Starting poll loop | batch={settings.worker_batch_size} | "
        f"interval={settings.worker_poll_interval}s | "
        f"model={'loaded' if face_detector._is_initialized else 'stub'}"
    )

    idle_logged = False
    while _running:
        if db is None:
            time.sleep(settings.worker_poll_interval)
            continue

        batch = _fetch_pending_batch(db, settings.worker_batch_size)

        if not batch:
            if not idle_logged:
                logger.info("[worker] Queue empty, waiting for new photos…")
                idle_logged = True
            time.sleep(settings.worker_poll_interval)
            continue

        idle_logged = False
        logger.info(f"[worker] Processing batch of {len(batch)} photo(s)…")
        stats = process_batch(db, batch)
        logger.info(
            f"[worker] Batch done | success={stats['success']} "
            f"failed={stats['failed']} skipped={stats['skipped']}"
        )
        # Short sleep between batches to avoid hammering the CPU
        time.sleep(0.5)

    logger.info("[worker] Exited cleanly.")


if __name__ == "__main__":
    run_worker_loop()
