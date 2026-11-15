from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import numpy as np
import cv2

from app.services.face_detector import face_detector

router = APIRouter(prefix="/api/v1", tags=["AI Processing"])

class CompareRequest(BaseModel):
    embedding_a: List[float] = Field(..., min_length=1)
    embedding_b: List[float] = Field(..., min_length=1)

class CompareResponse(BaseModel):
    similarity: float
    is_match: bool
    threshold: float

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "pixsort-ai",
        "model_loaded": face_detector._is_initialized
    }

@router.post("/faces/detect")
async def detect_faces(file: UploadFile = File(...)):
    """
    Accept an uploaded image file, decode it, and return extracted face embeddings & bounding boxes.
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file format")

    faces = face_detector.extract_faces(image)
    return {
        "count": len(faces),
        "faces": faces
    }

@router.post("/faces/compare", response_model=CompareResponse)
def compare_faces(request: CompareRequest):
    """
    Compute cosine similarity between two face embeddings.
    """
    from app.config import settings

    similarity = face_detector.compute_similarity(request.embedding_a, request.embedding_b)
    is_match = similarity >= settings.similarity_threshold

    return CompareResponse(
        similarity=similarity,
        is_match=is_match,
        threshold=settings.similarity_threshold
    )
