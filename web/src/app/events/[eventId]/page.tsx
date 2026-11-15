'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Upload, Users, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { AppShell } from '@/components/layout';

export default function EventDashboardPage() {
  const { eventId } = useParams<{ eventId: string }>();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Placeholder skeleton hero */}
          <div className="w-full h-48 rounded-3xl bg-gradient-to-br from-[var(--accent)]/30 to-[var(--accent-alt)]/20 flex items-center justify-center mb-6 shadow-card">
            <span className="text-6xl">📸</span>
          </div>

          <h1 className="text-3xl font-bold text-[var(--text)] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Event Dashboard
          </h1>
          <p className="text-[var(--text-secondary)] mb-6 text-sm">ID: {eventId}</p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Upload, label: 'Upload Photos', href: '#' },
              { icon: Users, label: 'Guests', href: '#' },
              { icon: Camera, label: 'All Photos', href: '#' },
              { icon: Sparkles, label: 'My Album', href: `album` },
            ].map(({ icon: Icon, label, href }) => (
              <Link key={label} href={href}>
                <div className="bg-[var(--surface)] rounded-3xl p-5 shadow-card flex flex-col items-center gap-3 hover:border-[var(--accent)] border border-[var(--border)] transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text)]">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
