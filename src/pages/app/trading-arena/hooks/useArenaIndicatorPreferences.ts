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
 * v3 (per-indicator Inputs/Style/Visibility dialog — IndicatorSettingsDialog.tsx):
 * adds `styles` (per-line color/opacity/thickness/line-style) + `visibility`
 * (global timeframe-bucket gating) on top of v2's `{ enabled, params }`. v2's
 * own read/sanitize/migrate functions are UNCHANGED (still exercised directly
 * by useArenaIndicatorPreferences.test.ts) — v3 reads through them via
 * `readArenaIndicatorPreferencesV3` and layers styles/visibility defaults on
 * top when no v3 record exists yet. The hook itself now holds v3 state; v2 is
 * kept only as the read-only migration source + its own pure-function tests.
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
  DEFAULT_ARENA_INDICATOR_PREFERENCES_V3,
  DEFAULT_ARENA_INDICATOR_STYLES,
  sanitizeArenaIndicatorPreferences,
  sanitizeArenaIndicatorPreferencesV3,
  type ArenaIndicatorEnabled,
  type ArenaIndicatorKey,
  type ArenaIndicatorLineStyle,
  type ArenaIndicatorParams,
  type ArenaIndicatorPreferences,
  type ArenaIndicatorPreferencesV3,
  type ArenaIndicatorStylePatch,
  type ArenaIndicatorStyles,
  type ArenaIndicatorVisibility,
} from '../components/indicatorsSettings';

/** Legacy flat-boolean key (pre-Indicators-popup). Read-only — migrated into v2, never written to again. */
export const ARENA_INDICATORS_STORAGE_KEY_V1 = 'finotaur:arena:indicators:v1';
/** `{ enabled, params }` key (pre-per-indicator-settings-dialog). Read-only — migrated into v3, never written to again. */
export const ARENA_INDICATORS_STORAGE_KEY_V2 = 'finotaur:arena:indicators:v2';
/** Current `{ enabled, params, styles, visibility }` key — see indicatorsSettings.ts's ArenaIndicatorPreferencesV3. */
export const ARENA_INDICATORS_STORAGE_KEY_V3 = 'finotaur:arena:indicators:v3';

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

/**
 * Reads + sanitizes the v3 `{ enabled, params, styles, visibility }` shape.
 * v3 wins if present. Otherwise falls back through the existing v2/v1 chain
 * (`readArenaIndicatorPreferences`, unchanged — still the single source of
 * truth for the enabled/params migration) and merges in the styles/
 * visibility defaults. Pure — not persisted until the next write, same
 * lazy-migration pattern as the v2 reader.
 */
export function readArenaIndicatorPreferencesV3(): ArenaIndicatorPreferencesV3 {
  const v3Raw = readRawKey(ARENA_INDICATORS_STORAGE_KEY_V3);
  if (v3Raw) return sanitizeArenaIndicatorPreferencesV3(v3Raw);

  const v2Chain = readArenaIndicatorPreferences(); // handles v2-wins / v1-migrate / defaults internally
  return {
    enabled: v2Chain.enabled,
    params: v2Chain.params,
    styles: DEFAULT_ARENA_INDICATOR_PREFERENCES_V3.styles,
    visibility: DEFAULT_ARENA_INDICATOR_PREFERENCES_V3.visibility,
  };
}

function writeArenaIndicatorPreferencesV3(prefs: ArenaIndicatorPreferencesV3): void {
  writeRawKey(ARENA_INDICATORS_STORAGE_KEY_V3, prefs);
}

export interface UseArenaIndicatorPreferencesResult {
  enabled: ArenaIndicatorEnabled;
  params: ArenaIndicatorParams;
  styles: ArenaIndicatorStyles;
  visibility: ArenaIndicatorVisibility;
  /** Shallow-patches one or more on/off booleans. Max-5 enforcement lives in the dialog, not here. */
  updateEnabled: (patch: Partial<ArenaIndicatorEnabled>) => void;
  /** Patches ONE indicator's param object, e.g. `updateParams('ema', { period: 12 })`. */
  updateParams: <K extends keyof ArenaIndicatorParams>(key: K, patch: Partial<ArenaIndicatorParams[K]>) => void;
  /** Deep-merges ONE indicator's line-style entries, e.g. `updateStyles('macd', { histogram: { color: '#fff' } })`. */
  updateStyles: <K extends keyof ArenaIndicatorStyles>(key: K, patch: ArenaIndicatorStylePatch<K>) => void;
  /** Shallow-patches the GLOBAL visibility config (applies to every indicator), e.g. `updateVisibility({ seconds: { ...visibility.seconds, enabled: false } })`. */
  updateVisibility: (patch: Partial<ArenaIndicatorVisibility>) => void;
  /** Resets ONE indicator's params + style to defaults. Visibility (global) is untouched. No-op params reset for vwap/volumeProfile (no params); no-op style reset for volumeProfile (no style). */
  resetIndicator: (key: ArenaIndicatorKey) => void;
  /** Restores every default (enabled/params/styles/visibility) and persists it (the dialog's "Reset to defaults" row). */
  reset: () => void;
}

export function useArenaIndicatorPreferences(): UseArenaIndicatorPreferencesResult {
  // Lazy initializer — only touches localStorage on first render.
  const [prefs, setPrefs] = useState<ArenaIndicatorPreferencesV3>(readArenaIndicatorPreferencesV3);

  // Track the most recent prefs so updaters don't depend on a stale closure.
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const updateEnabled = useCallback((patch: Partial<ArenaIndicatorEnabled>) => {
    const next: ArenaIndicatorPreferencesV3 = {
      ...prefsRef.current,
      enabled: { ...prefsRef.current.enabled, ...patch },
    };
    setPrefs(next);
    writeArenaIndicatorPreferencesV3(next);
  }, []);

  const updateParams = useCallback(
    <K extends keyof ArenaIndicatorParams>(key: K, patch: Partial<ArenaIndicatorParams[K]>) => {
      const next: ArenaIndicatorPreferencesV3 = {
        ...prefsRef.current,
        params: {
          ...prefsRef.current.params,
          [key]: { ...prefsRef.current.params[key], ...patch },
        },
      };
      setPrefs(next);
      writeArenaIndicatorPreferencesV3(next);
    },
    [],
  );

  const updateStyles = useCallback(
    <K extends keyof ArenaIndicatorStyles>(key: K, patch: ArenaIndicatorStylePatch<K>) => {
      const currentStyles = prefsRef.current.styles;
      const currentEntry = currentStyles[key];
      // `currentEntry`/`patch` are both maps of line-slot-name -> ArenaIndicatorLineStyle
      // for every ArenaIndicatorStyles[K] shape (ArenaSingleLineStyle /
      // ArenaMacdStyle / ArenaBbandsStyle) — the generic K makes this
      // impossible for TS to verify statically, hence the narrow casts here.
      const currentEntryRecord = currentEntry as unknown as Record<string, ArenaIndicatorLineStyle>;
      const patchRecord = patch as unknown as Record<string, Partial<ArenaIndicatorLineStyle> | undefined>;
      const mergedEntry: Record<string, ArenaIndicatorLineStyle> = { ...currentEntryRecord };
      for (const lineKey of Object.keys(patchRecord)) {
        const linePatch = patchRecord[lineKey];
        if (!linePatch) continue;
        mergedEntry[lineKey] = { ...currentEntryRecord[lineKey], ...linePatch };
      }
      const next: ArenaIndicatorPreferencesV3 = {
        ...prefsRef.current,
        styles: { ...currentStyles, [key]: mergedEntry } as ArenaIndicatorStyles,
      };
      setPrefs(next);
      writeArenaIndicatorPreferencesV3(next);
    },
    [],
  );

  const updateVisibility = useCallback((patch: Partial<ArenaIndicatorVisibility>) => {
    const next: ArenaIndicatorPreferencesV3 = {
      ...prefsRef.current,
      visibility: { ...prefsRef.current.visibility, ...patch },
    };
    setPrefs(next);
    writeArenaIndicatorPreferencesV3(next);
  }, []);

  const resetIndicator = useCallback((key: ArenaIndicatorKey) => {
    const current = prefsRef.current;
    // ArenaIndicatorKey (8 keys) is a superset of both keyof ArenaIndicatorParams
    // (6 keys — no vwap/volumeProfile) and keyof ArenaIndicatorStyles (7 keys —
    // no volumeProfile); these casts are narrowed safely by the runtime `in`
    // checks below before either key is used to index.
    const paramKey = key as keyof ArenaIndicatorParams;
    const hasParams = paramKey in ARENA_INDICATOR_PARAM_DEFAULTS;
    const styleKey = key as keyof ArenaIndicatorStyles;
    const hasStyle = styleKey in DEFAULT_ARENA_INDICATOR_STYLES;

    const next: ArenaIndicatorPreferencesV3 = {
      ...current,
      params: hasParams ? { ...current.params, [paramKey]: ARENA_INDICATOR_PARAM_DEFAULTS[paramKey] } : current.params,
      styles: hasStyle ? { ...current.styles, [styleKey]: DEFAULT_ARENA_INDICATOR_STYLES[styleKey] } : current.styles,
    };
    setPrefs(next);
    writeArenaIndicatorPreferencesV3(next);
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_ARENA_INDICATOR_PREFERENCES_V3);
    writeArenaIndicatorPreferencesV3(DEFAULT_ARENA_INDICATOR_PREFERENCES_V3);
  }, []);

  return {
    enabled: prefs.enabled,
    params: prefs.params,
    styles: prefs.styles,
    visibility: prefs.visibility,
    updateEnabled,
    updateParams,
    updateStyles,
    updateVisibility,
    resetIndicator,
    reset,
  };
}
