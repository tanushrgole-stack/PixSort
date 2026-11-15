'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { resolveSessionToken } from '@/lib/guest-session';

export default function ResumePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  useEffect(() => {
    async function restore() {
      try {
        const session = await resolveSessionToken(token);
        if (session) {
          router.replace(`/events/${session.eventId}/album`);
        } else {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      }
    }
    restore();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">Restoring your session…</p>
      </motion.div>
    </div>
  );
}
