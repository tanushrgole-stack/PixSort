'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';
import type { PhotoItem } from '@/types/event-ui';

interface MostLovedPhoto {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  momentName?: string;
  uploaderName?: string;
  favoriteCount: number;
}

interface MostLovedRowProps {
  eventId: string;
  onPhotoClick: (photo: PhotoItem) => void;
}

export function MostLovedRow({ eventId, onPhotoClick }: MostLovedRowProps) {
  const [photos, setPhotos] = useState<MostLovedPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${eventId}/most-loved?limit=12`)
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((data) => {
        setPhotos(data.photos || []);
      })
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
            <Heart className="w-3 h-3 fill-current" />
          </div>
          <span className="text-sm font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Most Loved
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-32 h-44 rounded-2xl bg-[var(--muted)]/20 animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) return null;

  return (
    <div className="py-3 bg-gradient-to-b from-transparent via-[var(--accent)]/5 to-transparent border-y border-[var(--border)]/50">
      <div className="px-4 flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text)] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Most Loved Moments
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
            Crowd favorites
          </span>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 pt-1">
        {photos.map((photo, i) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              onPhotoClick({
                id: photo.id,
                url: photo.url,
                thumbUrl: photo.thumbUrl,
                width: photo.width,
                height: photo.height,
                momentName: photo.momentName,
                uploaderName: photo.uploaderName,
                faceCount: 0,
                isSolo: false,
                isFavorited: true,
                isHidden: false,
                faces: [],
                status: 'done',
              })
            }
            className="relative shrink-0 w-32 sm:w-36 h-44 rounded-2xl overflow-hidden cursor-pointer shadow-card border border-[var(--border)] group"
          >
            <img
              src={photo.thumbUrl}
              alt="Loved photo"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />

            {/* Gradient shadow overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />

            {/* Favorite count pill */}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold">
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              <span>{photo.favoriteCount}</span>
            </div>

            {/* Moment / uploader details */}
            <div className="absolute bottom-2 inset-x-2 text-white">
              {photo.momentName && (
                <p className="text-[10px] font-semibold truncate text-white/90">
                  {photo.momentName}
                </p>
              )}
              {photo.uploaderName && (
                <p className="text-[9px] text-white/70 truncate">
                  by {photo.uploaderName}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
