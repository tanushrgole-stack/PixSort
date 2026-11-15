from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Form
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import numpy as np
import cv2
import json
import logging

from app.services.face_detector import face_detector
from app.services.clustering import cluster_faces_for_event
from app.services.enrollment import enroll_selfie, confirm_enrollment
from app.services.liveness import verify_liveness

logger = logging.getLogger("pixsort.ai.routes")
router = APIRouter(prefix="/api/v1", tags=["AI Processing"])


# ─────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────

class CompareRequest(BaseModel):
    embedding_a: List[float] = Field(..., min_length=1)
    embedding_b: List[float] = Field(..., min_length=1)

class CompareResponse(BaseModel):
    similarity: float
    is_match: bool
    threshold: float

class ProcessRequest(BaseModel):
    photo_id: str

class ProcessResponse(BaseModel):
    photo_id: str
    status: str
    faces_found: int = 0
    phash: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    error: Optional[str] = None

class ClusterRequest(BaseModel):
    event_id: str
    threshold: Optional[float] = None

class ProgressResponse(BaseModel):
    event_id: str
    total: int
    done: int
    pending: int
    processing: int
    failed: int
    percent: float

class ConfirmEnrollmentRequest(BaseModel):
    user_id: str
    event_id: str
    person_id: str
    selfie_embedding: List[float]

class LivenessFrame(BaseModel):
    yaw: float = 0.0
    ear: float = 1.0

class LivenessRequest(BaseModel):
    frames: List[LivenessFrame]

class FaceReportRequest(BaseModel):
    face_id: str
    photo_id: str
    event_id: str
    reporter_id: str
    person_id: Optional[str] = None
    kind: str  # "not_me" | "add_me"


# ─────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "pixsort-ai",
        "model_loaded": face_detector._is_initialized,
    }


# ─────────────────────────────────────────────────────────────
# POST /process — synchronous single-photo processing
# ─────────────────────────────────────────────────────────────

@router.post("/process", response_model=ProcessResponse)
def process_photo_endpoint(req: ProcessRequest):
    """
    Synchronously process one photo: download → faces → phash → cluster → DB update.
    Intended for small batches or manual triggers; bulk work is done by the worker.
    """
    from app.services.processor import process_photo
    result = process_photo(req.photo_id)
    return ProcessResponse(photo_id=req.photo_id, **result)


# ─────────────────────────────────────────────────────────────
# POST /cluster — trigger incremental face clustering
# ─────────────────────────────────────────────────────────────

@router.post("/cluster")
def cluster_endpoint(req: ClusterRequest):
    """Re-run incremental face clustering for an event."""
    from app.config import settings
    threshold = req.threshold or settings.clustering_threshold
    result = cluster_faces_for_event(req.event_id, threshold=threshold)
    return {"event_id": req.event_id, **result}


# ─────────────────────────────────────────────────────────────
# GET /progress/{event_id} — "Sorted X / Y photos"
# ─────────────────────────────────────────────────────────────

@router.get("/progress/{event_id}", response_model=ProgressResponse)
def get_processing_progress(event_id: str):
    try:
        from app.services.db import get_db
        db = get_db()
    except RuntimeError:
        raise HTTPException(503, detail="Database not configured")

    res = (
        db.table("photos")
        .select("status")
        .eq("event_id", event_id)
        .execute()
    )
    rows = res.data or []
    total = len(rows)
    counts = {"pending": 0, "processing": 0, "done": 0, "failed": 0}
    for r in rows:
        s = r.get("status", "pending")
        counts[s] = counts.get(s, 0) + 1

    done = counts["done"]
    percent = round((done / total * 100) if total > 0 else 0.0, 1)

    return ProgressResponse(
        event_id=event_id,
        total=total,
        done=done,
        pending=counts["pending"],
        processing=counts["processing"],
        failed=counts["failed"],
        percent=percent,
    )


# ─────────────────────────────────────────────────────────────
# POST /liveness/verify — verify liveness frames from browser
# ─────────────────────────────────────────────────────────────

@router.post("/liveness/verify")
def liveness_verify(req: LivenessRequest):
    """
    Verify a liveness challenge. Called with head-turn / blink frame data
    captured on the client via the camera. Returns { passed, reason }.
    """
    frames = [f.model_dump() for f in req.frames]
    result = verify_liveness(frames)
    return result


# ─────────────────────────────────────────────────────────────
# POST /enroll — selfie → embedding → match / candidates
# ─────────────────────────────────────────────────────────────

@router.post("/enroll")
async def enroll_endpoint(
    file: UploadFile = File(...),
    event_id: str = Form(...),
    user_id: str = Form(...),
):
    """
    Accept a selfie image and attempt face enrollment.
    Returns one of:
      { status: "linked", person_id, similarity }
      { status: "candidates", candidates: [{person_id, name, similarity, face_thumb}], selfie_embedding }
      { status: "new_person", person_id }
      { status: "error", error }
    The raw selfie image is never persisted — only the embedding is stored.
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(400, detail="Invalid image file")

    result = enroll_selfie(image, event_id, user_id)
    return result


# ─────────────────────────────────────────────────────────────
# POST /enroll/confirm — user picks a candidate
# ─────────────────────────────────────────────────────────────

@router.post("/enroll/confirm")
def confirm_enrollment_endpoint(req: ConfirmEnrollmentRequest):
    """
    Called when the user picks their face from the candidate list.
    Links user_id → person_id and re-runs face matching.
    """
    result = confirm_enrollment(
        req.user_id,
        req.event_id,
        req.person_id,
        req.selfie_embedding,
    )
    return result


# ─────────────────────────────────────────────────────────────
# POST /faces/report — "not me" / "add me"
# ─────────────────────────────────────────────────────────────

@router.post("/faces/report")
def report_face(req: FaceReportRequest):
    """
    Flag a face as 'not_me' (wrong match) or 'add_me' (missed match).
    For 'not_me': unlinks the face from the person.
    For 'add_me':  assigns the face to the reporter's person.
    Records the report in face_reports for host review.
    """
    if req.kind not in ("not_me", "add_me"):
        raise HTTPException(400, detail="kind must be 'not_me' or 'add_me'")

    try:
        from app.services.db import get_db
        db = get_db()
    except RuntimeError:
        raise HTTPException(503, detail="Database not configured")

    # Record the report
    db.table("face_reports").insert({
        "face_id":     req.face_id,
        "photo_id":    req.photo_id,
        "event_id":    req.event_id,
        "reporter_id": req.reporter_id,
        "person_id":   req.person_id,
        "kind":        req.kind,
    }).execute()

    if req.kind == "not_me":
        # Remove wrong person assignment
        db.table("faces").update({"person_id": None}).eq("id", req.face_id).execute()
        return {"updated": True, "action": "face_unlinked"}

    elif req.kind == "add_me":
        # Find the reporter's person record for this event
        if not req.person_id:
            raise HTTPException(400, detail="person_id required for add_me")
        db.table("faces").update({"person_id": req.person_id}).eq("id", req.face_id).execute()
        return {"updated": True, "action": "face_assigned"}


# ─────────────────────────────────────────────────────────────
# POST /faces/detect — raw image upload → embeddings
# ─────────────────────────────────────────────────────────────

@router.post("/faces/detect")
async def detect_faces(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(400, detail="Invalid image file")
    faces = face_detector.extract_faces(image)
    return {"count": len(faces), "faces": faces}


# ─────────────────────────────────────────────────────────────
# POST /faces/compare — cosine similarity
# ─────────────────────────────────────────────────────────────

@router.post("/faces/compare", response_model=CompareResponse)
def compare_faces(request: CompareRequest):
    from app.config import settings
    similarity = face_detector.compute_similarity(request.embedding_a, request.embedding_b)
    return CompareResponse(
        similarity=similarity,
        is_match=similarity >= settings.similarity_threshold,
        threshold=settings.similarity_threshold,
    )
