"""
Face enrollment service.

enroll_selfie(image_np, event_id, user_id):
  1. Run InsightFace detection on the selfie (must detect exactly 1 face).
  2. Compare the 512-d embedding against all existing people in the event.
  3. If best similarity >= HIGH_CONF: auto-link user → person.
  4. If MEDIUM_CONF <= best < HIGH_CONF: return top-3 candidates for user to pick.
  5. If best < MEDIUM_CONF: create a new person record and link.
  6. Store the embedding on the person record (avg with existing if already enrolled).
  7. Never persist the raw selfie — only the embedding is saved.
  8. After linking, re-assign all unlinked faces in the event that match this user.

re_match_after_upload(event_id, person_id):
  For each newly processed photo's faces, re-run similarity against the
  enrolled embedding and assign person_id if above threshold.
  Called from the worker after photo processing completes.
"""
import logging
from typing import Optional
import numpy as np

logger = logging.getLogger("pixsort.ai.enrollment")

HIGH_CONF   = 0.70   # auto-link
MEDIUM_CONF = 0.50   # show candidates
TOP_N       = 3      # number of candidates to surface


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def _get_person_embedding(db, person_id: str, event_id: str) -> Optional[np.ndarray]:
    """Return mean embedding of all faces assigned to this person."""
    res = (
        db.table("faces")
        .select("embedding")
        .eq("event_id", event_id)
        .eq("person_id", person_id)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return None
    embs = [np.array(r["embedding"], dtype=np.float32) for r in rows]
    return np.mean(embs, axis=0)


def _update_person_embedding_centroid(db, person_id: str, event_id: str, new_emb: np.ndarray):
    """
    After linking a user, we don't store the selfie embedding separately —
    we just rely on the face rows already in the DB.
    This function is a no-op here; centroid is recomputed on demand.
    """
    pass


def enroll_selfie(
    image_np: np.ndarray,
    event_id: str,
    user_id: str,
) -> dict:
    """
    Returns one of:
      { "status": "linked", "person_id": "...", "similarity": 0.82 }
      { "status": "candidates", "candidates": [{person_id, name, similarity, face_thumb}, ...] }
      { "status": "new_person", "person_id": "..." }
      { "status": "error", "error": "..." }
    """
    from app.services.face_detector import face_detector
    from app.services.db import get_db

    db = get_db()

    # ── 1. Detect face in selfie ─────────────────────────────────────────────
    if not face_detector._is_initialized:
        return {"status": "error", "error": "AI model not loaded"}

    faces = face_detector.extract_faces(image_np)
    if len(faces) == 0:
        return {"status": "error", "error": "No face detected in selfie. Please retake."}
    if len(faces) > 1:
        return {"status": "error", "error": "Multiple faces detected. Please use a solo selfie."}

    selfie_emb = np.array(faces[0]["embedding"], dtype=np.float32)
    confidence = faces[0]["confidence"]

    # ── 2. Check if already enrolled ────────────────────────────────────────
    existing_person = (
        db.table("people")
        .select("id")
        .eq("event_id", event_id)
        .eq("user_id", user_id)
        .execute()
    )
    if existing_person.data:
        # Already enrolled — re-run re-match and return
        person_id = existing_person.data[0]["id"]
        _re_match_faces(db, event_id, person_id, selfie_emb)
        return {"status": "linked", "person_id": person_id, "similarity": 1.0, "already_enrolled": True}

    # ── 3. Load all existing people and compute similarities ─────────────────
    people_res = (
        db.table("people")
        .select("id, name, face_thumbnail_path, opted_out")
        .eq("event_id", event_id)
        .eq("opted_out", False)
        .execute()
    )
    people = people_res.data or []

    scored = []
    for p in people:
        centroid = _get_person_embedding(db, p["id"], event_id)
        if centroid is None:
            continue
        sim = _cosine_sim(selfie_emb, centroid)
        scored.append({
            "person_id":  p["id"],
            "name":       p["name"],
            "face_thumb": p.get("face_thumbnail_path"),
            "similarity": round(sim, 4),
        })

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    best = scored[0] if scored else None

    # ── 4. Auto-link if high confidence ─────────────────────────────────────
    if best and best["similarity"] >= HIGH_CONF:
        person_id = best["person_id"]
        _link_user_to_person(db, event_id, user_id, person_id, selfie_emb)
        return {
            "status":     "linked",
            "person_id":  person_id,
            "similarity": best["similarity"],
        }

    # ── 5. Show candidates if medium confidence ──────────────────────────────
    if best and best["similarity"] >= MEDIUM_CONF:
        candidates = scored[:TOP_N]
        # Store candidates in DB for the user to pick
        db.table("enrollment_candidates").delete().eq("user_id", user_id).eq("event_id", event_id).execute()
        for rank, c in enumerate(candidates, 1):
            db.table("enrollment_candidates").insert({
                "user_id":    user_id,
                "event_id":   event_id,
                "person_id":  c["person_id"],
                "similarity": c["similarity"],
                "rank":       rank,
            }).execute()
        return {
            "status":     "candidates",
            "candidates": candidates,
            "selfie_embedding": selfie_emb.tolist(),  # returned to client for pick confirmation
        }

    # ── 6. Create new person ─────────────────────────────────────────────────
    user_res = db.table("users").select("name").eq("id", user_id).single().execute()
    user_name = (user_res.data or {}).get("name", "Guest")

    new_person = (
        db.table("people")
        .insert({
            "event_id":     event_id,
            "user_id":      user_id,
            "name":         user_name,
            "face_enrolled": True,
        })
        .execute()
    )
    if not new_person.data:
        return {"status": "error", "error": "Failed to create person record"}

    person_id = new_person.data[0]["id"]

    # Insert a synthetic face row for the selfie embedding (no photo, no bbox)
    # This anchors the cluster without storing the selfie image.
    # We use a sentinel photo_id approach: we insert with a null bbox
    db.table("faces").insert({
        "photo_id":   None,  # no source photo — just the enrollment embedding
        "event_id":   event_id,
        "embedding":  selfie_emb.tolist(),
        "bbox":       {"x": 0, "y": 0, "width": 0, "height": 0},
        "person_id":  person_id,
        "confidence": float(confidence),
    }).execute()

    # Trigger re-match of existing unassigned faces
    _re_match_faces(db, event_id, person_id, selfie_emb)

    return {"status": "new_person", "person_id": person_id}


def confirm_enrollment(
    user_id: str,
    event_id: str,
    person_id: str,
    selfie_embedding: list,
) -> dict:
    """
    Called when the user picks a candidate from the disambiguation UI.
    Links user → person and cleans up enrollment_candidates.
    """
    from app.services.db import get_db
    db = get_db()

    selfie_emb = np.array(selfie_embedding, dtype=np.float32)
    _link_user_to_person(db, event_id, user_id, person_id, selfie_emb)
    db.table("enrollment_candidates").delete().eq("user_id", user_id).eq("event_id", event_id).execute()
    return {"status": "linked", "person_id": person_id}


def _link_user_to_person(db, event_id: str, user_id: str, person_id: str, selfie_emb: np.ndarray):
    """Update people row, insert selfie embedding, re-match faces."""
    db.table("people").update({
        "user_id":      user_id,
        "face_enrolled": True,
    }).eq("id", person_id).execute()

    # Insert selfie embedding as an anchor face row
    db.table("faces").insert({
        "photo_id":   None,
        "event_id":   event_id,
        "embedding":  selfie_emb.tolist(),
        "bbox":       {"x": 0, "y": 0, "width": 0, "height": 0},
        "person_id":  person_id,
        "confidence": 1.0,
    }).execute()

    _re_match_faces(db, event_id, person_id, selfie_emb)


def _re_match_faces(db, event_id: str, person_id: str, enrolled_emb: np.ndarray):
    """
    After enrollment, scan all unassigned faces in this event and assign
    any that are close enough to the enrolled embedding.
    """
    from app.config import settings
    threshold = settings.clustering_threshold

    unassigned_res = (
        db.table("faces")
        .select("id, embedding")
        .eq("event_id", event_id)
        .is_("person_id", "null")
        .execute()
    )
    for face in (unassigned_res.data or []):
        emb = np.array(face["embedding"], dtype=np.float32)
        sim = _cosine_sim(enrolled_emb, emb)
        if sim >= threshold:
            db.table("faces").update({"person_id": person_id}).eq("id", face["id"]).execute()
            logger.debug(f"[enroll] Re-matched face {face['id']} → person {person_id} (sim={sim:.3f})")
