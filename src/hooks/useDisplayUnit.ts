import { useState, useCallback } from 'react';

export type DisplayUnit = '$' | 'R';

const STORAGE_KEY = 'finotaur:journal-display-unit';

function readStoredUnit(): DisplayUnit {
  if (typeof window === 'undefined') return '$';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'R' ? 'R' : '$';
  } catch {
    return '$';
  }
}

export function useDisplayUnit(): { unit: DisplayUnit; setUnit: (u: DisplayUnit) => void } {
  const [unit, setUnitState] = useState<DisplayUnit>(() => readStoredUnit());

  const setUnit = useCallback((u: DisplayUnit) => {
    setUnitState(u);
    try {
      window.localStorage.setItem(STORAGE_KEY, u);
    } catch {
      // Ignore quota errors — state update already applied above
    }
  }, []);

  return { unit, setUnit };
}
