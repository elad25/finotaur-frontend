/**
 * AggregatingSource — ChartDataSource decorator that bins a finer NATIVE
 * interval's bars into an arbitrary target bucket size client-side.
 *
 * Used by the Trading Arena's TimeframeMenu (arbitrary custom intervals like
 * '45m' / '3h' / '17m') where no upstream provider natively serves that
 * exact bucket. The base interval + target bucket size are fixed at
 * construction (see `resolveIntervalPlan` in
 * src/pages/app/trading-arena/utils/intervals.ts, which picks the finest
 * native interval that divides the target) — `getBars`'s own `interval`
 * parameter is intentionally IGNORED so this class satisfies the
 * `ChartDataSource` interface (which is typed against the fixed `Interval`
 * union) without needing to widen that union for every arbitrary target.
 *
 * Binning contract:
 *   - Bucket start = floor(barTime / targetSeconds) * targetSeconds.
 *   - open = first base bar's open in the bucket, close = last base bar's
 *     close, high/low = max/min across the bucket, volume = sum (only if
 *     every contributing bar reported volume — otherwise omitted).
 *   - Empty buckets are skipped — never synthesized. A sparse base feed
 *     (e.g. thin futures volume) simply yields fewer, unevenly-spaced target
 *     bars, which lightweight-charts handles fine (it doesn't require a
 *     bar every period).
 *
 * Base-fetch cap: the underlying source's own request limits (Binance/Yahoo
 * 1000-bar caps, etc.) are UNCHANGED by this class, but a very fine target
 * bucket over a wide window could still ask the base source for far more
 * bars than needed. To bound that, the `from` sent to the base source is
 * clamped so at most MAX_BASE_BARS base bars are ever requested — short
 * history for very fine custom timeframes over a wide window is an accepted
 * trade-off (per spec) rather than an error.
 */

import type { UTCTimestamp } from 'lightweight-charts';
import type { Bar, ChartDataSource, Interval } from '../types';

const MAX_BASE_BARS = 1500;

/** Seconds for the small set of fixed `Interval` values ever used as an AggregatingSource base. */
const BASE_INTERVAL_SECONDS: Partial<Record<Interval, number>> = {
  '1s': 1,
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '60m': 3600,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

/**
 * Bins ascending, deduplicated `Bar[]` into `targetSeconds`-wide buckets.
 * Pure function — exported separately so it's independently unit-testable
 * without needing a real ChartDataSource.
 */
export function aggregateBars(bars: Bar[], targetSeconds: number): Bar[] {
  if (!Number.isFinite(targetSeconds) || targetSeconds <= 0 || bars.length === 0) {
    return bars;
  }

  const out: Bar[] = [];
  let bucketStart: number | null = null;
  let open = 0;
  let high = -Infinity;
  let low = Infinity;
  let close = 0;
  let volume = 0;
  let hasVolume = false;

  const flush = () => {
    if (bucketStart === null) return;
    out.push({
      time: bucketStart as UTCTimestamp,
      open,
      high,
      low,
      close,
      volume: hasVolume ? volume : undefined,
    });
  };

  for (const bar of bars) {
    const t = Number(bar.time);
    if (!Number.isFinite(t)) continue;
    const bStart = Math.floor(t / targetSeconds) * targetSeconds;

    if (bucketStart === null || bStart !== bucketStart) {
      flush();
      bucketStart = bStart;
      open = bar.open;
      high = bar.high;
      low = bar.low;
      close = bar.close;
      volume = bar.volume ?? 0;
      hasVolume = bar.volume !== undefined;
      continue;
    }

    high = Math.max(high, bar.high);
    low = Math.min(low, bar.low);
    close = bar.close;
    if (bar.volume !== undefined) {
      volume += bar.volume;
      hasVolume = true;
    }
  }
  flush();

  return out;
}

export class AggregatingSource implements ChartDataSource {
  constructor(
    private readonly base: ChartDataSource,
    private readonly targetSeconds: number,
    private readonly baseInterval: Interval,
  ) {}

  async getBars(
    symbol: string,
    _interval: Interval,
    from: UTCTimestamp,
    to: UTCTimestamp,
  ): Promise<Bar[]> {
    const baseSeconds = BASE_INTERVAL_SECONDS[this.baseInterval] ?? 60;
    const requestedSpan = Number(to) - Number(from);
    const maxSpan = baseSeconds * MAX_BASE_BARS;
    const clampedFrom = requestedSpan > maxSpan ? ((Number(to) - maxSpan) as UTCTimestamp) : from;

    const baseBars = await this.base.getBars(symbol, this.baseInterval, clampedFrom, to);
    return aggregateBars(baseBars, this.targetSeconds);
  }
}
