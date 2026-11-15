'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Heart, X, Folder, Trash2 } from 'lucide-react';
import { usePhotos } from '@/hooks/usePhotos';
import { useFavorite } from '@/hooks/useFavorite';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import { useToast } from '@/providers/ToastProvider';
import MasonryGrid from '@/components/event/MasonryGrid';
import Lightbox from '@/components/event/Lightbox';
import EmptyState from '@/components/event/EmptyState';
import ConfettiEffect from '@/components/event/ConfettiEffect';
import { MomentsManagerModal } from '@/components/event/MomentsManagerModal';
import { Skeleton } from '@/components/ui';
import type { MomentTab } from '@/types/event-ui';

type Filter = 'all' | 'solo' | 'group';

interface MyPhotosProps {
  eventId: string;
  userId?: string;
  activeMoment: string | 'all';
  moments?: MomentTab[];
  isHost?: boolean;
}

const FILTER_CHIPS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Solo 🤳', value: 'solo' },
  { label: 'Group 👥', value: 'group' },
];

export default function MyPhotos({
  eventId,
  userId,
  activeMoment,
  moments = [],
  isHost = false,
}: MyPhotosProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const toast = useToast();

  const { photos, isLoading, hasMore, loadMore, reset } = usePhotos({
    eventId,
    tab: 'my',
    momentId: activeMoment === 'all' ? undefined : activeMoment,
    filter: filter === 'all' ? undefined : filter,
    pageSize: 30,
  });

  const { toggle: toggleFavorite } = useFavorite(userId);
  const { selected, isSelecting, toggle, selectAll, clear, startSelecting, longPressProps } =
    useMultiSelect();

  // Confetti: show once when photos first appear
  useEffect(() => {
    if (!userId || photos.length === 0) return;
    const key = `confetti_${eventId}_${userId}`;
    if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      setShowConfetti(true);
    }
  }, [photos.length > 0, eventId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadZip = useCallback(async () => {
    if (selected.size === 0) return;
    try {
      const res = await fetch(`/api/events/${eventId}/album/zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `album-${eventId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${selected.size} photos`);
      clear();
    } catch {
      toast.error('Download failed. Please try again.');
    }
  }, [selected, eventId, clear, toast]);

  const handleFavoriteSelected = useCallback(async () => {
    for (const id of selected) {
      const photo = photos.find((p) => p.id === id);
      if (photo) await toggleFavorite(id, photo.isFavorited);
    }
    toast.success(`Favorited ${selected.size} photos`);
    clear();
  }, [selected, photos, toggleFavorite, clear, toast]);

  const handleDeleteSelected = useCallback(async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected photo(s)?`)) return;
    try {
      const res = await fetch(`/api/events/${eventId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: Array.from(selected), user_id: userId }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Removed ${selected.size} photo(s)`);
      clear();
      reset();
    } catch {
      toast.error('Could not delete photos');
    }
  }, [selected, eventId, userId, clear, reset, toast]);

  const albumReady = !isLoading;

  return (
    <div className="relative">
      {showConfetti && <ConfettiEffect onDone={() => setShowConfetti(false)} />}

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setFilter(chip.value)}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              filter === chip.value
                ? 'bg-sunset-coral text-white shadow-warm'
                : 'bg-sunset-rose/30 dark:bg-sunset-dark-surface text-sunset-text/70 dark:text-sunset-dark-text/70 hover:bg-sunset-rose/50',
            ].join(' ')}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && photos.length === 0 && (
        <div className="grid grid-cols-3 gap-1 px-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && photos.length === 0 && (
        <EmptyState tab="my" albumReady={albumReady} />
      )}

      {/* Grid */}
      {photos.length > 0 && (
        <MasonryGrid
          photos={photos}
          onPhotoClick={(idx) => setLightboxIndex(idx)}
          onLongPress={(id) => {
            startSelecting();
            toggle(id);
          }}
          selected={selected}
          isSelecting={isSelecting}
          onLoadMore={hasMore ? loadMore : undefined}
        />
      )}

      {/* Multi-select action bar */}
      <AnimatePresence>
        {isSelecting && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed bottom-20 inset-x-0 mx-auto max-w-sm z-40 flex items-center gap-3 bg-white dark:bg-sunset-dark-surface border border-sunset-rose/30 shadow-card rounded-2xl px-4 py-3"
          >
            <span className="flex-1 text-sm font-semibold text-sunset-text dark:text-sunset-dark-text">
              {selected.size} selected
            </span>
            <button
              onClick={handleDownloadZip}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sunset-coral text-white text-xs font-medium disabled:opacity-40 hover:bg-sunset-coral/90 transition"
            >
              <Download className="w-3.5 h-3.5" />
              ZIP
            </button>
            <button
              onClick={handleFavoriteSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sunset-rose/40 text-sunset-coral text-xs font-medium disabled:opacity-40 hover:bg-sunset-rose/60 transition"
              title="Favorite Selected"
            >
              <Heart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowMoveModal(true)}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--muted)]/20 text-[var(--text)] text-xs font-medium disabled:opacity-40 hover:bg-[var(--muted)]/30 transition"
              title="Move to Moment"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Move</span>
            </button>
            {isHost && (
              <button
                onClick={handleDeleteSelected}
                disabled={selected.size === 0}
                className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={clear}
              className="p-1.5 rounded-xl hover:bg-sunset-rose/30 text-sunset-text/50 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move photos modal */}
      <MomentsManagerModal
        eventId={eventId}
        hostId={userId}
        moments={moments}
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMomentsUpdated={() => {}}
        movePhotoIds={Array.from(selected)}
        onPhotosMoved={() => {
          clear();
          reset();
        }}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onFavorite={(photoId) => {
            const photo = photos.find((p) => p.id === photoId);
            if (photo) toggleFavorite(photoId, photo.isFavorited);
          }}
          onReport={() => {}}
          onHide={() => {}}
          onDownload={() => {}}
        />
      )}
    </div>
  );
}
