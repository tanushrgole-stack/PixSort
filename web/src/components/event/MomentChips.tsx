'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { MomentTab } from '@/types/event-ui';

interface MomentChipsProps {
  moments: MomentTab[];
  active: string | 'all';
  onChange: (id: string | 'all') => void;
}

const ALL_TAB: MomentTab = { id: 'all', name: 'All' };

export function MomentChips({ moments, active, onChange }: MomentChipsProps) {
  const tabs = [ALL_TAB, ...moments];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <motion.button
            key={String(tab.id)}
            onClick={() => onChange(tab.id as string)}
            whileTap={{ scale: 0.95 }}
            className={clsx(
              'relative shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 select-none',
              isActive
                ? 'text-white'
                : 'text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="momentChipActive"
                className="absolute inset-0 rounded-full"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-alt))' }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">
              {tab.name}
              {tab.count !== undefined && (
                <span className={clsx('ml-1 text-[10px]', isActive ? 'text-white/70' : 'text-[var(--text-secondary)]')}>
                  {tab.count}
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
