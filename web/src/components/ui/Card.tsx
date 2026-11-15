'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  accentBorder?: boolean;
  onClick?: () => void;
  as?: 'div' | 'article' | 'section';
}

export function Card({
  children,
  className,
  hover = false,
  accentBorder = false,
  onClick,
  as: Tag = 'div',
}: CardProps) {
  const base = clsx(
    'bg-[var(--surface)] rounded-3xl shadow-card p-4',
    accentBorder && 'ring-2 ring-[var(--accent)]',
    hover && 'cursor-pointer',
    className
  );

  if (hover || onClick) {
    return (
      <motion.div
        className={base}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {children}
      </motion.div>
    );
  }

  return <Tag className={base}>{children}</Tag>;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={clsx('mb-3', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardHeaderProps) {
  return <div className={clsx('', className)}>{children}</div>;
}
