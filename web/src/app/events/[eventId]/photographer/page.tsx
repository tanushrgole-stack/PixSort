'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Upload, CheckCircle2, AlertCircle, Clock, Loader2, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getGuestSession } from '@/lib/guest-session';
import { Skeleton } from '@/components/ui';

interface DashboardData {
  uploaded_by_me: number;
  total_event: number;
  processing_breakdown: { pending: number; processing: number; done: number; failed: number };
  recent_uploads: Array<{ id: string; thumb_path?: string | null; storage_path: string; status: string; taken_at?: string }>;
  moments_coverage: Array<{ id: string; name: string; order_index: number; photo_count: number }>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'done') return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
  if (status === 'failed') return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  if (status === 'processing') return <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />;
  return <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />;
}

export default function PhotographerPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const session = getGuestSession();
  const userId = session?.userId;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/photographer?user_id=${userId}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Error'); return; }
      setData(json);
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [eventId, userId]);

  useEffect(() => { load(); }, [load]);

  if (!userId) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Camera className="w-12 h-12 text-[var(--accent)]" />
        <h1 className="text-xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
          Photographer Mode
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">Please join the event first.</p>
        <Link href={`/events/${eventId}`} className="text-[var(--accent)] text-sm font-semibold hover:underline">
          Go to event →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      {/* Header */}
      <div
        className="relative py-10 px-5"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-alt) 100%)' }}
      >
        <Link href={`/events/${eventId}`} className="inline-flex items-center gap-1.5 text-white/80 hover:text-white mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to event
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              Photographer Mode
            </h1>
            <p className="text-white/70 text-sm">Your upload stats & processing status</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-500">{error}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Only hosts and uploaders can access this dashboard.</p>
        </div>
      )}

      {data && (
        <div className="p-4 space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'My Uploads', value: data.uploaded_by_me, icon: <Upload className="w-5 h-5" />, color: 'var(--accent)' },
              { label: 'Total Event', value: data.total_event, icon: <ImageIcon className="w-5 h-5" />, color: 'var(--accent-alt)' },
              { label: 'Processed', value: data.processing_breakdown.done, icon: <CheckCircle2 className="w-5 h-5" />, color: '#22c55e' },
              { label: 'Failed', value: data.processing_breakdown.failed, icon: <AlertCircle className="w-5 h-5" />, color: '#ef4444' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-soft"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[var(--text-secondary)] text-xs">{stat.label}</span>
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                </div>
                <p className="text-3xl font-black" style={{ color: stat.color, fontFamily: 'var(--font-heading)' }}>
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Processing breakdown bar */}
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text)] mb-3">Processing Status</p>
            {data.total_event > 0 ? (
              <div className="space-y-2.5">
                {([
                  { label: 'Done', key: 'done', color: '#22c55e' },
                  { label: 'Processing', key: 'processing', color: '#f59e0b' },
                  { label: 'Pending', key: 'pending', color: '#94a3b8' },
                  { label: 'Failed', key: 'failed', color: '#ef4444' },
                ] as const).map(({ label, key, color }) => {
                  const count = data.processing_breakdown[key];
                  const pct = data.total_event > 0 ? Math.round((count / data.total_event) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-secondary)]">{label}</span>
                        <span style={{ color }}>{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--muted)]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-2 rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] text-center py-2">No photos in this event yet</p>
            )}
          </div>

          {/* Moments coverage */}
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text)] mb-3">Moments Coverage</p>
            <div className="space-y-2">
              {data.moments_coverage.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text)]">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-[var(--muted)]">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (m.photo_count / Math.max(1, data.total_event)) * 100 * 3)}%`,
                          background: 'var(--accent)',
                        }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] w-8 text-right">{m.photo_count}</span>
                  </div>
                </div>
              ))}
              {data.moments_coverage.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-2">No moments set up yet</p>
              )}
            </div>
          </div>

          {/* Recent uploads */}
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text)] mb-3">Recent Uploads ({data.recent_uploads.length})</p>
            {data.recent_uploads.length === 0 ? (
              <div className="text-center py-4 space-y-2">
                <Upload className="w-8 h-8 text-[var(--muted)] mx-auto" />
                <p className="text-sm text-[var(--text-secondary)]">No uploads yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recent_uploads.map((photo) => (
                  <div key={photo.id} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumb_path ?? photo.storage_path}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text)] truncate">{photo.id.slice(0, 8)}…</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {photo.taken_at ? new Date(photo.taken_at).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={photo.status} />
                      <span className="text-xs text-[var(--text-secondary)] capitalize">{photo.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href={`/events/${eventId}`}
            className="block w-full text-center py-3 rounded-2xl font-semibold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-alt))' }}
          >
            Upload More Photos
          </Link>
        </div>
      )}
    </div>
  );
}
