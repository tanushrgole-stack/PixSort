'use client';

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  lines?: number;
}

export function Skeleton({ className, rounded = 'lg', lines = 1 }: SkeletonProps) {
  const roundedMap = {
    sm: 'rounded',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  };

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'skeleton h-4',
              roundedMap[rounded],
              i === lines - 1 && 'w-3/4',
              className
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={clsx('skeleton', roundedMap[rounded], className)}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--surface)] rounded-3xl p-4 shadow-card space-y-3">
      <Skeleton className="h-40 w-full" rounded="lg" />
      <Skeleton className="h-5 w-2/3" rounded="md" />
      <Skeleton className="h-4 w-full" lines={2} />
    </div>
  );
}

export function SkeletonPhoto() {
  return (
    <div className="skeleton aspect-square rounded-2xl" />
  );
}
