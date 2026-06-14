// src/pages/app/crypto/scanner/useLiquidityBand.ts
//
// Computes the authoritative price band for the scanner price-axis auto-fit.
//
// Band = union of:
//   1. Every resting wall level in the live book whose notional >= floorUsd.
//   2. The visible candle high/low (so price action is always in frame),
//      provided via the optional getCandleRange accessor.
//
// Strategy:
//   1. Scan bid + ask levels whose notional (price × qty) >= floorUsd.
//   2. Merge in the candle high/low from getCandleRange (if provided).
//   3. Add 8% vertical padding on each side of the union.
//   4. Throttle recompute to every RECOMPUTE_INTERVAL_MS and only invalidate
//      when mid drifts > MID_DRIFT_PCT from the band center — avoids fighting
//      every tick while still tracking gradual price moves.
//   5. Reset completely on symbol / floorUsd change (new WorkstationInner mount).

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

/** Recompute the band no more than once every N ms. */
const RECOMPUTE_INTERVAL_MS = 3_000;

/** Re-center the band when mid drifts more than this fraction from band center. */
const MID_DRIFT_PCT = 0.005; // 0.5%

/** Vertical padding above and below the outermost level in the union. */
const PADDING_PCT = 0.08; // 8%

// ── Types ────────────────────────────────────────────────────────────────────

export interface LiquidityBand {
  /** Padded lower bound of the price axis. */
  minPrice: number;
  /** Padded upper bound of the price axis. */
  maxPrice: number;
  /** Raw band center (mid) used to detect drift for re-centering. */
  bandCenter: number;
}

export interface LiquidityBandOptions {
  /** Stable accessor to the live order book. */
  getBook: () => { bids: Map<number, number>; asks: Map<number, number> };
  /** Only levels whose notional (price × qty) >= floorUsd are included. */
  floorUsd: number;
  /** True once the WS is live — no-op while still connecting. */
  isLive: boolean;
  /**
   * Optional stable accessor to the current candle high/low extremes.
   * When provided, the candle range is merged into the wall range so that
   * price action is always visible even if qualifying walls are all on one
   * side of mid.
   */
  getCandleRange?: () => { high: number; low: number } | null;
}

// ── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns the current liquidity band for the scanner's price axis auto-fit,
 * or null when the book is empty / not yet ready.
 *
 * The band is the UNION of qualifying wall levels and the candle hi/low range,
 * padded by PADDING_PCT on each side.  This ensures the band is authoritative:
 * candles + all resting walls visible at the current Floor setting are in frame.
 */
export function useLiquidityBand({
  getBook,
  floorUsd,
  isLive,
  getCandleRange,
}: LiquidityBandOptions): LiquidityBand | null {
  const [band, setBand] = useState<LiquidityBand | null>(null);
  const lastBandCenterRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const compute = useCallback(() => {
    if (!isLive) return;

    const { bids, asks } = getBook();

    // ── Collect all notional-qualified wall levels ─────────────────────────
    let wallMin = Infinity;
    let wallMax = -Infinity;
    let hasWall = false;

    for (const [price, qty] of bids) {
      const notional = price * qty;
      if (notional < floorUsd) continue;
      hasWall = true;
      if (price < wallMin) wallMin = price;
      if (price > wallMax) wallMax = price;
    }

    for (const [price, qty] of asks) {
      const notional = price * qty;
      if (notional < floorUsd) continue;
      hasWall = true;
      if (price < wallMin) wallMin = price;
      if (price > wallMax) wallMax = price;
    }

    // ── Merge in candle hi/low so price action is always in frame ──────────
    const candleRange = getCandleRange?.() ?? null;
    const hasCandle = candleRange !== null;

    if (!hasWall && !hasCandle) {
      // Nothing to work with yet — clear band and wait.
      setBand(null);
      lastBandCenterRef.current = null;
      return;
    }

    // Union: expand limits to include whichever bounds we have.
    let rawMin = hasWall ? wallMin : Infinity;
    let rawMax = hasWall ? wallMax : -Infinity;

    if (hasCandle) {
      if (candleRange.low  < rawMin) rawMin = candleRange.low;
      if (candleRange.high > rawMax) rawMax = candleRange.high;
    }

    // Fall back to candle center if walls produced degenerate range.
    const rawCenter = (rawMin + rawMax) / 2;
    // Ensure a minimum visible span of 0.2% of center.
    const halfSpan = Math.max((rawMax - rawMin) / 2, rawCenter * 0.001);

    const effectiveMin = rawCenter - halfSpan;
    const effectiveMax = rawCenter + halfSpan;

    // ── Drift check: skip update if mid is close to last band center ───────
    // Reset (lastBandCenterRef = null) happens on effect cleanup whenever
    // floorUsd or isLive changes, so filter-change always forces a fresh compute.
    const prevCenter = lastBandCenterRef.current;
    if (prevCenter !== null) {
      const driftFrac = Math.abs(rawCenter - prevCenter) / prevCenter;
      if (driftFrac < MID_DRIFT_PCT) return; // within tolerance — no update
    }

    // ── Apply padding ──────────────────────────────────────────────────────
    const span = effectiveMax - effectiveMin;
    const pad  = span * PADDING_PCT;

    const newBand: LiquidityBand = {
      minPrice:   effectiveMin - pad,
      maxPrice:   effectiveMax + pad,
      bandCenter: rawCenter,
    };

    lastBandCenterRef.current = rawCenter;
    setBand(newBand);
  }, [getBook, floorUsd, isLive, getCandleRange]);

  useEffect(() => {
    // Eagerly compute once — don't wait for the first interval tick.
    compute();

    timerRef.current = setInterval(compute, RECOMPUTE_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
      timerRef.current = null;
      // Reset band center so next mount / filter-change re-fits from scratch.
      lastBandCenterRef.current = null;
    };
  // compute captures floorUsd / isLive / getCandleRange — effect reruns when any changes.
  }, [compute]);

  return band;
}
