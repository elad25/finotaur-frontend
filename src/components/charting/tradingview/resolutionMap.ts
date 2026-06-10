import type { Interval } from '../types';

/** Maps our Interval union to TradingView resolution strings. */
const INTERVAL_TO_TV: Record<Interval, string> = {
  '1m': '1',
  '2m': '2',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '60m': '60',
  '1h': '60',
  '4h': '240',
  '1d': '1D',
  '1wk': '1W',
  '1mo': '1M',
};

/** Maps TradingView resolution strings back to our Interval union.
 *  When a resolution has multiple Interval counterparts (e.g. "60" → "60m"),
 *  we prefer the shorter canonical form. */
const TV_TO_INTERVAL: Record<string, Interval> = {
  '1': '1m',
  '2': '2m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '60m',
  '240': '4h',
  '1D': '1d',
  '1W': '1wk',
  '1M': '1mo',
};

/** Convert our Interval to a TradingView resolution string. */
export function intervalToResolution(iv: Interval): string {
  return INTERVAL_TO_TV[iv];
}

/** Convert a TradingView resolution string back to our Interval.
 *  Falls back to '1d' for unknown resolutions (safe default). */
export function resolutionToInterval(res: string): Interval {
  return TV_TO_INTERVAL[res] ?? '1d';
}
