/**
 * Indicator compute functions — pure, O(n), client-side.
 *
 * All four indicators run on bars already in memory (the same array
 * FinotaurChart fed to the candlestick series). Zero new network calls.
 *
 * Output contract: each function returns `LineDataPoint[]` in strict
 * ascending-time order, suitable for `series.setData()` from
 * lightweight-charts. Leading bars where the indicator is not yet defined
 * (e.g. SMA 20 on bar 5) are omitted entirely — passing NaN to
 * lightweight-charts renders as zero, which would visually anchor the line
 * at the bottom of the price scale.
 */

import type { UTCTimestamp } from 'lightweight-charts';
import type { Bar } from './types';

/** A single point on a line series. Mirrors lightweight-charts LineData. */
export interface LineDataPoint {
  time: UTCTimestamp;
  value: number;
}

// ───────────────────────────────────────────────────────────────
// SMA — Simple Moving Average
// ───────────────────────────────────────────────────────────────
// Rolling arithmetic mean of `close` over the last `period` bars.
// Defined starting at bar index (period - 1).
export function computeSMA(bars: Bar[], period: number): LineDataPoint[] {
  if (period <= 0 || bars.length < period) return [];
  const out: LineDataPoint[] = [];
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= period) sum -= bars[i - period].close;
    if (i >= period - 1) {
      out.push({ time: bars[i].time, value: sum / period });
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────
// EMA — Exponential Moving Average
// ───────────────────────────────────────────────────────────────
// Seeded with the SMA of the first `period` bars, then recursively
// EMA_t = close_t * α + EMA_{t-1} * (1 - α), where α = 2 / (period + 1).
export function computeEMA(bars: Bar[], period: number): LineDataPoint[] {
  if (period <= 0 || bars.length < period) return [];
  const out: LineDataPoint[] = [];
  const alpha = 2 / (period + 1);

  // Seed: SMA over the first `period` bars
  let seed = 0;
  for (let i = 0; i < period; i++) seed += bars[i].close;
  let ema = seed / period;
  out.push({ time: bars[period - 1].time, value: ema });

  for (let i = period; i < bars.length; i++) {
    ema = bars[i].close * alpha + ema * (1 - alpha);
    out.push({ time: bars[i].time, value: ema });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────
// RSI — Relative Strength Index (Wilder's smoothing)
// ───────────────────────────────────────────────────────────────
// Classical 14-period RSI with Wilder's recursive averaging (the standard
// most charts default to). Returns values in [0, 100].
//
//   gain_t = max(close_t - close_{t-1}, 0)
//   loss_t = max(close_{t-1} - close_t, 0)
//   avgGain_t = (avgGain_{t-1} * (period - 1) + gain_t) / period   (Wilder)
//   RS = avgGain / avgLoss
//   RSI = 100 - 100 / (1 + RS)
export function computeRSI(bars: Bar[], period: number): LineDataPoint[] {
  if (period <= 0 || bars.length <= period) return [];
  const out: LineDataPoint[] = [];

  // Seed: simple average of first `period` gains and losses
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff; // diff is negative or zero
  }
  avgGain /= period;
  avgLoss /= period;

  const firstRsi =
    avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  out.push({ time: bars[period].time, value: firstRsi });

  // Wilder smoothing for the rest
  for (let i = period + 1; i < bars.length; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    out.push({ time: bars[i].time, value: rsi });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────
// VWAP — Volume-Weighted Average Price (session-reset)
// ───────────────────────────────────────────────────────────────
// Typical price = (high + low + close) / 3.
// VWAP_t = Σ(typical_i * vol_i) / Σ(vol_i), accumulated within a session.
//
// Session boundary: a new UTC calendar day. This is the right granularity
// for intraday charts (1m / 5m / 15m / 30m / 60m / 1h / 4h). For 1d+
// intervals VWAP is not meaningful — the caller should suppress the
// toggle.
//
// Bars with zero/missing volume contribute their typical price as if
// vol = 1 only if we have NO running volume yet; otherwise they are
// skipped from the accumulation (typical case for futures gaps).
export function computeVWAP(bars: Bar[]): LineDataPoint[] {
  if (bars.length === 0) return [];
  const out: LineDataPoint[] = [];

  let cumPV = 0;
  let cumV = 0;
  let currentDay = -1;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    // UTC day index (whole days since epoch)
    const dayIdx = Math.floor((bar.time as number) / 86400);
    if (dayIdx !== currentDay) {
      cumPV = 0;
      cumV = 0;
      currentDay = dayIdx;
    }
    const typical = (bar.high + bar.low + bar.close) / 3;
    const vol = bar.volume ?? 0;
    if (vol > 0) {
      cumPV += typical * vol;
      cumV += vol;
    }
    if (cumV > 0) {
      out.push({ time: bar.time, value: cumPV / cumV });
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────
// Helper: is this interval intraday (VWAP meaningful)?
// ───────────────────────────────────────────────────────────────
const INTRADAY_INTERVALS = new Set([
  '1m',
  '2m',
  '5m',
  '15m',
  '30m',
  '60m',
  '1h',
  '4h',
]);

export function isIntradayInterval(interval: string): boolean {
  return INTRADAY_INTERVALS.has(interval);
}
