'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getGuestSession } from '@/lib/guest-session';
import type { EventProgress, EventMember, MomentTab } from '@/types/event-ui';

export interface EventInfo {
  id: string;
  name: string;
  type: string;
  cover_url?: string;
  join_code: string;
  upload_mode: 'everyone' | 'selected';
  require_approval: boolean;
  expires_at: string;
  accent?: string;
}

interface UseEventDataResult {
  event: EventInfo | null;
  moments: MomentTab[];
  members: EventMember[];
  progress: EventProgress;
  myPerson: { userId: string; name: string; personId?: string } | null;
  canUpload: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEventData(eventId: string): UseEventDataResult {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [moments, setMoments] = useState<MomentTab[]>([]);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [progress, setProgress] = useState<EventProgress>({ sorted: 0, total: 0, percent: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const session = getGuestSession();
  const myPerson = session ? { userId: session.userId, name: session.name, personId: session.personId } : null;

  const fetchAll = useCallback(async () => {
    if (!eventId) return;
    try {
      const [evRes, momRes, memRes, progRes] = await Promise.allSettled([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/moments`),
        fetch(`/api/events/${eventId}/members`),
        fetch(`/api/events/${eventId}/progress`),
      ]);

      if (!mountedRef.current) return;

      if (evRes.status === 'fulfilled' && evRes.value.ok) {
        const data = await evRes.value.json();
        setEvent(data.event ?? data);
      }
      if (momRes.status === 'fulfilled' && momRes.value.ok) {
        const data = await momRes.value.json();
        const raw = data.moments ?? data ?? [];
        setMoments(raw.map((m: { id: string; name: string; count?: number }) => ({ id: m.id, name: m.name, count: m.count })));
      }
      if (memRes.status === 'fulfilled' && memRes.value.ok) {
        const data = await memRes.value.json();
        const raw = (data.members ?? data ?? []).slice(0, 8);
        setMembers(raw.map((m: { user_id?: string; id?: string; name?: string; avatar_url?: string; role?: string; status?: string }) => ({
          userId: m.user_id ?? m.id ?? '',
          name: m.name ?? 'Guest',
          avatarUrl: m.avatar_url,
          role: (m.role ?? 'guest') as EventMember['role'],
          status: (m.status ?? 'approved') as EventMember['status'],
        })));
      }
      if (progRes.status === 'fulfilled' && progRes.value.ok) {
        const data = await progRes.value.json();
        const sorted = data.sorted ?? data.processed ?? 0;
        const total = data.total ?? 0;
        setProgress({ sorted, total, percent: total > 0 ? Math.round((sorted / total) * 100) : 0 });
      }
      setError(null);
    } catch {
      if (mountedRef.current) setError('Failed to load event');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    fetchAll();
    return () => { mountedRef.current = false; };
  }, [fetchAll]);

  useEffect(() => {
    if (progress.percent >= 100 || isLoading) return;
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/progress`);
        if (!res.ok || !mountedRef.current) return;
        const data = await res.json();
        const sorted = data.sorted ?? data.processed ?? 0;
        const total = data.total ?? 0;
        setProgress({ sorted, total, percent: total > 0 ? Math.round((sorted / total) * 100) : 0 });
      } catch {}
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [eventId, progress.percent, isLoading]);

  const canUpload = event?.upload_mode === 'everyone' ||
    members.some(m => m.userId === myPerson?.userId && (m.role === 'host' || m.role === 'uploader'));

  return { event, moments, members, progress, myPerson, canUpload, isLoading, error, refetch: fetchAll };
}
