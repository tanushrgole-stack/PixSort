'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, EyeOff, Sparkles, Trash2, ShieldCheck, ChevronRight } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

interface DuplicatePhoto {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  momentName?: string;
  uploaderName?: string;
  takenAt?: string;
}

interface DuplicateGroup {
  id: string;
  bestPhotoId: string;
  photos: DuplicatePhoto[];
}

interface DuplicateCleanupModalProps {
  eventId: string;
  userId?: string;
  isHost?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCleanupCompleted?: () => void;
}

export function DuplicateCleanupModal({
  eventId,
  userId,
  isHost = false,
  isOpen,
  onClose,
  onCleanupCompleted,
}: DuplicateCleanupModalProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [bestMap, setBestMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState<'hide' | 'delete'>('hide');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/api/events/${eventId}/duplicates`)
      .then((r) => (r.ok ? r.json() : { groups: [] }))
      .then((data) => {
        const list: DuplicateGroup[] = data.groups || [];
        setGroups(list);
        const map: Record<string, string> = {};
        for (const g of list) {
          map[g.id] = g.bestPhotoId || g.photos[0]?.id;
        }
        setBestMap(map);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [eventId, isOpen]);

  if (!isOpen) return null;

  const handleSelectBest = (groupId: string, photoId: string) => {
    setBestMap((prev) => ({ ...prev, [groupId]: photoId }));
  };

  const handleResolveGroup = async (group: DuplicateGroup) => {
    const bestId = bestMap[group.id] || group.bestPhotoId;
    const hideIds = group.photos.map((p) => p.id).filter((id) => id !== bestId);
    if (hideIds.length === 0) return;

    setResolvingId(group.id);
    try {
      const res = await fetch(`/api/events/${eventId}/duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          best_photo_id: bestId,
          hide_photo_ids: hideIds,
          user_id: userId,
          action: isHost && actionType === 'delete' ? 'delete' : 'hide',
        }),
      });

      if (!res.ok) throw new Error();
      toast(
        isHost && actionType === 'delete'
          ? `Removed ${hideIds.length} duplicate shots!`
          : `Kept best photo and hid ${hideIds.length} similar shots`,
        'success'
      );

      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      onCleanupCompleted?.();
    } catch {
      toast('Failed to resolve duplicates', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAll = async () => {
    for (const group of groups) {
      await handleResolveGroup(group);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-soft">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                Duplicate & Burst Cleanup
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                AI groups similar poses and burst shots — pick the best, hide the rest
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--muted)]/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action settings bar (if host) */}
        {isHost && groups.length > 0 && (
          <div className="px-6 py-2.5 bg-[var(--muted)]/10 border-b border-[var(--border)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-secondary)] font-medium">Resolution method:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActionType('hide')}
                className={`px-3 py-1 rounded-xl font-medium transition ${
                  actionType === 'hide'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'
                }`}
              >
                Hide duplicates for everyone
              </button>
              <button
                onClick={() => setActionType('delete')}
                className={`px-3 py-1 rounded-xl font-medium transition ${
                  actionType === 'delete'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'
                }`}
              >
                Permanently delete duplicates
              </button>
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-3xl bg-[var(--bg)] border border-[var(--border)] animate-pulse space-y-3">
                  <div className="h-4 w-32 bg-[var(--muted)]/20 rounded-full" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-square bg-[var(--muted)]/20 rounded-2xl" />
                    <div className="aspect-square bg-[var(--muted)]/20 rounded-2xl" />
                    <div className="aspect-square bg-[var(--muted)]/20 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                Your album is clean!
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto">
                No duplicate or burst shots found across this event pool.
              </p>
            </div>
          ) : (
            groups.map((group, groupIdx) => {
              const currentBest = bestMap[group.id] || group.bestPhotoId;
              const isResolving = resolvingId === group.id;

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-3xl bg-[var(--bg)] border border-[var(--border)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                        Cluster #{groupIdx + 1}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {group.photos.length} similar shots
                      </span>
                    </div>

                    <button
                      onClick={() => handleResolveGroup(group)}
                      disabled={isResolving}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-alt)] text-white text-xs font-semibold shadow-soft hover:opacity-95 transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Keep Best Shot
                    </button>
                  </div>

                  {/* Photo comparison grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {group.photos.map((photo) => {
                      const isBest = currentBest === photo.id;
                      return (
                        <div
                          key={photo.id}
                          onClick={() => handleSelectBest(group.id, photo.id)}
                          className={`relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                            isBest
                              ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20 shadow-md scale-[1.02]'
                              : 'border-[var(--border)] opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="aspect-[4/3] bg-black/10 overflow-hidden">
                            <img
                              src={photo.thumbUrl}
                              alt="Shot"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>

                          {/* Best badge or Hide badge */}
                          <div className="absolute top-2 left-2">
                            {isBest ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow">
                                <Check className="w-3 h-3" /> BEST
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white/90 text-[10px] font-medium backdrop-blur-sm">
                                <EyeOff className="w-2.5 h-2.5" /> Will hide
                              </span>
                            )}
                          </div>

                          <div className="p-2 bg-[var(--surface)] text-[10px] text-[var(--text-secondary)] flex items-center justify-between border-t border-[var(--border)]">
                            <span>{photo.width} × {photo.height}</span>
                            <span>{photo.uploaderName || 'Guest'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {groups.length > 0 && (
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/60 flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">
              {groups.length} duplicate clusters detected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleResolveAll}
                className="px-4 py-2 rounded-2xl bg-[var(--accent)] text-white text-xs font-semibold hover:brightness-105 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Resolve All Clusters
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-2xl bg-[var(--muted)]/20 text-xs font-medium text-[var(--text)] hover:bg-[var(--muted)]/30 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
