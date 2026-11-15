'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import EmptyState from '@/components/event/EmptyState';
import { Skeleton } from '@/components/ui';
import type { PersonCard } from '@/types/event-ui';

const GRADIENTS = [
  'from-[#FF6B4A] to-[#FFB703]',
  'from-[#B76E79] to-[#FFD9CC]',
  'from-[#6C63FF] to-[#FF3CAC]',
  'from-[#7FB77E] to-[#FFB703]',
  'from-[#FF3CAC] to-[#FFB703]',
];

interface EveryoneProps {
  eventId: string;
  myPersonId?: string;
}

export default function Everyone({ eventId, myPersonId }: EveryoneProps) {
  const router = useRouter();
  const [people, setPeople] = useState<PersonCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/events/${eventId}/people`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const list: PersonCard[] = (data.people ?? data ?? []).map((p: Record<string, unknown>) => ({
          personId: String(p.id ?? p.person_id ?? ''),
          name: String(p.name ?? 'Unknown'),
          faceThumbUrl: (p.face_thumb_url ?? p.faceThumbUrl ?? undefined) as string | undefined,
          photoCount: Number(p.photo_count ?? p.photoCount ?? 0),
          isMe: (p.id ?? p.person_id) === myPersonId,
        }));
        setPeople(list);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [eventId, myPersonId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-3 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (people.length === 0) return <EmptyState tab="everyone" />;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4">
      {people.map((person, i) => (
        <motion.button
          key={person.personId}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 28 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push(`/events/${eventId}/people/${person.personId}`)}
          className="flex flex-col items-center gap-2 p-3 rounded-3xl hover:bg-[var(--muted)]/30 transition-colors"
        >
          {/* Face circle */}
          <div className="relative">
            <div
              className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg ${!person.faceThumbUrl ? `bg-gradient-to-br ${GRADIENTS[person.name.charCodeAt(0) % GRADIENTS.length]}` : ''}`}
            >
              {person.faceThumbUrl
                ? <img src={person.faceThumbUrl} alt={person.name} className="w-full h-full object-cover" />
                : person.name[0].toUpperCase()
              }
            </div>
            {person.isMe && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center text-[9px] text-white font-bold">
                ⭐
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs font-semibold text-[var(--text)] truncate max-w-[72px]">{person.name}</p>
            <p className="text-[10px] text-[var(--text-secondary)]">{person.photoCount} photos</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
