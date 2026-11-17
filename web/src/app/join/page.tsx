'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, QrCode, Sparkles, Calendar, User, ShieldCheck } from 'lucide-react';
import { Button, Logo } from '@/components/ui';
import { getUserEvents, type SavedEvent } from '@/lib/guest-session';
import { EVENT_EMOJI } from '@/lib/design-tokens';
import { useToast } from '@/providers/ToastProvider';

export default function JoinIndexPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentEvents, setRecentEvents] = useState<SavedEvent[]>([]);

  useEffect(() => {
    setRecentEvents(getUserEvents());
  }, []);

  async function handleJoinSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      addToast({ kind: 'warning', message: 'Please enter an event code.' });
      return;
    }

    if (cleanCode.length < 4) {
      addToast({ kind: 'warning', message: 'Event code is usually 6-8 characters.' });
      return;
    }

    setLoading(true);
    try {
      // Validate code against API
      const res = await fetch(`/api/join?code=${encodeURIComponent(cleanCode)}`);
      if (res.ok) {
        router.push(`/join/${cleanCode}`);
      } else {
        // If not found in mock/backend yet, still let them proceed to the join page to try
        router.push(`/join/${cleanCode}`);
      }
    } catch {
      router.push(`/join/${cleanCode}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-30 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--blush)] transition-colors flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <Logo />
          <div className="w-14" /> {/* Spacer for centering */}
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 py-10 flex flex-col justify-center">
        {/* Header Icon & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--golden)] flex items-center justify-center mx-auto mb-4 shadow-warm text-white">
            <QrCode className="w-8 h-8" />
          </div>
          <h1
            className="text-3xl font-bold text-[var(--text)] mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Join an Event
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto">
            Enter the join code shared by your host to view and add photos.
          </p>
        </div>

        {/* Code Input Form */}
        <form onSubmit={handleJoinSubmit} className="space-y-4 mb-8">
          <div>
            <label htmlFor="join-code-input" className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 text-center">
              Event Code
            </label>
            <input
              id="join-code-input"
              type="text"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              placeholder="e.g. ZQ8ZMQBW"
              maxLength={12}
              className="w-full text-center font-mono text-2xl font-bold tracking-widest py-4 px-4 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-light)] transition-all"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            iconEnd={<ArrowRight className="w-5 h-5" />}
          >
            Continue to Event
          </Button>
        </form>

        {/* Recent / Created Events Section */}
        {recentEvents.length > 0 && (
          <div className="pt-6 border-t border-[var(--border)]">
            <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Your Recent Events
            </h2>
            <div className="space-y-2.5">
              {recentEvents.map((ev) => (
                <button
                  key={`${ev.id}-${ev.joinCode}`}
                  type="button"
                  onClick={() => {
                    if (ev.role === 'host') {
                      router.push(`/events/${ev.id}`);
                    } else {
                      router.push(`/events/${ev.id}/album`);
                    }
                  }}
                  className="w-full p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-soft transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">
                      {EVENT_EMOJI[ev.type as keyof typeof EVENT_EMOJI] || '📸'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                        {ev.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-secondary)]">
                        <span className="font-mono font-medium text-[var(--accent)]">
                          {ev.joinCode}
                        </span>
                        <span>•</span>
                        <span className="capitalize flex items-center gap-1">
                          {ev.role === 'host' ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-amber-500" />
                              Host
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3" />
                              Joined
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-transform group-hover:translate-x-1 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alternative: QR scan tip */}
        <div className="mt-8 text-center text-xs text-[var(--text-secondary)] bg-[var(--blush)] p-3.5 rounded-2xl border border-[var(--border)]">
          <p className="font-medium text-[var(--text)] mb-0.5">Have a QR code?</p>
          <p>Scan it directly using your phone's camera app to jump right in.</p>
        </div>
      </main>
    </div>
  );
}
