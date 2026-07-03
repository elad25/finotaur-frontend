// ============================================================================
// LIQUIDITY DETECTOR (sweep + equal-levels)
// ============================================================================
//
// ICT DEFINITION
// --------------
// Liquidity sits beyond swing highs (buy-side) and swing lows (sell-side), and
// at clusters of "equal" highs/lows (resting stops).
//   - 'sweep' mode: price runs PAST a confirmed swing (taking the stops) and,
//     if requireReclaim, closes back inside. A high-sweep implies a likely
//     SHORT (sell-side reaction); a low-sweep implies a likely LONG. If
//     requireMSS, confirmation waits for a structure shift in the new direction
//     and formedAtIndex moves to the MSS bar.
//   - 'equal-levels' mode: cluster confirmed swing highs/lows within a % band;
//     >= minTouches members forms a liquidity POOL detection.
//
// LOOK-AHEAD GUARANTEE
// --------------------
// Sweep bar i compares against a swing confirmed at or before i-1. When MSS is
// required we scan forward only to the first MSS bar and set formedAtIndex to
// it, reading no candle beyond it. Equal-levels pools are emitted at the bar
// where the cluster's last member becomes confirmed (max confirmedAt).
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { MarketContext } from '../MarketContext';
import type { Detection, LiquidityParams } from '../types';
import { findBearishMSS, findBullishMSS } from './mss';

export function detect(
  candles: Candle[],
  ctx: MarketContext,
  params: LiquidityParams,
): Detection[] {
  return params.mode === 'sweep'
    ? detectSweep(candles, ctx, params)
    : detectEqualLevels(candles, ctx, params);
}

// ----------------------------------------------------------------------------
// Sweep mode
//
// NOTE: sweep mode intentionally does NOT read params.minTouches or
// params.equalTolerancePct -- those two knobs govern clustering in
// detectEqualLevels() below only. See the doc-comments on LiquidityParams.
// ----------------------------------------------------------------------------

function detectSweep(
  candles: Candle[],
  ctx: MarketContext,
  params: LiquidityParams,
): Detection[] {
  const out: Detection[] = [];
  const n = candles.length;
  const MSS_SCAN = 30; // bounded forward search for the structure shift

  for (let i = 1; i < n; i++) {
    // ---- Buy-side sweep (high taken) -> short bias ---------------------
    const swingHigh = ctx.lastConfirmedSwingHigh(i - 1);
    if (swingHigh && swingHigh.index < i && candles[i].high > swingHigh.price) {
      const reclaimed = params.requireReclaim
        ? candles[i].close < swingHigh.price
        : true;
      if (reclaimed) {
        let formedAt = i;
        let confirmed = true;
        if (params.requireMSS) {
          const mss = findBearishMSS(candles, ctx, i + 1, i + MSS_SCAN);
          if (mss === null) confirmed = false;
          else formedAt = mss;
        }
        if (confirmed) {
          out.push({
            patternType: 'LIQUIDITY',
            direction: 'short',
            formedAtIndex: formedAt,
            zone: { top: candles[i].high, bottom: swingHigh.price },
            refSwing: { index: swingHigh.index, price: swingHigh.price },
            meta: {
              mode: 'sweep',
              side: 'buy-side',
              sweepBarIndex: i,
              sweptSwingIndex: swingHigh.index,
            },
          });
        }
      }
    }

    // ---- Sell-side sweep (low taken) -> long bias ----------------------
    const swingLow = ctx.lastConfirmedSwingLow(i - 1);
    if (swingLow && swingLow.index < i && candles[i].low < swingLow.price) {
      const reclaimed = params.requireReclaim
        ? candles[i].close > swingLow.price
        : true;
      if (reclaimed) {
        let formedAt = i;
        let confirmed = true;
        if (params.requireMSS) {
          const mss = findBullishMSS(candles, ctx, i + 1, i + MSS_SCAN);
          if (mss === null) confirmed = false;
          else formedAt = mss;
        }
        if (confirmed) {
          out.push({
            patternType: 'LIQUIDITY',
            direction: 'long',
            formedAtIndex: formedAt,
            zone: { top: swingLow.price, bottom: candles[i].low },
            refSwing: { index: swingLow.index, price: swingLow.price },
            meta: {
              mode: 'sweep',
              side: 'sell-side',
              sweepBarIndex: i,
              sweptSwingIndex: swingLow.index,
            },
          });
        }
      }
    }
  }

  return out;
}

// ----------------------------------------------------------------------------
// Equal-levels mode
// ----------------------------------------------------------------------------

function detectEqualLevels(
  candles: Candle[],
  ctx: MarketContext,
  params: LiquidityParams,
): Detection[] {
  const out: Detection[] = [];
  const n = candles.length;
  const k = Math.max(1, Math.floor(params.swing.lookback));

  // All confirmed swings up to the last bar, with their confirmation bar.
  const lastIdx = n - 1;
  const highs = ctx.confirmedSwingHighsUpTo(lastIdx);
  const lows = ctx.confirmedSwingLowsUpTo(lastIdx);

  pushClusters(out, highs, params, k, 'short'); // equal highs = sell-side pool
  pushClusters(out, lows, params, k, 'long'); // equal lows = buy-side pool

  return out;
}

function pushClusters(
  out: Detection[],
  swings: Array<{ index: number; price: number }>,
  params: LiquidityParams,
  k: number,
  direction: 'long' | 'short',
): void {
  if (swings.length < params.minTouches) return;

  const used = new Array<boolean>(swings.length).fill(false);

  for (let a = 0; a < swings.length; a++) {
    if (used[a]) continue;
    const base = swings[a].price;
    if (base <= 0) continue;
    const members: Array<{ index: number; price: number }> = [swings[a]];
    used[a] = true;

    for (let b = a + 1; b < swings.length; b++) {
      if (used[b]) continue;
      const diffPct = Math.abs(swings[b].price - base) / base * 100;
      if (diffPct <= params.equalTolerancePct) {
        members.push(swings[b]);
        used[b] = true;
      }
    }

    if (members.length >= params.minTouches) {
      const prices = members.map((m) => m.price);
      const top = Math.max(...prices);
      const bottom = Math.min(...prices);
      // Pool is "active" from the bar the last member confirmed.
      const lastMemberIndex = Math.max(...members.map((m) => m.index));
      const formedAt = lastMemberIndex + k;
      out.push({
        patternType: 'LIQUIDITY',
        direction,
        formedAtIndex: formedAt,
        zone: { top, bottom },
        refSwing: { index: lastMemberIndex, price: direction === 'short' ? top : bottom },
        meta: {
          mode: 'equal-levels',
          touches: members.length,
          poolSide: direction === 'short' ? 'equal-highs' : 'equal-lows',
        },
      });
    }
  }
}
