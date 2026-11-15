"""
pHash (perceptual hash) utilities for duplicate detection.
Uses a pure-numpy DCT approach so there is no extra dependency beyond opencv.
Hamming distance < threshold => likely duplicate.
"""
import numpy as np
import cv2
import logging

logger = logging.getLogger("pixsort.ai.phash")

HASH_SIZE = 8          # Produces a 64-bit hash (8×8 DCT block)
HIGHFREQ_FACTOR = 4    # Input image is resized to hash_size * highfreq_factor


def compute_phash(image_bgr: np.ndarray) -> str:
    """
    Compute a 64-bit perceptual hash as a 16-char hex string.
    Returns empty string on error.
    """
    try:
        size = HASH_SIZE * HIGHFREQ_FACTOR                     # 32 × 32
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (size, size), interpolation=cv2.INTER_AREA)
        img_float = resized.astype(np.float32)

        # 2-D DCT via two 1-D DCTs
        dct = cv2.dct(img_float)
        dct_low = dct[:HASH_SIZE, :HASH_SIZE]

        # Median threshold (exclude the DC component at [0,0])
        flat = dct_low.flatten()
        median = np.median(flat[1:])

        bits = (flat >= median).astype(np.uint8)
        # Pack 64 bits into 8 bytes → 16 hex chars
        packed = np.packbits(bits)
        return packed.tobytes().hex()
    except Exception as e:
        logger.warning(f"pHash computation failed: {e}")
        return ""


def hamming_distance(hash_a: str, hash_b: str) -> int:
    """Hamming distance between two hex phash strings. Returns 999 on error."""
    try:
        if len(hash_a) != len(hash_b) or not hash_a:
            return 999
        a = int(hash_a, 16)
        b = int(hash_b, 16)
        xor = a ^ b
        return bin(xor).count("1")
    except Exception:
        return 999


def is_duplicate(hash_a: str, hash_b: str, threshold: int = 8) -> bool:
    return hamming_distance(hash_a, hash_b) <= threshold
