'use client';

import { clsx } from 'clsx';
import { Check } from 'lucide-react';

const STEPS = [
  'Event Type',
  'Details',
  'Moments',
  'Upload Mode',
  'Share',
];

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {children}
    </div>
  );
}

export function StepBar({ current, total = STEPS.length }: { current: number; total?: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  done && 'bg-[var(--accent)] text-white',
                  active && 'bg-[var(--accent)]/20 text-[var(--accent)] ring-2 ring-[var(--accent)]',
                  !done && !active && 'bg-[var(--muted)] text-[var(--text-secondary)]'
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={clsx('text-[10px] font-medium hidden sm:block', active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx('w-8 sm:w-14 h-0.5 rounded mb-4 transition-colors duration-300', i < current ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
