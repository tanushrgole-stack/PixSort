from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np
import cv2
import logging

from app.services.face_detector import face_detector
from app.services.clustering import cluster_faces_for_event

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
    """
    Returns processing progress counts for an event.
    Used to display 'Sorted X / Y photos' in the UI.
    """
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
