'use client';

import { clsx } from 'clsx';
import { EVENT_EMOJI } from '@/lib/design-tokens';

type EventType = 'wedding' | 'trip' | 'party' | 'birthday' | 'family' | 'college' | 'corporate';

const colorMap: Record<EventType, string> = {
  wedding: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  trip: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  party: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  birthday: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  family: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  college: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  corporate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

interface BadgeProps {
  type?: EventType;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({ type, label, className, size = 'md' }: BadgeProps) {
  const emoji = type ? EVENT_EMOJI[type] : '';
  const text = label ?? (type ? type.charAt(0).toUpperCase() + type.slice(1) : '');
  const colorClass = type ? colorMap[type] : 'bg-[var(--muted)] text-[var(--text-secondary)]';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        colorClass,
        className
      )}
    >
      {emoji && <span>{emoji}</span>}
      {text}
    </span>
  );
}
