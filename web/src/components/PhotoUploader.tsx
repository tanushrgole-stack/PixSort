"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ImageIcon,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useUploader, type UploadFile } from "@/hooks/useUploader";

interface Moment {
  id: string;
  name: string;
  order: number;
}

interface PhotoUploaderProps {
  eventId: string;
  userId: string;
  uploaderName: string;
  uploadMode: "everyone" | "selected";
  memberRole: "host" | "uploader" | "guest";
  moments: Moment[];
  defaultMomentId?: string;
  accentColor?: string;
}

// ─── Status badge colour map ─────────────────────────────────────────────────
const statusMeta: Record<
  UploadFile["status"],
  { label: string; color: string }
> = {
  queued:      { label: "Queued",      color: "text-sunset-text/60" },
  reading:     { label: "Reading…",    color: "text-sunset-golden" },
  uploading:   { label: "Uploading",   color: "text-blue-500" },
  registering: { label: "Saving…",     color: "text-sunset-golden" },
  done:        { label: "Done",        color: "text-emerald-500" },
  error:       { label: "Error",       color: "text-red-500" },
};

// ─── Tiny progress bar ───────────────────────────────────────────────────────
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-sunset-rose/40 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── Single file row ─────────────────────────────────────────────────────────
function FileRow({
  file,
  moments,
  onMomentChange,
  onRemove,
  onRetry,
}: {
  file: UploadFile;
  moments: Moment[];
  onMomentChange: (fileId: string, momentId: string) => void;
  onRemove: (fileId: string) => void;
  onRetry: (fileId: string) => void;
}) {
  const meta = statusMeta[file.status];
  const isActive = file.status === "uploading" || file.status === "registering";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-sunset-dark-surface border border-sunset-rose/30 shadow-sm"
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-sunset-rose/20">
        {file.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.thumbUrl}
            alt={file.file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-sunset-coral/60" />
          </div>
        )}
        {file.status === "done" && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
        )}
        {file.status === "error" && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs font-medium truncate text-sunset-text dark:text-sunset-dark-text">
          {file.file.name}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium ${meta.color}`}>{meta.label}</span>
          {isActive && (
            <span className="text-[10px] text-sunset-text/50">{file.progress}%</span>
          )}
          {file.takenAt && (
            <span className="text-[10px] text-sunset-text/40">
              {new Date(file.takenAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {isActive && (
          <ProgressBar
            value={file.progress}
            color={file.status === "uploading" ? "bg-blue-500" : "bg-sunset-golden"}
          />
        )}
        {file.error && (
          <p className="text-[10px] text-red-500 truncate">{file.error}</p>
        )}
      </div>

      {/* Moment selector */}
      {moments.length > 0 && (file.status === "queued" || file.status === "reading") && (
        <div className="relative shrink-0">
          <select
            value={file.momentId ?? ""}
            onChange={(e) => onMomentChange(file.id, e.target.value)}
            className="appearance-none text-[10px] pl-2 pr-5 py-1 rounded-lg bg-sunset-rose/20 dark:bg-sunset-dark-bg border border-sunset-rose/40 text-sunset-text dark:text-sunset-dark-text focus:outline-none focus:ring-1 focus:ring-sunset-coral cursor-pointer"
          >
            <option value="">No moment</option>
            {moments.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-sunset-text/50 pointer-events-none" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {file.status === "error" && (
          <button
            onClick={() => onRetry(file.id)}
            className="p-1.5 rounded-lg hover:bg-sunset-rose/20 text-sunset-coral transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        {(file.status === "queued" || file.status === "error") && (
          <button
            onClick={() => onRemove(file.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sunset-text/40 hover:text-red-500 transition-colors"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {isActive && (
          <Loader2 className="w-4 h-4 text-sunset-coral animate-spin" />
        )}
      </div>
    </motion.div>
  );
}

// ─── Main PhotoUploader component ────────────────────────────────────────────
export default function PhotoUploader({
  eventId,
  userId,
  uploaderName,
  uploadMode,
  memberRole,
  moments,
  defaultMomentId,
  accentColor = "#FF6B4A",
}: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    files,
    stats,
    isUploading,
    canUpload,
    addFiles,
    setFileMoment,
    removeFile,
    startUpload,
    retryFile,
  } = useUploader({
    eventId,
    userId,
    uploaderName,
    uploadMode,
    memberRole,
    moments,
    defaultMomentId,
  });

  // ── Drag & drop handlers ─────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      addFiles(dropped);
    },
    [addFiles]
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      addFiles(selected);
      e.target.value = "";
    },
    [addFiles]
  );

  // ── Blocked non-uploader ─────────────────────────────────────────────────
  if (!canUpload) {
    return (
      <div className="rounded-2xl border border-sunset-rose/40 p-8 text-center bg-white dark:bg-sunset-dark-surface shadow-soft">
        <Upload className="w-10 h-10 mx-auto text-sunset-text/30 mb-3" />
        <p className="font-serif text-lg font-semibold text-sunset-text dark:text-sunset-dark-text">
          Upload Restricted
        </p>
        <p className="text-sm text-sunset-text/60 dark:text-sunset-dark-text/60 mt-1">
          Only selected uploaders can add photos to this event.
          <br />
          Contact the host to be granted uploader access.
        </p>
      </div>
    );
  }

  const hasQueued = stats.queued > 0;
  const hasFiles = stats.total > 0;

  return (
    <div className="space-y-4">
      {/* ── Drop Zone ─────────────────────────────────────────────────── */}
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        animate={{ borderColor: isDragging ? accentColor : "transparent" }}
        className="relative rounded-2xl border-2 border-dashed border-sunset-rose/50 bg-white dark:bg-sunset-dark-surface p-8 text-center cursor-pointer transition-colors hover:border-sunset-coral/60 hover:bg-sunset-cream/50 dark:hover:bg-sunset-dark-bg/40 shadow-soft"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
          className="hidden"
          onChange={onFileInputChange}
        />
        <motion.div
          animate={{ scale: isDragging ? 1.08 : 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-warm"
            style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)` }}
          >
            <Upload className="w-7 h-7" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="font-serif text-xl font-bold text-sunset-text dark:text-sunset-dark-text">
              {isDragging ? "Drop photos here" : "Upload Photos"}
            </p>
            <p className="text-sm text-sunset-text/60 dark:text-sunset-dark-text/60 mt-1">
              Drag & drop or click to select · JPEG, PNG, HEIC, WebP
            </p>
            <p className="text-xs text-sunset-text/40 dark:text-sunset-dark-text/40 mt-0.5">
              Supports 1 000+ photos · Resumable chunked uploads
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      {hasFiles && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white dark:bg-sunset-dark-surface border border-sunset-rose/30 shadow-soft text-sm"
        >
          <div className="flex items-center gap-4 text-sunset-text/70 dark:text-sunset-dark-text/70">
            <span>
              <strong className="text-sunset-text dark:text-sunset-dark-text">{stats.total}</strong> photos
            </span>
            {stats.done > 0 && (
              <span className="text-emerald-500">✓ {stats.done} done</span>
            )}
            {stats.error > 0 && (
              <span className="text-red-500">✗ {stats.error} failed</span>
            )}
            {stats.uploading > 0 && (
              <span className="text-blue-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {stats.uploading} uploading
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasQueued && !isUploading && (
              <button
                onClick={startUpload}
                className="px-4 py-1.5 rounded-xl text-white text-sm font-medium shadow-warm transition-all active:scale-95"
                style={{ background: `linear-gradient(135deg, ${accentColor}, #FFB703)` }}
              >
                Upload {stats.queued} photo{stats.queued !== 1 ? "s" : ""}
              </button>
            )}
            {isUploading && (
              <span className="text-xs text-sunset-text/50 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-sunset-coral" />
                Uploading…
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* ── File list ─────────────────────────────────────────────────── */}
      {hasFiles && (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                moments={moments}
                onMomentChange={setFileMoment}
                onRemove={removeFile}
                onRetry={retryFile}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
