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

/**
 * Histogram bar point. Supports optional per-bar `color` override — matches
 * lightweight-charts v4 `HistogramData` so MACD histogram bars can paint
 * green when positive / red when negative without two separate series.
 */
export interface HistogramDataPoint {
  time: UTCTimestamp;
  value: number;
  color?: string;
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
// MACD — Moving Average Convergence Divergence (Phase 2.5)
// ───────────────────────────────────────────────────────────────
// Three series, all derived from `close`:
//   macd_t   = EMA(close, fast)_t − EMA(close, slow)_t
//   signal_t = EMA(macd, signalPeriod)_t
//   hist_t   = macd_t − signal_t
//
// Histogram bars carry an inline `color` so positive bars render green
// and negative bars render red on a single lightweight-charts histogram
// series (per-bar color is a v4 feature on HistogramData).
const MACD_HIST_UP_COLOR = '#22c55e';   // green-500 — momentum building up
const MACD_HIST_DOWN_COLOR = '#dc2626'; // red-600   — momentum fading down

export interface MACDResult {
  macd: LineDataPoint[];
  signal: LineDataPoint[];
  histogram: HistogramDataPoint[];
}

export function computeMACD(
  bars: Bar[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MACDResult {
  const empty: MACDResult = { macd: [], signal: [], histogram: [] };
  if (fast <= 0 || slow <= 0 || signalPeriod <= 0) return empty;
  if (slow <= fast) return empty; // sanity — MACD requires slow > fast
  if (bars.length < slow + signalPeriod) return empty;

  const fastEma = computeEMA(bars, fast);
  const slowEma = computeEMA(bars, slow);
  // slowEma starts at bars[slow-1].time; fastEma at bars[fast-1].time.
  // Align by skipping fastEma's lead so indices step the same bars.
  const fastOffset = slow - fast; // ≥ 1 because slow > fast

  const macdLine: LineDataPoint[] = [];
  for (let i = 0; i < slowEma.length; i++) {
    macdLine.push({
      time: slowEma[i].time,
      value: fastEma[i + fastOffset].value - slowEma[i].value,
    });
  }

  if (macdLine.length < signalPeriod) {
    return { macd: macdLine, signal: [], histogram: [] };
  }

  // Signal = EMA over the MACD line itself (seeded by SMA of first signalPeriod points)
  const alpha = 2 / (signalPeriod + 1);
  let seed = 0;
  for (let i = 0; i < signalPeriod; i++) seed += macdLine[i].value;
  let sig = seed / signalPeriod;
  const signalLine: LineDataPoint[] = [
    { time: macdLine[signalPeriod - 1].time, value: sig },
  ];
  for (let i = signalPeriod; i < macdLine.length; i++) {
    sig = macdLine[i].value * alpha + sig * (1 - alpha);
    signalLine.push({ time: macdLine[i].time, value: sig });
  }

  // Histogram only defined where signal is defined.
  // signalLine.length === macdLine.length − signalPeriod + 1.
  const macdOffset = macdLine.length - signalLine.length;
  const histogram: HistogramDataPoint[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    const diff = macdLine[i + macdOffset].value - signalLine[i].value;
    histogram.push({
      time: signalLine[i].time,
      value: diff,
      color: diff >= 0 ? MACD_HIST_UP_COLOR : MACD_HIST_DOWN_COLOR,
    });
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

// ───────────────────────────────────────────────────────────────
// Bollinger Bands (period, stdDev multiplier) — Phase 2.5
// ───────────────────────────────────────────────────────────────
// middle_t = SMA(close, period)_t
// std_t    = sqrt( Σ_{i=t-period+1..t} (close_i − middle_t)² / period )
// upper_t  = middle_t + stdDevMult · std_t
// lower_t  = middle_t − stdDevMult · std_t
//
// Population std (divide by N), not sample std (N-1). This matches the
// standard chart convention used by TradingView / most platforms.
export interface BollingerResult {
  middle: LineDataPoint[];
  upper: LineDataPoint[];
  lower: LineDataPoint[];
}

export function computeBollinger(
  bars: Bar[],
  period = 20,
  stdDevMult = 2,
): BollingerResult {
  if (period <= 0 || bars.length < period) {
    return { middle: [], upper: [], lower: [] };
  }
  const middle: LineDataPoint[] = [];
  const upper: LineDataPoint[] = [];
  const lower: LineDataPoint[] = [];

  // Rolling sum (close) for the SMA midline
  let sum = 0;
  for (let i = 0; i < period; i++) sum += bars[i].close;

  for (let i = period - 1; i < bars.length; i++) {
    if (i >= period) sum = sum - bars[i - period].close + bars[i].close;
    const mean = sum / period;

    // StdDev: O(period) per bar — chart windows are small (<2000 bars),
    // and Welford's variant would not change observed perf here.
    let sqDiffSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = bars[j].close - mean;
      sqDiffSum += d * d;
    }
    const std = Math.sqrt(sqDiffSum / period);

    middle.push({ time: bars[i].time, value: mean });
    upper.push({ time: bars[i].time, value: mean + stdDevMult * std });
    lower.push({ time: bars[i].time, value: mean - stdDevMult * std });
  }
  return { middle, upper, lower };
}

// ───────────────────────────────────────────────────────────────
// ATR — Average True Range (Wilder smoothing) — Phase 2.5
// ───────────────────────────────────────────────────────────────
// TR_i = max(high_i − low_i, |high_i − close_{i-1}|, |low_i − close_{i-1}|)
// ATR_period = mean(TR_1 .. TR_period)                           (seed)
// ATR_t      = (ATR_{t-1} · (period - 1) + TR_t) / period        (Wilder)
//
// Yields units of price ($) — caller renders in its own subpane.
export function computeATR(bars: Bar[], period = 14): LineDataPoint[] {
  if (period <= 0 || bars.length <= period) return [];
  const out: LineDataPoint[] = [];

  // Seed: arithmetic mean of TR_1..TR_period (TR_0 undefined — no prior close)
  let trSum = 0;
  for (let i = 1; i <= period; i++) {
    const h = bars[i].high;
    const l = bars[i].low;
    const cp = bars[i - 1].close;
    trSum += Math.max(h - l, Math.abs(h - cp), Math.abs(l - cp));
  }
  let atr = trSum / period;
  out.push({ time: bars[period].time, value: atr });

  for (let i = period + 1; i < bars.length; i++) {
    const h = bars[i].high;
    const l = bars[i].low;
    const cp = bars[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - cp), Math.abs(l - cp));
    atr = (atr * (period - 1) + tr) / period;
    out.push({ time: bars[i].time, value: atr });
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
