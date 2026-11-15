'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PhotoItem } from '@/types/event-ui';

interface UsePhotosOptions {
  eventId: string;
  tab: 'my' | 'all';
  momentId?: string;
  filter?: 'solo' | 'group' | 'all';
  pageSize?: number;
}

interface UsePhotosResult {
  photos: PhotoItem[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  reset: () => void;
}

function mapToPhotoItem(raw: Record<string, unknown>): PhotoItem {
  const storage = String(raw.storage_path ?? raw.url ?? '');
  const thumb = String(raw.thumb_path ?? raw.thumbnail_path ?? raw.thumbUrl ?? storage);
  const rawFaces = (raw.faces ?? []) as Array<Record<string, unknown>>;
  const faces = rawFaces.map(f => {
    const bbox = (f.bbox ?? {}) as Record<string, number>;
    return {
      id: String(f.id ?? ''),
      x: Number(bbox.x ?? f.x ?? 0),
      y: Number(bbox.y ?? f.y ?? 0),
      w: Number(bbox.w ?? bbox.width ?? f.w ?? 0),
      h: Number(bbox.h ?? bbox.height ?? f.h ?? 0),
      personId: (f.person_id ?? f.personId) as string | undefined,
      personName: (f.person_name ?? f.personName) as string | undefined,
      isMe: Boolean(f.is_me ?? f.isMe ?? false),
    };
  });
  const faceCount = faces.length || Number(raw.face_count ?? raw.faceCount ?? 0);
  return {
    id: String(raw.id ?? ''),
    url: storage,
    thumbUrl: thumb,
    width: Number(raw.width ?? 1200),
    height: Number(raw.height ?? 800),
    momentId: (raw.moment_id ?? raw.momentId) as string | undefined,
    momentName: (raw.moment_name ?? raw.momentName) as string | undefined,
    uploaderId: (raw.uploaded_by ?? raw.uploader_id) as string | undefined,
    uploaderName: (raw.uploader_name ?? raw.uploaderName) as string | undefined,
    faceCount,
    isSolo: faceCount === 1,
    isFavorited: Boolean(raw.is_favorited ?? raw.isFavorited ?? false),
    isHidden: Boolean(raw.is_hidden ?? raw.isHidden ?? false),
    faces,
    status: String(raw.status ?? raw.processing_status ?? 'done') as PhotoItem['status'],
    takenAt: (raw.taken_at ?? raw.takenAt) as string | undefined,
  };
}

export function usePhotos({ eventId, tab, momentId, filter, pageSize = 30 }: UsePhotosOptions): UsePhotosResult {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(async (pageNum: number, replace = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (mountedRef.current) setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), pageSize: String(pageSize) });
      if (momentId && momentId !== 'all') params.set('moment', momentId);
      if (filter && filter !== 'all') params.set('filter', filter);
      const url = tab === 'my'
        ? `/api/events/${eventId}/album?${params}`
        : `/api/events/${eventId}/all-photos?${params}`;
      const res = await fetch(url);
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json();
      const raw: Array<Record<string, unknown>> = data.photos ?? data.items ?? (Array.isArray(data) ? data : []);
      const newPhotos = raw.map(mapToPhotoItem);
      const dataTotal = Number(data.total ?? raw.length);
      if (!mountedRef.current) return;
      setTotal(dataTotal);
      setPhotos(prev => replace ? newPhotos : [...prev, ...newPhotos]);
      setHasMore(newPhotos.length === pageSize);
    } catch {
      // silent
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [eventId, tab, momentId, filter, pageSize]); // eslint-disable-line

  useEffect(() => {
    mountedRef.current = true;
    setPhotos([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, true);
    return () => { mountedRef.current = false; };
  }, [eventId, tab, momentId, filter]); // eslint-disable-line

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  }, [hasMore, isLoading, page, fetchPage]);

  const reset = useCallback(() => {
    setPhotos([]); setPage(1); setHasMore(true); fetchPage(1, true);
  }, [fetchPage]);

  return { photos, total, hasMore, isLoading, loadMore, reset };
}
