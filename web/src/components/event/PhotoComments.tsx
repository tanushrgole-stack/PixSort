'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Send, Trash2 } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

const REACTIONS = ['❤️', '😂', '🔥', '😍', '👏', '😢'];

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  content: string | null;
  reaction: string | null;
  created_at: string;
}

interface PhotoCommentsProps {
  eventId: string;
  photoId: string;
  userId?: string | null;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PhotoComments({
  eventId, photoId, userId, userName = 'Guest', isOpen, onClose
}: PhotoCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!photoId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/comments?photo_id=${photoId}`);
      const json = await res.json();
      setComments(json.comments ?? []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, photoId]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const sendReaction = async (reaction: string) => {
    if (!userId) { toast('Join to react', 'info'); return; }
    try {
      await fetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_id: photoId, user_id: userId, user_name: userName, reaction }),
      });
      load();
    } catch { /* ignore */ }
  };

  const sendComment = async () => {
    if (!text.trim() || !userId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_id: photoId, user_id: userId, user_name: userName, content: text.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setText('');
      load();
    } catch {
      toast('Could not send comment', 'error');
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (id: string) => {
    if (!userId) return;
    await fetch(`/api/events/${eventId}/comments?comment_id=${id}&user_id=${userId}`, { method: 'DELETE' });
    setComments((c) => c.filter((x) => x.id !== id));
  };

  // Count reactions
  const reactionCounts: Record<string, number> = {};
  for (const c of comments) {
    if (c.reaction) reactionCounts[c.reaction] = (reactionCounts[c.reaction] ?? 0) + 1;
  }
  const textComments = comments.filter((c) => c.content);
  const visibleComments = expanded ? textComments : textComments.slice(0, 3);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-md rounded-t-2xl"
          style={{ maxHeight: '60%', overflowY: 'auto' }}
        >
          {/* Handle bar */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-white/80 text-sm font-semibold">
              💬 Comments {textComments.length > 0 && `(${textComments.length})`}
            </span>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick reactions */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => sendReaction(r)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm"
              >
                <span>{r}</span>
                {reactionCounts[r] ? (
                  <span className="text-white/70 text-xs">{reactionCounts[r]}</span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Comments list */}
          {loading ? (
            <div className="px-4 pb-3 text-white/40 text-sm">Loading…</div>
          ) : visibleComments.length === 0 ? (
            <div className="px-4 pb-3 text-white/40 text-sm italic">Be the first to comment…</div>
          ) : (
            <div className="px-4 space-y-2 pb-2">
              {visibleComments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 group">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-alt)] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {c.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white/90 text-xs font-semibold">{c.user_name} </span>
                    <span className="text-white/70 text-xs">{c.content}</span>
                    <div className="text-white/30 text-[10px] mt-0.5">{timeAgo(c.created_at)}</div>
                  </div>
                  {c.user_id === userId && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              {textComments.length > 3 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-white/50 text-xs hover:text-white/80 transition-colors"
                >
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expanded ? 'Show less' : `See ${textComments.length - 3} more`}
                </button>
              )}
            </div>
          )}

          {/* Comment input */}
          <div className="flex items-center gap-2 px-4 pb-4 pt-2 border-t border-white/10">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); }}}
              placeholder={userId ? 'Add a comment…' : 'Join to comment'}
              disabled={!userId || sending}
              className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
            />
            <button
              onClick={sendComment}
              disabled={!text.trim() || !userId || sending}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
