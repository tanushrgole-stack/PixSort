/**
 * EXIF utilities — parse taken_at from JPEG/HEIC EXIF without a heavy library.
 * Reads the raw bytes of a File and extracts DateTimeOriginal.
 */

/** Extract EXIF DateTimeOriginal from a JPEG/HEIC as an ISO string, or null. */
export async function readExifDate(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;

  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer(); // first 128 KB is enough
    const view = new DataView(buffer);

    // JPEG magic: FF D8
    if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return null;

    let offset = 2;
    while (offset < view.byteLength - 2) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      const length = view.getUint16(offset + 2, false);

      // APP1 marker (0xE1) contains Exif
      if (marker === 0xe1) {
        const exifHeader = new Uint8Array(buffer, offset + 4, 4);
        const isExif =
          exifHeader[0] === 0x45 && // E
          exifHeader[1] === 0x78 && // x
          exifHeader[2] === 0x69 && // i
          exifHeader[3] === 0x66;   // f
        if (isExif) {
          const exifStart = offset + 10; // skip 'Exif\0\0'
          const isoDate = _parseExifIfd(view, exifStart);
          if (isoDate) return isoDate;
        }
      }
      offset += 2 + length;
    }
    return null;
  } catch {
    return null;
  }
}

/** Minimal IFD parser — look for tag 0x9003 (DateTimeOriginal). */
function _parseExifIfd(view: DataView, start: number): string | null {
  try {
    const littleEndian =
      view.getUint16(start, false) === 0x4949; // 'II' = little-endian
    const ifdOffset = view.getUint32(start + 4, littleEndian);
    const ifdStart = start + ifdOffset;
    const entryCount = view.getUint16(ifdStart, littleEndian);

    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdStart + 2 + i * 12;
      const tag = view.getUint16(entryOffset, littleEndian);

      // 0x9003 = DateTimeOriginal
      if (tag === 0x9003) {
        const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
        const absOffset = start + valueOffset;
        let str = "";
        for (let j = 0; j < 19; j++) {
          const ch = view.getUint8(absOffset + j);
          if (ch === 0) break;
          str += String.fromCharCode(ch);
        }
        // EXIF format: "YYYY:MM:DD HH:MM:SS"
        return _exifDateToIso(str);
      }
    }

    // Also recurse into SubExifIFD (tag 0x8769)
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdStart + 2 + i * 12;
      const tag = view.getUint16(entryOffset, littleEndian);
      if (tag === 0x8769) {
        const subIfdOffset = view.getUint32(entryOffset + 8, littleEndian);
        const result = _parseExifIfd(view, start);
        // Return the sub-ifd result if found
        const subResult = _parseExifSubIfd(view, start + subIfdOffset, littleEndian);
        if (subResult) return subResult;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function _parseExifSubIfd(view: DataView, ifdStart: number, littleEndian: boolean): string | null {
  try {
    const entryCount = view.getUint16(ifdStart, littleEndian);
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdStart + 2 + i * 12;
      const tag = view.getUint16(entryOffset, littleEndian);
      if (tag === 0x9003) {
        const absOffset = view.getUint32(entryOffset + 8, littleEndian);
        let str = "";
        for (let j = 0; j < 19; j++) {
          const ch = view.getUint8(absOffset + j);
          if (ch === 0) break;
          str += String.fromCharCode(ch);
        }
        return _exifDateToIso(str);
      }
    }
    return null;
  } catch {
    return null;
  }
}

function _exifDateToIso(exif: string): string | null {
  // "2024:06:15 14:30:00" → "2024-06-15T14:30:00"
  const match = exif.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

/** Suggest a moment name from a date string based on common event patterns. */
export function suggestMomentFromDate(
  takenAt: string | null,
  moments: { id: string; name: string; order: number }[]
): string | null {
  if (!takenAt || moments.length === 0) return null;
  const date = new Date(takenAt);
  const hour = date.getHours();

  // Heuristics: morning → Haldi/Day 1 patterns, evening → Reception/Party
  if (hour >= 6 && hour < 12) {
    const morning = moments.find((m) =>
      /haldi|morning|day 1|day1|registration/i.test(m.name)
    );
    if (morning) return morning.id;
  }
  if (hour >= 18 || hour < 2) {
    const evening = moments.find((m) =>
      /reception|party|sangeet|dinner|afterparty|farewell/i.test(m.name)
    );
    if (evening) return evening.id;
  }
  if (hour >= 14 && hour < 18) {
    const afternoon = moments.find((m) =>
      /wedding|ceremony|cake|beach/i.test(m.name)
    );
    if (afternoon) return afternoon.id;
  }
  return null; // no strong match
}
