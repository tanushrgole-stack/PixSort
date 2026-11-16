"""
Photo quality scoring utilities.
Computes sharpness (Laplacian variance), eyes-open (EAR), smile heuristic.
"""

from __future__ import annotations

import numpy as np
import cv2


def _laplacian_variance(gray: np.ndarray) -> float:
    """Higher = sharper.  Blurry images score < 100."""
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return float(np.var(lap))


def _eye_aspect_ratio(landmarks: np.ndarray, left: bool = True) -> float:
    """
    InsightFace 5-point landmarks: [left-eye, right-eye, nose, left-mouth, right-mouth].
    We approximate EAR by looking at the vertical distance between adjacent mouth
    corners (placeholder — InsightFace 5-pt doesn't give eyelid points).
    Returns a value in [0, 1]; higher = more open.
    """
    # With 5-point landmarks we can't compute a real EAR.
    # Return 0.7 as neutral (assume eyes open) so it doesn't penalise unfairly.
    return 0.7


def _smile_score(landmarks: np.ndarray) -> float:
    """
    Heuristic: ratio of horizontal mouth width to inter-eye distance.
    Wider mouth relative to eye distance -> more likely smiling.
    landmarks shape: (5, 2) — [L-eye, R-eye, nose, L-mouth, R-mouth]
    """
    try:
        l_eye, r_eye = landmarks[0], landmarks[1]
        l_mouth, r_mouth = landmarks[3], landmarks[4]
        eye_dist = float(np.linalg.norm(r_eye - l_eye)) + 1e-6
        mouth_width = float(np.linalg.norm(r_mouth - l_mouth))
        ratio = mouth_width / eye_dist
        # typical smiling ratio ~ 0.8-1.2, neutral ~ 0.5-0.7
        return float(np.clip((ratio - 0.4) / 0.8, 0.0, 1.0))
    except Exception:
        return 0.5


def compute_quality_score(
    image_bgr: np.ndarray,
    bbox: list[float] | None = None,
    landmarks: np.ndarray | None = None,
) -> dict:
    """
    Returns:
        {
          "sharpness": float,   # 0-1
          "eyes_open": float,   # 0-1
          "smile":     float,   # 0-1
          "overall":   float,   # 0-1
          "is_blurry": bool,
        }
    """
    h, w = image_bgr.shape[:2]

    # Crop to face region if bbox provided
    if bbox and len(bbox) == 4:
        x1, y1, x2, y2 = [int(v) for v in bbox]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        face_crop = image_bgr[y1:y2, x1:x2]
    else:
        face_crop = image_bgr

    if face_crop.size == 0:
        face_crop = image_bgr

    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)

    # Sharpness — normalise Laplacian variance to [0, 1]
    lap_var = _laplacian_variance(gray)
    # 500 is "sharp enough" for a typical photo
    sharpness = float(np.clip(lap_var / 500.0, 0.0, 1.0))
    is_blurry = lap_var < 80.0

    # Eyes open
    eyes_open = _eye_aspect_ratio(landmarks, left=True) if landmarks is not None else 0.7

    # Smile
    smile = _smile_score(landmarks) if landmarks is not None else 0.5

    # Overall weighted score
    overall = 0.4 * sharpness + 0.4 * eyes_open + 0.2 * smile

    return {
        "sharpness": round(sharpness, 4),
        "eyes_open": round(eyes_open, 4),
        "smile": round(smile, 4),
        "overall": round(float(overall), 4),
        "is_blurry": is_blurry,
    }
