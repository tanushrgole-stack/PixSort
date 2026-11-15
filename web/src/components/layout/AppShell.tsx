'use client';

import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { PageTransition } from '@/components/ui';

interface AppShellProps {
  children: React.ReactNode;
  /** Pass true on pages that have their own full-screen layout (landing, auth) */
  bare?: boolean;
}

export function AppShell({ children, bare = false }: AppShellProps) {
  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
