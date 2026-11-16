'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Camera, Image, User, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { ThemeToggle, Logo } from '@/components/ui';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/events', icon: Camera, label: 'My Events' },
  { href: '/album', icon: Image, label: 'My Album' },
  { href: '/me', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 bg-[var(--surface)] border-r border-[var(--border)] px-4 py-6 shrink-0">
      {/* Logo */}
      <Link href="/" className="flex items-center mb-8 group transition-transform hover:scale-[1.02]">
        <Logo size={34} />
      </Link>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-200',
                  active
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--muted)] hover:text-[var(--text)]'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
                {active && (
                  <motion.div
                    layoutId="sidebarIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
        <span className="text-xs text-[var(--text-secondary)]">PixSort v1</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
