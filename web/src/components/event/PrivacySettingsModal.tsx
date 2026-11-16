'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Scan, Eye, EyeOff, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  eventId?: string;
}

interface PrivacySettings {
  face_opt_out: boolean;
  consent_at: string | null;
  delete_requested_at: string | null;
  updated_at: string | null;
}

export default function PrivacySettingsModal({ isOpen, onClose, userId, eventId }: PrivacySettingsModalProps) {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/privacy`);
      const json = await res.json();
      setSettings(json);
    } catch {
      setSettings({ face_opt_out: false, consent_at: null, delete_requested_at: null, updated_at: null });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  const toggleFaceOptOut = async () => {
    if (!settings) return;
    setSaving(true);
    const newVal = !settings.face_opt_out;
    try {
      const res = await fetch(`/api/users/${userId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ face_opt_out: newVal }),
      });
      if (!res.ok) throw new Error('Failed');
      setSettings({ ...settings, face_opt_out: newVal });
      toast(newVal ? 'Face matching disabled · Your data will be removed.' : 'Face matching enabled', newVal ? 'info' : 'success');
    } catch {
      toast('Could not update setting', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestDeletion = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/privacy`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast(`All face data deleted (${json.person_ids_cleared} records cleared) 🗑️`, 'success');
      setShowDeleteConfirm(false);
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

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
            style={{ maxHeight: '85svh', overflowY: 'auto' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-[var(--surface)]">
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] sticky top-5 bg-[var(--surface)] z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Privacy & Data
                </h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--muted)]/30 text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-2xl bg-[var(--muted)]/40 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Face Matching Toggle */}
                  <div className="flex items-start justify-between gap-3 p-4 rounded-2xl" style={{ background: 'var(--muted)' }}>
                    <div className="flex items-start gap-3">
                      <Scan className="w-5 h-5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">AI Face Matching</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          When off, your face won't be recognised in future photos. Existing face data will be deleted.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleFaceOptOut}
                      disabled={saving}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${settings?.face_opt_out ? 'bg-[var(--muted)]' : ''}`}
                      style={{ background: settings?.face_opt_out ? 'var(--muted)' : 'var(--accent)' }}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                        style={{ left: settings?.face_opt_out ? '2px' : '26px' }}
                      />
                    </button>
                  </div>

                  {/* Hide my photos */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'var(--muted)' }}>
                    <EyeOff className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--text)]">Hide Photos of Me</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Go to My Photos tab → select photos → hide
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>

                  {/* Consent info */}
                  {settings?.consent_at && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'var(--muted)' }}>
                      <Shield className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">Consent Given</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {new Date(settings.consent_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Deletion requested */}
                  {settings?.delete_requested_at && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-600">Deletion Requested</p>
                        <p className="text-xs text-red-400">
                          Your face data was removed on {new Date(settings.delete_requested_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Delete face data */}
                  {!settings?.delete_requested_at && !showDeleteConfirm && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-red-500 border border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete All My Face Data
                    </button>
                  )}

                  {showDeleteConfirm && (
                    <div className="p-4 rounded-2xl border border-red-300 bg-red-50 dark:bg-red-500/10 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-red-600">Confirm Deletion</p>
                          <p className="text-xs text-red-500 mt-0.5">
                            This will permanently delete your face embeddings and recognition data from all events. You won't appear in AI-sorted albums after this.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--muted)]/30 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={requestDeletion}
                          disabled={saving}
                          className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
                        >
                          {saving ? 'Deleting…' : 'Yes, Delete'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Privacy policy link */}
                  <a
                    href="/privacy"
                    className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[var(--accent)]" />
                      <span className="text-sm font-medium text-[var(--text)]">Privacy Notice & DPDP Rights</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[var(--text-secondary)]" />
                  </a>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
