'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import Lightbox from '@/components/event/Lightbox';
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

interface Photo {
  id: string;
  storage_path: string;
  thumb_path?: string | null;
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  exif_lat?: number | null;
  exif_lng?: number | null;
  moment_id?: string | null;
  moments?: { name: string } | null;
}

interface TimelineGroup {
  date: string;
  label: string;
  momentGroups: { momentName: string; photos: Photo[] }[];
}

interface TimelineViewProps {
  eventId: string;
  userId?: string | null;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function groupByDateAndMoment(photos: Photo[]): TimelineGroup[] {
  const dateMap: Map<string, Map<string, Photo[]>> = new Map();

  for (const p of photos) {
    if (!p.taken_at) continue;
    const date = p.taken_at.split('T')[0];
    if (!dateMap.has(date)) dateMap.set(date, new Map());
    const momentName = (p.moments as { name: string } | null)?.name ?? 'General';
    const momentMap = dateMap.get(date)!;
    if (!momentMap.has(momentName)) momentMap.set(momentName, []);
    momentMap.get(momentName)!.push(p);
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, momentMap]) => ({
      date,
      label: formatDate(date),
      momentGroups: Array.from(momentMap.entries()).map(([momentName, photos]) => ({ momentName, photos })),
    }));
}

export default function TimelineView({ eventId, userId }: TimelineViewProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxPhotos, setLightboxPhotos] = useState<PhotoItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/all-photos?limit=500`);
      const json = await res.json();
      setPhotos(json.photos ?? []);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const groups = groupByDateAndMoment(photos);
  const hasGps = photos.some((p) => p.exif_lat);

  const openLightbox = (groupPhotos: Photo[], idx: number) => {
    const items: PhotoItem[] = groupPhotos.map((p) => ({
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
    setLightboxPhotos(items);
    setLightboxIndex(idx);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-32 rounded-xl" />
            <div className="flex gap-2 overflow-x-auto">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="flex-shrink-0 w-24 h-24 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <InlineEmpty
        emoji="🕰️"
        title="No timeline yet"
        message="Photos with date/time info will appear here as a timeline."
      />
    );
  }

  return (
    <div className="pb-4">
      {/* GPS hint */}
      {hasGps && (
        <div className="mx-4 mt-3 mb-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
          Some photos have GPS data · Map view coming soon
        </div>
      )}

      {/* Timeline */}
      <div className="relative ml-4 mt-4">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--accent)] via-[var(--accent-alt)] to-transparent opacity-30 rounded-full" />

        <div className="space-y-8 pl-10">
          {groups.map((group, gi) => (
            <motion.div
              key={group.date}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: gi * 0.05, duration: 0.3 }}
            >
              {/* Date dot + label */}
              <div className="flex items-center gap-2 -ml-10 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-soft"
                  style={{ background: 'var(--accent)' }}
                >
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                    {group.label}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {group.momentGroups.reduce((s, m) => s + m.photos.length, 0)} photos
                  </p>
                </div>
              </div>

              {/* Moment sub-groups */}
              <div className="space-y-4">
                {group.momentGroups.map((mg) => (
                  <div key={mg.momentName}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold text-[var(--accent)]">{mg.momentName}</span>
                      <ChevronRight className="w-3 h-3 text-[var(--text-secondary)]" />
                      <span className="text-xs text-[var(--text-secondary)]">{mg.photos.length} photos</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {mg.photos.map((photo, pi) => (
                        <button
                          key={photo.id}
                          onClick={() => openLightbox(mg.photos, pi)}
                          className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-200 shadow-soft"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.thumb_path ?? photo.storage_path}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {photo.exif_lat && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center">
                              <MapPin className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            photos={lightboxPhotos}
            initialIndex={lightboxIndex}
            onClose={() => { setLightboxIndex(null); setLightboxPhotos([]); }}
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
