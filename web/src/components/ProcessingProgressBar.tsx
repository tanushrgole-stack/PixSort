"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useProcessingProgress } from "@/hooks/useProcessingProgress";

interface ProcessingProgressBarProps {
  eventId: string;
  accentColor?: string;
  pollIntervalMs?: number;
}

export default function ProcessingProgressBar({
  eventId,
  accentColor = "#FF6B4A",
  pollIntervalMs = 4000,
}: ProcessingProgressBarProps) {
  const { progress, loading, error, refresh } = useProcessingProgress(eventId);

  // Auto-poll while there are unprocessed photos
  useEffect(() => {
    refresh(); // immediate first fetch
    const id = setInterval(() => {
      if (!progress || progress.pending > 0 || progress.processing > 0) {
        refresh();
      }
    }, pollIntervalMs);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, pollIntervalMs]);

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-sunset-text/50 dark:text-sunset-dark-text/50">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span>AI service unreachable</span>
      </div>
    );
  }

  if (!progress && loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-sunset-text/50 dark:text-sunset-dark-text/50">
        <Loader2 className="w-4 h-4 animate-spin text-sunset-coral" />
        <span>Checking sort progress…</span>
      </div>
    );
  }

  if (!progress || progress.total === 0) return null;

  const isDone = progress.done === progress.total;
  const isActive = progress.processing > 0 || progress.pending > 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-sunset-dark-surface border border-sunset-rose/30 shadow-soft p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDone ? (
            <Sparkles className="w-4 h-4 text-sunset-golden" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-sunset-coral" />
          )}
          <span className="text-sm font-semibold text-sunset-text dark:text-sunset-dark-text font-serif">
            {isDone ? "All photos sorted!" : "Sorting photos…"}
          </span>
        </div>
        <span className="text-sm font-medium text-sunset-coral tabular-nums">
          {progress.done} / {progress.total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-sunset-rose/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${accentColor}, #FFB703)` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Detail counters */}
      <div className="flex items-center gap-4 text-xs text-sunset-text/60 dark:text-sunset-dark-text/60">
        {progress.pending > 0 && (
          <span>{progress.pending} waiting</span>
        )}
        {progress.processing > 0 && (
          <span className="text-blue-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {progress.processing} processing
          </span>
        )}
        {progress.failed > 0 && (
          <span className="text-red-400">{progress.failed} failed</span>
        )}
        <span className="ml-auto font-medium text-sunset-coral">
          {progress.percent}%
        </span>
      </div>
    </div>
  );
}
