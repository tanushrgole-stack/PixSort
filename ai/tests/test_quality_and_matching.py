"""
Tests for the AI quality scoring and face matching utilities.
Run with: cd ai && python -m pytest tests/ -v
"""

import numpy as np
import pytest
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ─── Import modules under test ─────────────────────────────────────────────────

from app.services.quality import compute_quality_score


# ─── Quality scoring tests ─────────────────────────────────────────────────────

class TestComputeQualityScore:
    def _solid_image(self, h=100, w=100, value=128):
        """Create a solid grey image (blurry by definition)."""
        return np.full((h, w, 3), value, dtype=np.uint8)

    def _sharp_image(self, h=100, w=100):
        """Create a checkerboard (high Laplacian variance = sharp)."""
        img = np.zeros((h, w, 3), dtype=np.uint8)
        img[::2, ::2] = 255
        img[1::2, 1::2] = 255
        return img

    def test_returns_required_keys(self):
        img = self._solid_image()
        result = compute_quality_score(img)
        assert set(result.keys()) == {'sharpness', 'eyes_open', 'smile', 'overall', 'is_blurry'}

    def test_solid_image_is_blurry(self):
        img = self._solid_image()
        result = compute_quality_score(img)
        assert result['is_blurry'] is True

    def test_checkerboard_not_blurry(self):
        img = self._sharp_image()
        result = compute_quality_score(img)
        assert result['is_blurry'] is False

    def test_overall_in_range(self):
        img = self._solid_image()
        result = compute_quality_score(img)
        assert 0.0 <= result['overall'] <= 1.0

    def test_sharp_image_higher_sharpness_than_blurry(self):
        blurry = self._solid_image()
        sharp = self._sharp_image()
        r_blurry = compute_quality_score(blurry)
        r_sharp = compute_quality_score(sharp)
        assert r_sharp['sharpness'] > r_blurry['sharpness']

    def test_bbox_crop_still_returns_dict(self):
        img = self._solid_image(200, 200)
        result = compute_quality_score(img, bbox=[50, 50, 150, 150])
        assert 'overall' in result

    def test_empty_bbox_fallback(self):
        img = self._solid_image()
        # Zero-size bbox should fall back to full image
        result = compute_quality_score(img, bbox=[0, 0, 0, 0])
        assert isinstance(result['overall'], float)

    def test_scores_are_floats(self):
        img = self._solid_image()
        result = compute_quality_score(img)
        for key in ('sharpness', 'eyes_open', 'smile', 'overall'):
            assert isinstance(result[key], float)

    def test_scores_rounded_to_4dp(self):
        img = self._solid_image()
        result = compute_quality_score(img)
        for key in ('sharpness', 'eyes_open', 'smile', 'overall'):
            # 4 decimal places
            assert result[key] == round(result[key], 4)


# ─── Cosine similarity helpers ─────────────────────────────────────────────────

def cosine_similarity(a, b):
    a, b = np.array(a, dtype=float), np.array(b, dtype=float)
    norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


class TestCosineSimilarity:
    def test_identical_vectors(self):
        v = [1, 2, 3, 4, 5]
        assert pytest.approx(cosine_similarity(v, v), abs=1e-6) == 1.0

    def test_opposite_vectors(self):
        assert pytest.approx(cosine_similarity([1, 0, 0], [-1, 0, 0]), abs=1e-6) == -1.0

    def test_orthogonal_vectors(self):
        assert pytest.approx(cosine_similarity([1, 0], [0, 1]), abs=1e-6) == 0.0

    def test_zero_vector_returns_zero(self):
        assert cosine_similarity([0, 0, 0], [1, 2, 3]) == 0.0

    def test_near_identical_embeddings_score_high(self):
        base = np.random.rand(512)
        base /= np.linalg.norm(base)
        noisy = base + np.random.rand(512) * 0.01
        noisy /= np.linalg.norm(noisy)
        assert cosine_similarity(base, noisy) > 0.98

    def test_unrelated_embeddings_score_low(self):
        np.random.seed(42)
        a = np.random.rand(512); a /= np.linalg.norm(a)
        b = np.random.rand(512); b /= np.linalg.norm(b)
        # Random unit vectors in 512-d are nearly orthogonal
        assert abs(cosine_similarity(a, b)) < 0.15
