'use client';

import { useState, useCallback, Suspense, lazy } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventData } from '@/hooks/useEventData';
import { getGuestSession } from '@/lib/guest-session';
import { EventHeader } from '@/components/event/EventHeader';
import { Skeleton } from '@/components/ui';
import PhotoUploader from '@/components/PhotoUploader';
import ProcessingProgressBar from '@/components/ProcessingProgressBar';

// Lazy-load tabs for code splitting
const MyPhotos = lazy(() => import('@/components/event/tabs/MyPhotos'));
const AllPhotos = lazy(() => import('@/components/event/tabs/AllPhotos'));
const Everyone = lazy(() => import('@/components/event/tabs/Everyone'));
const Favorites = lazy(() => import('@/components/event/tabs/Favorites'));

type TabId = 'my' | 'all' | 'everyone' | 'favorites';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'my',       label: 'My Photos',  emoji: '🤳' },
  { id: 'all',      label: 'All Photos', emoji: '📸' },
  { id: 'everyone', label: 'Everyone',   emoji: '👥' },
  { id: 'favorites',label: 'Favorites',  emoji: '♥' },
];

function TabSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { event, moments, members, progress, myPerson, canUpload, isLoading } = useEventData(eventId);

  const [activeTab, setActiveTab] = useState<TabId>('my');
  const [activeMoment, setActiveMoment] = useState<string>('all');
  const [showUploader, setShowUploader] = useState(false);

  const session = getGuestSession();
  const userId = session?.userId;

  const handleMomentChange = useCallback((id: string) => {
    setActiveMoment(id);
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Skeleton className="w-full h-52 rounded-none" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-48 rounded-xl" />
          <Skeleton className="h-4 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-1 mt-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {/* ── Event Header ──────────────────────────────────────────────────────── */}
      <EventHeader
        event={event}
        members={members}
        progress={progress}
        moments={moments}
        activeMoment={activeMoment}
        onMomentChange={handleMomentChange}
        canUpload={canUpload}
        onUploadClick={() => setShowUploader(true)}
      />

      {/* ── Processing progress bar ───────────────────────────────────────────── */}
      {progress.total > 0 && progress.percent < 100 && (
        <div className="px-4 pt-2">
          <ProcessingProgressBar eventId={eventId} />
        </div>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="flex overflow-x-auto scrollbar-hide px-2">
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                activeTab === tab.id ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              <span className="text-base">{tab.emoji}</span>
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────────── */}
      <Suspense fallback={<TabSkeleton />}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {activeTab === 'my' && (
              <MyPhotos eventId={eventId} userId={userId} activeMoment={activeMoment} />
            )}
            {activeTab === 'all' && (
              <AllPhotos eventId={eventId} userId={userId} activeMoment={activeMoment} />
            )}
            {activeTab === 'everyone' && (
              <Everyone eventId={eventId} myPersonId={myPerson?.personId} />
            )}
            {activeTab === 'favorites' && (
              <Favorites eventId={eventId} userId={userId} activeMoment={activeMoment} />
            )}
          </motion.div>
        </AnimatePresence>
      </Suspense>

      {/* ── Upload drawer ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUploader && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowUploader(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] rounded-t-3xl shadow-card border-t border-[var(--border)] pb-safe"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
              </div>

              <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--border)]">
                <h3 className="text-base font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Upload Photos
                </h3>
                <button
                  onClick={() => setShowUploader(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--muted)]/30 text-[var(--text-secondary)] transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 max-h-[70svh] overflow-y-auto">
                <PhotoUploader
                  eventId={eventId}
                  userId={userId ?? ''}
                  uploaderName={session?.name ?? 'Guest'}
                  uploadMode={event.upload_mode === 'everyone' ? 'everyone' : 'selected'}
                  memberRole={
                    members.find(m => m.userId === userId)?.role ?? 'guest'
                  }
                  moments={moments.map(m => ({ id: m.id as string, event_id: eventId, name: m.name, order_index: 0, created_at: '' }))}
                  defaultMomentId={activeMoment === 'all' ? undefined : activeMoment}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
