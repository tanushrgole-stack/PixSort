'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Share2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { applyEventAccent } from '@/lib/design-tokens';
import { MemberAvatars } from './MemberAvatars';
import { ProgressRing } from './ProgressRing';
import { MomentChips } from './MomentChips';

interface EventMember {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: 'host' | 'uploader' | 'guest';
  status: 'approved' | 'pending';
}

interface EventProgress {
  sorted: number;
  total: number;
  percent: number;
}

interface MomentTab {
  id: string | 'all';
  name: string;
  count?: number;
}

interface EventHeaderProps {
  event: {
    id: string;
    name: string;
    type: string;
    cover_url?: string;
    accent?: string;
    join_code: string;
  };
  members: EventMember[];
  progress: EventProgress;
  moments: MomentTab[];
  activeMoment: string | 'all';
  onMomentChange: (id: string) => void;
  canUpload: boolean;
  onUploadClick: () => void;
}

export function EventHeader({
  event,
  members,
  progress,
  moments,
  activeMoment,
  onMomentChange,
  canUpload,
  onUploadClick,
}: EventHeaderProps) {
  const [copied, setCopied] = useState(false);

  // Apply event-type accent on mount
  useEffect(() => {
    applyEventAccent(event.type);
  }, [event.type]);

  async function handleShare() {
    const text = `Join my PixSort event! Code: ${event.join_code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.name, text });
      } else {
        await navigator.clipboard.writeText(event.join_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: just copy code
      try {
        await navigator.clipboard.writeText(event.join_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore silently
      }
    }
  }

  // Build cover style: image or gradient fallback
  const coverStyle = event.cover_url
    ? {
        backgroundImage: `url(${event.cover_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background:
          'linear-gradient(135deg, var(--accent) 0%, var(--accent-alt) 100%)',
      };

  return (
    <>
      {/* ── Hero cover ──────────────────────────────────────────────────────── */}
      <div
        className="relative w-full h-48 md:h-64 overflow-hidden"
        style={coverStyle}
      >
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Top bar: Back + ThemeToggle + Share */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4">
          <Link
            href="/events"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/45 transition-colors"
            aria-label="Back to events"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/45 transition-colors relative"
              aria-label="Share event code"
            >
              <Share2 className="w-4 h-4" />
              {/* Copied confirmation */}
              <AnimatePresence>
                {copied && (
                  <motion.span
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: -36 }}
                    exit={{ opacity: 0, y: -42 }}
                    className="absolute left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap pointer-events-none"
                  >
                    Copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <ThemeToggle />
          </div>
        </div>

        {/* Bottom of cover: event name + badge */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 min-w-0">
              <h1
                className="text-white font-bold text-2xl md:text-3xl leading-tight truncate"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {event.name}
              </h1>
            </div>
            <Badge
              type={event.type as Parameters<typeof Badge>[0]['type']}
              size="sm"
              className="shrink-0 backdrop-blur-sm bg-white/20 text-white border-0"
            />
          </div>
        </div>
      </div>

      {/* ── Info card (overlapping cover) ───────────────────────────────────── */}
      <div
        className="relative z-10 mx-3 -mt-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] px-4 pt-5 pb-4"
        style={{ boxShadow: '0 4px 24px rgba(43,33,24,0.10)' }}
      >
        {/* Row: Avatars + ProgressRing */}
        <div className="flex items-center justify-between gap-4">
          <MemberAvatars members={members} max={6} total={members.length} />
          <ProgressRing
            sorted={progress.sorted}
            total={progress.total}
            size={72}
            strokeWidth={6}
          />
        </div>

        {/* "Sorted X of Y" label */}
        <p className="mt-2 text-xs text-[var(--text-secondary)] mb-3">
          {progress.total === 0
            ? 'Processing photos…'
            : `Sorted ${progress.sorted} of ${progress.total} photos`}
        </p>

        {/* Moment chips */}
        <div className="-mx-4">
          <MomentChips
            moments={moments}
            active={activeMoment}
            onChange={onMomentChange}
          />
        </div>
      </div>

      {/* ── Upload FAB ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {canUpload && (
          <motion.button
            key="upload-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08, y: -3 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={onUploadClick}
            aria-label="Upload photos"
            className="fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white"
            style={{
              background: 'linear-gradient(135deg, #FF6B4A 0%, #FF9966 100%)',
              boxShadow:
                '0 6px 24px rgba(255,107,74,0.45), 0 0 0 0 rgba(255,107,74,0.35)',
              animation: 'fab-pulse 2.4s ease-in-out infinite',
            }}
          >
            <Upload className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* FAB pulse keyframe (injected inline to avoid extra CSS file dependency) */}
      <style>{`
        @keyframes fab-pulse {
          0%, 100% { box-shadow: 0 6px 24px rgba(255,107,74,0.45), 0 0 0 0 rgba(255,107,74,0.35); }
          50%       { box-shadow: 0 6px 24px rgba(255,107,74,0.45), 0 0 0 10px rgba(255,107,74,0); }
        }
      `}</style>
    </>
  );
}
