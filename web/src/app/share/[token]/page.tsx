'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, Calendar, Eye, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui';

interface ShareData {
  event: { id: string; title: string; type: string };
  person: { id: string; name: string; face_thumb_url: string | null } | null;
  label: string | null;
  expires_at: string;
  view_count: number;
  photos: Array<{
    id: string;
    storage_path: string;
    thumb_path?: string | null;
    width?: number | null;
    height?: number | null;
    taken_at?: string | null;
  }>;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setData(json);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-4 space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-4 p-6">
        <span className="text-5xl">🔗</span>
        <h1 className="text-xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
          {error === 'Link has expired' ? 'This link has expired' : 'Link not found'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] text-center">
          {error === 'Link has expired'
            ? 'The person who shared this album can generate a new link.'
            : 'This share link is invalid or has been revoked.'}
        </p>
      </div>
    );
  }

  const expiryLabel = new Date(data.expires_at).toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div
        className="relative py-10 px-6 text-center"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-alt) 100%)' }}
      >
        {data.person?.face_thumb_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.person.face_thumb_url}
            alt={data.person.name}
            className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-4 border-white/40 shadow-lg"
          />
        )}
        {!data.person?.face_thumb_url && (
          <div className="w-20 h-20 rounded-full bg-white/20 mx-auto mb-3 flex items-center justify-center">
            <span className="text-3xl">📷</span>
          </div>
        )}
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          {data.person?.name ?? 'Shared Album'}
        </h1>
        <p className="text-white/80 text-sm mt-1">{data.event.title}</p>
        {data.label && <p className="text-white/60 text-xs mt-0.5">{data.label}</p>}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-6 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <ImageIcon className="w-4 h-4" />
          {data.photos.length} photos
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <Eye className="w-4 h-4" />
          {data.view_count} views
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <Calendar className="w-4 h-4" />
          Expires {expiryLabel}
        </div>
      </div>

      {/* Grid */}
      {data.photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
          <span className="text-4xl">🌅</span>
          <p className="text-[var(--text-secondary)] text-sm">No photos in this album yet.</p>
        </div>
      ) : (
        <div className="p-2 grid grid-cols-3 gap-1">
          {data.photos.map((photo, i) => (
            <motion.button
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02, duration: 0.2 }}
              onClick={() => setLightboxSrc(photo.storage_path)}
              className="relative aspect-square overflow-hidden rounded-xl hover:scale-[1.03] transition-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumb_path ?? photo.storage_path}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.button>
          ))}
        </div>
      )}

      {/* Simple lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={lightboxSrc}
            download
            className="absolute bottom-8 right-8 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-5 h-5 text-black" />
          </a>
        </div>
      )}

      {/* Footer */}
      <div className="py-8 text-center">
        <p className="text-xs text-[var(--text-secondary)]">Powered by PixSort · View only</p>
      </div>
    </div>
  );
}
