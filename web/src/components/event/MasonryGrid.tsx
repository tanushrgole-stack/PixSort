'use client';

import {
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Check, User } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Skeleton } from '@/components/ui';
import type { PhotoItem } from '@/types/event-ui';

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MasonryGridProps {
  photos: PhotoItem[];
  onPhotoClick: (idx: number) => void;
  onLongPress: (id: string) => void;
  selected: Set<string>;
  isSelecting: boolean;
  columnCount?: number;
  onLoadMore?: () => void;
}

// ─── Photo Card ───────────────────────────────────────────────────────────────

interface PhotoCardProps {
  photo: PhotoItem;
  idx: number;
  isSelected: boolean;
  isSelecting: boolean;
  onClick: () => void;
  onLongPress: () => void;
}

function PhotoCard({
  photo,
  idx,
  isSelected,
  isSelecting,
  onClick,
  onLongPress,
}: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  // Aspect ratio via paddingBottom trick
  const paddingBottom =
    photo.height && photo.width
      ? `${(photo.height / photo.width) * 100}%`
      : '75%';

  const isPending =
    photo.status === 'pending' || photo.status === 'processing';

  // ── Long-press handlers ──────────────────────────────────────────────────
  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, 500);
  }, [onLongPress]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    cancelLongPress();
    if (!didLongPress.current) {
      onClick();
    }
  }, [cancelLongPress, onClick]);

  const handlePointerLeave = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  return (
    <motion.div
      className={cn(
        'relative w-full mb-2 md:mb-3 rounded-xl overflow-hidden cursor-pointer',
        'break-inside-avoid',
        'transition-shadow duration-200',
      )}
      style={{ display: 'inline-block', width: '100%' }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* Aspect ratio wrapper */}
      <div
        className="relative w-full overflow-hidden rounded-xl bg-[var(--border)]"
        style={{ paddingBottom }}
      >
        {/* Thumbnail image */}
        <img
          src={photo.thumbUrl}
          alt={photo.momentName ?? `Photo ${idx + 1}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            'transition-[filter] duration-500',
            loaded ? 'blur-0' : 'blur-sm scale-105',
          )}
          draggable={false}
        />

        {/* Shimmer overlay for pending/processing */}
        <AnimatePresence>
          {isPending && (
            <motion.div
              key="shimmer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 skeleton"
            />
          )}
        </AnimatePresence>

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && !isSelecting && (
            <motion.div
              key="hover-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
            >
              {/* Heart icon top-right */}
              <div className="absolute top-2 right-2">
                <Heart
                  className={cn(
                    'w-5 h-5 drop-shadow',
                    photo.isFavorited
                      ? 'text-[#FF6B4A] fill-[#FF6B4A]'
                      : 'text-white',
                  )}
                />
              </div>

              {/* Uploader chip bottom */}
              {photo.uploaderName && (
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                  <User className="w-3 h-3 text-white/80 shrink-0" />
                  <span className="text-white text-xs font-medium truncate drop-shadow">
                    {photo.uploaderName}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selection overlay */}
        <AnimatePresence>
          {isSelecting && (
            <motion.div
              key="select-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
              style={{
                background: isSelected
                  ? 'rgba(255,107,74,0.25)'
                  : 'rgba(0,0,0,0.15)',
              }}
            >
              {/* Checkmark circle */}
              <div className="absolute top-2 right-2">
                <motion.div
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                    isSelected
                      ? 'bg-[var(--accent)] border-[var(--accent)]'
                      : 'bg-white/30 border-white',
                  )}
                >
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── MasonryGrid ──────────────────────────────────────────────────────────────

export function MasonryGrid({
  photos,
  onPhotoClick,
  onLongPress,
  selected,
  isSelecting,
  columnCount: _columnCount,
  onLoadMore,
}: MasonryGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll sentinel
  useEffect(() => {
    if (!onLoadMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore]);

  if (photos.length === 0) return null;

  return (
    <div className="w-full">
      {/*
        CSS column-count masonry:
        2 cols on mobile, 3 on md, 4 on lg
        Each card has break-inside-avoid via inline style (Tailwind class
        doesn't survive column layout in all browsers without it)
      */}
      <div
        className={cn(
          'w-full gap-2 md:gap-3',
          '[column-count:2] md:[column-count:3] lg:[column-count:4]',
          '[column-gap:0.5rem] md:[column-gap:0.75rem]',
        )}
        style={{
          columnCount: _columnCount ?? undefined,
        }}
      >
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            style={{ breakInside: 'avoid', display: 'inline-block', width: '100%' }}
          >
            <PhotoCard
              photo={photo}
              idx={idx}
              isSelected={selected.has(photo.id)}
              isSelecting={isSelecting}
              onClick={() => onPhotoClick(idx)}
              onLongPress={() => onLongPress(photo.id)}
            />
          </div>
        ))}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />
    </div>
  );
}

export default MasonryGrid;
