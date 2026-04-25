import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────
export type CelebrationKind =
  | 'achievement'      // unlocked achievement (gold accent + confetti)
  | 'freeze_earned'    // milestone awarded a streak freeze (blue accent)
  | 'freeze_used'      // freeze auto-consumed to bridge missed days (blue accent)
  | 'streak_milestone' // hit a notable streak number (orange accent)
  | 'weekly_complete'  // weekly challenge just completed (green accent + confetti)
  | 'personal_best'    // new exercise PR (purple accent)
  | 'level_up';        // crossed XP level boundary (purple accent + confetti)

export interface Celebration {
  id: string;
  kind: CelebrationKind;
  title: string;
  body: string;
  // Optional emoji/icon override (defaults are kind-based)
  emoji?: string;
  // Optional reward shown as chips at the bottom
  rewards?: { gems?: number; xp?: number };
  // Should confetti play with this celebration? (defaults by kind)
  withConfetti?: boolean;
  // Display duration in ms (defaults to 3500)
  durationMs?: number;
}

interface CelebrationContextValue {
  /** Enqueue one or more celebrations. They display sequentially, oldest first. */
  enqueue: (items: Omit<Celebration, 'id'> | Omit<Celebration, 'id'>[]) => void;
  /** The currently visible celebration, or null. */
  current: Celebration | null;
  /** Manually advance past the current celebration (e.g. on tap). */
  dismiss: () => void;
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────
let idCounter = 0;
const nextId = () => `c_${Date.now()}_${++idCounter}`;

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [current, setCurrent] = useState<Celebration | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enqueue = useCallback((items: Omit<Celebration, 'id'> | Omit<Celebration, 'id'>[]) => {
    const list = Array.isArray(items) ? items : [items];
    if (list.length === 0) return;
    const withIds: Celebration[] = list.map(item => ({ ...item, id: nextId() }));
    setQueue(q => [...q, ...withIds]);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrent(null);
  }, []);

  // When current is null and queue has items, promote the next one
  useEffect(() => {
    if (current !== null) return;
    if (queue.length === 0) return;

    const [head, ...rest] = queue;
    setCurrent(head);
    setQueue(rest);

    const duration = head.durationMs ?? 3500;
    timerRef.current = setTimeout(() => {
      setCurrent(null);
      timerRef.current = null;
    }, duration);
  }, [current, queue]);

  // Cleanup any pending timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <CelebrationContext.Provider value={{ enqueue, current, dismiss }}>
      {children}
    </CelebrationContext.Provider>
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────
export function useCelebrations(): CelebrationContextValue {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    // Soft fallback so screens don't crash if provider is missing —
    // celebrations just become no-ops in that case.
    return {
      enqueue: () => {},
      current: null,
      dismiss: () => {},
    };
  }
  return ctx;
}

/** Lighter hook for consumers that only need to enqueue. */
export function useCelebrate() {
  return useCelebrations().enqueue;
}
