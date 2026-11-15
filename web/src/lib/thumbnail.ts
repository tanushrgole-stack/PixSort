/**
 * Client-side thumbnail generation using the Canvas API.
 * Returns a Blob (JPEG, quality 0.72) at max 400×400.
 */

const MAX_DIM = 400;
const THUMB_QUALITY = 0.72;

export function generateThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const { width, height } = img;
        const scale = Math.min(MAX_DIM / width, MAX_DIM / height, 1);
        const tw = Math.round(width * scale);
        const th = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, tw, th);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", THUMB_QUALITY);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Read image dimensions from a File without fully loading it. */
export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
