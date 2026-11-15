"""
Liveness check utilities.

We use a simple "head-turn" or "blink" challenge implemented via
browser-side MediaPipe face landmarks. This module handles the
server-side verification of the liveness proof.

Client sends:
  { "frames": [ { "yaw": float, "ear": float } ] }
  where yaw = estimated head yaw angle (°), ear = eye-aspect-ratio

Server checks:
  - At least one frame with |yaw| > YAW_THRESHOLD (head turned)
    OR at least one frame with EAR < BLINK_EAR_THRESHOLD (blink)
  - Total frames within expected range (not a replay)

This is a lightweight check — it deters casual spoofing but is not
a production-grade anti-spoofing system (which would require a dedicated
PAD model). It is "simple liveness" as specified in the project.
"""
from typing import List, Dict, Any

YAW_THRESHOLD   = 15.0   # degrees of head rotation
BLINK_THRESHOLD = 0.20   # EAR below this = blink
MIN_FRAMES      = 5
MAX_FRAMES      = 60


def verify_liveness(frames: List[Dict[str, Any]]) -> dict:
    """
    Returns { "passed": bool, "reason": str }
    frames: list of { "yaw": float, "ear": float } dicts
    """
    if not frames or len(frames) < MIN_FRAMES:
        return {"passed": False, "reason": "Too few liveness frames captured"}
    if len(frames) > MAX_FRAMES:
        return {"passed": False, "reason": "Too many frames — possible replay"}

    yaws = [abs(float(f.get("yaw", 0))) for f in frames]
    ears = [float(f.get("ear", 1.0)) for f in frames]

    turned = any(y >= YAW_THRESHOLD for y in yaws)
    blinked = any(e <= BLINK_THRESHOLD for e in ears)

    if turned or blinked:
        return {"passed": True, "reason": "ok"}

    return {
        "passed": False,
        "reason": (
            "Liveness not confirmed — please slowly turn your head or blink naturally"
        ),
    }
