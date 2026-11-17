'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, ArrowRight, AlertCircle } from 'lucide-react';
import { Button, Badge, Skeleton } from '@/components/ui';
import { saveGuestSession } from '@/lib/guest-session';
import { applyEventAccent } from '@/lib/design-tokens';
import { useToast } from '@/providers/ToastProvider';

interface EventInfo {
  id: string;
  name: string;
  type: string;
  require_approval: boolean;
  cover_url?: string;
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { addToast } = useToast();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/join?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const ev = data?.event ?? data;
        if (!ev || !ev.id) {
          setNotFound(true);
        } else {
          setEvent(ev);
          applyEventAccent(ev.type);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingEvent(false));
  }, [code]);

  async function handleJoin() {
    if (!guestName.trim()) {
      addToast({ kind: 'warning', message: 'Please enter your name.' });
      return;
    }
    setJoining(true);
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          join_code: code,
          code,
          name: guestName.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const userId = data.user_id ?? data.user?.id ?? `guest-${Date.now()}`;
      const evId = event?.id ?? data.event?.id ?? data.eventId ?? '';

      // Save session
      saveGuestSession({
        userId,
        name: guestName.trim(),
        eventId: evId,
        token: data.session_token ?? '',
        memberStatus: data.status ?? data.member_status ?? 'approved',
        createdAt: new Date().toISOString(),
      });

      // Go to selfie scan
      router.push(`/join/${code}/scan`);
    } catch {
      addToast({ kind: 'error', message: 'Could not join event. Please try again.' });
      setJoining(false);
    }
  }

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-48 w-full" rounded="lg" />
          <Skeleton className="h-6 w-2/3" rounded="md" />
          <Skeleton className="h-4 w-full" lines={2} />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Event not found</h2>
          <p className="text-[var(--text-secondary)] text-sm">Double-check the code or link and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, var(--bg) 0%, #FFE8D6 100%)' }}>
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Event card */}
          {event?.cover_url && (
            <div className="w-full h-40 rounded-3xl overflow-hidden mb-6 shadow-card">
              <img src={event.cover_url} alt={event.name} className="w-full h-full object-cover" />
            </div>
          )}

          {!event?.cover_url && (
            <div
              className="w-full h-40 rounded-3xl mb-6 shadow-card flex items-center justify-center text-6xl"
              style={{ background: 'linear-gradient(135deg, var(--accent)/20, var(--accent-alt)/20)' }}
            >
              📸
            </div>
          )}

          <Badge type={event!.type as Parameters<typeof Badge>[0]['type']} className="mb-3" />
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            {event!.name}
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mb-6 flex items-center gap-2">
            <Users className="w-4 h-4" />
            You&apos;re joining as a guest — no account needed.
          </p>

          {event!.require_approval && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-3 mb-5 flex gap-2 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              The host needs to approve you before you can upload or see photos.
            </div>
          )}

          {/* Name input */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Your name</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. Priya"
              autoFocus
              className="w-full h-13 px-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-lg"
              style={{ fontFamily: 'var(--font-heading)' }}
            />
          </div>

          <Button
            size="lg"
            fullWidth
            loading={joining}
            onClick={handleJoin}
            iconEnd={<ArrowRight className="w-5 h-5" />}
          >
            Join Event
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
