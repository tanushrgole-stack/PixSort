'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, Filter, Smile, Users } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { AppShell } from '@/components/layout';

export default function PersonalAlbumPage() {
  const { eventId } = useParams<{ eventId: string }>();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                My Album
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">Every photo you appear in</p>
            </div>
            <Button size="sm" variant="outline" icon={<Download className="w-4 h-4" />}>
              Download ZIP
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {['All', 'Solo', 'Group', 'Haldi', 'Reception'].map((f) => (
              <button
                key={f}
                className="shrink-0 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                {f}
              </button>
            ))}
          </div>

          {/* Photo grid placeholder */}
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br"
                style={{
                  background: `hsl(${(i * 30) % 360} 60% 85%)`,
                }}
              />
            ))}
          </div>

          <p className="text-center text-sm text-[var(--text-secondary)] mt-8">
            Photos load here once face processing is complete.
          </p>
        </motion.div>
      </div>
    </AppShell>
  );
}
