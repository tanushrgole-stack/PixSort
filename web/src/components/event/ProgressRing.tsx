'use client';

import { motion } from 'framer-motion';

interface ProgressRingProps {
  sorted: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({ sorted, total, size = 72, strokeWidth = 6, className }: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const percent = total > 0 ? Math.min((sorted / total) * 100, 100) : 0;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className={`relative flex items-center justify-center ${className ?? ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: total === 0 ? circumference * 0.85 : offset }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {total === 0 ? (
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="text-xs font-bold text-[var(--accent)]">…</motion.span>
        ) : (
          <>
            <span className="text-sm font-bold leading-none text-[var(--accent)]">{sorted}</span>
            <span className="text-[9px] leading-none text-[var(--text-secondary)] mt-0.5">/ {total}</span>
          </>
        )}
      </div>
    </div>
  );
}
