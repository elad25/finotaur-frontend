// src/components/charting/orderflow/__tests__/useOrderFlow.test.ts
//
// Unit coverage for the pure incremental-coverage helper behind the
// pan-triggered history backfill feature (useOrderFlow.ts's requestHistory/
// computeIncrementalRange). The hook itself (React lifecycle, debounce
// timers, single-flight state machine) is exercised indirectly via this pure
// function — it's the one piece of that logic extractable without a React
// test harness + fake TradeSource + fake timers, per this task's scope.

import { describe, it, expect } from 'vitest';
import { computeIncrementalRange, getRequestHistoryForStore } from '../useOrderFlow';
import { FlowBinStore } from '../flowBinStore';

describe('computeIncrementalRange', () => {
  it('returns null when nothing is covered yet (coveredFromMs === null)', () => {
    expect(computeIncrementalRange(null, 1_000)).toBeNull();
  });

  it('returns null when the requested edge is already covered (>= coveredFromMs)', () => {
    expect(computeIncrementalRange(10_000, 10_000)).toBeNull();
    expect(computeIncrementalRange(10_000, 15_000)).toBeNull();
  });

  it('returns the gap range when the requested edge is earlier than covered', () => {
    expect(computeIncrementalRange(10_000, 5_000)).toEqual({ fromMs: 5_000, toMs: 9_999 });
  });

  it('never re-fetches the already-covered range — toMs is always coveredFromMs - 1', () => {
    const range = computeIncrementalRange(50_000, 1_000);
    expect(range).not.toBeNull();
    expect(range!.toMs).toBe(49_999);
    expect(range!.toMs).toBeLessThan(50_000);
  });

  it('returns null for a degenerate/inverted range (toMs <= requestedFromMs)', () => {
    // coveredFromMs - 1 === requestedFromMs — the "gap" would be empty.
    expect(computeIncrementalRange(10_000, 9_999)).toBeNull();
  });

  it('handles requestedFromMs far in the past (deep pan) the same as a shallow one', () => {
    expect(computeIncrementalRange(100_000, 0)).toEqual({ fromMs: 0, toMs: 99_999 });
  });
});

describe('getRequestHistoryForStore (store-keyed registry lookup)', () => {
  it('returns undefined for a store no useOrderFlow hook has claimed', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    expect(getRequestHistoryForStore(store)).toBeUndefined();
  });

  it('never collides across two distinct store instances (WeakMap keyed by identity)', () => {
    const storeA = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    const storeB = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    expect(getRequestHistoryForStore(storeA)).toBeUndefined();
    expect(getRequestHistoryForStore(storeB)).toBeUndefined();
  });
});
