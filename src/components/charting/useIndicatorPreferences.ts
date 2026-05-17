/**
 * useIndicatorPreferences — persist indicator on/off state in localStorage.
 *
 * Phase 2 keeps state per-browser. Phase 3 may migrate to a user_settings
 * Supabase table; the `v1` suffix on the storage key reserves room for a
 * schema bump without losing the old data.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { INDICATOR_DEFAULTS, type IndicatorSettings } from './types';

const STORAGE_KEY = 'finotaur:chart:indicators:v1';

function readFromStorage(): IndicatorSettings {
  if (typeof window === 'undefined') return INDICATOR_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INDICATOR_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<IndicatorSettings>;
    // Defensive: forward-compat with future keys, ignore unknown ones.
    return {
      sma: parsed.sma === true,
      ema: parsed.ema === true,
      rsi: parsed.rsi === true,
      vwap: parsed.vwap === true,
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
export function useIndicatorPreferences(): [
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
