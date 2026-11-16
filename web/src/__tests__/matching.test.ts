/**
 * Tests for face-matching / photo utility helpers.
 * Run with: cd web && npx jest
 *
 * These are pure-unit tests that don't need a DB or browser.
 */

// ─── Helpers under test (inline — extracted from production logic) ─────────────

/** Cosine similarity between two float vectors (0–1). */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Decide match confidence tier from cosine similarity.
 * Mirrors the Python logic in ai/app/services/processor.py.
 */
function matchTier(similarity: number): 'high' | 'medium' | 'low' | 'none' {
  if (similarity >= 0.72) return 'high';
  if (similarity >= 0.55) return 'medium';
  if (similarity >= 0.40) return 'low';
  return 'none';
}

/** Normalise a raw embedding vector to unit length. */
function normalise(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (norm === 0) return v;
  return v.map((x) => x / norm);
}

/** Generate join code — same logic as api-helpers.ts */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('cosineSimilarity', () => {
  test('identical vectors → 1.0', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  test('opposite vectors → -1.0', () => {
    expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBeCloseTo(-1.0, 5);
  });

  test('orthogonal vectors → 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  test('empty vectors → 0', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  test('mismatched lengths → 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  test('zero vector → 0', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  test('known similar pair scores > 0.9', () => {
    // Near-identical face embeddings should score very high
    const base = [0.5, 0.3, 0.1, 0.8, 0.6];
    const similar = base.map((x) => x + Math.random() * 0.01); // tiny noise
    expect(cosineSimilarity(normalise(base), normalise(similar))).toBeGreaterThan(0.98);
  });

  test('very different vectors score < 0.4', () => {
    const a = normalise([1, 0, 0, 0, 0]);
    const b = normalise([0, 0, 0, 0, 1]);
    expect(cosineSimilarity(a, b)).toBeLessThan(0.4);
  });
});

describe('matchTier', () => {
  test('0.72 → high', () => expect(matchTier(0.72)).toBe('high'));
  test('0.80 → high', () => expect(matchTier(0.80)).toBe('high'));
  test('0.60 → medium', () => expect(matchTier(0.60)).toBe('medium'));
  test('0.55 → medium', () => expect(matchTier(0.55)).toBe('medium'));
  test('0.45 → low', () => expect(matchTier(0.45)).toBe('low'));
  test('0.30 → none', () => expect(matchTier(0.30)).toBe('none'));
  test('0.00 → none', () => expect(matchTier(0.00)).toBe('none'));
  test('1.00 → high', () => expect(matchTier(1.00)).toBe('high'));
});

describe('normalise', () => {
  test('unit vector unchanged', () => {
    const v = [1, 0, 0];
    expect(normalise(v)).toEqual([1, 0, 0]);
  });

  test('output has unit length', () => {
    const v = [3, 4]; // magnitude = 5
    const n = normalise(v);
    const len = Math.sqrt(n[0] ** 2 + n[1] ** 2);
    expect(len).toBeCloseTo(1.0, 10);
  });

  test('zero vector unchanged', () => {
    expect(normalise([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('generateJoinCode', () => {
  test('returns 8 characters', () => {
    expect(generateJoinCode()).toHaveLength(8);
  });

  test('only uppercase alphanumeric chars', () => {
    const code = generateJoinCode();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  test('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 1000 }, generateJoinCode));
    // With 36^8 possibilities, 1000 codes should all be unique
    expect(codes.size).toBe(1000);
  });
});
