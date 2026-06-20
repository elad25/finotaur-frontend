// ============================================================================
// SIGNAL BUILDER — turn a Detection into a fully-priced TradeSignal
// ============================================================================
//
// Resolves the setup's entry / stop / target rules against a detection and the
// market context to produce concrete entryPrice / stopLoss / takeProfit. Returns
// null if the resulting geometry is invalid (stop on the wrong side of entry,
// zero risk distance, etc.) so the engine can simply skip it.
//
// LOOK-AHEAD GUARANTEE
// --------------------
// All values are derived from the detection (formed at detection.formedAtIndex)
// and context arrays at indices <= formedAtIndex. No future candle is read.
// ============================================================================

import type { Candle } from '../../components/ReplayChart/types';
import type { MarketContext } from './MarketContext';
import type {
  Detection,
  SetupDefinition,
  TradeSignal,
  Zone,
} from './types';

const EPS = 1e-9;

export function buildSignal(
  detection: Detection,
  candles: Candle[],
  ctx: MarketContext,
  setup: SetupDefinition,
): TradeSignal | null {
  const dir = detection.direction; // 'long' | 'short'
  const i = detection.formedAtIndex;
  if (i < 0 || i >= candles.length) return null;

  const entryPrice = resolveEntry(detection, candles, setup, dir);
  if (entryPrice === null || !isFinite(entryPrice) || entryPrice <= 0) return null;

  const stopLoss = resolveStop(detection, candles, ctx, setup, dir, entryPrice);
  if (stopLoss === null || !isFinite(stopLoss) || stopLoss <= 0) return null;

  // Stop must be on the correct side of entry.
  if (dir === 'long' && stopLoss >= entryPrice - EPS) return null;
  if (dir === 'short' && stopLoss <= entryPrice + EPS) return null;

  const takeProfit = resolveTarget(detection, ctx, setup, dir, entryPrice, stopLoss);
  if (takeProfit === null || !isFinite(takeProfit) || takeProfit <= 0) return null;

  // Target must be on the correct (profit) side of entry.
  if (dir === 'long' && takeProfit <= entryPrice + EPS) return null;
  if (dir === 'short' && takeProfit >= entryPrice - EPS) return null;

  return {
    detection,
    direction: dir,
    armIndex: i,
    entryPrice,
    orderType: setup.entry.orderType,
    stopLoss,
    takeProfit,
    validForBars: setup.entry.validForBars,
  };
}

// ----------------------------------------------------------------------------
// Entry
// ----------------------------------------------------------------------------

function resolveEntry(
  detection: Detection,
  candles: Candle[],
  setup: SetupDefinition,
  dir: 'long' | 'short',
): number | null {
  const zone = detection.zone;
  switch (setup.entry.trigger) {
    case 'zone-50':
      return (zone.top + zone.bottom) / 2;
    case 'zone-tap':
      // Tap the edge the market would reach first on a pullback:
      // long demand -> tap the zone TOP (price falling into the zone);
      // short supply -> tap the zone BOTTOM (price rising into the zone).
      return dir === 'long' ? zone.top : zone.bottom;
    case 'close-confirm':
    case 'sweep-then-mss':
      // Market on the next bar's open (engine fills market at candle.open).
      // Use the confirmation bar's close as the reference entry price; the
      // engine's getExecutionPrice('market') will fill at the actual open.
      return candles[detection.formedAtIndex].close;
    default:
      return null;
  }
}

// ----------------------------------------------------------------------------
// Stop
// ----------------------------------------------------------------------------

function resolveStop(
  detection: Detection,
  candles: Candle[],
  ctx: MarketContext,
  setup: SetupDefinition,
  dir: 'long' | 'short',
  entry: number,
): number | null {
  const zone = detection.zone;
  const buffer = (setup.stop.bufferPct ?? 0) / 100;
  let raw: number | null = null;

  switch (setup.stop.basis) {
    case 'swing': {
      const swingPrice = detection.refSwing
        ? detection.refSwing.price
        : nearestSwingForStop(ctx, detection.formedAtIndex, dir);
      if (swingPrice === null) return null;
      raw = swingPrice;
      break;
    }
    case 'zone-far-edge':
      // Far edge = the side away from entry.
      raw = dir === 'long' ? zone.bottom : zone.top;
      break;
    case 'atr': {
      const a = ctx.atr[detection.formedAtIndex] || 0;
      const mult = setup.stop.atrMult ?? 1.5;
      if (a <= 0) return null;
      raw = dir === 'long' ? entry - mult * a : entry + mult * a;
      break;
    }
    case 'fixed-pct': {
      const pct = (setup.stop.fixedPct ?? 1) / 100;
      raw = dir === 'long' ? entry * (1 - pct) : entry * (1 + pct);
      break;
    }
    default:
      return null;
  }

  if (raw === null) return null;

  // Apply buffer further away from entry.
  return dir === 'long' ? raw * (1 - buffer) : raw * (1 + buffer);
}

function nearestSwingForStop(
  ctx: MarketContext,
  index: number,
  dir: 'long' | 'short',
): number | null {
  // Long -> stop below a recent swing low; short -> above a recent swing high.
  const s = dir === 'long'
    ? ctx.lastConfirmedSwingLow(index)
    : ctx.lastConfirmedSwingHigh(index);
  return s ? s.price : null;
}

// ----------------------------------------------------------------------------
// Target
// ----------------------------------------------------------------------------

function resolveTarget(
  detection: Detection,
  ctx: MarketContext,
  setup: SetupDefinition,
  dir: 'long' | 'short',
  entry: number,
  stop: number,
): number | null {
  const risk = Math.abs(entry - stop);
  if (risk <= EPS) return null;

  switch (setup.target.basis) {
    case 'r-multiple': {
      const r = setup.target.rMultiple ?? 2;
      return dir === 'long' ? entry + r * risk : entry - r * risk;
    }
    case 'fixed-pct': {
      const pct = (setup.target.fixedPct ?? 2) / 100;
      return dir === 'long' ? entry * (1 + pct) : entry * (1 - pct);
    }
    case 'opposing-liquidity': {
      const opp = opposingLiquidity(ctx, detection.formedAtIndex, dir, entry, detection.zone);
      if (opp !== null) return opp;
      // Fallback to a 2R target when no opposing liquidity exists.
      const r = setup.target.rMultiple ?? 2;
      return dir === 'long' ? entry + r * risk : entry - r * risk;
    }
    default:
      return null;
  }
}

/**
 * Nearest opposing confirmed swing/pool in the trade direction:
 * long -> nearest confirmed swing HIGH above entry; short -> nearest confirmed
 * swing LOW below entry. Returns null if none exists.
 */
function opposingLiquidity(
  ctx: MarketContext,
  index: number,
  dir: 'long' | 'short',
  entry: number,
  _zone: Zone,
): number | null {
  if (dir === 'long') {
    const highs = ctx.confirmedSwingHighsUpTo(index).filter((s) => s.price > entry);
    if (highs.length === 0) return null;
    return Math.min(...highs.map((s) => s.price)); // nearest above
  }
  const lows = ctx.confirmedSwingLowsUpTo(index).filter((s) => s.price < entry);
  if (lows.length === 0) return null;
  return Math.max(...lows.map((s) => s.price)); // nearest below
}
