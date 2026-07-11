/**
 * useArenaIndicatorPreferences — persist the Trading Arena's selected chart
 * indicators in localStorage.
 *
 * Deliberately a SEPARATE hook from `useIndicatorPreferences`
 * (src/components/charting/useIndicatorPreferences.ts), which backs
 * Backtest/Journal — that hook has no storage-key parameter, so reusing it
 * here would clobber those surfaces' saved preferences with the Arena's.
 * Same shape (`IndicatorSettings`) and read/write logic, different
 * localStorage key.
 *
 * Selection is a single source of truth held in TradingArena.tsx and
 * threaded down to whichever tab is active, so switching tabs (Chart /
 * Order Flow / Futures) keeps the same indicators on screen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { INDICATOR_DEFAULTS, type IndicatorSettings } from '@/components/charting/types';

const STORAGE_KEY = 'finotaur:arena:indicators:v1';

function readFromStorage(): IndicatorSettings {
  if (typeof window === 'undefined') return INDICATOR_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INDICATOR_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<IndicatorSettings>;
    return {
      sma: parsed.sma === true,
      ema: parsed.ema === true,
      rsi: parsed.rsi === true,
      vwap: parsed.vwap === true,
      macd: parsed.macd === true,
      bbands: parsed.bbands === true,
      atr: parsed.atr === true,
    };
  } catch {
    // Corrupt JSON / blocked storage — fall back silently.
    return INDICATOR_DEFAULTS;
  }
}

function writeToStorage(settings: IndicatorSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full / blocked — non-fatal, toggles still work for the session.
  }
}

/**
 * Returns `[settings, setSettings]`. `setSettings` accepts either a full
 * IndicatorSettings object or an updater function — same ergonomics as
 * React's `setState`.
 */
export function useArenaIndicatorPreferences(): [
  IndicatorSettings,
  (next: IndicatorSettings | ((prev: IndicatorSettings) => IndicatorSettings)) => void,
] {
  // Lazy initializer — only touches localStorage on first render.
  const [settings, setSettingsState] = useState<IndicatorSettings>(readFromStorage);

  // Track the most recent settings so the writer doesn't depend on stale state.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const setSettings = useCallback(
    (next: IndicatorSettings | ((prev: IndicatorSettings) => IndicatorSettings)) => {
      const resolved =
        typeof next === 'function' ? next(settingsRef.current) : next;
      setSettingsState(resolved);
      writeToStorage(resolved);
    },
    [],
  );

  return [settings, setSettings];
}
