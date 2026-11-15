'use client';

import { motion } from 'framer-motion';

interface EmptyStateProps {
  tab: 'my' | 'all' | 'everyone' | 'favorites';
  albumReady?: boolean;
}

const CONFIGS = {
  'my-not-ready': {
    emoji: '🌅',
    title: 'Your album is filling up...',
    subtitle: 'AI is finding you in the photos. Check back soon.',
    shimmer: true,
  },
  'my-ready': {
    emoji: '📷',
    title: 'No photos found',
    subtitle: 'Try adjusting your filters.',
    shimmer: false,
  },
  'all': {
    emoji: '📷',
    title: 'No photos yet.',
    subtitle: 'Be the first to upload!',
    shimmer: false,
  },
  'everyone': {
    emoji: '👥',
    title: 'No one has enrolled yet.',
    subtitle: 'Once guests scan their face, they\'ll appear here.',
    shimmer: false,
  },
  'favorites': {
    emoji: '🤍',
    title: 'Nothing favorited yet.',
    subtitle: 'Tap ♥ on any photo to save it here.',
    shimmer: false,
  },
} as const;

export default function EmptyState({ tab, albumReady }: EmptyStateProps) {
  const key =
    tab === 'my'
      ? albumReady
        ? 'my-ready'
        : 'my-not-ready'
      : tab;

  const cfg = CONFIGS[key];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center select-none"
    >
      <span className="text-6xl mb-5 drop-shadow-sm" role="img" aria-hidden>
        {cfg.emoji}
      </span>
      <p className="font-serif text-xl font-semibold text-sunset-text dark:text-sunset-dark-text mb-2">
        {cfg.title}
      </p>
      <p className="text-sm text-sunset-text/60 dark:text-sunset-dark-text/60 max-w-xs">
        {cfg.subtitle}
      </p>

      {cfg.shimmer && (
        <div className="mt-8 w-48 space-y-2.5 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-2.5 rounded-full bg-gradient-to-r from-sunset-rose/30 via-sunset-cream/60 to-sunset-rose/30 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s`, width: `${80 - i * 12}%`, margin: '0 auto' }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
