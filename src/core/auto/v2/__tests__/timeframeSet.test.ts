// ============================================================================
// TIMEFRAME SET — alignment golden table + closed-bar boundary tests
// ============================================================================
// Hand-built 5m execution series + 4h context series (48 x 5m == 1 x 4h) —
// asserts the EXACT first execution index where each 4h bar becomes visible,
// including the ±1 bar boundary cases, per `TimeframeSet.ts`'s closed-bar
// rule: `ctxOpenMs + ctxDurationMs <= execOpenMs`.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../../components/ReplayChart/types';
import { TimeframeSet } from '../TimeframeSet';

const FIVE_MIN = 300; // seconds
const FOUR_HOUR = 14_400; // seconds

/** 5m execution candle at index `i` (open = i * 5min, from `baseSec`). */
function exec(i: number, baseSec = 0): Candle {
  return { time: baseSec + i * FIVE_MIN, open: 1, high: 1, low: 1, close: 1, volume: 1 };
}

/** 4h context candle at bucket index `k` (open = k * 4h, from `baseSec`). */
function ctx4h(k: number, baseSec = 0): Candle {
  return { time: baseSec + k * FOUR_HOUR, open: 1, high: 1, low: 1, close: 1, volume: 1 };
}

describe('TimeframeSet — alignment golden table (5m exec, 4h context)', () => {
  // 100 execution bars: opens 0, 300, 600, ..., 29700 (covers just under 8.25h).
  const execCandles: Candle[] = Array.from({ length: 100 }, (_, i) => exec(i));
  // 3 context bars: opens 0 (closes 14400), 14400 (closes 28800), 28800
  // (closes 43200 — never closes within this exec window, on purpose, to
  // prove the "not yet closed" upper boundary too).
  const ctxCandles: Candle[] = [ctx4h(0), ctx4h(1), ctx4h(2)];

  const set = new TimeframeSet({ '5m': execCandles, '4h': ctxCandles }, '5m');

  it('execution timeframe is the identity mapping', () => {
    expect(set.alignedIndex('5m', 0)).toBe(0);
    expect(set.alignedIndex('5m', 47)).toBe(47);
    expect(set.alignedIndex('5m', 99)).toBe(99);
  });

  // Golden table: exec bar index -> expected 4h alignedIndex.
  // ctx bar0 [00:00,04:00) closes at open=14400 -> exec bar 48 (48*300=14400).
  // ctx bar1 [04:00,08:00) closes at open=28800 -> exec bar 96 (96*300=28800).
  // ctx bar2 [08:00,12:00) closes at open=43200 -> never reached (max exec
  // open here is 29700).
  const golden: Array<[execIndex: number, expectedCtxIndex: number]> = [
    [0, -1], // start of backtest — no 4h bar has closed yet
    [47, -1], // ctx bar0 open+dur = 14400, exec47 open = 14100 < 14400 -> not yet
    [48, 0], // exec48 open = 14400 >= 14400 -> ctx bar0 JUST became visible
    [49, 0], // still ctx bar0 (sticky until the next boundary)
    [95, 0], // exec95 open = 28500 < 28800 -> ctx bar1 not yet closed
    [96, 1], // exec96 open = 28800 >= 28800 -> ctx bar1 JUST became visible
    [99, 1], // last exec bar — ctx bar2 never closes in this window
  ];

  it.each(golden)('alignedIndex(4h, execBar %i) === %i', (execIndex, expected) => {
    expect(set.alignedIndex('4h', execIndex)).toBe(expected);
  });

  it('series() returns the raw registered candle arrays', () => {
    expect(set.series('5m')).toBe(execCandles);
    expect(set.series('4h')).toBe(ctxCandles);
  });

  it('alignedIndex throws for an unregistered timeframe', () => {
    expect(() => set.alignedIndex('1h' as never, 10)).toThrow(/no series registered/i);
  });

  it('out-of-range execution index returns -1 rather than throwing', () => {
    expect(set.alignedIndex('4h', -1)).toBe(-1);
    expect(set.alignedIndex('4h', 1000)).toBe(-1);
  });
});

describe('TimeframeSet — construction guards', () => {
  it('throws when the execution timeframe series is missing/empty', () => {
    expect(() => new TimeframeSet({ '4h': [ctx4h(0)] }, '5m')).toThrow(/execution timeframe/i);
    expect(() => new TimeframeSet({ '5m': [], '4h': [ctx4h(0)] }, '5m')).toThrow(/execution timeframe/i);
  });

  it('silently skips an empty context series (no alignment array built)', () => {
    const set = new TimeframeSet({ '5m': [exec(0), exec(1)], '4h': [] }, '5m');
    expect(() => set.alignedIndex('4h', 0)).toThrow(/no series registered/i);
  });
});
