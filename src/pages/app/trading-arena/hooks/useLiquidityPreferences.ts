/**
 * useLiquidityPreferences — persist the Trading Arena Liquidity tab's
 * floor-filter mode + size-filter percentage per symbol, in localStorage
 * (PR 3, task K.1).
 *
 * Clones the lazy-init / write-through / corrupt-JSON-safe / field-by-field
 * validation pattern of useFootprintPreferences.ts, but simpler: a single
 * per-symbol key, no __default/per-symbol split. Both fields here are
 * inherently symbol-scoped (a $500K floor makes sense for BTCUSDT, not for
 * a low-notional altcoin) — there's no shared "visual preference" concern
 * the way footprint's content/layout/colorScheme are, so a two-key split
 * would just be unnecessary complexity.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export const LIQUIDITY_STORAGE_PREFIX = 'finotaur:arena:liquidity:v1';

export function liquiditySymbolStorageKey(symbol: string): string {
  return `${LIQUIDITY_STORAGE_PREFIX}:${symbol}`;
}

/** 'auto' = adaptive per-symbol floor; a number = one of LiquidityTab.tsx's FLOOR_OPTIONS values (or any custom $ floor). */
export type LiquidityFloorMode = 'auto' | number;
export type LiquiditySizeFilterPct = 0 | 1 | 5 | 10 | 25;

export interface LiquidityPreferences {
  floorMode: LiquidityFloorMode;
  sizeFilterPct: LiquiditySizeFilterPct;
}

export const DEFAULT_LIQUIDITY_PREFERENCES: LiquidityPreferences = {
  floorMode: 'auto',
  sizeFilterPct: 0,
};

const SIZE_FILTER_VALUES: readonly LiquiditySizeFilterPct[] = [0, 1, 5, 10, 25];

function asFloorMode(v: unknown, fallback: LiquidityFloorMode): LiquidityFloorMode {
  if (v === 'auto') return 'auto';
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  return fallback;
}

function asSizeFilterPct(v: unknown, fallback: LiquiditySizeFilterPct): LiquiditySizeFilterPct {
  return typeof v === 'number' && (SIZE_FILTER_VALUES as readonly number[]).includes(v)
    ? (v as LiquiditySizeFilterPct)
    : fallback;
}

/**
 * Validates an arbitrary parsed-JSON value field-by-field against
 * `fallback` — never trusts the shape of `raw` (corrupt/partial/foreign
 * JSON degrades gracefully per field, never throws). Pure, exported for
 * direct unit testing (mirrors useFootprintPreferences.ts's
 * sanitizeFootprintSettings).
 */
export function sanitizeLiquidityPreferences(
  raw: unknown,
  fallback: LiquidityPreferences = DEFAULT_LIQUIDITY_PREFERENCES,
): LiquidityPreferences {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<LiquidityPreferences>;
  return {
    floorMode: asFloorMode(p.floorMode, fallback.floorMode),
    sizeFilterPct: asSizeFilterPct(p.sizeFilterPct, fallback.sizeFilterPct),
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

function writeRawKey(key: string, value: LiquidityPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / blocked — non-fatal, in-memory state still works this session.
  }
}

/** Pure read — safe to call outside React (used both by the hook's lazy initializer and directly by tests). */
export function readLiquidityPreferencesForSymbol(symbol: string): LiquidityPreferences {
  return sanitizeLiquidityPreferences(readRawKey(liquiditySymbolStorageKey(symbol)), DEFAULT_LIQUIDITY_PREFERENCES);
}

export interface UseLiquidityPreferencesResult {
  preferences: LiquidityPreferences;
  update: (patch: Partial<LiquidityPreferences>) => void;
}

export function useLiquidityPreferences(symbol: string): UseLiquidityPreferencesResult {
  const [preferences, setPreferences] = useState<LiquidityPreferences>(() =>
    readLiquidityPreferencesForSymbol(symbol),
  );

  // Tracks the symbol `update` should write against — avoids a stale-closure
  // symbol on rapid symbol-switch + update races (same guard
  // useFootprintPreferences.ts uses).
  const symbolRef = useRef(symbol);

  useEffect(() => {
    symbolRef.current = symbol;
    setPreferences(readLiquidityPreferencesForSymbol(symbol));
  }, [symbol]);

  const update = useCallback((patch: Partial<LiquidityPreferences>) => {
    setPreferences((prev) => {
      const next: LiquidityPreferences = { ...prev, ...patch };
      writeRawKey(liquiditySymbolStorageKey(symbolRef.current), next);
      return next;
    });
  }, []);

  return { preferences, update };
}
