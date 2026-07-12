/**
 * useDomPreferences — persist the Trading Arena DOM tab's ladder/render/
 * auto-center/trading settings per symbol, in localStorage.
 *
 * Clones the lazy-init / write-through / corrupt-JSON-safe / field-by-field
 * validation pattern of useLiquidityPreferences.ts — see that file's header
 * comment for the full rationale. All fields here are symbol-scoped (order
 * size, depth count, etc. are reasonable to differ between e.g. BTCUSDT and
 * a lower-notional altcoin), so — like useLiquidityPreferences — this is a
 * single per-symbol key with no __default/per-symbol split.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export const DOM_STORAGE_PREFIX = 'finotaur:arena:dom:v1';

export function domSymbolStorageKey(symbol: string): string {
  return `${DOM_STORAGE_PREFIX}:${symbol}`;
}

export type DomDepthCount = 5 | 10 | 20 | 40;
export type DomUpdateMs = 100 | 150 | 250;
export type DomAutoCenterSec = 15 | 30 | 60 | 120;
export type DomRecenterTicks = 3 | 5 | 10 | 20;

export const DOM_DEPTH_COUNT_OPTIONS: readonly DomDepthCount[] = [5, 10, 20, 40];
export const DOM_UPDATE_MS_OPTIONS: readonly DomUpdateMs[] = [100, 150, 250];
export const DOM_AUTO_CENTER_SEC_OPTIONS: readonly DomAutoCenterSec[] = [15, 30, 60, 120];
export const DOM_RECENTER_TICKS_OPTIONS: readonly DomRecenterTicks[] = [3, 5, 10, 20];

export interface DomPreferences {
  /** Ladder rows shown per side (above/below center). Default 10. */
  depthCount: DomDepthCount;
  /** Row-model render throttle, ms. Default 150. */
  updateMs: DomUpdateMs;
  /** Whether the ladder auto-recenters on the last traded price. Default true. */
  autoCenter: boolean;
  /** Auto-recenter cadence, seconds — the ladder recenters at least this often when autoCenter is on. Default 60. */
  autoCenterSec: DomAutoCenterSec;
  /** Immediate-recenter threshold — recenters as soon as price drifts this many ticks from center. Default 5. */
  recenterTicks: DomRecenterTicks;
  /** Gold accent line at the last-traded-price row. Default true. */
  showCenterLine: boolean;
  /** Session volume histogram column. Default true. */
  showVolumeHistogram: boolean;
  /** Default paper order size for ladder clicks. Default 1. */
  orderQty: number;
}

export const DEFAULT_DOM_PREFERENCES: DomPreferences = {
  depthCount: 10,
  updateMs: 150,
  autoCenter: true,
  autoCenterSec: 60,
  recenterTicks: 5,
  showCenterLine: true,
  showVolumeHistogram: true,
  orderQty: 1,
};

const MIN_ORDER_QTY = 0.001;

function asDepthCount(v: unknown, fallback: DomDepthCount): DomDepthCount {
  return typeof v === 'number' && (DOM_DEPTH_COUNT_OPTIONS as readonly number[]).includes(v)
    ? (v as DomDepthCount)
    : fallback;
}

function asUpdateMs(v: unknown, fallback: DomUpdateMs): DomUpdateMs {
  return typeof v === 'number' && (DOM_UPDATE_MS_OPTIONS as readonly number[]).includes(v)
    ? (v as DomUpdateMs)
    : fallback;
}

function asAutoCenterSec(v: unknown, fallback: DomAutoCenterSec): DomAutoCenterSec {
  return typeof v === 'number' && (DOM_AUTO_CENTER_SEC_OPTIONS as readonly number[]).includes(v)
    ? (v as DomAutoCenterSec)
    : fallback;
}

function asRecenterTicks(v: unknown, fallback: DomRecenterTicks): DomRecenterTicks {
  return typeof v === 'number' && (DOM_RECENTER_TICKS_OPTIONS as readonly number[]).includes(v)
    ? (v as DomRecenterTicks)
    : fallback;
}

function asBoolean(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asOrderQty(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= MIN_ORDER_QTY ? v : fallback;
}

/**
 * Validates an arbitrary parsed-JSON value field-by-field against
 * `fallback` — never trusts the shape of `raw` (corrupt/partial/foreign
 * JSON degrades gracefully per field, never throws). Pure, exported for
 * direct unit testing (mirrors sanitizeLiquidityPreferences).
 */
export function sanitizeDomPreferences(
  raw: unknown,
  fallback: DomPreferences = DEFAULT_DOM_PREFERENCES,
): DomPreferences {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<DomPreferences>;
  return {
    depthCount: asDepthCount(p.depthCount, fallback.depthCount),
    updateMs: asUpdateMs(p.updateMs, fallback.updateMs),
    autoCenter: asBoolean(p.autoCenter, fallback.autoCenter),
    autoCenterSec: asAutoCenterSec(p.autoCenterSec, fallback.autoCenterSec),
    recenterTicks: asRecenterTicks(p.recenterTicks, fallback.recenterTicks),
    showCenterLine: asBoolean(p.showCenterLine, fallback.showCenterLine),
    showVolumeHistogram: asBoolean(p.showVolumeHistogram, fallback.showVolumeHistogram),
    orderQty: asOrderQty(p.orderQty, fallback.orderQty),
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

function writeRawKey(key: string, value: DomPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / blocked — non-fatal, in-memory state still works this session.
  }
}

/** Pure read — safe to call outside React (used both by the hook's lazy initializer and directly by tests). */
export function readDomPreferencesForSymbol(symbol: string): DomPreferences {
  return sanitizeDomPreferences(readRawKey(domSymbolStorageKey(symbol)), DEFAULT_DOM_PREFERENCES);
}

export interface UseDomPreferencesResult {
  preferences: DomPreferences;
  update: (patch: Partial<DomPreferences>) => void;
}

export function useDomPreferences(symbol: string): UseDomPreferencesResult {
  const [preferences, setPreferences] = useState<DomPreferences>(() =>
    readDomPreferencesForSymbol(symbol),
  );

  // Tracks the symbol `update` should write against — avoids a stale-closure
  // symbol on rapid symbol-switch + update races (same guard
  // useLiquidityPreferences.ts uses).
  const symbolRef = useRef(symbol);

  useEffect(() => {
    symbolRef.current = symbol;
    setPreferences(readDomPreferencesForSymbol(symbol));
  }, [symbol]);

  const update = useCallback((patch: Partial<DomPreferences>) => {
    setPreferences((prev) => {
      const next: DomPreferences = { ...prev, ...patch };
      writeRawKey(domSymbolStorageKey(symbolRef.current), next);
      return next;
    });
  }, []);

  return { preferences, update };
}
