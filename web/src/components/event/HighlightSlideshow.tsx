'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, X, Share2, Gauge } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

interface Photo {
  id: string;
  storage_path: string;
  thumb_path?: string | null;
}

interface HighlightSlideshowProps {
  eventId: string;
  onClose: () => void;
}

const SPEEDS = [0.75, 1, 1.5, 2] as const;

export default function HighlightSlideshow({ eventId, onClose }: HighlightSlideshowProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const speed = SPEEDS[speedIdx];
  const intervalMs = 3500 / speed;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/most-loved?limit=20`);
      const json = await res.json();
      setPhotos(json.photos ?? []);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const goTo = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setCurrent(idx);
  }, []);

  const next = useCallback(() => {
    if (photos.length === 0) return;
    goTo((current + 1) % photos.length, 1);
  }, [current, photos.length, goTo]);

  const prev = useCallback(() => {
    if (photos.length === 0) return;
    goTo((current - 1 + photos.length) % photos.length, -1);
  }, [current, photos.length, goTo]);

  // Auto-advance
  useEffect(() => {
    if (!playing || photos.length <= 1) return;
    timerRef.current = setTimeout(next, intervalMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, current, intervalMs, photos.length, next]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast('Slideshow link copied! 🎞️', 'success');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading your highlights…</div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
        <span className="text-5xl">💔</span>
        <p className="text-white text-xl" style={{ fontFamily: 'var(--font-heading)' }}>No loved photos yet</p>
        <p className="text-white/60 text-sm">Heart some photos to build your highlight reel.</p>
        <button onClick={onClose} className="mt-4 px-6 py-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
          Go back
        </button>
      </div>
    );
  }

  const photo = photos[current];

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Photo with Ken Burns effect */}
      <AnimatePresence mode="sync">
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, scale: direction > 0 ? 1.05 : 0.97 }}
          animate={{ opacity: 1, scale: 1.08 }}
          exit={{ opacity: 0, scale: direction > 0 ? 0.97 : 1.05 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.storage_path}
            alt=""
            className="w-full h-full object-cover"
            style={{ transformOrigin: `${30 + current * 7 % 40}% ${30 + current * 11 % 40}%` }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        </motion.div>
      </AnimatePresence>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSpeedIdx((speedIdx + 1) % SPEEDS.length)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur text-white text-sm hover:bg-black/60 transition-colors"
          >
            <Gauge className="w-4 h-4" />
            {speed}x
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? 1 : -1)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 20 : 6,
              height: 6,
              background: i === current ? 'white' : 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-6 z-10">
        <button
          onClick={prev}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={() => setPlaying(!playing)}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
        >
          {playing ? (
            <Pause className="w-7 h-7 text-black" />
          ) : (
            <Play className="w-7 h-7 text-black ml-1" />
          )}
        </button>

        <button
          onClick={next}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Photo counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
        {current + 1} / {photos.length}
      </div>
    </div>
  );
}
