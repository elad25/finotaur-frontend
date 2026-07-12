// src/components/charting/orderflow/volumeBubbles.ts
//
// Pure aggregation/threshold/sizing logic for the Liquidity tab's "executed
// aggression" volume bubbles (Task S2 — ATAS/Bookmap restyle). No React, no
// canvas — VolumeBubblesLayer.tsx consumes this to decide WHAT to draw;
// coordinate mapping + the actual ctx.arc() calls live there.
//
// Source data is FlowCandleView[] (from FlowBinStore.getRange — the SAME
// aggregation engine the Footprint tab already uses; see flowBinStore.ts).
// A bin can carry both buyVol and sellVol (both sides traded at that price
// within the bar) — we render ONE bubble per (bar, price bin), sized by and
// colored for whichever side dominates that bin (net volume), matching how
// ATAS/Bookmap show a single aggregated print marker per cluster rather than
// two overlapping circles at the same point.

import type { FlowCandleView } from './types';

export type BubbleSide = 'buy' | 'sell';

export interface VolumeBubble {
  /** Candle (bar) time, unix seconds — matches FlowCandleView.time. */
  time: number;
  /** Bin price (the bin's floor price, NOT a mid-of-bin adjustment — matches FlowBin.binPrice). */
  price: number;
  /** Dominant-side volume driving the bubble's size (NOT the bin's total — see header comment). */
  volume: number;
  side: BubbleSide;
}

/**
 * Flattens every (bar, bin) in `candles` into its net dominant-side volume —
 * the pool a percentile threshold is computed over. Bins with net volume
 * exactly 0 (equal buy/sell) are excluded — no side to attribute a bubble to.
 */
function dominantVolumes(candles: readonly FlowCandleView[]): number[] {
  const out: number[] = [];
  for (const candle of candles) {
    for (const bin of candle.bins) {
      const net = bin.buyVol - bin.sellVol;
      if (net === 0) continue;
      out.push(net > 0 ? bin.buyVol : bin.sellVol);
    }
  }
  return out;
}

/**
 * Threshold volume at the given percentile (default 0.98 = "top ~2%") over
 * the dominant-side volumes in `candles`. Returns 0 when there's no data
 * (nothing to threshold against — every trade passes, matching the "auto"
 * default's intent of "highlight what stands out", degrading gracefully to
 * "show everything" when the sample is too small to have a meaningful tail).
 *
 * Uses a plain sort (candidate pools are visible-range-bounded — hundreds to
 * low thousands of bins, not the tens-of-thousands DepthMatrixLayer's
 * histogram percentile guards against) — see percentile65536 in
 * DepthMatrixLayer.tsx for the O(n) alternative used there at a much larger
 * scale; not needed here.
 */
export function computeBubbleThreshold(
  candles: readonly FlowCandleView[],
  pct: number = 0.98,
): number {
  const volumes = dominantVolumes(candles).filter((v) => v > 0);
  if (volumes.length === 0) return 0;
  volumes.sort((a, b) => a - b);
  const idx = Math.min(volumes.length - 1, Math.max(0, Math.ceil(volumes.length * pct) - 1));
  return volumes[idx];
}

export type BubbleThresholdSetting = 'auto' | number;

/**
 * Resolves a `BubbleThresholdSetting` to a concrete volume cutoff.
 * 'auto' → computeBubbleThreshold(candles, 0.98) (top ~2% of visible trades).
 * A finite number ≥ 0 → used verbatim as an absolute volume floor.
 */
export function resolveBubbleThreshold(
  candles: readonly FlowCandleView[],
  setting: BubbleThresholdSetting,
): number {
  if (setting === 'auto') return computeBubbleThreshold(candles);
  return Number.isFinite(setting) && setting >= 0 ? setting : 0;
}

/**
 * Builds one VolumeBubble per (bar, bin) whose dominant-side volume is
 * strictly greater than `threshold`. Bins with net volume 0 (perfectly
 * balanced buy/sell) never produce a bubble — see dominantVolumes' doc.
 */
export function computeVolumeBubbles(
  candles: readonly FlowCandleView[],
  threshold: number,
): VolumeBubble[] {
  const out: VolumeBubble[] = [];
  for (const candle of candles) {
    for (const bin of candle.bins) {
      const net = bin.buyVol - bin.sellVol;
      if (net === 0) continue;
      const side: BubbleSide = net > 0 ? 'buy' : 'sell';
      const volume = side === 'buy' ? bin.buyVol : bin.sellVol;
      if (volume <= threshold) continue;
      out.push({ time: candle.time, price: bin.binPrice, volume, side });
    }
  }
  return out;
}

// ── Radius sizing ────────────────────────────────────────────────────────────

const DEFAULT_MIN_RADIUS_PX = 3;
const DEFAULT_MAX_RADIUS_PX = 18;

/**
 * Maps `volume` to a bubble radius in px via a sqrt scale (area, not
 * diameter, scales linearly with volume — the standard "bubble chart"
 * convention so a 4x-larger print doesn't look 4x as wide, which would
 * visually overstate it).
 *
 * `maxVolume` should be the largest dominant-side volume in the current
 * visible window (callers typically pass the max of the bubbles they're
 * about to render). Volumes at or above `maxVolume` clamp to `maxPx`;
 * `threshold` (if provided) maps to `minPx` so bubbles never render smaller
 * than the visual floor even right at the cutoff.
 */
export function bubbleRadiusPx(
  volume: number,
  maxVolume: number,
  threshold: number = 0,
  minPx: number = DEFAULT_MIN_RADIUS_PX,
  maxPx: number = DEFAULT_MAX_RADIUS_PX,
): number {
  if (!(maxVolume > threshold) || !(volume > 0)) return minPx;
  const clampedVolume = Math.min(volume, maxVolume);
  const t = Math.max(0, (clampedVolume - threshold) / (maxVolume - threshold));
  const sqrtT = Math.sqrt(t);
  return minPx + sqrtT * (maxPx - minPx);
}
