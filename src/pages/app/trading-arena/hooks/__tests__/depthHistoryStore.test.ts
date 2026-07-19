// src/pages/app/trading-arena/hooks/__tests__/depthHistoryStore.test.ts
//
// Exercises the pure helpers depthHistoryStore.ts's IndexedDB plumbing is
// built on (cap logic, prune selection, gap-column construction) — no
// fake-indexeddb dependency exists in this repo yet, and the codebase's
// established convention for these hooks/stores (see
// useLiveDepthColumns.test.ts's header comment) is to test the pure,
// exported functions directly rather than spin up a fake IndexedDB or a
// React render harness. The IndexedDB-touching functions themselves
// (saveDepthHistory/loadDepthHistory/pruneDepthHistory) are thin,
// try/catch-wrapped wiring around these helpers — see
// flowStorePersistence.ts for the same pattern this module mirrors.

import { describe, expect, it } from 'vitest';
import {
  buildGapColumn,
  capColumnsForSave,
  mergeRestoredColumns,
  needsGapColumn,
  selectKeysToPrune,
} from '../depthHistoryStore';
import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';

function col(t: number, overrides: Partial<DecodedColumn> = {}): DecodedColumn {
  return { t, anchor: 100, binSize: 1, flags: 0, bids: [], asks: [], ...overrides };
}

describe('capColumnsForSave', () => {
  it('returns the array unchanged when at or under the cap', () => {
    const columns = [col(0), col(5_000)];
    expect(capColumnsForSave(columns, 5)).toBe(columns);
    expect(capColumnsForSave(columns, 2)).toBe(columns);
  });

  it('keeps only the newest N entries (tail) once over the cap', () => {
    const columns = [col(0), col(1_000), col(2_000), col(3_000)];
    const capped = capColumnsForSave(columns, 2);
    expect(capped.map((c) => c.t)).toEqual([2_000, 3_000]);
  });

  it('defaults the cap to 2880 (mirrors useLiveDepthColumns.ts RING_CAP)', () => {
    const columns = Array.from({ length: 3_000 }, (_, i) => col(i));
    const capped = capColumnsForSave(columns);
    expect(capped).toHaveLength(2_880);
    expect(capped[0].t).toBe(120); // oldest 120 entries trimmed
    expect(capped[capped.length - 1].t).toBe(2_999);
  });
});

describe('selectKeysToPrune', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('selects entries older than maxAgeMs for deletion', () => {
    const now = 10 * DAY;
    const records = [
      { key: 'a', savedAtMs: now - 60 * DAY }, // way stale
      { key: 'b', savedAtMs: now - 1 * DAY }, // fresh
    ];
    expect(selectKeysToPrune(records, now, 48 * 60 * 60 * 1000, 8)).toEqual(['a']);
  });

  it('LRU-trims survivors beyond maxKeys, oldest first, once age-pruning alone is insufficient', () => {
    const now = 0;
    const records = [
      { key: 'k1', savedAtMs: now - 5_000 },
      { key: 'k2', savedAtMs: now - 4_000 },
      { key: 'k3', savedAtMs: now - 3_000 },
      { key: 'k4', savedAtMs: now - 2_000 },
      { key: 'k5', savedAtMs: now - 1_000 },
    ];
    // Nothing is old enough to fail the age check, but maxKeys=3 forces
    // the 2 oldest (k1, k2) out.
    const deleted = selectKeysToPrune(records, now, 48 * 60 * 60 * 1000, 3);
    expect(deleted.sort()).toEqual(['k1', 'k2']);
  });

  it('returns an empty array when nothing needs pruning', () => {
    const now = 0;
    const records = [{ key: 'a', savedAtMs: now - 1_000 }];
    expect(selectKeysToPrune(records, now, 48 * 60 * 60 * 1000, 8)).toEqual([]);
  });

  it('does not double-count a key already marked for age-deletion in the LRU pass', () => {
    const now = 100 * DAY;
    const records = [
      { key: 'stale', savedAtMs: now - 60 * DAY }, // age-pruned
      { key: 'k1', savedAtMs: now - 5_000 },
      { key: 'k2', savedAtMs: now - 4_000 },
    ];
    const deleted = selectKeysToPrune(records, now, 48 * 60 * 60 * 1000, 1);
    // 'stale' is age-pruned; of the 2 survivors, maxKeys=1 evicts the older one (k1).
    expect(deleted.sort()).toEqual(['k1', 'stale']);
  });
});

describe('buildGapColumn', () => {
  it('carries anchor/binSize from afterColumn, sets flags bit0, and has empty sides', () => {
    const after = col(1_000, { anchor: 18_500.25, binSize: 5 });
    const gap = buildGapColumn(after, 6_000);
    expect(gap.t).toBe(6_000);
    expect(gap.anchor).toBe(18_500.25);
    expect(gap.binSize).toBe(5);
    expect(gap.flags & 1).toBe(1);
    expect(gap.bids).toEqual([]);
    expect(gap.asks).toEqual([]);
  });
});

describe('needsGapColumn', () => {
  const SAMPLE_INTERVAL_MS = 5_000;

  it('is false when the gap is within 2x the sample interval', () => {
    expect(needsGapColumn(0, 5_000, SAMPLE_INTERVAL_MS)).toBe(false);
    expect(needsGapColumn(0, 10_000, SAMPLE_INTERVAL_MS)).toBe(false); // exactly 2x — not strictly greater
  });

  it('is true once the gap exceeds 2x the sample interval', () => {
    expect(needsGapColumn(0, 10_001, SAMPLE_INTERVAL_MS)).toBe(true);
    expect(needsGapColumn(0, 60 * 60 * 1000, SAMPLE_INTERVAL_MS)).toBe(true); // a 1h bridge outage
  });
});

describe('mergeRestoredColumns', () => {
  it('returns authoritative columns unchanged when restored is empty', () => {
    const authoritative = [col(0), col(5_000)];
    expect(mergeRestoredColumns([], authoritative).map((c) => c.t)).toEqual([0, 5_000]);
  });

  it('returns restored columns unchanged (sorted) when authoritative is empty', () => {
    const restored = [col(5_000), col(0)];
    expect(mergeRestoredColumns(restored, []).map((c) => c.t)).toEqual([0, 5_000]);
  });

  it('fills gaps: keeps restored columns for timestamps authoritative does not cover', () => {
    const restored = [col(0), col(5_000), col(10_000)];
    const authoritative = [col(10_000, { anchor: 999 }), col(15_000)];
    const merged = mergeRestoredColumns(restored, authoritative);
    expect(merged.map((c) => c.t)).toEqual([0, 5_000, 10_000, 15_000]);
  });

  it('authoritative always wins on an exact-t collision, even with stale restored data', () => {
    const restored = [col(10_000, { anchor: 111, binSize: 1 })];
    const authoritative = [col(10_000, { anchor: 222, binSize: 2 })];
    const merged = mergeRestoredColumns(restored, authoritative);
    expect(merged).toHaveLength(1);
    expect(merged[0].anchor).toBe(222);
    expect(merged[0].binSize).toBe(2);
  });

  it('sorts the merged result ascending by t regardless of input order', () => {
    const restored = [col(20_000), col(0)];
    const authoritative = [col(10_000)];
    expect(mergeRestoredColumns(restored, authoritative).map((c) => c.t)).toEqual([0, 10_000, 20_000]);
  });
});
