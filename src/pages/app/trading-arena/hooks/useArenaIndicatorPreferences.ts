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
 * top when no v3 record exists yet.
 *
 * v4 (INSTANCES model — same indicator addable multiple times, e.g.
 * EMA 9 + EMA 21): replaces v3's one-per-type `{ enabled, params, styles }`
 * with `{ instances }` (see indicatorsSettings.ts's `ArenaIndicatorInstance`/
 * `ArenaIndicatorPreferencesV4`). v3's own read/sanitize/migrate functions
 * are UNCHANGED (still exercised directly by
 * useArenaIndicatorPreferences.test.ts) — v4 reads through them via
 * `readArenaIndicatorPreferencesV3` and migrates via `migrateV3ToV4` when no
 * v4 record exists yet. The hook itself now holds v4 state; v3/v2/v1 are
 * kept only as the read-only migration chain + their own pure-function tests.
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
  DEFAULT_ARENA_INDICATOR_PREFERENCES_V4,
  MAX_ACTIVE_INDICATORS,
  createIndicatorInstance,
  defaultParamsForType,
  defaultStylesForType,
  migrateV3ToV4,
  sanitizeArenaIndicatorPreferences,
  sanitizeArenaIndicatorPreferencesV3,
  sanitizeArenaIndicatorPreferencesV4,
  type ArenaIndicatorEnabled,
  type ArenaIndicatorInstance,
  type ArenaIndicatorKey,
  type ArenaIndicatorLineStyle,
  type ArenaIndicatorPreferences,
  type ArenaIndicatorPreferencesV3,
  type ArenaIndicatorPreferencesV4,
  type ArenaIndicatorVisibility,
} from '../components/indicatorsSettings';

/** Legacy flat-boolean key (pre-Indicators-popup). Read-only — migrated into v2, never written to again. */
export const ARENA_INDICATORS_STORAGE_KEY_V1 = 'finotaur:arena:indicators:v1';
/** `{ enabled, params }` key (pre-per-indicator-settings-dialog). Read-only — migrated into v3, never written to again. */
export const ARENA_INDICATORS_STORAGE_KEY_V2 = 'finotaur:arena:indicators:v2';
/** `{ enabled, params, styles, visibility }` key (pre-instances-model). Read-only — migrated into v4, never written to again. */
export const ARENA_INDICATORS_STORAGE_KEY_V3 = 'finotaur:arena:indicators:v3';
/** Current `{ instances, visibility }` key — see indicatorsSettings.ts's ArenaIndicatorPreferencesV4. */
export const ARENA_INDICATORS_STORAGE_KEY_V4 = 'finotaur:arena:indicators:v4';

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

/**
 * Reads + sanitizes the current v4 `{ instances, visibility }` shape. v4
 * wins if present. Otherwise falls back through the existing v3/v2/v1 chain
 * (`readArenaIndicatorPreferencesV3`, unchanged — still the single source of
 * truth for the enabled/params/styles migration) via `migrateV3ToV4`. Pure —
 * not persisted until the next write, same lazy-migration pattern as the
 * v2→v3 reader.
 */
export function readArenaIndicatorPreferencesV4(): ArenaIndicatorPreferencesV4 {
  const v4Raw = readRawKey(ARENA_INDICATORS_STORAGE_KEY_V4);
  if (v4Raw) return sanitizeArenaIndicatorPreferencesV4(v4Raw);

  const v3Chain = readArenaIndicatorPreferencesV3(); // handles v3-wins / v2/v1-migrate / defaults internally
  return migrateV3ToV4(v3Chain);
}

function writeArenaIndicatorPreferencesV4(prefs: ArenaIndicatorPreferencesV4): void {
  writeRawKey(ARENA_INDICATORS_STORAGE_KEY_V4, prefs);
}

export interface UseArenaIndicatorPreferencesResult {
  instances: ArenaIndicatorInstance[];
  visibility: ArenaIndicatorVisibility;
  /**
   * Adds a fresh instance of `type` (type defaults for params/style).
   * Returns the new instance's id, or `null` if refused: at the 5-active
   * cap, or `type === 'volumeProfile'` and one already exists (Volume
   * Profile stays single-instance — its detail params live in chartStyle,
   * not per-instance, so a 2nd one would be indistinguishable from the 1st).
   */
  addInstance: (type: ArenaIndicatorKey) => string | null;
  /** Removes one instance by id. No-op if the id doesn't exist. */
  removeInstance: (id: string) => void;
  /** Shallow-patches ONE instance's params, e.g. `updateInstanceParams(id, { period: 12 })`. */
  updateInstanceParams: (id: string, patch: Record<string, unknown>) => void;
  /** Deep-merges ONE instance's line-style entries, e.g. `updateInstanceStyles(id, { histogram: { color: '#fff' } })`. */
  updateInstanceStyles: (id: string, patch: Record<string, unknown>) => void;
  /** Shallow-patches the GLOBAL visibility config (applies to every indicator), e.g. `updateVisibility({ seconds: { ...visibility.seconds, enabled: false } })`. */
  updateVisibility: (patch: Partial<ArenaIndicatorVisibility>) => void;
  /** Resets ONE instance's params + style to its type's defaults. Visibility (global) is untouched. */
  resetInstance: (id: string) => void;
  /** Restores every default (instances/visibility) and persists it (the dialog's "Reset to defaults" row). */
  reset: () => void;
}

export function useArenaIndicatorPreferences(): UseArenaIndicatorPreferencesResult {
  // Lazy initializer — only touches localStorage on first render.
  const [prefs, setPrefs] = useState<ArenaIndicatorPreferencesV4>(readArenaIndicatorPreferencesV4);

  // Track the most recent prefs so updaters don't depend on a stale closure.
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const addInstance = useCallback((type: ArenaIndicatorKey): string | null => {
    const current = prefsRef.current;
    if (type === 'volumeProfile' && current.instances.some((instance) => instance.type === 'volumeProfile')) {
      return null;
    }
    if (current.instances.length >= MAX_ACTIVE_INDICATORS) return null;

    const instance = createIndicatorInstance(type);
    const next: ArenaIndicatorPreferencesV4 = { ...current, instances: [...current.instances, instance] };
    setPrefs(next);
    writeArenaIndicatorPreferencesV4(next);
    return instance.id;
  }, []);

  const removeInstance = useCallback((id: string) => {
    const current = prefsRef.current;
    const next: ArenaIndicatorPreferencesV4 = {
      ...current,
      instances: current.instances.filter((instance) => instance.id !== id),
    };
    setPrefs(next);
    writeArenaIndicatorPreferencesV4(next);
  }, []);

  const updateInstanceParams = useCallback((id: string, patch: Record<string, unknown>) => {
    const current = prefsRef.current;
    const next: ArenaIndicatorPreferencesV4 = {
      ...current,
      instances: current.instances.map((instance) =>
        instance.id === id
          ? { ...instance, params: { ...(instance.params as Record<string, unknown>), ...patch } as typeof instance.params }
          : instance,
      ),
    };
    setPrefs(next);
    writeArenaIndicatorPreferencesV4(next);
  }, []);

  const updateInstanceStyles = useCallback((id: string, patch: Record<string, unknown>) => {
    const current = prefsRef.current;
    const next: ArenaIndicatorPreferencesV4 = {
      ...current,
      instances: current.instances.map((instance) => {
        if (instance.id !== id) return instance;
        // `instance.styles`/`patch` are both maps of line-slot-name ->
        // ArenaIndicatorLineStyle for every per-type styles shape
        // (ArenaSingleLineStyle / ArenaMacdStyle / ArenaBbandsStyle /
        // volumeProfile's empty object) — the instance's own `type` makes
        // this impossible for TS to verify statically here, hence the
        // narrow casts (same pattern the pre-instances `updateStyles` used).
        const currentStylesRecord = instance.styles as unknown as Record<string, ArenaIndicatorLineStyle>;
        const patchRecord = patch as Record<string, Partial<ArenaIndicatorLineStyle> | undefined>;
        const mergedStyles: Record<string, ArenaIndicatorLineStyle> = { ...currentStylesRecord };
        for (const lineKey of Object.keys(patchRecord)) {
          const linePatch = patchRecord[lineKey];
          if (!linePatch) continue;
          mergedStyles[lineKey] = { ...currentStylesRecord[lineKey], ...linePatch };
        }
        return { ...instance, styles: mergedStyles as unknown as typeof instance.styles };
      }),
    };
    setPrefs(next);
    writeArenaIndicatorPreferencesV4(next);
  }, []);

  const updateVisibility = useCallback((patch: Partial<ArenaIndicatorVisibility>) => {
    const next: ArenaIndicatorPreferencesV4 = {
      ...prefsRef.current,
      visibility: { ...prefsRef.current.visibility, ...patch },
    };
    setPrefs(next);
    writeArenaIndicatorPreferencesV4(next);
  }, []);

  const resetInstance = useCallback((id: string) => {
    const current = prefsRef.current;
    const next: ArenaIndicatorPreferencesV4 = {
      ...current,
      instances: current.instances.map((instance) =>
        instance.id === id
          ? { ...instance, params: defaultParamsForType(instance.type), styles: defaultStylesForType(instance.type) }
          : instance,
      ),
    };
    setPrefs(next);
    writeArenaIndicatorPreferencesV4(next);
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_ARENA_INDICATOR_PREFERENCES_V4);
    writeArenaIndicatorPreferencesV4(DEFAULT_ARENA_INDICATOR_PREFERENCES_V4);
  }, []);

  return {
    instances: prefs.instances,
    visibility: prefs.visibility,
    addInstance,
    removeInstance,
    updateInstanceParams,
    updateInstanceStyles,
    updateVisibility,
    resetInstance,
    reset,
  };
}
