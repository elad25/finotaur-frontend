// src/components/charting/dataSources/__tests__/AggregatingSource.test.ts
//
// Coverage for AggregatingSource's binning: happy path (N base bars fold
// into 1 target bucket, OHLCV correctness), bucket alignment to epoch
// multiples of targetSeconds, and empty-bucket skipping (sparse base feed
// never synthesizes a bar).

import { describe, it, expect } from 'vitest';
import type { UTCTimestamp } from 'lightweight-charts';
import { aggregateBars, AggregatingSource } from '../AggregatingSource';
import type { Bar, ChartDataSource, Interval } from '../../types';

function bar(time: number, open: number, high: number, low: number, close: number, volume?: number): Bar {
  return { time: time as UTCTimestamp, open, high, low, close, volume };
}

describe('aggregateBars — happy path', () => {
  it('folds N 1-minute bars into a single 5-minute bucket', () => {
    // 5 consecutive 1m bars starting at an exact 5m boundary (t=0).
    const bars: Bar[] = [
      bar(0,   100, 105, 95,  102, 10),
      bar(60,  102, 108, 100, 106, 20),
      bar(120, 106, 110, 104, 103, 15),
      bar(180, 103, 107, 101, 109, 5),
      bar(240, 109, 111, 108, 110, 8),
    ];

    const out = aggregateBars(bars, 300);

    expect(out.length).toBe(1);
    expect(out[0]).toEqual({
      time: 0,
      open: 100,   // first bar's open
      high: 111,   // max across all 5
      low: 95,     // min across all 5
      close: 110,  // last bar's close
      volume: 58,  // sum
    });
  });

  it('produces one bucket per distinct target-aligned time window', () => {
    const bars: Bar[] = [
      bar(0,  1, 2, 0, 1.5),
      bar(60, 1.5, 2.5, 1, 2),
      // gap into the next 5m bucket
      bar(300, 2, 3, 1.8, 2.8),
      bar(360, 2.8, 3.2, 2.5, 3),
    ];

    const out = aggregateBars(bars, 300);

    expect(out.length).toBe(2);
    expect(out[0].time).toBe(0);
    expect(out[0].high).toBe(2.5);
    expect(out[0].low).toBe(0);
    expect(out[1].time).toBe(300);
    expect(out[1].close).toBe(3);
  });
});

describe('aggregateBars — bucket alignment', () => {
  it('aligns bucket start to floor(time / targetSeconds) * targetSeconds, not the first bar time', () => {
    // First bar lands mid-bucket (t=120 inside the [0,300) 5m bucket) —
    // bucket start must snap DOWN to 0, not to 120.
    const bars: Bar[] = [
      bar(120, 10, 12, 9, 11),
      bar(180, 11, 13, 10, 12),
    ];

    const out = aggregateBars(bars, 300);

    expect(out.length).toBe(1);
    expect(out[0].time).toBe(0);
  });

  it('splits bars that straddle a bucket boundary into separate buckets', () => {
    const bars: Bar[] = [
      bar(299, 1, 1, 1, 1), // last second of bucket [0,300)
      bar(300, 2, 2, 2, 2), // first second of bucket [300,600)
    ];

    const out = aggregateBars(bars, 300);

    expect(out.length).toBe(2);
    expect(out[0].time).toBe(0);
    expect(out[1].time).toBe(300);
  });
});

describe('aggregateBars — empty-bucket skipping', () => {
  it('never synthesizes a bar for a bucket with no base data (sparse feed)', () => {
    const bars: Bar[] = [
      bar(0,    1, 1, 1, 1),
      // buckets [300,600) and [600,900) have no data at all
      bar(900,  2, 2, 2, 2),
    ];

    const out = aggregateBars(bars, 300);

    // Only 2 buckets emitted — none for the empty middle window.
    expect(out.length).toBe(2);
    expect(out.map((b) => b.time)).toEqual([0, 900]);
  });

  it('returns the input unchanged for an empty bars array', () => {
    expect(aggregateBars([], 300)).toEqual([]);
  });

  it('omits volume when no contributing bar reported it', () => {
    const bars: Bar[] = [bar(0, 1, 2, 0, 1.5, undefined)];
    const out = aggregateBars(bars, 300);
    expect(out[0].volume).toBeUndefined();
  });
});

describe('AggregatingSource', () => {
  it('fetches the base interval and bins to the target, ignoring the interval param passed to getBars', () => {
    const calls: { symbol: string; interval: Interval; from: number; to: number }[] = [];
    const stubBase: ChartDataSource = {
      async getBars(symbol, interval, from, to) {
        calls.push({ symbol, interval, from: Number(from), to: Number(to) });
        return [
          bar(0,   1, 2, 0, 1.5, 1),
          bar(60,  1.5, 2.5, 1, 2, 1),
          bar(120, 2, 3, 1.5, 2.5, 1),
        ];
      },
    };

    const src = new AggregatingSource(stubBase, 180, '1m');

    return src.getBars('BTCUSDT', '1d' as Interval, 0 as UTCTimestamp, 300 as UTCTimestamp).then((out) => {
      expect(calls[0].interval).toBe('1m'); // base source always sees the fixed base interval
      expect(out.length).toBe(1);
      expect(out[0]).toEqual({ time: 0, open: 1, high: 3, low: 0, close: 2.5, volume: 3 });
    });
  });

  it('clamps the base fetch window so it never asks for more than ~1500 base bars', () => {
    let seenFrom = -1;
    const stubBase: ChartDataSource = {
      async getBars(_symbol, _interval, from) {
        seenFrom = Number(from);
        return [];
      },
    };

    const targetSeconds = 60; // base = '1m' (60s) — 1500 bars = 90,000s span
    const src = new AggregatingSource(stubBase, targetSeconds, '1m');
    const to = 1_000_000;
    const from = 0; // requested span is far wider than 1500 base bars

    return src.getBars('BTCUSDT', '1d' as Interval, from as UTCTimestamp, to as UTCTimestamp).then(() => {
      expect(seenFrom).toBeGreaterThan(from);
      expect(to - seenFrom).toBeLessThanOrEqual(60 * 1500);
    });
  });
});
