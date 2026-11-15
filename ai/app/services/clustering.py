"""
Face clustering service.
Groups detected faces within an event into 'people' records using
incremental cosine-similarity matching (no sklearn dependency).

Algorithm per event:
  1. Fetch all faces without a person_id.
  2. For each face, compare its embedding against the centroid of each
     existing cluster (person) in the event.
  3. If similarity >= threshold → assign to that cluster & update centroid.
  4. Otherwise → create a new 'people' row and start a fresh cluster.

This runs incrementally: each time new photos are processed we only cluster
unassigned faces, so it scales to thousands of photos without re-clustering all.
"""
import logging
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger("pixsort.ai.clustering")


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def cluster_faces_for_event(event_id: str, threshold: float = 0.50) -> Dict[str, int]:
    """
    Cluster unassigned faces for an event.
    Returns a summary dict: {'assigned': N, 'new_people': M}.
    """
    from app.services.db import get_db
    db = get_db()

    # ── 1. Fetch existing people + their representative embeddings ──────────
    people_res = db.table("people").select("id, name").eq("event_id", event_id).execute()
    people_rows = people_res.data or []

    # Build cluster centroids from already-assigned faces
    clusters: Dict[str, np.ndarray] = {}   # person_id → mean embedding
    clusters_count: Dict[str, int] = {}

    for p in people_rows:
        pid = p["id"]
        faces_res = (
            db.table("faces")
            .select("embedding")
            .eq("event_id", event_id)
            .eq("person_id", pid)
            .execute()
        )
        embs = [np.array(f["embedding"], dtype=np.float32) for f in (faces_res.data or [])]
        if embs:
            clusters[pid] = np.mean(embs, axis=0)
            clusters_count[pid] = len(embs)

    # ── 2. Fetch unassigned faces ────────────────────────────────────────────
    unassigned_res = (
        db.table("faces")
        .select("id, embedding, photo_id")
        .eq("event_id", event_id)
        .is_("person_id", "null")
        .execute()
    )
    unassigned = unassigned_res.data or []
    logger.info(f"[cluster] event={event_id}: {len(unassigned)} unassigned faces, "
                f"{len(clusters)} existing people")

    assigned = 0
    new_people = 0

    for face in unassigned:
        emb = np.array(face["embedding"], dtype=np.float32)
        best_pid: Optional[str] = None
        best_sim = -1.0

        for pid, centroid in clusters.items():
            sim = _cosine_sim(emb, centroid)
            if sim > best_sim:
                best_sim = sim
                best_pid = pid

        if best_pid and best_sim >= threshold:
            # Assign to existing cluster and update centroid (running mean)
            n = clusters_count[best_pid]
            clusters[best_pid] = (clusters[best_pid] * n + emb) / (n + 1)
            clusters_count[best_pid] = n + 1
            person_id = best_pid
        else:
            # Create a new person
            new_person = (
                db.table("people")
                .insert({"event_id": event_id, "name": "Unknown", "face_enrolled": False})
                .execute()
            )
            new_rows = new_person.data or []
            if not new_rows:
                logger.warning(f"[cluster] Failed to create new person for face {face['id']}")
                continue
            person_id = new_rows[0]["id"]
            clusters[person_id] = emb.copy()
            clusters_count[person_id] = 1
            new_people += 1

        db.table("faces").update({"person_id": person_id}).eq("id", face["id"]).execute()
        assigned += 1

    logger.info(f"[cluster] event={event_id}: assigned={assigned}, new_people={new_people}")
    return {"assigned": assigned, "new_people": new_people}
