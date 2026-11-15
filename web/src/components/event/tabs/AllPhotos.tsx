'use client';

import { motion } from 'framer-motion';
import { usePhotos } from '@/hooks/usePhotos';
import { useFavorite } from '@/hooks/useFavorite';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import MasonryGrid from '@/components/event/MasonryGrid';
import Lightbox from '@/components/event/Lightbox';
import EmptyState from '@/components/event/EmptyState';
import { useState } from 'react';

interface AllPhotosProps {
  eventId: string;
  activeMoment: string | 'all';
  userId?: string;
}

export default function AllPhotos({ eventId, activeMoment, userId }: AllPhotosProps) {
  const { photos, isLoading, hasMore, loadMore } = usePhotos({
    eventId,
    tab: 'all',
    momentId: activeMoment === 'all' ? undefined : activeMoment,
    pageSize: 30,
  });
  const { toggle: toggleFav } = useFavorite(userId);
  const { selected, isSelecting, toggle, longPressProps, stopSelecting } = useMultiSelect();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (!isLoading && photos.length === 0) {
    return <EmptyState tab="all" />;
  }

  return (
    <div className="relative">
      <MasonryGrid
        photos={photos}
        onPhotoClick={(idx) => setLightboxIdx(idx)}
        onLongPress={(id) => { toggle(id); }}
        selected={selected}
        isSelecting={isSelecting}
        onLoadMore={hasMore ? loadMore : undefined}
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
