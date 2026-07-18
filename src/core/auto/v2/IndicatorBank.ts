// ============================================================================
// INDICATOR BANK — precomputed CAUSAL indicator arrays for one candle series (v2)
// ============================================================================
//
// LOOK-AHEAD GUARANTEE
// --------------------
// Every array returned by `getSeries` is index-aligned to the candle series
// passed to the constructor. Each value at index `i` is derivable using ONLY
// `candles[0..i]` — never a future bar. Concretely, per `IndicatorRef.type`:
//
//  - `sma(length)` / `ema(length)` (defaults 20) are NaN for `i < length - 1`
//    (not enough closes yet). The first real value, at `i = length - 1`, is
//    the simple mean of `close[0..length-1]`. `ema` reuses that SAME value
//    as its seed (standard convention — a seed computed any other way would
//    need bars before the series start, which don't exist). After the seed,
//    `ema[i] = close[i] * k + ema[i-1] * (1 - k)`, `k = 2 / (length + 1)`.
//  - `rsi(length)` (default 14, Wilder) is NaN for `i < length`. The seed at
//    `i = length` is a SIMPLE average of the first `length` gain/loss
//    deltas (`close[1]-close[0]` .. `close[length]-close[length-1]` —
//    Wilder's own seeding convention); every bar after switches to the
//    Wilder recurrence `avg = (avg * (length - 1) + delta) / length`.
//  - `atr(length)` (default 14, Wilder) mirrors `ema`'s warmup shape: NaN
//    for `i < length - 1`. The seed at `i = length - 1` is a simple mean of
//    the first `length` true-range values (bar 0's TR has no prior close,
//    so it degrades to `high[0] - low[0]`), then the Wilder recurrence
//    continues exactly like `rsi`'s gain/loss averages.
//  - `vwap` (length ignored) is SESSION-ANCHORED: it resets at every local
//    calendar-day boundary (via `localDayKey`, same timezone convention as
//    `LevelBank`) and accumulates `sum(typicalPrice * volume) / sum(volume)`
//    over `[dayStart, i]` INCLUSIVE of bar `i` itself — a standard intraday
//    VWAP reads its own bar's volume, unlike `LevelBank`'s
//    `sessionHigh`/`sessionLow`, which deliberately exclude the current bar.
//    Still fully causal: bar `i`'s own OHLCV is known once bar `i` closes.
//    `typicalPrice = (high + low + close) / 3`. NaN while the day's
//    cumulative volume is still 0 (no volume traded yet this session,
//    including when `candle.volume` is missing/undefined, treated as 0).
//  - `macd` (length ignored — fixed classic 12/26) is `ema(12) - ema(26)`;
//    NaN until BOTH EMAs have warmed up, i.e. `i < 25` (ema26's warmup
//    boundary). This bank does NOT expose the signal line or histogram in
//    v1 — `macd` here is the MACD LINE only. A `crossesAbove(macd, const
//    0)` condition covers the common "MACD crosses above zero" use case;
//    signal-line support (a 9-period EMA of this line) can be added later
//    as a new `IndicatorRef` variant without breaking this contract.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import { candleTimeMs, localDayKey } from '../MarketContext';
import type { IndicatorRef } from './types';

/** Options controlling IndicatorBank's causal-indicator computation. */
export interface IndicatorBankOptions {
  /** IANA timezone used to bucket bars into calendar days for `vwap`'s
   *  session-anchoring (e.g. 'America/New_York'). Required. */
  timezone: string;
}

/** Per-type default `length` when a caller omits it (mirrors common
 *  charting-package defaults). `vwap`/`macd` ignore `length` entirely. */
const DEFAULT_LENGTH: Record<'sma' | 'ema' | 'rsi' | 'atr', number> = {
  sma: 20,
  ema: 20,
  rsi: 14,
  atr: 14,
};

/** Classic fixed MACD periods. `IndicatorRef.length` is ignored for 'macd'. */
const MACD_FAST = 12;
const MACD_SLOW = 26;

/**
 * Per-candle-series bank of causal technical indicators. Series are computed
 * lazily on first `getSeries()` call for a given (canonicalized)
 * `IndicatorRef` and cached for the lifetime of the bank instance.
 */
export class IndicatorBank {
  private readonly candles: Candle[];
  private readonly timezone: string;

  /** Final per-ref result cache, keyed by canonical IndicatorRef key. */
  private readonly seriesCache = new Map<string, Float64Array>();
  /** Memoized close-price array (shared by sma/ema/rsi/macd computations). */
  private closesCache: Float64Array | null = null;

  constructor(candles: Candle[], opts: IndicatorBankOptions) {
    this.candles = candles;
    this.timezone = opts.timezone;
  }

  /**
   * Resolve an `IndicatorRef` to a causal Float64Array index-aligned to the
   * candle series. Lazy + cached by canonical key: calling `getSeries` twice
   * with structurally-equal refs (including an explicit `length` equal to
   * the type's default) returns the SAME array instance.
   */
  getSeries(ref: IndicatorRef): Float64Array {
    const key = indicatorRefKey(ref);
    const cached = this.seriesCache.get(key);
    if (cached) return cached;
    const series = this.compute(ref);
    this.seriesCache.set(key, series);
    return series;
  }

  private compute(ref: IndicatorRef): Float64Array {
    switch (ref.type) {
      case 'sma':
        return smaSeries(this.closes(), ref.length ?? DEFAULT_LENGTH.sma);
      case 'ema':
        return emaSeries(this.closes(), ref.length ?? DEFAULT_LENGTH.ema);
      case 'rsi':
        return rsiSeries(this.closes(), ref.length ?? DEFAULT_LENGTH.rsi);
      case 'atr':
        return atrSeries(this.candles, ref.length ?? DEFAULT_LENGTH.atr);
      case 'vwap':
        return this.vwapSeries();
      case 'macd': {
        const fast = emaSeries(this.closes(), MACD_FAST);
        const slow = emaSeries(this.closes(), MACD_SLOW);
        const n = this.candles.length;
        const macd = new Float64Array(n);
        for (let i = 0; i < n; i++) {
          // NaN - x === NaN and x - NaN === NaN, so the warmup gap
          // propagates correctly without an explicit NaN check.
          macd[i] = fast[i] - slow[i];
        }
        return macd;
      }
      /* istanbul ignore next -- exhaustiveness guard */
      default: {
        // Note: unlike `LevelRef` (a true discriminated union of variant
        // object shapes), `IndicatorRef` is a SINGLE interface whose `type`
        // field is a string-literal union — so it's `ref.type`, not `ref`
        // itself, that narrows to `never` once every case is handled.
        const _exhaustive: never = ref.type;
        throw new Error(
          `IndicatorBank.getSeries: unknown IndicatorRef type ${JSON.stringify(_exhaustive)}`,
        );
      }
    }
  }

  private closes(): Float64Array {
    if (this.closesCache) return this.closesCache;
    const n = this.candles.length;
    const closes = new Float64Array(n);
    for (let i = 0; i < n; i++) closes[i] = this.candles[i].close;
    this.closesCache = closes;
    return closes;
  }

  // ----- vwap (session-anchored, current-bar-inclusive) --------------------

  private vwapSeries(): Float64Array {
    const n = this.candles.length;
    const vwap = new Float64Array(n).fill(NaN);
    let curDayKey: string | null = null;
    let cumPV = 0; // cumulative typicalPrice * volume, this session
    let cumV = 0; // cumulative volume, this session

    for (let i = 0; i < n; i++) {
      const c = this.candles[i];
      const dk = localDayKey(candleTimeMs(c), this.timezone);
      if (dk !== curDayKey) {
        // New calendar day: reset the session accumulator.
        curDayKey = dk;
        cumPV = 0;
        cumV = 0;
      }
      const typicalPrice = (c.high + c.low + c.close) / 3;
      const vol = c.volume ?? 0;
      cumPV += typicalPrice * vol;
      cumV += vol;
      vwap[i] = cumV === 0 ? NaN : cumPV / cumV;
    }
    return vwap;
  }
}

// ============================================================================
// Pure series computations (no bank state — straightforward to unit-test).
// ============================================================================

/** Simple moving average. NaN for `i < length - 1`. O(n) via a running sum
 *  over a sliding window of width `length`. */
function smaSeries(closes: Float64Array, length: number): Float64Array {
  const n = closes.length;
  const sma = new Float64Array(n).fill(NaN);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += closes[i];
    if (i >= length) sum -= closes[i - length];
    if (i >= length - 1) sma[i] = sum / length;
  }
  return sma;
}

/**
 * Exponential moving average. Seed = SMA of the first `length` closes,
 * placed at `i = length - 1`; NaN before that. `k = 2 / (length + 1)`.
 */
function emaSeries(closes: Float64Array, length: number): Float64Array {
  const n = closes.length;
  const ema = new Float64Array(n).fill(NaN);
  if (n < length) return ema;

  const k = 2 / (length + 1);
  let sum = 0;
  for (let i = 0; i < length; i++) sum += closes[i];
  let prev = sum / length;
  ema[length - 1] = prev;
  for (let i = length; i < n; i++) {
    prev = closes[i] * k + prev * (1 - k);
    ema[i] = prev;
  }
  return ema;
}

/**
 * Wilder's RSI. NaN for `i < length`. The seed (at `i = length`) is a
 * SIMPLE average of the first `length` gain/loss deltas; every bar after
 * switches to the Wilder recurrence
 * `avg = (avg * (length - 1) + delta) / length`. Result in `[0, 100]`.
 */
function rsiSeries(closes: Float64Array, length: number): Float64Array {
  const n = closes.length;
  const rsi = new Float64Array(n).fill(NaN);
  if (n <= length) return rsi;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gainSum += delta;
    else lossSum += -delta;
  }
  let avgGain = gainSum / length;
  let avgLoss = lossSum / length;
  rsi[length] = rsiFromAverages(avgGain, avgLoss);

  for (let i = length + 1; i < n; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (length - 1) + gain) / length;
    avgLoss = (avgLoss * (length - 1) + loss) / length;
    rsi[i] = rsiFromAverages(avgGain, avgLoss);
  }
  return rsi;
}

/** RSI from Wilder average gain/loss. Flat (no movement at all, both
 *  averages 0) -> 50 (avoids an undefined 0/0 ratio); all-gain
 *  (`avgLoss === 0`, `avgGain > 0`) -> 100 (standard convention). */
function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Wilder's ATR over true range. NaN for `i < length - 1` (mirrors `ema`'s
 * warmup shape). Bar 0's true range has no prior close, so it degrades to
 * `high[0] - low[0]`. The seed at `i = length - 1` is a simple mean of the
 * first `length` true-range values; every bar after switches to the Wilder
 * recurrence `atr = (atr * (length - 1) + tr) / length`.
 */
function atrSeries(candles: Candle[], length: number): Float64Array {
  const n = candles.length;
  const atr = new Float64Array(n).fill(NaN);
  if (n < length) return atr;

  const tr = new Float64Array(n);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  }

  let sum = 0;
  for (let i = 0; i < length; i++) sum += tr[i];
  let prev = sum / length;
  atr[length - 1] = prev;
  for (let i = length; i < n; i++) {
    prev = (prev * (length - 1) + tr[i]) / length;
    atr[i] = prev;
  }
  return atr;
}

/** Canonical cache key for an IndicatorRef — stable regardless of whether
 *  `length` was given explicitly or defaulted, and independent of key
 *  insertion order in the object literal the caller constructed. */
function indicatorRefKey(ref: IndicatorRef): string {
  switch (ref.type) {
    case 'sma':
    case 'ema':
    case 'rsi':
    case 'atr':
      return `${ref.type}:${ref.length ?? DEFAULT_LENGTH[ref.type]}`;
    case 'vwap':
      return 'vwap';
    case 'macd':
      return 'macd'; // length ignored — fixed 12/26.
  }
}
