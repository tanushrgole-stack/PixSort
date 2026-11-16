'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Lightbox from '@/components/event/Lightbox';
import { Skeleton } from '@/components/ui';
import type { PhotoItem } from '@/types/event-ui';

function InlineEmpty({ emoji, title, message }: { emoji: string; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <span className="text-5xl mb-4">{emoji}</span>
      <p className="font-semibold text-[var(--text)] text-lg mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{title}</p>
      <p className="text-sm text-[var(--text-secondary)] max-w-xs">{message}</p>
    </div>
  );
}

function cn(...a: Parameters<typeof clsx>) { return twMerge(clsx(...a)); }

interface Photo {
  id: string;
  storage_path: string;
  thumb_path?: string | null;
  width?: number | null;
  height?: number | null;
  quality_score?: number | null;
  taken_at?: string | null;
  moment_id?: string | null;
}

interface TopPicksTabProps {
  eventId: string;
  personId?: string | null;
  userId?: string | null;
}

function QualityStars({ score }: { score: number | null | undefined }) {
  const stars = Math.round((score ?? 0) * 5);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn('w-2.5 h-2.5', i < stars ? 'fill-amber-400 text-amber-400' : 'text-white/40')}
        />
      ))}
    </div>
  );
}

export default function TopPicksTab({ eventId, personId, userId }: TopPicksTabProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!personId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/top-picks?person_id=${personId}&limit=30`);
      const json = await res.json();
      setPhotos(json.photos ?? []);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, personId]);

  useEffect(() => { load(); }, [load]);

  const photoItems: PhotoItem[] = photos.map((p) => ({
    id: p.id,
    url: p.storage_path,
    thumbUrl: p.thumb_path ?? p.storage_path,
    width: p.width ?? 400,
    height: p.height ?? 400,
    isFavorited: false,
    isHidden: false,
    uploadedBy: '',
    momentId: p.moment_id ?? undefined,
    takenAt: p.taken_at ?? undefined,
    faceCount: 0,
    isSolo: false,
    faces: [],
    status: 'done' as const,
  }));

  if (loading) {
    return (
      <div className="p-4 grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (!personId) {
    return (
      <InlineEmpty
        emoji="🤳"
        title="Scan your face first"
        message="Join the event and scan your face to see your AI Top Picks."
      />
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 py-3"
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Sparkles className="w-4 h-4" />
          AI Top Picks · {photos.length} photos
        </div>
        <span className="text-xs text-[var(--text-secondary)]">ranked by sharpness, eyes & smile</span>
      </motion.div>

      {photos.length === 0 ? (
        <InlineEmpty
          emoji="✨"
          title="No ranked photos yet"
          message="Photos are scored as they're processed. Check back soon!"
        />
      ) : (
        <div className="px-2">
          {/* Quality score overlay grid */}
          <div className="grid grid-cols-3 gap-1">
            {photos.map((photo, idx) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                onClick={() => setLightboxIndex(idx)}
                className="relative aspect-square overflow-hidden rounded-xl group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumb_path ?? photo.storage_path}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Rank badge */}
                {idx < 3 && (
                  <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32', color: '#1a1a1a' }}>
                    {idx + 1}
                  </div>
                )}
                {/* Quality stars overlay */}
                <div className="absolute bottom-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <QualityStars score={photo.quality_score} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            photos={photoItems}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onFavorite={() => {}}
            onReport={() => {}}
            onHide={() => {}}
            onDownload={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
