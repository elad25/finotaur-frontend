// src/pages/app/crypto/scanner/useLiquidityBand.ts
//
// Computes the resting-liquidity price band from the live order book.
//
// Strategy:
//   1. Scan bid + ask levels whose notional (price × qty) >= floorUsd.
//   2. Find the min bid-price and max ask-price among those levels.
//   3. Add 15% vertical padding on each side.
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

/** Vertical padding above and below the outermost resting level. */
const PADDING_PCT = 0.15; // 15%

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
}

// ── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns the current liquidity band for the scanner's price axis auto-fit,
 * or null when the book is empty / not yet ready.
 */
export function useLiquidityBand({
  getBook,
  floorUsd,
  isLive,
}: LiquidityBandOptions): LiquidityBand | null {
  const [band, setBand] = useState<LiquidityBand | null>(null);
  const lastBandCenterRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const compute = useCallback(() => {
    if (!isLive) return;

    const { bids, asks } = getBook();

    // Collect all notional-qualified bid prices and ask prices.
    let minBid = Infinity;
    let maxBid = -Infinity;
    let minAsk = Infinity;
    let maxAsk = -Infinity;

    let hasBid = false;
    let hasAsk = false;

    for (const [price, qty] of bids) {
      const notional = price * qty;
      if (notional < floorUsd) continue;
      hasBid = true;
      if (price < minBid) minBid = price;
      if (price > maxBid) maxBid = price;
    }

    for (const [price, qty] of asks) {
      const notional = price * qty;
      if (notional < floorUsd) continue;
      hasAsk = true;
      if (price < minAsk) minAsk = price;
      if (price > maxAsk) maxAsk = price;
    }

    // Need at least bids or asks with qualifying levels.
    if (!hasBid && !hasAsk) {
      setBand(null);
      lastBandCenterRef.current = null;
      return;
    }

    // Raw band extends from lowest qualifying bid to highest qualifying ask.
    const rawMin = hasBid ? minBid : minAsk;
    const rawMax = hasAsk ? maxAsk : maxBid;

    // If only one side has data, extend the other side symmetrically.
    const rawCenter = (rawMin + rawMax) / 2;
    const halfSpan = Math.max(rawMax - rawMin, rawCenter * 0.002); // at least 0.2% width

    const effectiveMin = rawCenter - halfSpan;
    const effectiveMax = rawCenter + halfSpan;

    // Drift check: skip update if mid is close to last band center.
    const prevCenter = lastBandCenterRef.current;
    if (prevCenter !== null) {
      const driftFrac = Math.abs(rawCenter - prevCenter) / prevCenter;
      if (driftFrac < MID_DRIFT_PCT) return; // within tolerance — no update
    }

    // Apply padding.
    const span = effectiveMax - effectiveMin;
    const pad = span * PADDING_PCT;

    const newBand: LiquidityBand = {
      minPrice:   effectiveMin - pad,
      maxPrice:   effectiveMax + pad,
      bandCenter: rawCenter,
    };

    lastBandCenterRef.current = rawCenter;
    setBand(newBand);
  }, [getBook, floorUsd, isLive]);

  useEffect(() => {
    // Eagerly compute once — don't wait for the first interval tick.
    compute();

    timerRef.current = setInterval(compute, RECOMPUTE_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
      timerRef.current = null;
      // Reset band center so next mount re-fits from scratch.
      lastBandCenterRef.current = null;
    };
  // getBook is a stable useCallback ref; floorUsd / isLive drive recompute.
  }, [compute, isLive, floorUsd]);

  return band;
}
