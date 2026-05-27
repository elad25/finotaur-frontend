/**
 * useChartTheme — persist chart light/dark theme preference in localStorage.
 *
 * Mirrors the pattern of useIndicatorPreferences. The `v1` suffix on the
 * storage key reserves room for a schema bump without losing the old data.
 *
 * Callers that want a light default (e.g. Trade Journal) pass
 * `defaultTheme = 'light'`. Other consumers default to 'dark'.
 */

import { useCallback, useState } from 'react';

export type ChartThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'finotaur:chart:theme:v1';

function readFromStorage(defaultTheme: ChartThemeMode): ChartThemeMode {
  if (typeof window === 'undefined') return defaultTheme;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTheme;
    // Validate stored value — only exact 'light' or 'dark' are valid.
    if (raw === 'light' || raw === 'dark') return raw;
    // Corrupt / unknown value — fall back silently.
    return defaultTheme;
  } catch {
    // Blocked storage — non-fatal.
    return defaultTheme;
  }
}

function writeToStorage(theme: ChartThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage full / blocked — non-fatal, toggle still works for the session.
  }
}

/**
 * Returns `[theme, setTheme]`. `setTheme` writes through to localStorage.
 * Accepts an optional `defaultTheme` argument so the journal can default to
 * `'light'` while other future consumers can default to `'dark'`.
 */
export function useChartTheme(
  defaultTheme: ChartThemeMode = 'dark',
): [ChartThemeMode, (next: ChartThemeMode) => void] {
  // Lazy initializer — only touches localStorage on first render.
  const [theme, setThemeState] = useState<ChartThemeMode>(() =>
    readFromStorage(defaultTheme),
  );

  const setTheme = useCallback((next: ChartThemeMode) => {
    setThemeState(next);
    writeToStorage(next);
  }, []);

  return [theme, setTheme];
}
