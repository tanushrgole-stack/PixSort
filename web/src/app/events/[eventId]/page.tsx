'use client';

import { useState, useCallback, Suspense, lazy } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventData } from '@/hooks/useEventData';
import { useRealtimePhotos } from '@/hooks/useRealtimePhotos';
import { getGuestSession } from '@/lib/guest-session';
import { EventHeader } from '@/components/event/EventHeader';
import { MostLovedRow } from '@/components/event/MostLovedRow';
import { NewPhotosBanner } from '@/components/event/NewPhotosBanner';
import { MomentsManagerModal } from '@/components/event/MomentsManagerModal';
import { DuplicateCleanupModal } from '@/components/event/DuplicateCleanupModal';
import { HostToolsModal } from '@/components/event/HostToolsModal';
import PrivacySettingsModal from '@/components/event/PrivacySettingsModal';
import ShareAlbumModal from '@/components/event/ShareAlbumModal';
import HighlightSlideshow from '@/components/event/HighlightSlideshow';
import Lightbox from '@/components/event/Lightbox';
import { Skeleton } from '@/components/ui';
import PhotoUploader from '@/components/PhotoUploader';
import ProcessingProgressBar from '@/components/ProcessingProgressBar';
import type { PhotoItem } from '@/types/event-ui';

// Lazy-load tabs for performance
const MyPhotos = lazy(() => import('@/components/event/tabs/MyPhotos'));
const AllPhotos = lazy(() => import('@/components/event/tabs/AllPhotos'));
const Everyone = lazy(() => import('@/components/event/tabs/Everyone'));
const Favorites = lazy(() => import('@/components/event/tabs/Favorites'));
const TopPicksTab = lazy(() => import('@/components/event/TopPicksTab'));
const TimelineView = lazy(() => import('@/components/event/TimelineView'));

type TabId = 'my' | 'all' | 'everyone' | 'favorites' | 'top-picks' | 'timeline';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'my',        label: 'My Photos',  emoji: '🤳' },
  { id: 'all',       label: 'All Photos', emoji: '📸' },
  { id: 'everyone',  label: 'Everyone',   emoji: '👥' },
  { id: 'favorites', label: 'Favorites',  emoji: '♥' },
  { id: 'top-picks', label: 'Top Picks',  emoji: '✨' },
  { id: 'timeline',  label: 'Timeline',   emoji: '🕰️' },
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
  const {
    event,
    moments,
    members,
    progress,
    myPerson,
    canUpload,
    isLoading,
    error,
    refetch,
  } = useEventData(eventId);

  const [activeTab, setActiveTab] = useState<TabId>('my');
  const [activeMoment, setActiveMoment] = useState<string>('all');
  const [showUploader, setShowUploader] = useState(false);

  // Phase 2 Modals state
  const [showMomentsModal, setShowMomentsModal] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showHostToolsModal, setShowHostToolsModal] = useState(false);
  const [lovedLightboxPhoto, setLovedLightboxPhoto] = useState<PhotoItem | null>(null);

  // Phase 3 state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

  const session = getGuestSession();
  const userId = session?.userId;

  // Realtime live updates
  const { newCount, clearNew } = useRealtimePhotos({
    eventId,
    personId: myPerson?.personId,
    userId,
    onNewPhotos: () => refetch(),
  });

  const handleMomentChange = useCallback((id: string) => {
    setActiveMoment(id);
  }, []);

  const isHost = Boolean(
    members.some((m) => m.userId === userId && m.role === 'host') ||
      (event && (event as { host_id?: string }).host_id === userId)
  );

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="text-5xl" role="img" aria-label="error">😕</span>
        <p className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
          Couldn&apos;t load this event
        </p>
        <p className="text-sm text-[var(--text-secondary)] max-w-xs">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-[var(--bg)]" aria-label="Loading event" aria-busy="true">
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
      {/* ── Realtime New Photos Banner ────────────────────────────────────────── */}
      <NewPhotosBanner
        count={newCount}
        onRefresh={() => {
          clearNew();
          refetch();
          setActiveTab('my');
        }}
        onDismiss={clearNew}
      />

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
        isHost={isHost}
        onOpenHostTools={() => setShowHostToolsModal(true)}
        onOpenMoments={() => setShowMomentsModal(true)}
        onOpenDuplicates={() => setShowDuplicatesModal(true)}
      />

      {/* ── Most Loved Carousel Row (Phase 2) ─────────────────────────────────── */}
      <MostLovedRow
        eventId={eventId}
        onPhotoClick={(photo) => setLovedLightboxPhoto(photo)}
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
                activeTab === tab.id ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
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
              <MyPhotos
                eventId={eventId}
                userId={userId}
                activeMoment={activeMoment}
                moments={moments}
                isHost={isHost}
              />
            )}
            {activeTab === 'all' && (
              <AllPhotos
                eventId={eventId}
                userId={userId}
                activeMoment={activeMoment}
                moments={moments}
                isHost={isHost}
              />
            )}
            {activeTab === 'everyone' && (
              <Everyone eventId={eventId} myPersonId={myPerson?.personId} />
            )}
            {activeTab === 'favorites' && (
              <Favorites eventId={eventId} userId={userId} activeMoment={activeMoment} />
            )}
            {activeTab === ('top-picks' as TabId) && (
              <TopPicksTab eventId={eventId} personId={myPerson?.personId} userId={userId} />
            )}
            {activeTab === ('timeline' as TabId) && (
              <TimelineView eventId={eventId} userId={userId} />
            )}
          </motion.div>
        </AnimatePresence>
      </Suspense>

      {/* ── Phase 3: quick access bar ──────────────────────────────────────────── */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setShowHighlight(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-white whitespace-nowrap hover:scale-105 transition-transform"
          style={{ background: 'linear-gradient(135deg, #FF6B4A, #FFB347)' }}
        >
          🎞️ Highlight Reel
        </button>
        {userId && (
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--muted)]/30 transition-colors text-[var(--text)]"
          >
            🔗 Share My Album
          </button>
        )}
        <button
          onClick={() => setActiveTab('top-picks')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--muted)]/30 transition-colors text-[var(--text)]"
        >
          ✨ Top Picks
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--muted)]/30 transition-colors text-[var(--text)]"
        >
          🕰️ Timeline
        </button>
        <a
          href={`/events/${eventId}/photographer`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--muted)]/30 transition-colors text-[var(--text)]"
        >
          📷 Photographer
        </a>
        <button
          onClick={() => setShowPrivacyModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--muted)]/30 transition-colors text-[var(--text)]"
        >
          🔒 Privacy
        </button>
      </div>

      {/* ── Upload drawer ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUploader && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowUploader(false)}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] rounded-t-3xl shadow-card border-t border-[var(--border)] pb-safe"
            >
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
                    members.find((m) => m.userId === userId)?.role ?? 'guest'
                  }
                  moments={moments.map((m, idx) => ({
                    id: m.id as string,
                    name: m.name,
                    order: idx,
                  }))}
                  defaultMomentId={activeMoment === 'all' ? undefined : activeMoment}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Phase 2 Modals ───────────────────────────────────────────────────── */}
      {/* Moments Manager Modal */}
      <MomentsManagerModal
        eventId={eventId}
        hostId={userId}
        moments={moments}
        isOpen={showMomentsModal}
        onClose={() => setShowMomentsModal(false)}
        onMomentsUpdated={() => refetch()}
      />

      {/* Duplicate Cleanup Modal */}
      <DuplicateCleanupModal
        eventId={eventId}
        userId={userId}
        isHost={isHost}
        isOpen={showDuplicatesModal}
        onClose={() => setShowDuplicatesModal(false)}
        onCleanupCompleted={() => refetch()}
      />

      {/* Host Tools Modal */}
      <HostToolsModal
        eventId={eventId}
        hostId={userId || '00000000-0000-0000-0000-000000000001'}
        uploadMode={event.upload_mode}
        requireApproval={event.require_approval}
        isOpen={showHostToolsModal}
        onClose={() => setShowHostToolsModal(false)}
        onEventUpdated={() => refetch()}
        onOpenMoments={() => setShowMomentsModal(true)}
        onOpenDuplicates={() => setShowDuplicatesModal(true)}
      />

      {/* Standalone Lightbox for Most Loved photo clicks */}
      {lovedLightboxPhoto && (
        <Lightbox
          photos={[lovedLightboxPhoto]}
          initialIndex={0}
          onClose={() => setLovedLightboxPhoto(null)}
          onFavorite={() => {}}
          onReport={() => {}}
          onHide={() => {}}
          onDownload={() => {}}
          eventId={eventId}
          userId={userId}
        />
      )}

      {/* ── Phase 3 Modals ───────────────────────────────────────────────────── */}
      <PrivacySettingsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        userId={userId ?? ''}
        eventId={eventId}
      />

      {userId && (
        <ShareAlbumModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          eventId={eventId}
          userId={userId}
        />
      )}

      {showHighlight && (
        <HighlightSlideshow
          eventId={eventId}
          onClose={() => setShowHighlight(false)}
        />
      )}
    </div>
  );
}
