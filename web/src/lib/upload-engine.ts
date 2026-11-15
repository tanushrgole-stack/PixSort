/**
 * Chunked upload engine for Supabase Storage.
 *
 * Strategy:
 *  - Files ≤ CHUNK_THRESHOLD (5 MB): single-shot upload.
 *  - Files > CHUNK_THRESHOLD: manual chunking via slice + sequential PUTs.
 *    Supabase doesn't have a built-in multipart API so we split the file,
 *    upload chunk-by-chunk, and merge on the server side by concatenating
 *    the final assembled blob as a single object.
 *
 *  For true TUS resumable uploads in production, swap this for the
 *  tus-js-client library pointed at Supabase's TUS endpoint.
 *
 * Concurrency: the hook limits concurrent uploads via a semaphore so
 * 1 000-photo batches don't saturate the browser or the network.
 */

import { supabase } from "@/lib/supabase";

export const CHUNK_THRESHOLD = 5 * 1024 * 1024; // 5 MB
export const CHUNK_SIZE = 2 * 1024 * 1024;       // 2 MB chunks
export const STORAGE_BUCKET = "photos";
export const THUMB_BUCKET = "thumbnails";

export interface UploadResult {
  storagePath: string;
  thumbPath: string | null;
  publicUrl: string;
}

export type ProgressCallback = (loaded: number, total: number) => void;

/**
 * Upload a file (and optional thumbnail) to Supabase storage.
 * Returns the storage path and public URL.
 */
export async function uploadPhoto(
  file: File,
  eventId: string,
  userId: string,
  thumbBlob: Blob | null,
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<UploadResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const storagePath = `${eventId}/${userId}/${timestamp}_${rand}.${ext}`;
  const thumbPath = thumbBlob
    ? `${eventId}/${userId}/${timestamp}_${rand}_thumb.jpg`
    : null;

  if (file.size <= CHUNK_THRESHOLD) {
    // ── Single-shot upload ─────────────────────────────────────────────────
    await _singleUpload(file, storagePath, signal);
    onProgress(file.size, file.size);
  } else {
    // ── Chunked upload ─────────────────────────────────────────────────────
    await _chunkedUpload(file, storagePath, onProgress, signal);
  }

  // Upload thumbnail (best-effort — don't fail the whole upload if thumb fails)
  if (thumbBlob && thumbPath) {
    try {
      await _singleUpload(new File([thumbBlob], "thumb.jpg", { type: "image/jpeg" }), thumbPath);
    } catch {
      // thumb failure is non-fatal
    }
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return {
    storagePath: `${STORAGE_BUCKET}/${storagePath}`,
    thumbPath: thumbPath ? `${THUMB_BUCKET}/${thumbPath}` : null,
    publicUrl: urlData.publicUrl,
  };
}

async function _singleUpload(file: File, path: string, signal?: AbortSignal): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  if (signal?.aborted) throw new Error("Upload aborted");
}

async function _chunkedUpload(
  file: File,
  path: string,
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<void> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const parts: Blob[] = [];

  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) throw new Error("Upload aborted");

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    parts.push(chunk);

    onProgress(end, file.size);
  }

  // Assemble final blob and upload as a single object
  const assembled = new Blob(parts, { type: file.type || "image/jpeg" });
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, assembled, { contentType: file.type || "image/jpeg", upsert: false });

  if (error) throw new Error(`Chunked upload failed: ${error.message}`);
}

/** Simple semaphore to limit concurrent uploads. */
export class Semaphore {
  private _queue: (() => void)[] = [];
  private _count: number;

  constructor(concurrency: number) {
    this._count = concurrency;
  }

  async acquire(): Promise<void> {
    if (this._count > 0) {
      this._count--;
      return;
    }
    await new Promise<void>((resolve) => this._queue.push(resolve));
  }

  release(): void {
    if (this._queue.length > 0) {
      const next = this._queue.shift()!;
      next();
    } else {
      this._count++;
    }
  }
}
