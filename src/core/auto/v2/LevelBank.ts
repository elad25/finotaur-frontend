// ============================================================================
// LEVEL BANK — precomputed CAUSAL level arrays for one candle series (v2)
// ============================================================================
//
// LOOK-AHEAD GUARANTEE
// --------------------
// Every array returned by `getSeries` is index-aligned to the candle series
// passed to the constructor. Each value at index `i` is derivable using ONLY
// `candles[0..i]` (and, for `swingHigh`/`swingLow`, only pivots CONFIRMED at
// or before `i` — see `./swings.ts`). Concretely:
//
//  - `prevDayHigh` / `prevDayLow` / `prevDayClose` at bar `i` reflect the
//    LAST fully-COMPLETED calendar day as of `i` (never the still-forming
//    current day). NaN on the series' first calendar day (no prior day
//    exists yet).
//  - `dayOpen` at bar `i` is the open of the CURRENT day's first bar — known
//    from that first bar onward (never NaN once the day has started).
//  - `sessionHigh` / `sessionLow` at bar `i` are the running high/low of the
//    CURRENT day using bars STRICTLY BEFORE `i` (i.e. `[dayStart, i-1]`).
//    This is a deliberate choice: it lets a caller write
//    `candles[i].high > sessionHigh[i]` to mean "bar i breaks today's prior
//    high" without off-by-one double-counting bar `i` itself. NaN on the
//    first bar of a day (nothing before it yet, this session).
//  - `openingRangeHigh` / `openingRangeLow` at bar `i` are the high/low of
//    the day's first `orMinutes` (default 15) minutes, but ONLY once that
//    window has fully CLOSED (i.e. once a bar exists whose open time is
//    `orMinutes` or more after the day's first bar). Bars still INSIDE the
//    window read NaN — the final range isn't knowable yet without their own
//    future neighbours.
//  - `swingHigh` / `swingLow` at bar `i` are the price of the `nth`
//    most-recently CONFIRMED swing pivot as of `i` (see `./swings.ts`); NaN
//    until enough pivots have confirmed.
//  - `phaseAnchor` levels are NOT resolvable here — see the throw in
//    `compute()` below.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import { candleTimeMs, localDayKey } from '../MarketContext';
import type { LevelRef } from './types';
import { computeConfirmedSwings, nthMostRecentSwingSeries } from './swings';
import type { ConfirmedSwing } from './swings';

/** Options controlling LevelBank's causal-level computation. */
export interface LevelBankOptions {
  /** IANA timezone used to bucket bars into calendar days (e.g.
   *  'America/New_York'). Required — every level here is day-scoped. */
  timezone: string;
  /** Default opening-range window length in minutes when a `LevelRef` of
   *  type 'openingRangeHigh'/'openingRangeLow' doesn't specify its own
   *  `orMinutes`. Default 15. */
  orMinutes?: number;
  /** Default fractal half-width (k) for swing levels when a `LevelRef` of
   *  type 'swingHigh'/'swingLow' doesn't specify its own `lookback`.
   *  Default 2 — matches v1's swing discipline (`MarketContext`). */
  swingLookback?: number;
}

interface DayAggregates {
  prevHigh: Float64Array;
  prevLow: Float64Array;
  prevClose: Float64Array;
  dayOpen: Float64Array;
  sessionHigh: Float64Array;
  sessionLow: Float64Array;
  /** ms timestamp of each bar's day's FIRST bar — internal, used by the
   *  opening-range computation to know when the window has closed. */
  dayStartMs: Float64Array;
}

/**
 * Per-candle-series bank of causal price levels. Series are computed lazily
 * on first `getSeries()` call for a given (canonicalized) `LevelRef` and
 * cached for the lifetime of the bank instance.
 */
export class LevelBank {
  private readonly candles: Candle[];
  private readonly timezone: string;
  private readonly defaultOrMinutes: number;
  private readonly defaultSwingLookback: number;

  /** Final per-ref result cache, keyed by canonical LevelRef key. */
  private readonly seriesCache = new Map<string, Float64Array>();
  /** Memoized single-pass day aggregates (shared by 6 LevelRef types). */
  private dayAggCache: DayAggregates | null = null;
  /** Memoized opening-range pass, keyed by orMinutes. */
  private readonly openingRangeCache = new Map<number, { high: Float64Array; low: Float64Array }>();
  /** Memoized confirmed-swing lists, keyed by fractal k. */
  private readonly confirmedSwingsCache = new Map<
    number,
    { highs: ConfirmedSwing[]; lows: ConfirmedSwing[] }
  >();

  constructor(candles: Candle[], opts: LevelBankOptions) {
    this.candles = candles;
    this.timezone = opts.timezone;
    this.defaultOrMinutes = opts.orMinutes ?? 15;
    this.defaultSwingLookback = opts.swingLookback ?? 2;
  }

  /**
   * Resolve a `LevelRef` to a causal Float64Array index-aligned to the
   * candle series. Lazy + cached by canonical key: calling `getSeries` twice
   * with structurally-equal refs returns the SAME array instance.
   *
   * @throws if `ref.type === 'phaseAnchor'` — that variant requires live
   *   phase-execution state from the PhaseEngine (Increment 3), which this
   *   candles-only bank does not have.
   */
  getSeries(ref: LevelRef): Float64Array {
    const key = levelRefKey(ref);
    const cached = this.seriesCache.get(key);
    if (cached) return cached;
    const series = this.compute(ref);
    this.seriesCache.set(key, series);
    return series;
  }

  private compute(ref: LevelRef): Float64Array {
    switch (ref.type) {
      case 'prevDayHigh':
        return this.dayAggregates().prevHigh;
      case 'prevDayLow':
        return this.dayAggregates().prevLow;
      case 'prevDayClose':
        return this.dayAggregates().prevClose;
      case 'dayOpen':
        return this.dayAggregates().dayOpen;
      case 'sessionHigh':
        return this.dayAggregates().sessionHigh;
      case 'sessionLow':
        return this.dayAggregates().sessionLow;
      case 'openingRangeHigh':
        return this.openingRange(ref.orMinutes ?? this.defaultOrMinutes).high;
      case 'openingRangeLow':
        return this.openingRange(ref.orMinutes ?? this.defaultOrMinutes).low;
      case 'swingHigh':
        return this.swingSeries('high', ref.lookback ?? this.defaultSwingLookback, ref.nth ?? 1);
      case 'swingLow':
        return this.swingSeries('low', ref.lookback ?? this.defaultSwingLookback, ref.nth ?? 1);
      case 'phaseAnchor':
        throw new Error(
          `LevelBank.getSeries: phaseAnchor refs (phaseId="${ref.phaseId}", ` +
            `anchor="${ref.anchor}") require live phase-execution state from the ` +
            'PhaseEngine (Increment 3) and cannot be resolved from candles alone. ' +
            'Do not call LevelBank.getSeries with a phaseAnchor ref before then.',
        );
      /* istanbul ignore next -- exhaustiveness guard */
      default: {
        const _exhaustive: never = ref;
        throw new Error(`LevelBank.getSeries: unknown LevelRef ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  // ----- day-scoped aggregates (prevDay*/dayOpen/session*) -----------------

  private dayAggregates(): DayAggregates {
    if (this.dayAggCache) return this.dayAggCache;

    const n = this.candles.length;
    const prevHigh = new Float64Array(n).fill(NaN);
    const prevLow = new Float64Array(n).fill(NaN);
    const prevClose = new Float64Array(n).fill(NaN);
    const dayOpen = new Float64Array(n).fill(NaN);
    const sessionHigh = new Float64Array(n).fill(NaN);
    const sessionLow = new Float64Array(n).fill(NaN);
    const dayStartMs = new Float64Array(n).fill(NaN);

    let curDayKey: string | null = null;
    // Completed-day snapshot, populated once the FIRST day boundary is
    // crossed. Undefined (NaN passthrough) for the series' first day.
    let completedHigh = NaN;
    let completedLow = NaN;
    let completedClose = NaN;
    // Accumulators for the day currently in progress.
    let curHigh = -Infinity;
    let curLow = Infinity;
    let curClose = NaN;
    let curDayOpen = NaN;
    let curDayStartMs = NaN;
    // Running session high/low using bars STRICTLY BEFORE the current one.
    let runningSessionHigh = -Infinity;
    let runningSessionLow = Infinity;

    for (let i = 0; i < n; i++) {
      const candle = this.candles[i];
      const dk = localDayKey(candleTimeMs(candle), this.timezone);

      if (dk !== curDayKey) {
        // New calendar day: the PREVIOUS day (if any) is now fully complete.
        if (curDayKey !== null) {
          completedHigh = curHigh;
          completedLow = curLow;
          completedClose = curClose;
        }
        curDayKey = dk;
        curHigh = candle.high;
        curLow = candle.low;
        curDayOpen = candle.open;
        curDayStartMs = candleTimeMs(candle);
        runningSessionHigh = -Infinity;
        runningSessionLow = Infinity;
      } else {
        curHigh = Math.max(curHigh, candle.high);
        curLow = Math.min(curLow, candle.low);
      }

      prevHigh[i] = completedHigh;
      prevLow[i] = completedLow;
      prevClose[i] = completedClose;
      dayOpen[i] = curDayOpen;
      sessionHigh[i] = runningSessionHigh === -Infinity ? NaN : runningSessionHigh;
      sessionLow[i] = runningSessionLow === Infinity ? NaN : runningSessionLow;
      dayStartMs[i] = curDayStartMs;

      // Bar i's own high/low become part of the running session state for
      // bars AFTER i — never for bar i itself (see class-level doc comment).
      runningSessionHigh = Math.max(runningSessionHigh, candle.high);
      runningSessionLow = Math.min(runningSessionLow, candle.low);
      curClose = candle.close;
    }

    this.dayAggCache = {
      prevHigh,
      prevLow,
      prevClose,
      dayOpen,
      sessionHigh,
      sessionLow,
      dayStartMs,
    };
    return this.dayAggCache;
  }

  // ----- opening range -------------------------------------------------

  private openingRange(orMinutes: number): { high: Float64Array; low: Float64Array } {
    const cached = this.openingRangeCache.get(orMinutes);
    if (cached) return cached;

    const { dayStartMs } = this.dayAggregates();
    const n = this.candles.length;
    const high = new Float64Array(n).fill(NaN);
    const low = new Float64Array(n).fill(NaN);
    const windowMs = orMinutes * 60_000;

    let curDayStart = NaN;
    let orHigh = -Infinity;
    let orLow = Infinity;
    let orClosed = false;
    let orFinalHigh = NaN;
    let orFinalLow = NaN;

    for (let i = 0; i < n; i++) {
      const candle = this.candles[i];
      const dayStart = dayStartMs[i];
      if (dayStart !== curDayStart) {
        // New day: reset the opening-range accumulator.
        curDayStart = dayStart;
        orHigh = -Infinity;
        orLow = Infinity;
        orClosed = false;
        orFinalHigh = NaN;
        orFinalLow = NaN;
      }

      const elapsed = candleTimeMs(candle) - dayStart;
      if (elapsed < windowMs) {
        // Still inside the window: this bar's own value is NaN (the range
        // isn't final yet), but it DOES contribute to the accumulator.
        orHigh = Math.max(orHigh, candle.high);
        orLow = Math.min(orLow, candle.low);
        high[i] = NaN;
        low[i] = NaN;
      } else {
        if (!orClosed) {
          orFinalHigh = orHigh;
          orFinalLow = orLow;
          orClosed = true;
        }
        high[i] = orFinalHigh;
        low[i] = orFinalLow;
      }
    }

    const result = { high, low };
    this.openingRangeCache.set(orMinutes, result);
    return result;
  }

  // ----- swings -----------------------------------------------------------

  private confirmedSwings(k: number): { highs: ConfirmedSwing[]; lows: ConfirmedSwing[] } {
    const cached = this.confirmedSwingsCache.get(k);
    if (cached) return cached;
    const computed = computeConfirmedSwings(this.candles, k);
    this.confirmedSwingsCache.set(k, computed);
    return computed;
  }

  private swingSeries(kind: 'high' | 'low', lookback: number, nth: number): Float64Array {
    const { highs, lows } = this.confirmedSwings(lookback);
    const list = kind === 'high' ? highs : lows;
    return nthMostRecentSwingSeries(this.candles.length, list, nth);
  }
}

/** Canonical cache key for a LevelRef — stable regardless of key insertion
 *  order in the object literal the caller constructed. */
function levelRefKey(ref: LevelRef): string {
  switch (ref.type) {
    case 'prevDayHigh':
    case 'prevDayLow':
    case 'prevDayClose':
    case 'sessionHigh':
    case 'sessionLow':
    case 'dayOpen':
      return ref.type;
    case 'openingRangeHigh':
    case 'openingRangeLow':
      return `${ref.type}:${ref.orMinutes ?? 'default'}`;
    case 'swingHigh':
    case 'swingLow':
      return `${ref.type}:${ref.lookback ?? 'default'}:${ref.nth ?? 1}`;
    case 'phaseAnchor':
      return `phaseAnchor:${ref.phaseId}:${ref.anchor}`;
  }
}
