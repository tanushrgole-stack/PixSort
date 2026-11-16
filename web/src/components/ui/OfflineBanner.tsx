'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setShowReconnect(false); };
    const goOnline = () => {
      setOffline(false);
      setShowReconnect(true);
      setTimeout(() => setShowReconnect(false), 3000);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          key="offline"
          role="alert"
          aria-live="assertive"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white"
          style={{ background: '#E05030' }}
        >
          <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden />
          You&apos;re offline · Changes will sync when back online
        </motion.div>
      )}
      {showReconnect && (
        <motion.div
          key="reconnected"
          role="status"
          aria-live="polite"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white"
          style={{ background: '#22c55e' }}
        >
          <Wifi className="w-4 h-4 flex-shrink-0" aria-hidden />
          Back online!
        </motion.div>
      )}
    </AnimatePresence>
  );
}
