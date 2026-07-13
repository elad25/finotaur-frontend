/**
 * useArenaIndicatorPreferences — persist the Trading Arena's selected chart
 * indicators (on/off + editable params) in localStorage.
 *
 * v2 (Indicators POPUP): the old flat-boolean `v1` record (7 keys, no
 * params, no Volume Profile) is superseded by a `{ enabled, params }` shape —
 * see ../components/indicatorsSettings.ts for the types/sanitizers. A v1
 * record is migrated in-place on first read (see migrateV1ToV2 below); the
 * v1 key itself is left untouched on disk (harmless — nothing reads it once
 * v2 exists).
 *
 * Deliberately a SEPARATE hook from `useIndicatorPreferences`
 * (src/components/charting/useIndicatorPreferences.ts), which backs
 * Backtest/Journal — that hook has no storage-key parameter, no params, and
 * no Volume Profile concept, so reusing it here would clobber those
 * surfaces' saved preferences with the Arena's.
 *
 * `readArenaIndicatorPreferences` / `migrateV1ToV2` are exported as pure
 * functions (no React) specifically so they're unit-testable without a
 * DOM-rendering harness — same pattern useFootprintPreferences.ts documents.
 *
 * Selection is a single source of truth held in TradingArena.tsx and
 * threaded down to whichever tab is active, so switching tabs (Chart /
 * Order Flow / Liquidity / DOM) keeps the same indicators on screen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ARENA_INDICATOR_PARAM_DEFAULTS,
  DEFAULT_ARENA_INDICATOR_PREFERENCES,
  sanitizeArenaIndicatorPreferences,
  type ArenaIndicatorEnabled,
  type ArenaIndicatorParams,
  type ArenaIndicatorPreferences,
} from '../components/indicatorsSettings';

/** Legacy flat-boolean key (pre-Indicators-popup). Read-only — migrated into v2, never written to again. */
export const ARENA_INDICATORS_STORAGE_KEY_V1 = 'finotaur:arena:indicators:v1';
/** Current `{ enabled, params }` key. */
export const ARENA_INDICATORS_STORAGE_KEY_V2 = 'finotaur:arena:indicators:v2';

function readRawKey(key: string): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    // Corrupt JSON / blocked storage — fall back silently.
    return null;
  }
}

function writeRawKey(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / blocked — non-fatal, toggles still work for the session.
  }
}

/**
 * Migrates a legacy v1 record (flat booleans, no `volumeProfile`, no
 * `params`) into the v2 shape. `volumeProfile` defaults to `true` (Session
 * Volume Profile was on-by-default pre-migration, via
 * chartStyle.volumeProfile.enabled) and every numeric param falls back to
 * ARENA_INDICATOR_PARAM_DEFAULTS — including EMA's new period-9 default,
 * which applies even to migrated users (there is no prior EMA-period
 * preference to preserve, since v1 had no params at all).
 */
export function migrateV1ToV2(v1Raw: unknown): ArenaIndicatorPreferences {
  const p = (v1Raw && typeof v1Raw === 'object' ? v1Raw : {}) as Partial<Record<string, unknown>>;

  const enabled: ArenaIndicatorEnabled = {
    sma: p.sma === true,
    ema: p.ema === true,
    rsi: p.rsi === true,
    vwap: p.vwap === true,
    macd: p.macd === true,
    bbands: p.bbands === true,
    atr: p.atr === true,
    volumeProfile: true,
  };

  return { enabled, params: { ...ARENA_INDICATOR_PARAM_DEFAULTS } };
}

/**
 * Reads + sanitizes the current preferences. v2 wins if present; otherwise
 * a v1 record is migrated (not persisted until the next write — pure read).
 * Pure — safe to call outside React (used both by the hook's lazy
 * initializer and directly by tests).
 */
export function readArenaIndicatorPreferences(): ArenaIndicatorPreferences {
  const v2Raw = readRawKey(ARENA_INDICATORS_STORAGE_KEY_V2);
  if (v2Raw) return sanitizeArenaIndicatorPreferences(v2Raw);

  const v1Raw = readRawKey(ARENA_INDICATORS_STORAGE_KEY_V1);
  if (v1Raw) return migrateV1ToV2(v1Raw);

  return DEFAULT_ARENA_INDICATOR_PREFERENCES;
}

function writeArenaIndicatorPreferences(prefs: ArenaIndicatorPreferences): void {
  writeRawKey(ARENA_INDICATORS_STORAGE_KEY_V2, prefs);
}

export interface UseArenaIndicatorPreferencesResult {
  enabled: ArenaIndicatorEnabled;
  params: ArenaIndicatorParams;
  /** Shallow-patches one or more on/off booleans. Max-5 enforcement lives in the dialog, not here. */
  updateEnabled: (patch: Partial<ArenaIndicatorEnabled>) => void;
  /** Patches ONE indicator's param object, e.g. `updateParams('ema', { period: 12 })`. */
  updateParams: <K extends keyof ArenaIndicatorParams>(key: K, patch: Partial<ArenaIndicatorParams[K]>) => void;
  /** Restores DEFAULT_ARENA_INDICATOR_PREFERENCES and persists it (the dialog's "Reset to defaults" row). */
  reset: () => void;
}

export function useArenaIndicatorPreferences(): UseArenaIndicatorPreferencesResult {
  // Lazy initializer — only touches localStorage on first render.
  const [prefs, setPrefs] = useState<ArenaIndicatorPreferences>(readArenaIndicatorPreferences);

  // Track the most recent prefs so updaters don't depend on a stale closure.
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const updateEnabled = useCallback((patch: Partial<ArenaIndicatorEnabled>) => {
    const next: ArenaIndicatorPreferences = {
      ...prefsRef.current,
      enabled: { ...prefsRef.current.enabled, ...patch },
    };
    setPrefs(next);
    writeArenaIndicatorPreferences(next);
  }, []);

  const updateParams = useCallback(
    <K extends keyof ArenaIndicatorParams>(key: K, patch: Partial<ArenaIndicatorParams[K]>) => {
      const next: ArenaIndicatorPreferences = {
        ...prefsRef.current,
        params: {
          ...prefsRef.current.params,
          [key]: { ...prefsRef.current.params[key], ...patch },
        },
      };
      setPrefs(next);
      writeArenaIndicatorPreferences(next);
    },
    [],
  );

  const reset = useCallback(() => {
    setPrefs(DEFAULT_ARENA_INDICATOR_PREFERENCES);
    writeArenaIndicatorPreferences(DEFAULT_ARENA_INDICATOR_PREFERENCES);
  }, []);

  return { enabled: prefs.enabled, params: prefs.params, updateEnabled, updateParams, reset };
}
