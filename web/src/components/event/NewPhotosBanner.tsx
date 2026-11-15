'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, X } from 'lucide-react';

interface NewPhotosBannerProps {
  count: number;
  onRefresh: () => void;
  onDismiss: () => void;
}

export function NewPhotosBanner({ count, onRefresh, onDismiss }: NewPhotosBannerProps) {
  if (count <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="fixed top-16 inset-x-0 mx-auto max-w-sm z-50 px-4"
      >
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-alt)] text-white shadow-warm border border-white/20">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 animate-spin-slow text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold leading-tight">
              {count} new photo{count > 1 ? 's' : ''} of you!
            </p>
            <p className="text-[10px] text-white/80">AI sorted and added them to your album</p>
          </div>

          <button
            onClick={() => {
              onRefresh();
              onDismiss();
            }}
            className="px-2.5 py-1 rounded-xl bg-white text-[var(--accent)] text-xs font-bold hover:bg-white/90 transition flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            View
          </button>

          <button
            onClick={onDismiss}
            className="p-1 text-white/70 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
