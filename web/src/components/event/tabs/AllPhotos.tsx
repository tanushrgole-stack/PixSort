'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Heart, X, Folder, Trash2 } from 'lucide-react';
import { usePhotos } from '@/hooks/usePhotos';
import { useFavorite } from '@/hooks/useFavorite';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import { useToast } from '@/providers/ToastProvider';
import MasonryGrid from '@/components/event/MasonryGrid';
import Lightbox from '@/components/event/Lightbox';
import EmptyState from '@/components/event/EmptyState';
import { MomentsManagerModal } from '@/components/event/MomentsManagerModal';
import type { MomentTab } from '@/types/event-ui';

interface AllPhotosProps {
  eventId: string;
  activeMoment: string | 'all';
  userId?: string;
  moments?: MomentTab[];
  isHost?: boolean;
}

export default function AllPhotos({
  eventId,
  activeMoment,
  userId,
  moments = [],
  isHost = false,
}: AllPhotosProps) {
  const { photos, isLoading, hasMore, loadMore, reset } = usePhotos({
    eventId,
    tab: 'all',
    momentId: activeMoment === 'all' ? undefined : activeMoment,
    pageSize: 30,
  });
  const { toggle: toggleFav } = useFavorite(userId);
  const { selected, isSelecting, toggle, clear, startSelecting } = useMultiSelect();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const { toast } = useToast();

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
      a.download = `event-${eventId}-photos.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Downloaded ${selected.size} photos`, 'success');
      clear();
    } catch {
      toast('Download failed. Please try again.', 'error');
    }
  }, [selected, eventId, clear, toast]);

  const handleFavoriteSelected = useCallback(async () => {
    for (const id of selected) {
      const photo = photos.find((p) => p.id === id);
      if (photo) await toggleFav(id, photo.isFavorited);
    }
    toast(`Favorited ${selected.size} photos`, 'success');
    clear();
  }, [selected, photos, toggleFav, clear, toast]);

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
      toast(`Removed ${selected.size} photo(s)`, 'success');
      clear();
      reset();
    } catch {
      toast('Could not delete photos', 'error');
    }
  }, [selected, eventId, userId, clear, reset, toast]);

  if (!isLoading && photos.length === 0) {
    return <EmptyState tab="all" />;
  }

  return (
    <div className="relative">
      <MasonryGrid
        photos={photos}
        onPhotoClick={(idx) => setLightboxIdx(idx)}
        onLongPress={(id) => {
          startSelecting();
          toggle(id);
        }}
        selected={selected}
        isSelecting={isSelecting}
        onLoadMore={hasMore ? loadMore : undefined}
      />

      {/* Multi-select bar */}
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

      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onFavorite={(id, val) => toggleFav(id, val)}
          onReport={() => {}}
          onHide={() => {}}
          onDownload={() => {}}
        />
      )}
    </div>
  );
}
