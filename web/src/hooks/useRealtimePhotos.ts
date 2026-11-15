'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/providers/ToastProvider';

interface UseRealtimePhotosOptions {
  eventId: string;
  personId?: string;
  userId?: string;
  onNewPhotos?: () => void;
}

export function useRealtimePhotos({
  eventId,
  personId,
  userId,
  onNewPhotos,
}: UseRealtimePhotosOptions) {
  const { toast } = useToast();
  const [newCount, setNewCount] = useState<number>(0);
  const initialCountRef = useRef<number | null>(null);

  // 1. Supabase Realtime Channel
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-photos-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'faces',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const face = payload.new as { person_id?: string };
          if (personId && face.person_id === personId) {
            setNewCount((prev) => {
              const updated = prev + 1;
              toast(`✨ A new photo of you was added!`, 'success');
              return updated;
            });
            onNewPhotos?.();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          onNewPhotos?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, personId, onNewPhotos, toast]);

  // 2. Fallback polling for local demo / when websocket is inactive
  useEffect(() => {
    if (!eventId || !personId) return;

    const checkNew = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/album?pageSize=1`);
        if (!res.ok) return;
        const data = await res.json();
        const currentTotal = Number(data.total || 0);

        if (initialCountRef.current === null) {
          initialCountRef.current = currentTotal;
        } else if (currentTotal > initialCountRef.current) {
          const diff = currentTotal - initialCountRef.current;
          initialCountRef.current = currentTotal;
          setNewCount((prev) => prev + diff);
          toast(`🎉 ${diff} new photo${diff > 1 ? 's' : ''} of you were added!`, 'success');
          onNewPhotos?.();
        }
      } catch {
        // silent
      }
    };

    const interval = setInterval(checkNew, 8000);
    return () => clearInterval(interval);
  }, [eventId, personId, onNewPhotos, toast]);

  const clearNew = () => setNewCount(0);

  return { newCount, clearNew };
}
