'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Camera, Image, User } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/events', icon: Camera, label: 'Events' },
  { href: '/album', icon: Image, label: 'Album' },
  { href: '/me', icon: User, label: 'Me' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--surface)]/80 backdrop-blur-md border-t border-[var(--border)] pb-safe">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 min-w-[56px] py-1 group">
              <div className="relative">
                <Icon
                  className={clsx(
                    'w-6 h-6 transition-colors duration-200',
                    active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--accent)]'
                  )}
                />
                {active && (
                  <motion.div
                    layoutId="bottomNavDot"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span
                className={clsx(
                  'text-[10px] font-medium transition-colors duration-200',
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
