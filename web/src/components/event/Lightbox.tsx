'use client';

import {
  useEffect,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  motion,
  AnimatePresence,
  type PanInfo,
} from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  EyeOff,
  UserX,
  UserPlus,
  Scan,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useToast } from '@/providers/ToastProvider';
import type { PhotoItem, FaceBox } from '@/types/event-ui';

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LightboxProps {
  photos: PhotoItem[];
  initialIndex: number;
  onClose: () => void;
  onFavorite: (id: string, val: boolean) => void;
  onReport: (id: string, type: 'not_me' | 'add_me') => void;
  onHide: (id: string) => void;
  onDownload: (id: string) => void;
}

// ─── Slide variants (direction-aware) ────────────────────────────────────────

const SLIDE_DISTANCE = 300;

function getVariants(direction: number) {
  return {
    enter: { x: direction > 0 ? SLIDE_DISTANCE : -SLIDE_DISTANCE, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: direction > 0 ? -SLIDE_DISTANCE : SLIDE_DISTANCE, opacity: 0 },
  };
}

// ─── Face Box Overlay ─────────────────────────────────────────────────────────

function FaceBoxOverlay({ face }: { face: FaceBox }) {
  return (
    <div
      className={cn(
        'absolute border-2 rounded pointer-events-none',
        face.isMe ? 'border-[#FF6B4A]' : 'border-emerald-400',
      )}
      style={{
        left: `${face.x * 100}%`,
        top: `${face.y * 100}%`,
        width: `${face.w * 100}%`,
        height: `${face.h * 100}%`,
        borderStyle: 'dashed',
      }}
    >
      {face.personName && (
        <span
          className={cn(
            'absolute -bottom-5 left-0 text-[10px] font-semibold px-1 rounded whitespace-nowrap',
            face.isMe
              ? 'bg-[#FF6B4A] text-white'
              : 'bg-emerald-400 text-white',
          )}
        >
          {face.personName}
        </span>
      )}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

export function Lightbox({
  photos,
  initialIndex,
  onClose,
  onFavorite,
  onReport,
  onHide,
  onDownload,
}: LightboxProps) {
  const { success } = useToast();

  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [showFaces, setShowFaces] = useState(false);
  const [scale, setScale] = useState(1);

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Pinch zoom state
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);

  const photo = photos[index];

  // ── Navigation helpers ───────────────────────────────────────────────────
  const goTo = useCallback(
    (nextIdx: number, dir: number) => {
      if (nextIdx < 0 || nextIdx >= photos.length) return;
      setDirection(dir);
      setIndex(nextIdx);
      setScale(1);
    },
    [photos.length],
  );

  const goPrev = useCallback(() => goTo(index - 1, -1), [index, goTo]);
  const goNext = useCallback(() => goTo(index + 1, 1), [index, goTo]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Touch swipe handlers ─────────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Start pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.hypot(dx, dy);
      pinchStartScale.current = scale;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const nextScale = Math.min(
        4,
        Math.max(1, (pinchStartScale.current * dist) / pinchStartDist.current),
      );
      setScale(nextScale);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (
      e.changedTouches.length === 1 &&
      touchStartX.current !== null &&
      scale === 1
    ) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy =
        touchStartY.current !== null
          ? Math.abs(e.changedTouches[0].clientY - touchStartY.current)
          : 0;

      // Only swipe horizontally (not scroll)
      if (Math.abs(dx) > 80 && Math.abs(dx) > dy) {
        if (dx < 0) goNext();
        else goPrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    pinchStartDist.current = null;
  }

  // ── Download handler ─────────────────────────────────────────────────────
  function handleDownload() {
    if (!photo) return;
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = `photo-${photo.id}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onDownload(photo.id);
    success('Photo downloaded!');
  }

  if (!photo) return null;

  const variants = getVariants(direction);

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9000] bg-black/90 flex flex-col"
        onClick={onClose}
      >
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-2 z-10 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Counter + meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/70 text-sm font-medium tabular-nums">
              {index + 1} / {photos.length}
            </span>
            {photo.momentName && (
              <span className="bg-white/15 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">
                {photo.momentName}
              </span>
            )}
            {photo.uploaderName && (
              <span className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full">
                by {photo.uploaderName}
              </span>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* ── Photo area ──────────────────────────────────────────────────── */}
        <div
          className="flex-1 relative flex items-center justify-center overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Prev arrow */}
          {index > 0 && (
            <button
              className="absolute left-2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
              onClick={goPrev}
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Photo with AnimatePresence slide transition */}
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={photo.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 380, damping: 36 },
                opacity: { duration: 0.15 },
              }}
              className="absolute inset-0 flex items-center justify-center select-none"
            >
              {/* Inner container for zoom + face boxes */}
              <div
                className="relative max-w-full max-h-full"
                style={{
                  transform: `scale(${scale})`,
                  transition: scale === 1 ? 'transform 0.2s ease' : 'none',
                }}
              >
                <img
                  src={photo.url}
                  alt={photo.momentName ?? 'Photo'}
                  className="max-w-[90vw] max-h-[70vh] object-contain rounded-lg select-none"
                  draggable={false}
                />

                {/* Face boxes overlay */}
                {showFaces && photo.faces.length > 0 && (
                  <div className="absolute inset-0">
                    {photo.faces.map((face) => (
                      <FaceBoxOverlay key={face.id} face={face} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Next arrow */}
          {index < photos.length - 1 && (
            <button
              className="absolute right-2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
              onClick={goNext}
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        {/* ── Bottom action bar ────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-t from-black/70 to-transparent pb-safe"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Favorite */}
          <ActionButton
            label={photo.isFavorited ? 'Unfavorite' : 'Favorite'}
            onClick={() => onFavorite(photo.id, !photo.isFavorited)}
          >
            <Heart
              className={cn(
                'w-5 h-5',
                photo.isFavorited
                  ? 'text-[#FF6B4A] fill-[#FF6B4A]'
                  : 'text-white',
              )}
            />
          </ActionButton>

          {/* Download */}
          <ActionButton label="Download" onClick={handleDownload}>
            <Download className="w-5 h-5 text-white" />
          </ActionButton>

          {/* Not me */}
          <ActionButton
            label="Not me"
            onClick={() => onReport(photo.id, 'not_me')}
          >
            <UserX className="w-5 h-5 text-red-400" />
          </ActionButton>

          {/* Add me */}
          <ActionButton
            label="Add me"
            onClick={() => onReport(photo.id, 'add_me')}
          >
            <UserPlus className="w-5 h-5 text-white" />
          </ActionButton>

          {/* Hide */}
          <ActionButton label="Hide" onClick={() => onHide(photo.id)}>
            <EyeOff className="w-5 h-5 text-white" />
          </ActionButton>

          {/* Face-box toggle */}
          {photo.faces.length > 0 && (
            <ActionButton
              label={showFaces ? 'Hide faces' : 'Show faces'}
              onClick={() => setShowFaces((v) => !v)}
              active={showFaces}
            >
              <Scan
                className={cn(
                  'w-5 h-5',
                  showFaces ? 'text-emerald-400' : 'text-white',
                )}
              />
            </ActionButton>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Helper: icon action button ───────────────────────────────────────────────

function ActionButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors',
        active ? 'bg-white/20' : 'hover:bg-white/10',
      )}
    >
      {children}
      <span className="text-white/60 text-[10px] font-medium leading-none">
        {label}
      </span>
    </button>
  );
}

export default Lightbox;
