"use client";

/**
 * useUploader — the main upload orchestration hook.
 *
 * Features:
 *  - Accepts files from drag/drop or multi-select.
 *  - Validates upload permissions against event.upload_mode.
 *  - Reads EXIF taken_at and auto-suggests a moment.
 *  - Generates client-side thumbnail before upload.
 *  - Uploads via upload-engine (chunked + resumable).
 *  - Per-file progress tracking.
 *  - Concurrency-limited (MAX_CONCURRENT uploads at a time).
 *  - Retry up to MAX_RETRIES times on failure.
 *  - Registers the photo record in Supabase via the API route.
 */

import { useState, useCallback, useRef } from "react";
import { uploadPhoto, Semaphore } from "@/lib/upload-engine";
import { generateThumbnail, readImageDimensions } from "@/lib/thumbnail";
import { readExifDate, suggestMomentFromDate } from "@/lib/exif";

const MAX_CONCURRENT = 3; // simultaneous uploads
const MAX_RETRIES = 2;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];

export type FileStatus =
  | "queued"
  | "reading"
  | "uploading"
  | "registering"
  | "done"
  | "error";

export interface UploadFile {
  id: string; // local uuid
  file: File;
  status: FileStatus;
  progress: number; // 0–100
  error?: string;
  momentId?: string; // assigned or auto-suggested
  takenAt?: string; // ISO string from EXIF
  thumbUrl?: string; // object URL for preview
  photoId?: string; // DB row id once registered
  uploadedBy?: string; // uploader name
}

interface UseUploaderOptions {
  eventId: string;
  userId: string;
  uploaderName: string;
  uploadMode: "everyone" | "selected";
  memberRole: "host" | "uploader" | "guest";
  moments: { id: string; name: string; order: number }[];
  defaultMomentId?: string;
  onPhotoRegistered?: (photoId: string, file: UploadFile) => void;
}

export function useUploader(opts: UseUploaderOptions) {
  const {
    eventId,
    userId,
    uploaderName,
    uploadMode,
    memberRole,
    moments,
    defaultMomentId,
    onPhotoRegistered,
  } = opts;

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const semaphoreRef = useRef(new Semaphore(MAX_CONCURRENT));
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Permission check ─────────────────────────────────────────────────────
  const canUpload =
    uploadMode === "everyone" ||
    memberRole === "host" ||
    memberRole === "uploader";

  // ── Update a single file entry ───────────────────────────────────────────
  const patchFile = useCallback((id: string, patch: Partial<UploadFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }, []);

  // ── Accept new files (from drop or input) ───────────────────────────────
  const addFiles = useCallback(
    async (incoming: File[]) => {
      if (!canUpload) return;

      const valid = incoming.filter((f) => ACCEPTED_TYPES.includes(f.type));

      const newEntries: UploadFile[] = valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "queued",
        progress: 0,
        momentId: defaultMomentId,
        thumbUrl: undefined,
      }));

      setFiles((prev) => [...prev, ...newEntries]);

      // Pre-read EXIF + generate thumbs in parallel (non-blocking)
      newEntries.forEach(async (entry) => {
        const thumbUrl = URL.createObjectURL(entry.file); // immediate low-cost preview
        patchFile(entry.id, { thumbUrl, status: "reading" });

        const [takenAt, thumbBlob] = await Promise.all([
          readExifDate(entry.file),
          generateThumbnail(entry.file),
        ]);

        const suggestedMomentId =
          takenAt ? suggestMomentFromDate(takenAt, moments) ?? defaultMomentId : defaultMomentId;

        patchFile(entry.id, {
          takenAt: takenAt ?? undefined,
          momentId: suggestedMomentId,
          status: "queued",
          thumbUrl: thumbBlob ? URL.createObjectURL(thumbBlob) : thumbUrl,
        });
      });
    },
    [canUpload, defaultMomentId, moments, patchFile]
  );

  // ── Set moment for a specific file ──────────────────────────────────────
  const setFileMoment = useCallback((fileId: string, momentId: string) => {
    patchFile(fileId, { momentId });
  }, [patchFile]);

  // ── Remove a queued file ─────────────────────────────────────────────────
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === fileId);
      if (target?.thumbUrl) URL.revokeObjectURL(target.thumbUrl);
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  // ── Upload single file with retry ────────────────────────────────────────
  const uploadOne = useCallback(
    async (entry: UploadFile, signal: AbortSignal) => {
      await semaphoreRef.current.acquire();
      try {
        patchFile(entry.id, { status: "uploading", progress: 0 });

        let attempt = 0;
        while (attempt <= MAX_RETRIES) {
          try {
            const thumbBlob = entry.thumbUrl ? await (async () => {
              const r = await fetch(entry.thumbUrl!);
              return r.blob();
            })() : null;

            const dims = await readImageDimensions(entry.file);

            const result = await uploadPhoto(
              entry.file,
              eventId,
              userId,
              thumbBlob,
              (loaded, total) => {
                patchFile(entry.id, { progress: Math.round((loaded / total) * 90) });
              },
              signal
            );

            if (signal.aborted) return;

            // Register photo record via API
            patchFile(entry.id, { status: "registering", progress: 92 });

            const response = await fetch(`/api/events/${eventId}/photos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uploaded_by: userId,
                storage_path: result.storagePath,
                thumb_path: result.thumbPath,
                moment_id: entry.momentId ?? null,
                width: dims?.width ?? null,
                height: dims?.height ?? null,
                taken_at: entry.takenAt ?? null,
              }),
              signal,
            });

            if (!response.ok) throw new Error(await response.text());

            const { photo } = await response.json();

            patchFile(entry.id, {
              status: "done",
              progress: 100,
              photoId: photo.id,
              uploadedBy: uploaderName,
            });

            onPhotoRegistered?.(photo.id, { ...entry, photoId: photo.id });
            return;
          } catch (err) {
            if (signal.aborted) return;
            attempt++;
            if (attempt > MAX_RETRIES) {
              patchFile(entry.id, {
                status: "error",
                error: err instanceof Error ? err.message : "Upload failed",
              });
              return;
            }
            // Exponential back-off: 1s, 2s, 4s
            await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
            patchFile(entry.id, { status: "uploading", progress: 0 });
          }
        }
      } finally {
        semaphoreRef.current.release();
      }
    },
    [eventId, userId, uploaderName, patchFile, onPhotoRegistered]
  );

  // ── Start uploading all queued files ─────────────────────────────────────
  const startUpload = useCallback(async () => {
    if (!canUpload || isUploading) return;

    const queued = files.filter((f) => f.status === "queued" || f.status === "reading");
    if (queued.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsUploading(true);

    try {
      await Promise.all(queued.map((f) => uploadOne(f, controller.signal)));
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [canUpload, isUploading, files, uploadOne]);

  // ── Retry a single errored file ──────────────────────────────────────────
  const retryFile = useCallback(
    async (fileId: string) => {
      const target = files.find((f) => f.id === fileId);
      if (!target || target.status !== "error") return;
      patchFile(fileId, { status: "queued", error: undefined, progress: 0 });

      const controller = new AbortController();
      await uploadOne({ ...target, status: "queued" }, controller.signal);
    },
    [files, patchFile, uploadOne]
  );

  // ── Cancel all in-flight uploads ─────────────────────────────────────────
  const cancelAll = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
  }, []);

  // ── Computed stats ───────────────────────────────────────────────────────
  const stats = {
    total: files.length,
    queued: files.filter((f) => f.status === "queued" || f.status === "reading").length,
    uploading: files.filter((f) => f.status === "uploading" || f.status === "registering").length,
    done: files.filter((f) => f.status === "done").length,
    error: files.filter((f) => f.status === "error").length,
  };

  return {
    files,
    stats,
    isUploading,
    canUpload,
    addFiles,
    setFileMoment,
    removeFile,
    startUpload,
    retryFile,
    cancelAll,
  };
}
