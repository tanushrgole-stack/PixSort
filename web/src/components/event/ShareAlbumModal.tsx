'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Copy, RefreshCw, Calendar, Eye } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

interface ShareAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  userId: string;
}

interface ShareLink {
  token: string;
  url: string;
  expires_at: string;
  view_count: number;
}

function QRCode({ value }: { value: string }) {
  // Simple visual QR placeholder (real QR would need a lib)
  return (
    <div className="w-32 h-32 rounded-xl border-2 border-[var(--border)] flex items-center justify-center bg-white p-2">
      <svg viewBox="0 0 21 21" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
        {/* Simple QR pattern placeholder */}
        <rect width="21" height="21" fill="white" />
        {/* Finder patterns */}
        <rect x="0" y="0" width="7" height="7" fill="black" />
        <rect x="1" y="1" width="5" height="5" fill="white" />
        <rect x="2" y="2" width="3" height="3" fill="black" />
        <rect x="14" y="0" width="7" height="7" fill="black" />
        <rect x="15" y="1" width="5" height="5" fill="white" />
        <rect x="16" y="2" width="3" height="3" fill="black" />
        <rect x="0" y="14" width="7" height="7" fill="black" />
        <rect x="1" y="15" width="5" height="5" fill="white" />
        <rect x="2" y="16" width="3" height="3" fill="black" />
        {/* Data pattern (decorative) */}
        {Array.from({ length: 5 }).map((_, i) =>
          Array.from({ length: 5 }).map((_, j) => {
            const on = (value.charCodeAt((i * 5 + j) % value.length) + i + j) % 3 === 0;
            return on ? <rect key={`${i}-${j}`} x={9 + j} y={9 + i} width="1" height="1" fill="black" /> : null;
          })
        )}
      </svg>
    </div>
  );
}

export default function ShareAlbumModal({ isOpen, onClose, eventId, userId }: ShareAlbumModalProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/share-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, label: 'My Album' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setShareLink(json);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink.url);
    toast('Link copied! 🔗', 'success');
  };

  const expiryLabel = shareLink
    ? new Date(shareLink.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] rounded-t-3xl shadow-card border-t border-[var(--border)] pb-safe max-w-lg mx-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  <Link2 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Share My Album
                </h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--muted)]/30 text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {!shareLink ? (
                <>
                  <p className="text-sm text-[var(--text-secondary)] text-center">
                    Create a read-only link so family and friends can view your photos without joining the event.
                  </p>
                  <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: 'var(--muted)' }}>
                    <span className="text-sm">🔒</span>
                    <span className="text-xs text-[var(--text-secondary)]">Link expires in 30 days · View only · No account needed</span>
                  </div>
                  <button
                    onClick={generate}
                    disabled={loading}
                    className="w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-alt))' }}
                  >
                    {loading ? 'Generating…' : '✨ Generate Share Link'}
                  </button>
                </>
              ) : (
                <>
                  {/* QR + Link */}
                  <div className="flex gap-4 items-start">
                    <QRCode value={shareLink.url} />
                    <div className="flex-1 space-y-2">
                      <div className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                        <p className="text-xs text-[var(--text-secondary)] font-mono break-all leading-relaxed">{shareLink.url}</p>
                      </div>
                      <button
                        onClick={copyLink}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white"
                        style={{ background: 'var(--accent)' }}
                      >
                        <Copy className="w-4 h-4" /> Copy Link
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3">
                    <div className="flex-1 p-3 rounded-2xl flex items-center gap-2" style={{ background: 'var(--muted)' }}>
                      <Calendar className="w-4 h-4 text-[var(--accent)]" />
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Expires</p>
                        <p className="text-sm font-semibold text-[var(--text)]">{expiryLabel}</p>
                      </div>
                    </div>
                    <div className="flex-1 p-3 rounded-2xl flex items-center gap-2" style={{ background: 'var(--muted)' }}>
                      <Eye className="w-4 h-4 text-[var(--accent)]" />
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Views</p>
                        <p className="text-sm font-semibold text-[var(--text)]">{shareLink.view_count}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={generate}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-2xl text-sm text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--muted)]/30 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate link (invalidates old)
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
