'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Crown,
  UserCheck,
  UserX,
  UploadCloud,
  Settings,
  Shield,
  Trash2,
  Folder,
  Copy,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import type { EventMember } from '@/types/event-ui';

interface HostToolsModalProps {
  eventId: string;
  hostId: string;
  uploadMode: 'everyone' | 'selected';
  requireApproval: boolean;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
  onOpenMoments: () => void;
  onOpenDuplicates: () => void;
}

type TabType = 'requests' | 'members' | 'settings';

export function HostToolsModal({
  eventId,
  hostId,
  uploadMode,
  requireApproval,
  isOpen,
  onClose,
  onEventUpdated,
  onOpenMoments,
  onOpenDuplicates,
}: HostToolsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [pendingMembers, setPendingMembers] = useState<EventMember[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<EventMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Settings form state
  const [selectedUploadMode, setSelectedUploadMode] = useState(uploadMode);
  const [selectedRequireApproval, setSelectedRequireApproval] = useState(requireApproval);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/events/${eventId}/members`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rawList: Array<Record<string, unknown>> = data.members || [];

      const parsed: EventMember[] = rawList.map((m) => {
        const u = (m.users as Record<string, unknown>) || {};
        return {
          userId: String(m.user_id || u.id || ''),
          name: String(u.name || 'Guest'),
          role: String(m.role || 'guest') as EventMember['role'],
          status: String(m.status || 'approved') as EventMember['status'],
        };
      });

      setPendingMembers(parsed.filter((m) => m.status === 'pending'));
      setApprovedMembers(parsed.filter((m) => m.status === 'approved'));
    } catch {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedUploadMode(uploadMode);
      setSelectedRequireApproval(requireApproval);
      fetchMembers();
    }
  }, [isOpen, eventId, uploadMode, requireApproval]);

  if (!isOpen) return null;

  const handleMemberAction = async (
    userId: string,
    action: 'approve' | 'reject' | 'assign_uploader' | 'revoke_uploader'
  ) => {
    try {
      const res = await fetch(`/api/events/${eventId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: hostId,
          user_id: userId,
          action,
        }),
      });

      if (!res.ok) throw new Error();

      const messages: Record<string, string> = {
        approve: 'Member approved!',
        reject: 'Member removed',
        assign_uploader: 'Assigned as uploader',
        revoke_uploader: 'Revoked uploader permissions',
      };
      toast(messages[action] || 'Action completed', 'success');
      fetchMembers();
      onEventUpdated();
    } catch {
      toast('Failed to perform member action', 'error');
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: hostId,
          upload_mode: selectedUploadMode,
          require_approval: selectedRequireApproval,
        }),
      });

      if (!res.ok) throw new Error();
      toast('Event settings updated!', 'success');
      onEventUpdated();
    } catch {
      toast('Could not save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-soft">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                Host Dashboard & Controls
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Manage members, join requests, moments, and permissions
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

        {/* Quick management shortcuts */}
        <div className="px-6 py-3 bg-[var(--bg)]/40 border-b border-[var(--border)] flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              onClose();
              onOpenMoments();
            }}
            className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition flex items-center gap-1.5 shrink-0"
          >
            <Folder className="w-3.5 h-3.5" />
            Manage Moments
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenDuplicates();
            }}
            className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition flex items-center gap-1.5 shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            Clean Up Duplicates
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[var(--border)] px-6 bg-[var(--surface)]">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'requests'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Join Requests
            {pendingMembers.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingMembers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'members'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Members & Roles ({approvedMembers.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'settings'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Event Settings
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Join requests */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {loadingMembers ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">Loading requests...</div>
              ) : pendingMembers.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text)]">No pending requests</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Anyone with the link can join directly unless approval is enabled.
                  </p>
                </div>
              ) : (
                pendingMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">{member.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Awaiting approval to view & upload</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMemberAction(member.userId, 'approve')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition flex items-center gap-1 shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleMemberAction(member.userId, 'reject')}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-semibold transition flex items-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Members & Roles */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              {approvedMembers.map((member) => {
                const isHostUser = member.role === 'host';
                const isUploader = member.role === 'uploader';

                return (
                  <div
                    key={member.userId}
                    className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-alt)] text-white text-xs font-bold flex items-center justify-center">
                        {member.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-[var(--text)]">{member.name}</p>
                          {isHostUser && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 font-semibold">
                              👑 Host
                            </span>
                          )}
                          {isUploader && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-semibold">
                              📷 Uploader
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Approved guest</p>
                      </div>
                    </div>

                    {!isHostUser && (
                      <div className="flex items-center gap-2">
                        {isUploader ? (
                          <button
                            onClick={() => handleMemberAction(member.userId, 'revoke_uploader')}
                            className="px-2.5 py-1 rounded-xl bg-[var(--muted)]/20 hover:bg-[var(--muted)]/30 text-xs font-medium text-[var(--text)] transition"
                          >
                            Demote to Guest
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMemberAction(member.userId, 'assign_uploader')}
                            className="px-2.5 py-1 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 text-xs font-semibold transition"
                          >
                            + Make Uploader
                          </button>
                        )}
                        <button
                          onClick={() => handleMemberAction(member.userId, 'reject')}
                          className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition"
                          title="Remove from event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: Event Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Upload mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                  Upload Permission Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedUploadMode('everyone')}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      selectedUploadMode === 'everyone'
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-[var(--text)]">Everyone</span>
                      {selectedUploadMode === 'everyone' && <Check className="w-4 h-4 text-[var(--accent)]" />}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Any guest who joins can upload photos.
                    </p>
                  </button>

                  <button
                    onClick={() => setSelectedUploadMode('selected')}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      selectedUploadMode === 'selected'
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-[var(--text)]">Selected Uploaders</span>
                      {selectedUploadMode === 'selected' && <Check className="w-4 h-4 text-[var(--accent)]" />}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Only host & designated uploaders can add photos.
                    </p>
                  </button>
                </div>
              </div>

              {/* Approval toggle */}
              <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-[var(--text)]">Require Host Approval</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    New guests enter a waiting room until you approve them.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRequireApproval(!selectedRequireApproval)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    selectedRequireApproval ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                  }`}
                >
                  <motion.div
                    animate={{ x: selectedRequireApproval ? 26 : 2 }}
                    className="w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5"
                  />
                </button>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full py-3 rounded-2xl bg-[var(--accent)] text-white text-sm font-bold shadow-soft hover:brightness-105 transition disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-[var(--muted)]/20 text-xs font-semibold text-[var(--text)] hover:bg-[var(--muted)]/30 transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
