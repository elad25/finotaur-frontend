/**
 * useChartStylePreferences — persist the Trading Arena's TradingView-style
 * "Chart Settings" (see ../components/chartStyleSettings.ts) in localStorage.
 *
 * Single GLOBAL key (not per-symbol, unlike useFootprintPreferences' row
 * size) — chart style is a look-and-feel preference the user sets once and
 * expects everywhere, same spirit as useArenaIndicatorPreferences. Clones
 * that hook's lazy-init / write-through / corrupt-JSON-safe pattern.
 */

import { useCallback, useRef, useState } from 'react';

import {
  DEFAULT_CHART_STYLE,
  sanitizeChartStyleSettings,
  type ChartStyleSettings,
} from '../components/chartStyleSettings';

export const CHART_STYLE_STORAGE_KEY = 'finotaur:arena:chartStyle:v1';

function readFromStorage(): ChartStyleSettings {
  if (typeof window === 'undefined') return DEFAULT_CHART_STYLE;
  try {
    const raw = window.localStorage.getItem(CHART_STYLE_STORAGE_KEY);
    if (!raw) return DEFAULT_CHART_STYLE;
    return sanitizeChartStyleSettings(JSON.parse(raw));
  } catch {
    // Corrupt JSON / blocked storage — fall back silently.
    return DEFAULT_CHART_STYLE;
  }
}

function writeToStorage(settings: ChartStyleSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHART_STYLE_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full / blocked — non-fatal, toggles still work for the session.
  }
}

export interface UseChartStylePreferencesResult {
  settings: ChartStyleSettings;
  /** Shallow-patches one or more fields and persists the merged result. */
  update: (patch: Partial<ChartStyleSettings>) => void;
  /** Restores DEFAULT_CHART_STYLE and persists it (the menu's "Reset to defaults" row). */
  reset: () => void;
}

export function useChartStylePreferences(): UseChartStylePreferencesResult {
  // Lazy initializer — only touches localStorage on first render.
  const [settings, setSettingsState] = useState<ChartStyleSettings>(readFromStorage);

  // Track the most recent settings so update() doesn't depend on a stale closure.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const update = useCallback((patch: Partial<ChartStyleSettings>) => {
    const next: ChartStyleSettings = { ...settingsRef.current, ...patch };
    setSettingsState(next);
    writeToStorage(next);
  }, []);

  const reset = useCallback(() => {
    setSettingsState(DEFAULT_CHART_STYLE);
    writeToStorage(DEFAULT_CHART_STYLE);
  }, []);

  return { settings, update, reset };
}
