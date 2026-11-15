'use client';

import { useCallback } from 'react';
import { useToast } from '@/providers/ToastProvider';

export function useFavorite(userId: string | undefined) {
  const { addToast } = useToast();

  const toggle = useCallback(async (photoId: string, currentlyFavorited: boolean) => {
    if (!userId) {
      addToast({ kind: 'warning', message: 'Join the event to save favorites.' });
      return;
    }
    try {
      const res = await fetch(`/api/users/${userId}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_id: photoId, action: currentlyFavorited ? 'remove' : 'add' }),
      });
      if (!res.ok) throw new Error();
    } catch {
      addToast({ kind: 'error', message: 'Could not update favorite. Try again.' });
    }
  }, [userId, addToast]);

  return { toggle };
}
