'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Check, Folder } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import type { MomentTab } from '@/types/event-ui';

interface MomentsManagerModalProps {
  eventId: string;
  hostId?: string;
  moments: MomentTab[];
  isOpen: boolean;
  onClose: () => void;
  onMomentsUpdated: () => void;
  movePhotoIds?: string[];
  onPhotosMoved?: () => void;
}

export function MomentsManagerModal({
  eventId,
  hostId,
  moments,
  isOpen,
  onClose,
  onMomentsUpdated,
  movePhotoIds,
  onPhotosMoved,
}: MomentsManagerModalProps) {
  const { toast } = useToast();
  const [newMomentName, setNewMomentName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validMoments = moments.filter((m) => m.id !== 'all');

  const handleAddMoment = async () => {
    if (!newMomentName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/moments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: hostId || '00000000-0000-0000-0000-000000000001',
          name: newMomentName.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to add moment');
      setNewMomentName('');
      toast('Moment added successfully!', 'success');
      onMomentsUpdated();
    } catch {
      toast('Could not add moment. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameMoment = async (momentId: string) => {
    if (!editingName.trim()) return;
    try {
      const res = await fetch(`/api/events/${eventId}/moments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: hostId || '00000000-0000-0000-0000-000000000001',
          moment_id: momentId,
          name: editingName.trim(),
        }),
      });

      if (!res.ok) throw new Error();
      setEditingId(null);
      toast('Moment renamed!', 'success');
      onMomentsUpdated();
    } catch {
      toast('Failed to rename moment', 'error');
    }
  };

  const handleDeleteMoment = async (momentId: string) => {
    if (!confirm('Are you sure? Photos in this moment will remain in the event.')) return;
    try {
      const res = await fetch(`/api/events/${eventId}/moments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: hostId || '00000000-0000-0000-0000-000000000001',
          moment_id: momentId,
        }),
      });

      if (!res.ok) throw new Error();
      toast('Moment deleted', 'success');
      onMomentsUpdated();
    } catch {
      toast('Failed to delete moment', 'error');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= validMoments.length) return;

    const current = validMoments[index];
    const target = validMoments[targetIdx];

    try {
      await Promise.all([
        fetch(`/api/events/${eventId}/moments`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host_id: hostId || '00000000-0000-0000-0000-000000000001',
            moment_id: current.id,
            order: targetIdx + 1,
          }),
        }),
        fetch(`/api/events/${eventId}/moments`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host_id: hostId || '00000000-0000-0000-0000-000000000001',
            moment_id: target.id,
            order: index + 1,
          }),
        }),
      ]);
      onMomentsUpdated();
    } catch {
      toast('Failed to update order', 'error');
    }
  };

  const handleMovePhotosToMoment = async (momentId: string | null) => {
    if (!movePhotoIds || movePhotoIds.length === 0) return;
    try {
      const res = await fetch(`/api/events/${eventId}/photos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_ids: movePhotoIds,
          moment_id: momentId,
          host_id: hostId,
        }),
      });

      if (!res.ok) throw new Error();
      toast(`Moved ${movePhotoIds.length} photos!`, 'success');
      onPhotosMoved?.();
      onClose();
    } catch {
      toast('Could not move photos', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                {movePhotoIds && movePhotoIds.length > 0 ? 'Move Photos to Moment' : 'Manage Moments'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {movePhotoIds && movePhotoIds.length > 0
                  ? `Select a destination for ${movePhotoIds.length} photos`
                  : 'Add, rename or reorder event sub-albums'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick unassign option when moving photos */}
          {movePhotoIds && movePhotoIds.length > 0 && (
            <button
              onClick={() => handleMovePhotosToMoment(null)}
              className="w-full p-3 rounded-2xl border border-dashed border-[var(--border)] text-left hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition text-sm text-[var(--text-secondary)] flex items-center justify-between"
            >
              <span>None (Leave untagged)</span>
              <span className="text-xs bg-[var(--muted)]/20 px-2 py-0.5 rounded-full">All Photos pool</span>
            </button>
          )}

          {/* Add Moment input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMomentName}
              onChange={(e) => setNewMomentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMoment()}
              placeholder="e.g. Sangeet, Sunset Cruise, Day 2..."
              className="flex-1 px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              onClick={handleAddMoment}
              disabled={isSubmitting || !newMomentName.trim()}
              className="px-4 py-2.5 rounded-2xl bg-[var(--accent)] text-white text-sm font-medium hover:brightness-105 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Moments List */}
          <div className="space-y-2 pt-2">
            <AnimatePresence>
              {validMoments.map((moment, idx) => (
                <motion.div
                  key={moment.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[var(--accent)]/40 transition"
                >
                  {/* Order handles */}
                  {!movePhotoIds && (
                    <div className="flex flex-col gap-0.5 text-[var(--text-secondary)]">
                      <button
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        className="hover:text-[var(--accent)] disabled:opacity-20 transition"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === validMoments.length - 1}
                        className="hover:text-[var(--accent)] disabled:opacity-20 transition"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Name or Edit Field */}
                  <div className="flex-1 min-w-0 px-2">
                    {editingId === moment.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameMoment(moment.id as string)}
                          autoFocus
                          className="flex-1 px-2.5 py-1 text-sm rounded-xl border border-[var(--accent)] bg-[var(--surface)] text-[var(--text)] focus:outline-none"
                        />
                        <button
                          onClick={() => handleRenameMoment(moment.id as string)}
                          className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--muted)]/20 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-[var(--text)] truncate">
                          {moment.name}
                        </span>
                        {moment.count !== undefined && (
                          <span className="text-xs text-[var(--text-secondary)] bg-[var(--surface)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                            {moment.count} photos
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Move action OR Edit/Delete actions */}
                  {movePhotoIds && movePhotoIds.length > 0 ? (
                    <button
                      onClick={() => handleMovePhotosToMoment(moment.id as string)}
                      className="px-3 py-1 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:brightness-105 transition"
                    >
                      Move Here
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          setEditingId(moment.id as string);
                          setEditingName(moment.name);
                        }}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMoment(moment.id as string)}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-[var(--surface)] transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {validMoments.length === 0 && (
              <p className="text-center py-6 text-sm text-[var(--text-secondary)]">
                No moments created yet. Add one above!
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-[var(--muted)]/20 hover:bg-[var(--muted)]/30 text-sm font-medium text-[var(--text)] transition"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
