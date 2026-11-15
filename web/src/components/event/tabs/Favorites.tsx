'use client';

import { useState, useEffect } from 'react';
import { useFavorite } from '@/hooks/useFavorite';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import MasonryGrid from '@/components/event/MasonryGrid';
import Lightbox from '@/components/event/Lightbox';
import EmptyState from '@/components/event/EmptyState';
import { Skeleton } from '@/components/ui';
import type { PhotoItem } from '@/types/event-ui';

interface FavoritesProps {
  eventId: string;
  userId?: string;
  activeMoment: string | 'all';
}

export default function Favorites({ eventId, userId, activeMoment }: FavoritesProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const { toggle: toggleFav } = useFavorite(userId);
  const { selected, isSelecting, toggle, longPressProps } = useMultiSelect();

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    fetch(`/api/users/${userId}/favorites`)
      .then(r => r.ok ? r.json() : { favorites: [] })
      .then(data => {
        const raw: Array<Record<string, unknown>> = data.photos ?? data.favorites ?? data ?? [];
        const items: PhotoItem[] = raw.map(p => ({
          id: String(p.id ?? ''),
          url: String(p.storage_path ?? p.url ?? ''),
          thumbUrl: String(p.thumb_path ?? p.thumbnail_path ?? p.url ?? ''),
          width: Number(p.width ?? 1200),
          height: Number(p.height ?? 800),
          momentId: (p.moment_id ?? undefined) as string | undefined,
          momentName: (p.moment_name ?? undefined) as string | undefined,
          uploaderName: (p.uploader_name ?? undefined) as string | undefined,
          faceCount: Number(p.face_count ?? 0),
          isSolo: Number(p.face_count ?? 0) === 1,
          isFavorited: true,
          isHidden: false,
          faces: [],
          status: 'done',
        }));
        setPhotos(items);
      })
      .catch(() => setPhotos([]))
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1 p-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (!userId || photos.length === 0) return <EmptyState tab="favorites" />;

  const filtered = activeMoment === 'all' ? photos : photos.filter(p => p.momentId === activeMoment);

  return (
    <div>
      <MasonryGrid
        photos={filtered}
        onPhotoClick={(idx) => setLightboxIdx(idx)}
        onLongPress={(id) => toggle(id)}
        selected={selected}
        isSelecting={isSelecting}
      />
      {lightboxIdx !== null && (
        <Lightbox
          photos={filtered}
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
