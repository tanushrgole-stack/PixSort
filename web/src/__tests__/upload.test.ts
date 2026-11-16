/**
 * Tests for the upload flow helpers.
 * Run with: cd web && npx jest
 */

// ─── Helpers under test ───────────────────────────────────────────────────────

/** Returns true if the MIME type is an accepted photo format. */
function isAcceptedPhotoType(mime: string): boolean {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(
    mime.toLowerCase()
  );
}

/** Clamp file size to max allowed bytes (50 MB). */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function validateUploadFile(file: { name: string; size: number; type: string }): {
  valid: boolean;
  error?: string;
} {
  if (!isAcceptedPhotoType(file.type)) {
    return { valid: false, error: `Unsupported file type: ${file.type}` };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { valid: false, error: `File too large (max 50 MB): ${file.name}` };
  }
  if (file.size === 0) {
    return { valid: false, error: `Empty file: ${file.name}` };
  }
  return { valid: true };
}

/** Build the upload storage path for a photo. */
function buildStoragePath(eventId: string, userId: string, filename: string): string {
  const ext = filename.split('.').pop() ?? 'jpg';
  // Replace non-alphanumeric chars except dots with underscores
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `events/${eventId}/photos/${userId}/${Date.now()}_${safe}`;
}

/** Sanitise a user-supplied event name. */
function sanitiseEventName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 80);
}

/** Format bytes to human-readable string. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('isAcceptedPhotoType', () => {
  test.each([
    ['image/jpeg', true],
    ['image/jpg', true],
    ['image/png', true],
    ['image/webp', true],
    ['image/heic', true],
    ['image/heif', true],
    ['image/gif', false],
    ['video/mp4', false],
    ['application/pdf', false],
    ['text/plain', false],
    ['IMAGE/JPEG', true], // case-insensitive
  ])('%s → %s', (mime, expected) => {
    expect(isAcceptedPhotoType(mime)).toBe(expected);
  });
});

describe('validateUploadFile', () => {
  const validFile = { name: 'photo.jpg', size: 1024 * 1024, type: 'image/jpeg' };

  test('valid jpeg passes', () => {
    expect(validateUploadFile(validFile).valid).toBe(true);
  });

  test('gif rejected', () => {
    const r = validateUploadFile({ ...validFile, type: 'image/gif' });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('Unsupported');
  });

  test('50 MB exactly → passes', () => {
    expect(validateUploadFile({ ...validFile, size: MAX_UPLOAD_BYTES }).valid).toBe(true);
  });

  test('50 MB + 1 byte → fails', () => {
    const r = validateUploadFile({ ...validFile, size: MAX_UPLOAD_BYTES + 1 });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('too large');
  });

  test('empty file → fails', () => {
    const r = validateUploadFile({ ...validFile, size: 0 });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('Empty');
  });

  test('heic accepted', () => {
    expect(validateUploadFile({ name: 'img.heic', size: 5_000_000, type: 'image/heic' }).valid).toBe(true);
  });
});

describe('buildStoragePath', () => {
  test('contains event and user IDs', () => {
    const path = buildStoragePath('evt123', 'usr456', 'photo.jpg');
    expect(path).toContain('evt123');
    expect(path).toContain('usr456');
  });

  test('path starts with events/', () => {
    const path = buildStoragePath('e', 'u', 'img.jpg');
    expect(path).toMatch(/^events\//);
  });

  test('special chars in filename are sanitised', () => {
    const path = buildStoragePath('e', 'u', 'my photo (1).jpg');
    expect(path).not.toContain(' ');
    expect(path).not.toContain('(');
    expect(path).not.toContain(')');
  });
});

describe('sanitiseEventName', () => {
  test('trims whitespace', () => {
    expect(sanitiseEventName('  Hello  ')).toBe('Hello');
  });

  test('collapses multiple spaces', () => {
    expect(sanitiseEventName('My   Wedding  Day')).toBe('My Wedding Day');
  });

  test('truncates at 80 chars', () => {
    const long = 'A'.repeat(100);
    expect(sanitiseEventName(long)).toHaveLength(80);
  });

  test('empty string returns empty', () => {
    expect(sanitiseEventName('   ')).toBe('');
  });
});

describe('formatBytes', () => {
  test('bytes', () => expect(formatBytes(500)).toBe('500 B'));
  test('kilobytes', () => expect(formatBytes(1536)).toBe('1.5 KB'));
  test('megabytes', () => expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB'));
  test('zero', () => expect(formatBytes(0)).toBe('0 B'));
});
