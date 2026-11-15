"""
Core photo processing pipeline.

process_photo(photo_id):
  1. Fetch photo record + public storage URL.
  2. Download image bytes.
  3. Decode with OpenCV.
  4. Compute pHash.
  5. Run InsightFace detection → 512-d embeddings + bboxes.
  6. Upsert face rows into Supabase.
  7. Update photo status → 'done'.
  8. Trigger incremental face clustering for the event.
  9. Flag duplicates by pHash within the event.
"""
import io
import logging
import httpx
import numpy as np
import cv2

from app.services.db import get_db
from app.services.face_detector import face_detector
from app.services.phash import compute_phash, is_duplicate
from app.services.clustering import cluster_faces_for_event
from app.config import settings

logger = logging.getLogger("pixsort.ai.processor")


def _download_image(url: str) -> np.ndarray | None:
    try:
        resp = httpx.get(url, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        nparr = np.frombuffer(resp.content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Download failed for {url}: {e}")
        return None


def _flag_duplicates(photo_id: str, event_id: str, phash: str) -> None:
    """
    Compare this photo's phash against all other photos in the event.
    Mark duplicates in the DB via a 'is_duplicate' flag stored as metadata
    in the photos.phash field (we reuse it as a prefix dup:<original_id>
    for duplicates). The original (first uploaded) wins.
    """
    if not phash:
        return
    db = get_db()
    # Fetch all existing phashes for this event (excluding current photo)
    res = (
        db.table("photos")
        .select("id, phash")
        .eq("event_id", event_id)
        .neq("id", photo_id)
        .not_.is_("phash", "null")
        .execute()
    )
    for row in res.data or []:
        existing_hash = row.get("phash", "")
        if existing_hash.startswith("dup:"):
            continue  # already a duplicate itself
        if is_duplicate(phash, existing_hash, threshold=settings.phash_dup_threshold):
            # Mark current photo as duplicate of the original
            db.table("photos").update(
                {"phash": f"dup:{row['id']}"}
            ).eq("id", photo_id).execute()
            logger.info(f"[processor] Photo {photo_id} flagged as dup of {row['id']}")
            return


def process_photo(photo_id: str) -> dict:
    """
    Full processing pipeline for one photo.
    Returns a result dict: {status, faces_found, is_dup, error?}
    """
    db = get_db()

    # ── 1. Fetch photo record ───────────────────────────────────────────────
    res = db.table("photos").select("*").eq("id", photo_id).single().execute()
    photo = res.data
    if not photo:
        return {"status": "failed", "error": f"Photo {photo_id} not found"}

    event_id = photo["event_id"]
    storage_path = photo["storage_path"]

    # ── 2. Mark as processing ───────────────────────────────────────────────
    db.table("photos").update({"status": "processing"}).eq("id", photo_id).execute()

    # ── 3. Build public URL & download ─────────────────────────────────────
    # Supabase storage public URL pattern
    storage_url = (
        f"{settings.supabase_url}/storage/v1/object/public/{storage_path}"
    )
    img = _download_image(storage_url)
    if img is None:
        db.table("photos").update({"status": "failed"}).eq("id", photo_id).execute()
        return {"status": "failed", "error": "Could not download image"}

    h, w = img.shape[:2]

    # ── 4. pHash ────────────────────────────────────────────────────────────
    phash = compute_phash(img)

    # ── 5. Face detection ───────────────────────────────────────────────────
    faces = face_detector.extract_faces(img) if face_detector._is_initialized else []

    # ── 6. Insert face rows ─────────────────────────────────────────────────
    face_rows = []
    for face in faces:
        face_rows.append({
            "photo_id":   photo_id,
            "event_id":   event_id,
            "embedding":  face["embedding"],   # list[float] 512-d
            "bbox":       face["bbox"],
            "confidence": face["confidence"],
        })

    if face_rows:
        db.table("faces").insert(face_rows).execute()

    # ── 7. Update photo record ──────────────────────────────────────────────
    db.table("photos").update({
        "status": "done",
        "phash":  phash,
        "width":  w,
        "height": h,
    }).eq("id", photo_id).execute()

    # ── 8. Incremental face clustering ──────────────────────────────────────
    if face_rows:
        try:
            cluster_faces_for_event(event_id, threshold=settings.clustering_threshold)
        except Exception as e:
            logger.warning(f"[processor] Clustering error after photo {photo_id}: {e}")

    # ── 9. Duplicate flagging ───────────────────────────────────────────────
    _flag_duplicates(photo_id, event_id, phash)

    logger.info(
        f"[processor] photo={photo_id} done | faces={len(face_rows)} | "
        f"dup={'yes' if phash.startswith('dup:') else 'no'}"
    )
    return {
        "status": "done",
        "faces_found": len(face_rows),
        "phash": phash,
        "width": w,
        "height": h,
    }
