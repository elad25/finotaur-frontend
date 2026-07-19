// ============================================================================
// MARKET CONTEXT — precomputed CAUSAL feature arrays for the auto-backtester
// ============================================================================
//
// LOOK-AHEAD GUARANTEE
// --------------------
// Every array exposed here is index-aligned to `candles`. Each value at index
// `i` is computed using ONLY candles[0..i] — never any future bar — EXCEPT the
// raw `swingHighs`/`swingLows` fractal flags, which by definition need a half-
// window of FUTURE bars to confirm a pivot. To use swings safely, detectors
// MUST go through `lastConfirmedSwingHigh(i)` / `lastConfirmedSwingLow(i)`,
// which only return pivots that were already CONFIRMED at or before bar `i`
// (i.e. pivot index + k <= i). Reading the raw flag arrays directly is a
// look-ahead bug.
// ============================================================================

import type { Candle } from '../../components/ReplayChart/types';
import type { SetupDefinition } from './types';

/** Inputs that influence the precomputed arrays. */
export interface MarketContextParams {
  /** Fractal half-width (k). A pivot at i spans [i-k, i+k]. */
  swingLookback: number;
  /** Wilder ATR period. */
  atrPeriod: number;
  /** Optional session filter (timezone-aware). */
  session?: SetupDefinition['session'];
  /** Optional HTF bias config + candles. */
  bias?: SetupDefinition['bias'];
  htfCandles?: Candle[];
}

const DEFAULT_PARAMS: MarketContextParams = {
  swingLookback: 2,
  atrPeriod: 14,
};

/** A confirmed pivot. */
interface ConfirmedSwing {
  index: number;
  price: number;
}

export class MarketContext {
  readonly candles: Candle[];
  readonly params: MarketContextParams;

  /** Raw fractal flags. NOT look-ahead-safe to read directly — use helpers. */
  readonly swingHighs: boolean[];
  readonly swingLows: boolean[];

  /** Wilder ATR(period), causal (atr[i] uses only candles <= i). */
  readonly atr: number[];

  /** Per-bar session permission (true if session disabled). */
  readonly sessionAllowed: boolean[];

  /** Per-bar HTF bias: +1 bullish / 0 neutral / -1 bearish. */
  readonly htfBias: number[];

  // Confirmed-swing timelines, sorted ascending by confirmation bar.
  // confirmedAt = pivotIndex + k. Each entry stores the pivot itself.
  private readonly confirmedHighs: Array<ConfirmedSwing & { confirmedAt: number }>;
  private readonly confirmedLows: Array<ConfirmedSwing & { confirmedAt: number }>;

  private constructor(candles: Candle[], params: MarketContextParams) {
    this.candles = candles;
    this.params = params;

    const k = Math.max(1, Math.floor(params.swingLookback));
    const { highs, lows } = computeFractals(candles, k);
    this.swingHighs = highs;
    this.swingLows = lows;

    this.confirmedHighs = collectConfirmed(candles, highs, k, 'high');
    this.confirmedLows = collectConfirmed(candles, lows, k, 'low');

    this.atr = computeWilderAtr(candles, Math.max(1, Math.floor(params.atrPeriod)));
    this.sessionAllowed = computeSessionAllowed(candles, params.session);
    this.htfBias = computeHtfBias(candles, params.bias, params.htfCandles);
  }

  /** Build a context once per run. */
  static build(
    candles: Candle[],
    params?: Partial<MarketContextParams>,
  ): MarketContext {
    return new MarketContext(candles, { ...DEFAULT_PARAMS, ...params });
  }

  // ----- causal swing helpers --------------------------------------------

  /** All swing highs CONFIRMED at or before bar `i` (look-ahead-safe). */
  confirmedSwingHighsUpTo(i: number): ConfirmedSwing[] {
    const out: ConfirmedSwing[] = [];
    for (const s of this.confirmedHighs) {
      if (s.confirmedAt > i) break; // sorted ascending by confirmedAt
      out.push({ index: s.index, price: s.price });
    }
    return out;
  }

  /** All swing lows CONFIRMED at or before bar `i` (look-ahead-safe). */
  confirmedSwingLowsUpTo(i: number): ConfirmedSwing[] {
    const out: ConfirmedSwing[] = [];
    for (const s of this.confirmedLows) {
      if (s.confirmedAt > i) break;
      out.push({ index: s.index, price: s.price });
    }
    return out;
  }

  /** Most recent swing high confirmed at or before bar `i`, or null. */
  lastConfirmedSwingHigh(i: number): ConfirmedSwing | null {
    let last: ConfirmedSwing | null = null;
    for (const s of this.confirmedHighs) {
      if (s.confirmedAt > i) break;
      last = { index: s.index, price: s.price };
    }
    return last;
  }

  /** Most recent swing low confirmed at or before bar `i`, or null. */
  lastConfirmedSwingLow(i: number): ConfirmedSwing | null {
    let last: ConfirmedSwing | null = null;
    for (const s of this.confirmedLows) {
      if (s.confirmedAt > i) break;
      last = { index: s.index, price: s.price };
    }
    return last;
  }

  // ----- per-candle helpers ----------------------------------------------

  /** Absolute candle body size. */
  body(i: number): number {
    const c = this.candles[i];
    return Math.abs(c.close - c.open);
  }

  /** Candle high-low range. */
  range(i: number): number {
    const c = this.candles[i];
    return c.high - c.low;
  }

  /** Bullish displacement: up candle whose body >= mult * ATR(i). */
  isUpDisplacement(i: number, mult: number): boolean {
    const c = this.candles[i];
    const a = this.atr[i];
    if (a <= 0) return false;
    return c.close > c.open && this.body(i) >= mult * a;
  }

  /** Bearish displacement: down candle whose body >= mult * ATR(i). */
  isDownDisplacement(i: number, mult: number): boolean {
    const c = this.candles[i];
    const a = this.atr[i];
    if (a <= 0) return false;
    return c.close < c.open && this.body(i) >= mult * a;
  }
}

// ============================================================================
// Pure helpers (module-private)
// ============================================================================

/**
 * Strict fractal pivots with half-width k.
 * swingHigh[i] === high[i] is the STRICT maximum of [i-k, i+k].
 */
function computeFractals(
  candles: Candle[],
  k: number,
): { highs: boolean[]; lows: boolean[] } {
  const n = candles.length;
  const highs = new Array<boolean>(n).fill(false);
  const lows = new Array<boolean>(n).fill(false);

  for (let i = k; i < n - k; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    let isHigh = true;
    let isLow = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (candles[j].high >= h) isHigh = false;
      if (candles[j].low <= l) isLow = false;
      if (!isHigh && !isLow) break;
    }
    highs[i] = isHigh;
    lows[i] = isLow;
  }
  return { highs, lows };
}

/**
 * Turn raw fractal flags into a list of confirmed swings, where a pivot at
 * index p becomes CONFIRMED only at bar p + k (because it required k future
 * bars to validate). Sorted ascending by `confirmedAt`.
 */
function collectConfirmed(
  candles: Candle[],
  flags: boolean[],
  k: number,
  field: 'high' | 'low',
): Array<ConfirmedSwing & { confirmedAt: number }> {
  const out: Array<ConfirmedSwing & { confirmedAt: number }> = [];
  for (let p = 0; p < flags.length; p++) {
    if (!flags[p]) continue;
    out.push({
      index: p,
      price: field === 'high' ? candles[p].high : candles[p].low,
      confirmedAt: p + k,
    });
  }
  // Already ascending by index; confirmedAt = index + k preserves the order.
  return out;
}

/**
 * Wilder ATR(period), computed causally.
 * TR[i] = max(high-low, |high-prevClose|, |low-prevClose|).
 * atr[i] for i < period is the running simple average of TR seen so far so the
 * array is always populated; the proper Wilder smoothing starts at period.
 */
function computeWilderAtr(candles: Candle[], period: number): number[] {
  const n = candles.length;
  const atr = new Array<number>(n).fill(0);
  if (n === 0) return atr;

  const tr = new Array<number>(n).fill(0);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose),
    );
  }

  // Seed: simple average of the first `period` TRs (causal running mean before
  // we have a full window so early bars still have a usable value).
  let running = 0;
  for (let i = 0; i < n; i++) {
    if (i < period) {
      running += tr[i];
      atr[i] = running / (i + 1);
      if (i === period - 1) atr[i] = running / period;
    } else {
      // Wilder smoothing.
      atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }
  }
  return atr;
}

/**
 * Per-candle session permission. Uses the candle OPEN time and the configured
 * IANA timezone. If session is disabled/absent, all bars are allowed.
 */
function computeSessionAllowed(
  candles: Candle[],
  session?: SetupDefinition['session'],
): boolean[] {
  const n = candles.length;
  const allowed = new Array<boolean>(n).fill(true);
  if (!session || !session.enabled) return allowed;

  const tz = session.timezone || 'UTC';
  const dayAllowed = (d: number): boolean =>
    !session.days || session.days.length === 0 || session.days.includes(d);

  for (let i = 0; i < n; i++) {
    const ms = candleTimeMs(candles[i]);
    const { minutes, weekday } = localMinutesAndDay(ms, tz);
    let ok = false;
    if (dayAllowed(weekday)) {
      for (const w of session.windows) {
        const start = hhmmToMinutes(w.start);
        const end = hhmmToMinutes(w.end);
        if (start <= end) {
          if (minutes >= start && minutes < end) {
            ok = true;
            break;
          }
        } else {
          // Window wraps past midnight (e.g. 22:00 -> 02:00).
          if (minutes >= start || minutes < end) {
            ok = true;
            break;
          }
        }
      }
    }
    allowed[i] = ok;
  }
  return allowed;
}

/**
 * HTF bias mapped down to each LTF bar. Each LTF bar is associated with the
 * most-recently CLOSED HTF bar -- CLOSED meaning
 * `htfOpenTime + htfBarDuration <= ltfOpenTime`, never a still-forming one.
 *
 * This is deliberately stricter than "htf.time <= ltf.time" (open-time
 * alignment): the bias VALUE at an HTF index is derived from that bar's
 * CLOSE (EMA over closes / confirmed structure), so an HTF bar only becomes
 * safe to read once it has fully closed relative to the LTF bar consuming
 * it. Example: a 4h bar opens 00:00 and closes 04:00; an LTF bar at 01:00
 * must NOT read the bias computed from that bar's (not-yet-existing) 04:00
 * close -- it must read the PREVIOUS closed 4h bar's bias, or neutral (0)
 * if no HTF bar has closed yet.
 *
 * Bias = EMA slope sign (method 'ema') or last-confirmed HTF structure
 * (method 'structure'). Disabled/absent -> all neutral (0).
 */
function computeHtfBias(
  candles: Candle[],
  bias?: SetupDefinition['bias'],
  htfCandles?: Candle[],
): number[] {
  const n = candles.length;
  const out = new Array<number>(n).fill(0);
  if (!bias || !bias.enabled || !htfCandles || htfCandles.length === 0) {
    return out;
  }

  // Per-HTF-bar bias value, causal.
  const htfBiasSeries =
    bias.method === 'ema'
      ? emaSlopeBias(htfCandles, bias.emaLength ?? 50)
      : structureBias(htfCandles);

  // HTF bar duration, needed to know when a candidate HTF bar has actually
  // CLOSED. Prefer the setup's explicit timeframe label; fall back to the
  // median spacing between consecutive HTF candles (robust to occasional
  // gaps -- weekends/holidays -- that would skew a plain mean/first-delta).
  const htfDurationMs =
    timeframeToMs(bias.htfTimeframe) ?? medianDeltaMs(htfCandles);

  // For each LTF bar, find the latest HTF bar that has fully CLOSED by the
  // LTF bar's own open time. htfIdx = -1 means no HTF bar has closed yet.
  let htfIdx = -1;
  for (let i = 0; i < n; i++) {
    const tLtf = candleTimeMs(candles[i]);
    while (
      htfIdx + 1 < htfCandles.length &&
      candleTimeMs(htfCandles[htfIdx + 1]) + htfDurationMs <= tLtf
    ) {
      htfIdx++;
    }
    out[i] = htfIdx >= 0 ? htfBiasSeries[htfIdx] : 0;
  }
  return out;
}

/** Known timeframe labels mapped to milliseconds. Extend as new timeframes
 *  become selectable in the bias-filter UI. */
const TIMEFRAME_TO_MS: Record<string, number> = {
  '1m': 60_000,
  '3m': 3 * 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '2h': 2 * 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '8h': 8 * 60 * 60_000,
  '12h': 12 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '3d': 3 * 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
};

/**
 * Resolve a timeframe label to its duration in milliseconds via the known
 * {@link TIMEFRAME_TO_MS} map, or `undefined` if the label isn't recognized.
 * Exported (Increment 3 — MTF) so `v2/TimeframeSet.ts` and `v2/types.ts` use
 * the SAME duration source as this module's own HTF-bias closed-bar rule,
 * rather than maintaining a second, potentially-drifting timeframe map.
 */
export function timeframeToMs(tf?: string): number | undefined {
  if (!tf) return undefined;
  return TIMEFRAME_TO_MS[tf];
}

/**
 * Robust bar-duration estimate: the MEDIAN delta between consecutive candle
 * open times. Used only as a fallback when the timeframe label isn't in the
 * known map above -- median is resistant to the occasional large gap
 * (weekend/holiday/missing bar) that would otherwise skew a mean or a
 * first-delta sample toward an unrepresentative duration. Exported
 * (Increment 3 — MTF) for the same reason as {@link timeframeToMs}.
 */
export function medianDeltaMs(candles: Candle[]): number {
  if (candles.length < 2) return 0;
  const deltas: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    deltas.push(candleTimeMs(candles[i]) - candleTimeMs(candles[i - 1]));
  }
  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  return deltas.length % 2 === 0
    ? (deltas[mid - 1] + deltas[mid]) / 2
    : deltas[mid];
}

/** EMA-slope bias series: +1 if EMA rising, -1 if falling, 0 flat. Causal. */
function emaSlopeBias(candles: Candle[], length: number): number[] {
  const n = candles.length;
  const out = new Array<number>(n).fill(0);
  if (n === 0) return out;
  const alpha = 2 / (length + 1);
  let ema = candles[0].close;
  let prevEma = ema;
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      ema = candles[0].close;
    } else {
      prevEma = ema;
      ema = candles[i].close * alpha + ema * (1 - alpha);
    }
    out[i] = ema > prevEma ? 1 : ema < prevEma ? -1 : 0;
  }
  return out;
}

/**
 * Structure bias: +1 while the latest confirmed swing high was taken out
 * (higher-high regime), -1 while the latest confirmed swing low was taken out.
 * Computed causally with a small k=2 fractal.
 */
function structureBias(candles: Candle[]): number[] {
  const n = candles.length;
  const out = new Array<number>(n).fill(0);
  const k = 2;
  const { highs, lows } = computeFractals(candles, k);

  let lastConfirmedHigh: number | null = null;
  let lastConfirmedLow: number | null = null;
  let regime = 0;

  for (let i = 0; i < n; i++) {
    // Confirm any pivot whose window closed at this bar (pivot index = i - k).
    const p = i - k;
    if (p >= 0) {
      if (highs[p]) lastConfirmedHigh = candles[p].high;
      if (lows[p]) lastConfirmedLow = candles[p].low;
    }
    if (lastConfirmedHigh !== null && candles[i].close > lastConfirmedHigh) {
      regime = 1;
    } else if (lastConfirmedLow !== null && candles[i].close < lastConfirmedLow) {
      regime = -1;
    }
    out[i] = regime;
  }
  return out;
}

// ----- tiny time utilities --------------------------------------------------

/** Candle time normalized to milliseconds (handles seconds vs ms). */
export function candleTimeMs(c: Candle): number {
  const t = typeof c.time === 'number' ? c.time : Number(c.time);
  // Heuristic: values below ~1e12 are seconds (UTCTimestamp is seconds).
  return t < 1e12 ? t * 1000 : t;
}

/**
 * Parse an "HH:MM" string to minutes-of-day. Exported (v2 Increment 5) so
 * `v2/StrategyEngine.ts`'s `flatAt` clock-time exit uses the SAME parsing
 * this module's own session-window logic already relies on, rather than a
 * second, potentially-drifting implementation.
 */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Local calendar-day key ("YYYY-MM-DD") for a UTC ms timestamp in `timezone`.
 * Used to bucket bars into trading days for day-scoped risk limits (e.g.
 * `RiskConfig.maxTradesPerDay` in AutoBacktestEngine). Uses the `en-CA`
 * locale, which formats dates as YYYY-MM-DD by construction.
 */
export function localDayKey(ms: number, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date(ms));
}

/**
 * Local minutes-of-day and weekday (0=Sun) for a UTC ms timestamp in tz.
 * Exported (v2 Increment 5) so `v2/LevelBank.ts`'s named-session windows
 * (always ET) and `v2/StrategyEngine.ts`'s `flatAt` clock-time exit reuse
 * the SAME `Intl.DateTimeFormat` parsing this module's own session-window
 * logic already relies on, rather than a second, potentially-drifting
 * implementation.
 */
export function localMinutesAndDay(
  ms: number,
  timezone: string,
): { minutes: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ms));
  let hour = 0;
  let minute = 0;
  let weekdayStr = 'Sun';
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10) % 24;
    else if (p.type === 'minute') minute = parseInt(p.value, 10);
    else if (p.type === 'weekday') weekdayStr = p.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { minutes: hour * 60 + minute, weekday: weekdayMap[weekdayStr] ?? 0 };
}
