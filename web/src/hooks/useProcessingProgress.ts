"use client";

import { useState, useCallback } from "react";

export interface ProcessingProgress {
  total: number;
  done: number;
  pending: number;
  processing: number;
  failed: number;
  percent: number;
}

/**
 * useProcessingProgress — polls the AI service for face-sorting progress.
 * Exposes { progress, loading, refresh }.
 */
export function useProcessingProgress(eventId: string, aiServiceUrl?: string) {
  const baseUrl = aiServiceUrl ?? process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/progress/${eventId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch progress");
    } finally {
      setLoading(false);
    }
  }, [eventId, baseUrl]);

  return { progress, loading, error, refresh };
}
