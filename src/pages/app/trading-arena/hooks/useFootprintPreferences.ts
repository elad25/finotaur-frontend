/**
 * useFootprintPreferences — persist the Trading Arena Footprint tab's
 * Unified Footprint Settings (see ../components/footprintSettings.ts) in
 * localStorage.
 *
 * Clones the lazy-init / write-through / corrupt-JSON-safe / field-by-field
 * validation pattern of useArenaIndicatorPreferences.ts, but splits storage
 * across TWO keys instead of one:
 *  - `finotaur:arena:footprint:v1:__default` — every visual preference
 *    (content, layout, colors, imbalance, panels, stats rows). Shared
 *    across all symbols — switching symbols keeps your look-and-feel.
 *  - `finotaur:arena:footprint:v1:<SYMBOL>` — ONLY rowSizeMode/rowSizeValue.
 *    Row size is tick/price-scale dependent (a $5 row makes sense for
 *    BTCUSDT, not for a $2 stock-adjacent instrument), so it's the one
 *    concern that must NOT bleed across symbols.
 *
 * `readSettingsForSymbol` / `sanitizeFootprintSettings` are exported as pure
 * functions (no React) specifically so they're unit-testable without a
 * DOM-rendering harness — this codebase's vitest config runs hooks' logic
 * this way (see useArenaIndicatorPreferences' sibling tests / the lack of
 * @testing-library/react in package.json).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_FOOTPRINT_SETTINGS,
  type FootprintSettings,
} from '../components/footprintSettings';

export const FOOTPRINT_STORAGE_PREFIX = 'finotaur:arena:footprint:v1';
export const FOOTPRINT_DEFAULT_STORAGE_KEY = `${FOOTPRINT_STORAGE_PREFIX}:__default`;

export function footprintSymbolStorageKey(symbol: string): string {
  return `${FOOTPRINT_STORAGE_PREFIX}:${symbol}`;
}

/**
 * Fields that vary per-symbol. Every other FootprintSettings field is a
 * shared visual preference and lives in the __default record.
 */
const SYMBOL_SCOPED_FIELDS: ReadonlySet<keyof FootprintSettings> = new Set([
  'rowSizeMode',
  'rowSizeValue',
]);

const CONTENT_VALUES: FootprintSettings['content'][] = ['bidAsk', 'delta', 'volume', 'trades', 'volumeDelta'];
const LAYOUT_VALUES: FootprintSettings['layout'][] = ['numbers', 'histogram'];
const COLOR_SCHEME_VALUES: FootprintSettings['colorScheme'][] = ['delta', 'volumeHeat', 'solid'];
const ROW_SIZE_MODE_VALUES: FootprintSettings['rowSizeMode'][] = ['auto', 'price', 'ticks'];

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function asNullableNumber(v: unknown, fallback: number | null): number | null {
  if (v === null) return null;
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function asOneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/**
 * Validates an arbitrary parsed-JSON value field-by-field against
 * `fallback` (never trusts the shape of `raw` — corrupt/partial/foreign
 * JSON degrades gracefully to `fallback` per field, never throws).
 */
export function sanitizeFootprintSettings(raw: unknown, fallback: FootprintSettings): FootprintSettings {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<FootprintSettings> & { statsRows?: Partial<FootprintSettings['statsRows']> };

  return {
    content: asOneOf(p.content, CONTENT_VALUES, fallback.content),
    layout: asOneOf(p.layout, LAYOUT_VALUES, fallback.layout),
    colorScheme: asOneOf(p.colorScheme, COLOR_SCHEME_VALUES, fallback.colorScheme),
    imbalanceRatioPct: asNumber(p.imbalanceRatioPct, fallback.imbalanceRatioPct),
    imbalanceStackedCount: asNumber(p.imbalanceStackedCount, fallback.imbalanceStackedCount),
    imbalanceStackedOnly: asBool(p.imbalanceStackedOnly, fallback.imbalanceStackedOnly),
    rowSizeMode: asOneOf(p.rowSizeMode, ROW_SIZE_MODE_VALUES, fallback.rowSizeMode),
    rowSizeValue: asNullableNumber(p.rowSizeValue, fallback.rowSizeValue),
    autoTransform: asBool(p.autoTransform, fallback.autoTransform),
    autoTransformMinPx: asNumber(p.autoTransformMinPx, fallback.autoTransformMinPx),
    showCvd: asBool(p.showCvd, fallback.showCvd),
    showDelta: asBool(p.showDelta, fallback.showDelta),
    showVolumeProfile: asBool(p.showVolumeProfile, fallback.showVolumeProfile),
    showPoc: asBool(p.showPoc, fallback.showPoc),
    showValueArea: asBool(p.showValueArea, fallback.showValueArea),
    magnifierEnabled: asBool(p.magnifierEnabled, fallback.magnifierEnabled),
    statsRows: {
      volume: asBool(p.statsRows?.volume, fallback.statsRows.volume),
      delta: asBool(p.statsRows?.delta, fallback.statsRows.delta),
      deltaPct: asBool(p.statsRows?.deltaPct, fallback.statsRows.deltaPct),
      maxDelta: asBool(p.statsRows?.maxDelta, fallback.statsRows.maxDelta),
      minDelta: asBool(p.statsRows?.minDelta, fallback.statsRows.minDelta),
      sessionDelta: asBool(p.statsRows?.sessionDelta, fallback.statsRows.sessionDelta),
    },
  };
}

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

function writeRawKey(key: string, value: Partial<FootprintSettings>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / blocked — non-fatal, in-memory state still works this session.
  }
}

/**
 * Reads + merges the __default record with `symbol`'s override record
 * (rowSizeMode/rowSizeValue only). Pure — safe to call outside React (used
 * both by the hook's lazy initializer and directly by tests).
 */
export function readFootprintSettingsForSymbol(symbol: string): FootprintSettings {
  const defaults = sanitizeFootprintSettings(readRawKey(FOOTPRINT_DEFAULT_STORAGE_KEY), DEFAULT_FOOTPRINT_SETTINGS);

  const symbolRaw = readRawKey(footprintSymbolStorageKey(symbol));
  if (!symbolRaw || typeof symbolRaw !== 'object') return defaults;

  const merged = sanitizeFootprintSettings(symbolRaw, defaults);
  // Only the symbol-scoped fields are allowed to differ from __default —
  // anything else present in a stray/corrupt symbol record is ignored, so a
  // symbol record can never silently override a shared visual preference.
  return {
    ...defaults,
    rowSizeMode: merged.rowSizeMode,
    rowSizeValue: merged.rowSizeValue,
  };
}

export interface UseFootprintPreferencesResult {
  settings: FootprintSettings;
  /**
   * Patches one or more fields. Per-field, the patch is routed to either the
   * per-symbol record (rowSizeMode/rowSizeValue) or the shared __default
   * record (everything else) — callers never need to think about which.
   */
  update: (patch: Partial<FootprintSettings>) => void;
}

export function useFootprintPreferences(symbol: string): UseFootprintPreferencesResult {
  const [settings, setSettings] = useState<FootprintSettings>(() => readFootprintSettingsForSymbol(symbol));

  // Tracks the symbol `update` should write per-symbol fields against —
  // avoids a stale-closure symbol on rapid symbol-switch + update races.
  const symbolRef = useRef(symbol);

  useEffect(() => {
    symbolRef.current = symbol;
    setSettings(readFootprintSettingsForSymbol(symbol));
  }, [symbol]);

  const update = useCallback((patch: Partial<FootprintSettings>) => {
    setSettings((prev) => {
      const next: FootprintSettings = { ...prev, ...patch };

      const defaultPatch: Partial<FootprintSettings> = {};
      const symbolPatch: Partial<FootprintSettings> = {};
      for (const key of Object.keys(patch) as (keyof FootprintSettings)[]) {
        if (SYMBOL_SCOPED_FIELDS.has(key)) {
          (symbolPatch as Record<string, unknown>)[key] = next[key];
        } else {
          (defaultPatch as Record<string, unknown>)[key] = next[key];
        }
      }

      if (Object.keys(defaultPatch).length > 0) {
        const existingDefault = sanitizeFootprintSettings(
          readRawKey(FOOTPRINT_DEFAULT_STORAGE_KEY),
          DEFAULT_FOOTPRINT_SETTINGS,
        );
        writeRawKey(FOOTPRINT_DEFAULT_STORAGE_KEY, { ...existingDefault, ...defaultPatch });
      }
      if (Object.keys(symbolPatch).length > 0) {
        const symbolKey = footprintSymbolStorageKey(symbolRef.current);
        const existingSymbolRaw = readRawKey(symbolKey);
        const existingSymbol =
          existingSymbolRaw && typeof existingSymbolRaw === 'object'
            ? (existingSymbolRaw as Partial<FootprintSettings>)
            : {};
        writeRawKey(symbolKey, { ...existingSymbol, ...symbolPatch });
      }

      return next;
    });
  }, []);

  return { settings, update };
}
