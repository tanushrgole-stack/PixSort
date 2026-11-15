'use client';

import { useState, useCallback, useRef } from 'react';

interface UseMultiSelectResult {
  selected: Set<string>;
  isSelecting: boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  startSelecting: () => void;
  stopSelecting: () => void;
  longPressProps: (id: string) => {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
  };
}

export function useMultiSelect(): UseMultiSelectResult {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSelecting = useCallback(() => setIsSelecting(true), []);

  const stopSelecting = useCallback(() => {
    setIsSelecting(false);
    setSelected(new Set());
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => setSelected(new Set(ids)), []);
  const clear = useCallback(() => setSelected(new Set()), []);

  const longPressProps = useCallback((id: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      timerRef.current = setTimeout(() => {
        setIsSelecting(true);
        setSelected(prev => { const n = new Set(prev); n.add(id); return n; });
      }, 500);
    },
    onPointerUp: () => { if (timerRef.current) clearTimeout(timerRef.current); },
    onPointerLeave: () => { if (timerRef.current) clearTimeout(timerRef.current); },
  }), []);

  return { selected, isSelecting, toggle, selectAll, clear, startSelecting, stopSelecting, longPressProps };
}
