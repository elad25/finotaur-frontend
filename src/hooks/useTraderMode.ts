import { useState, useCallback } from 'react';
import type { TraderMode } from '@/lib/journal/traderNormalization';

export type { TraderMode };

const STORAGE_KEY = 'finotaur:trader-mode';

function readStoredMode(): TraderMode {
  if (typeof window === 'undefined') return 'per-account';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Default is per-account (avg per portfolio — "what did one account make");
    // an explicit per-contract choice is still honored from storage.
    return stored === 'per-contract' ? 'per-contract' : 'per-account';
  } catch {
    return 'per-account';
  }
}

export function useTraderMode(): { traderMode: TraderMode; setTraderMode: (m: TraderMode) => void } {
  const [traderMode, setTraderModeState] = useState<TraderMode>(() => readStoredMode());

  const setTraderMode = useCallback((m: TraderMode) => {
    setTraderModeState(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // Ignore quota errors — state update already applied above
    }
  }, []);

  return { traderMode, setTraderMode };
}
