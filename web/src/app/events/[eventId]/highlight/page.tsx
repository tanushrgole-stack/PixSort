'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import HighlightSlideshow from '@/components/event/HighlightSlideshow';
import { useRouter } from 'next/navigation';

export default function HighlightPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  return (
    <HighlightSlideshow
      eventId={eventId}
      onClose={() => router.back()}
    />
  );
}
