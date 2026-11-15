'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles } from 'lucide-react';
import { getGuestSession } from '@/lib/guest-session';
import { Button } from '@/components/ui';
import SelfieScan from '@/components/SelfieScan';

type ScanPhase = 'ready' | 'scanning' | 'processing' | 'finding' | 'done';

const PROGRESS_MESSAGES = [
  'Analysing your face…',
  'Scanning the photo pool…',
  'Finding your best angles…',
  'Almost done — checking every face…',
  'Building your personal album…',
];

export default function ScanPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<ScanPhase>('ready');
  const [msgIdx, setMsgIdx] = useState(0);
  const [photoCount, setPhotoCount] = useState<number | null>(null);

  const session = getGuestSession();

  // Rotate progress messages while finding
  useEffect(() => {
    if (phase !== 'finding') return;
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % PROGRESS_MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [phase]);

  // Fetch photo count for the event
  useEffect(() => {
    if (!session?.eventId) return;
    fetch(`/api/events/${session.eventId}/progress`)
      .then((r) => r.json())
      .then((d) => setPhotoCount(d.total ?? 0))
      .catch(() => {});
  }, [session?.eventId]);

  function handleEnrollComplete(_personId?: string) {
    setPhase('finding');
    // After 3s simulate "found" and redirect
    setTimeout(() => {
      setPhase('done');
      setTimeout(() => {
        router.push(`/events/${session?.eventId ?? ''}/album`);
      }, 1200);
    }, 3000);
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[var(--text-secondary)]">Session not found. Please join the event again.</p>
          <Button className="mt-4" onClick={() => router.push(`/join/${code}`)}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, var(--bg) 0%, #FFE8D6 60%, var(--bg) 100%)' }}
    >
      <AnimatePresence mode="wait">
        {/* ── Ready ── */}
        {phase === 'ready' && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-alt)] flex items-center justify-center mx-auto mb-6 shadow-warm">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-[var(--text)] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Now, scan your face
            </h2>
            <p className="text-[var(--text-secondary)] mb-2">
              Hi <strong className="text-[var(--text)]">{session.name}</strong>! Scan your face once and AI will find every photo you appear in.
            </p>
            {photoCount !== null && photoCount > 0 && (
              <p className="text-sm text-[var(--accent)] font-medium mb-6">
                {photoCount.toLocaleString()} photos waiting to be sorted
              </p>
            )}
            <div className="bg-[var(--surface)] rounded-3xl p-5 shadow-card text-left space-y-3 mb-8">
              {['Quick 10-second scan', 'Only your face embedding is saved — not the selfie', 'Works even if uploads happen later'].map((tip, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                  <div className="w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">{i + 1}</div>
                  {tip}
                </div>
              ))}
            </div>
            <Button size="lg" fullWidth onClick={() => setPhase('scanning')} icon={<Camera className="w-5 h-5" />}>
              Start face scan
            </Button>
            <button
              onClick={handleEnrollComplete}
              className="mt-3 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors underline-offset-2 hover:underline"
            >
              Skip for now
            </button>
          </motion.div>
        )}

        {/* ── Scanning ── */}
        {phase === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm"
          >
            <SelfieScan
              eventId={session.eventId}
              userId={session.userId}
              onEnrolled={handleEnrollComplete}
            />
          </motion.div>
        )}

        {/* ── Finding ── */}
        {(phase === 'finding' || phase === 'done') && (
          <motion.div
            key="finding"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center max-w-sm"
          >
            {phase === 'finding' ? (
              <>
                {/* Pulsing spinner */}
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-[var(--accent)]/20"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-[var(--accent)]/30"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: 0.3 }}
                  />
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-alt)] flex items-center justify-center shadow-warm">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-[var(--text)] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                  {photoCount !== null && photoCount > 0
                    ? `Finding you in ${photoCount.toLocaleString()} photos…`
                    : 'Building your album…'}
                </h3>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={msgIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="text-[var(--text-secondary)] text-sm"
                  >
                    {PROGRESS_MESSAGES[msgIdx]}
                  </motion.p>
                </AnimatePresence>
              </>
            ) : (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🎉</span>
                </div>
                <h3 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Your album is ready!
                </h3>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
