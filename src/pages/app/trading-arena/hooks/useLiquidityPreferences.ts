/**
 * useLiquidityPreferences — persist the Trading Arena Liquidity tab's
 * render preferences (palette, smoothing, volume bubbles, side profile, and
 * — forward-compat, Phase 1 — a `sensitivity` preset) per symbol, in
 * localStorage (PR 3, task K.1).
 *
 * Phase 1 "no manual thresholds" overhaul: `floorMode` and `sizeFilterPct`
 * (the old manual floor/size-filter toolbar) have been REMOVED from this
 * shape — the heatmap no longer has a manual threshold toolbar (see
 * LiquidityTab.tsx / DepthMatrixLayer.tsx / depthSignificance.ts). Any
 * stale `floorMode`/`sizeFilterPct` fields already sitting in a user's
 * localStorage under the same `v1` key are simply ignored by
 * sanitizeLiquidityPreferences (field-by-field — ignores unknown/extra
 * keys), so no storage migration is needed.
 *
 * Clones the lazy-init / write-through / corrupt-JSON-safe / field-by-field
 * validation pattern of useFootprintPreferences.ts, but simpler: a single
 * per-symbol key, no __default/per-symbol split. These fields are
 * inherently symbol-scoped — there's no shared "visual preference" concern
 * the way footprint's content/layout/colorScheme are, so a two-key split
 * would just be unnecessary complexity.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isDepthPaletteId, type DepthPaletteId } from '@/components/charting/depthPalettes';

export const LIQUIDITY_STORAGE_PREFIX = 'finotaur:arena:liquidity:v1';

export function liquiditySymbolStorageKey(symbol: string): string {
  return `${LIQUIDITY_STORAGE_PREFIX}:${symbol}`;
}

/** 'auto' = top ~2% of visible dominant-side trade volumes; a number = absolute volume floor. */
export type LiquidityBubbleThreshold = 'auto' | number;

/**
 * Forward-compat field (Phase 1 of the "no manual thresholds" overhaul) —
 * not wired to any render behavior yet. Phase 3 will use this preset to
 * bias the significance mapping (e.g. a stricter/looser soft-knee reference)
 * without reintroducing a raw floor/size-filter toolbar. Persisted now so a
 * user's choice, once Phase 3 ships, doesn't reset silently.
 */
export type LiquiditySensitivity = 'quiet' | 'balanced' | 'detailed';

export interface LiquidityPreferences {
  /** Depth matrix heatmap color palette (Task S2 — ATAS/Bookmap restyle). Default 'finotaur'. */
  palette: DepthPaletteId;
  /** Vertical band-smoothing + hot-wall bloom on the depth matrix. Default true. */
  smoothing: boolean;
  /** Executed-aggression volume bubbles overlay. Default true. */
  bubbles: boolean;
  /** Volume threshold that gates a bubble — see volumeBubbles.ts. Default 'auto'. */
  bubbleThreshold: LiquidityBubbleThreshold;
  /** Right-edge "what's waiting" resting-book gutter. Default true. */
  sideProfile: boolean;
  /** Forward-compat — see LiquiditySensitivity doc comment. Default 'balanced'. */
  sensitivity: LiquiditySensitivity;
}

export const DEFAULT_LIQUIDITY_PREFERENCES: LiquidityPreferences = {
  palette: 'finotaur',
  smoothing: true,
  bubbles: true,
  bubbleThreshold: 'auto',
  sideProfile: true,
  sensitivity: 'balanced',
};

function asSensitivity(v: unknown, fallback: LiquiditySensitivity): LiquiditySensitivity {
  return v === 'quiet' || v === 'balanced' || v === 'detailed' ? v : fallback;
}

function asPalette(v: unknown, fallback: DepthPaletteId): DepthPaletteId {
  return isDepthPaletteId(v) ? v : fallback;
}

function asBoolean(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asBubbleThreshold(v: unknown, fallback: LiquidityBubbleThreshold): LiquidityBubbleThreshold {
  if (v === 'auto') return 'auto';
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  return fallback;
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
  // `raw` may still carry a stale floorMode/sizeFilterPct from a pre-Phase-1
  // localStorage record — Partial<LiquidityPreferences> intentionally no
  // longer has those keys, so they're simply never read here (ignored, not
  // migrated — see this file's header comment).
  const p = raw as Partial<LiquidityPreferences>;
  return {
    palette: asPalette(p.palette, fallback.palette),
    smoothing: asBoolean(p.smoothing, fallback.smoothing),
    bubbles: asBoolean(p.bubbles, fallback.bubbles),
    bubbleThreshold: asBubbleThreshold(p.bubbleThreshold, fallback.bubbleThreshold),
    sideProfile: asBoolean(p.sideProfile, fallback.sideProfile),
    sensitivity: asSensitivity(p.sensitivity, fallback.sensitivity),
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
