import logging
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger("pixsort.ai.face_detector")

class FaceDetectorService:
    def __init__(self, model_name: str = "buffalo_l", det_thresh: float = 0.6):
        self.model_name = model_name
        self.det_thresh = det_thresh
        self.app = None
        self._is_initialized = False

    def load_model(self) -> None:
        """Initialize the InsightFace FaceAnalysis application using CPU execution."""
        if self._is_initialized:
            return

        try:
            from insightface.app import FaceAnalysis

            logger.info(f"Loading InsightFace model '{self.model_name}' on CPU...")
            self.app = FaceAnalysis(
                name=self.model_name,
                providers=["CPUExecutionProvider"]
            )
            self.app.prepare(ctx_id=-1, det_thresh=self.det_thresh)
            self._is_initialized = True
            logger.info("InsightFace model initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not load InsightFace model: {e}. Running in stub mode.")
            self._is_initialized = False

    def extract_faces(self, image_np: np.ndarray) -> List[Dict[str, Any]]:
        """
        Extract bounding boxes and 512-d normalized face embeddings from an image.
        Returns empty list if model is not loaded or no faces detected.
        """
        if not self._is_initialized or self.app is None:
            logger.warning("Face analysis model is not initialized.")
            return []

        faces = self.app.get(image_np)
        results = []
        for face in faces:
            bbox = face.bbox.astype(int).tolist()
            embedding = face.normed_embedding.tolist()
            confidence = float(face.det_score)

            results.append({
                "bbox": {
                    "x": bbox[0],
                    "y": bbox[1],
                    "width": bbox[2] - bbox[0],
                    "height": bbox[3] - bbox[1],
                },
                "embedding": embedding,
                "confidence": confidence,
            })
        return results

    def compute_similarity(self, embedding_a: List[float], embedding_b: List[float]) -> float:
        """Compute cosine similarity between two normalized 512-d embeddings."""
        a = np.array(embedding_a, dtype=np.float32)
        b = np.array(embedding_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

face_detector = FaceDetectorService()
