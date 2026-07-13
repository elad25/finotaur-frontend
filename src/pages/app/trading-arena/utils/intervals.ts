/**
 * Trading Arena — arbitrary timeframe model + helpers.
 *
 * `ArenaInterval` encodes ANY N+unit as a string: `<N><unit>` where unit is
 * one of `s` (seconds) / `m` (minutes) / `h` (hours) / `D` (day) / `W` (week)
 * / `M` (month). Examples: '1s', '45m', '3h', '1D', '1W', '1M'.
 *
 * Deliberately a DIFFERENT type from `Interval` (src/components/charting/types.ts)
 * — that type is a fixed Yahoo-style union consumed by ~140 files across the
 * app (Backtest/Journal/MarketScanner/etc.) and is left untouched by this
 * feature (bar one additive '1s' member — see that file's comment). This
 * module is the single place that knows how to translate an arbitrary
 * ArenaInterval into whatever a concrete ChartDataSource can natively serve.
 */

import type { Interval } from '@/components/charting/types';

// ═══════════════════════════════════════════════════════════════
// Core type + parsing
// ═══════════════════════════════════════════════════════════════

export type ArenaInterval = string;

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  D: 86400,
  W: 7 * 86400,
  M: 30 * 86400, // approximate — only used for bucket-size math, not calendar dates
};

const UNIT_LABEL_SINGULAR: Record<string, string> = {
  s: 'second',
  m: 'minute',
  h: 'hour',
  D: 'day',
  W: 'week',
  M: 'month',
};

const INTERVAL_RE = /^(\d+)(s|m|h|D|W|M)$/;

/** Parses '45m' → 2700. Malformed input safely falls back to 60 (1 minute) — never throws. */
export function intervalToSeconds(interval: ArenaInterval): number {
  const match = INTERVAL_RE.exec(interval);
  if (!match) return 60;
  const n = Number(match[1]);
  const unitSeconds = UNIT_SECONDS[match[2]];
  if (!Number.isFinite(n) || n <= 0 || !unitSeconds) return 60;
  return n * unitSeconds;
}

/** Formats '45m' → '45 minutes', '1h' → '1 hour', '1D' → '1 day'. Falls back to the raw string if malformed. */
export function formatIntervalLabel(interval: ArenaInterval): string {
  const match = INTERVAL_RE.exec(interval);
  if (!match) return interval;
  const n = Number(match[1]);
  const label = UNIT_LABEL_SINGULAR[match[2]] ?? match[2];
  return `${n} ${label}${n === 1 ? '' : 's'}`;
}

/** Short chip/trigger label — the raw interval string is already TradingView-short ('5m', '1h', '1D'). */
export function formatIntervalShort(interval: ArenaInterval): string {
  return interval;
}

// ═══════════════════════════════════════════════════════════════
// Menu grouping
// ═══════════════════════════════════════════════════════════════

export type TimeframeGroupHeader = 'SECONDS' | 'MINUTES' | 'HOURS' | 'DAYS';

export interface TimeframeGroup {
  header: TimeframeGroupHeader;
  items: ArenaInterval[];
}

export const ARENA_TIMEFRAME_GROUPS: TimeframeGroup[] = [
  { header: 'SECONDS', items: ['1s', '5s', '10s', '15s', '30s', '45s'] },
  { header: 'MINUTES', items: ['1m', '2m', '3m', '5m', '15m', '30m', '45m'] },
  { header: 'HOURS',   items: ['1h', '2h', '3h', '4h'] },
  { header: 'DAYS',    items: ['1D', '1W', '1M'] },
];

// ═══════════════════════════════════════════════════════════════
// Custom interval builder (feeds the "Custom..." dialog)
// ═══════════════════════════════════════════════════════════════

export type CustomIntervalUnit = 'seconds' | 'minutes' | 'hours' | 'days';

const CUSTOM_UNIT_SUFFIX: Record<CustomIntervalUnit, string> = {
  seconds: 's',
  minutes: 'm',
  hours: 'h',
  days: 'D',
};

/** Builds an ArenaInterval string from the Custom dialog's number + unit inputs. Clamps to a positive integer. */
export function buildCustomInterval(value: number, unit: CustomIntervalUnit): ArenaInterval {
  const n = Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
  return `${n}${CUSTOM_UNIT_SUFFIX[unit]}`;
}

// ═══════════════════════════════════════════════════════════════
// Capability descriptor — per assetClass, which menu sections are usable
// ═══════════════════════════════════════════════════════════════

export interface IntervalCapability {
  /** Whether the SECONDS group can be served at all for the active symbol. */
  secondsEnabled: boolean;
  /** Tooltip shown on disabled SECONDS rows. */
  secondsDisabledReason?: string;
}

/**
 * Crypto (Binance) is the only asset class with a live trades feed today, so
 * it's the only one that can serve sub-minute bars. Stocks/forex/futures data
 * comes from cached/delayed REST sources with no native second-level bars.
 */
export function getIntervalCapability(assetClass: string): IntervalCapability {
  if (assetClass === 'crypto') return { secondsEnabled: true };
  return {
    secondsEnabled: false,
    secondsDisabledReason: 'Seconds require a live trades feed',
  };
}

// ═══════════════════════════════════════════════════════════════
// Native-vs-aggregate resolution — for candlestick (OHLCV) fetches only.
// Order-flow/footprint (FlowBinStore-based) bins directly from trades and is
// already arbitrary-interval-capable — this section does NOT apply there.
// ═══════════════════════════════════════════════════════════════

export type CandleSourceKind = 'binance' | 'databento' | 'yahoo';

/** Seconds for every fixed `Interval` member this module cares about (native candidates only). */
const FIXED_INTERVAL_SECONDS: Partial<Record<Interval, number>> = {
  '1s': 1,
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '60m': 3600,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1wk': 7 * 86400,
  '1mo': 30 * 86400,
};

// Mirrors each concrete source's own INTERVAL_MAP / INTERVAL_TO_BUCKET_SECONDS
// (kept in sync manually — same pattern the Arena tabs already used for their
// pre-existing local INTERVAL_SECONDS copies before this feature).
const NATIVE_SETS: Record<CandleSourceKind, Interval[]> = {
  binance:   ['1s', '1m', '5m', '15m', '30m', '1h', '4h', '1d'],
  databento: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
  yahoo:     ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1wk', '1mo'],
};

function nativeIntervalForSeconds(seconds: number, set: Interval[]): Interval | null {
  for (const iv of set) {
    if (FIXED_INTERVAL_SECONDS[iv] === seconds) return iv;
  }
  return null;
}

/** Finest native base a given source kind can serve for client-side aggregation. */
function baseIntervalForSeconds(seconds: number, kind: CandleSourceKind): Interval {
  if (kind === 'binance' && seconds < 60) return '1s';
  if (seconds < 3600) return '1m';
  if (seconds < 86400) return '1h';
  return '1d';
}

export type ResolvedIntervalPlan =
  | { kind: 'native'; interval: Interval }
  | { kind: 'aggregate'; baseInterval: Interval; targetSeconds: number };

/**
 * Given a candlestick source kind + the Arena's requested (arbitrary)
 * interval, decides whether the source can serve it directly or whether the
 * caller should wrap the source in AggregatingSource with the returned
 * `baseInterval` + `targetSeconds`.
 */
export function resolveIntervalPlan(
  kind: CandleSourceKind,
  arenaInterval: ArenaInterval,
): ResolvedIntervalPlan {
  const seconds = intervalToSeconds(arenaInterval);
  const native = nativeIntervalForSeconds(seconds, NATIVE_SETS[kind]);
  if (native) return { kind: 'native', interval: native };
  return { kind: 'aggregate', baseInterval: baseIntervalForSeconds(seconds, kind), targetSeconds: seconds };
}
