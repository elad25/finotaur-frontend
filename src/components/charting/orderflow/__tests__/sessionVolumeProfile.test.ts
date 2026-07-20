// src/components/charting/orderflow/__tests__/sessionVolumeProfile.test.ts
//
// Coverage for the Session Volume Profile pure aggregation (S1 "Arena WOW
// week"): session partitioning (day/week/month/custom, including overnight
// custom windows and timezone handling), bar->bin volume distribution
// (uniform-across-range approximation), and the top-level computeSessionProfiles
// (POC/VAH/VAL + vPOC-violation scan).

import { describe, it, expect } from 'vitest';
import {
  parseHHMM,
  partitionBarsIntoSessions,
  deriveSessionRowSize,
  distributeBarVolumeToBins,
  computeSessionProfiles,
  startOfCivilDaySec,
} from '../sessionVolumeProfile';
import type { Bar } from '../../types';
import type { UTCTimestamp } from 'lightweight-charts';

function bar(timeSec: number, open: number, high: number, low: number, close: number, volume: number): Bar {
  return { time: timeSec as UTCTimestamp, open, high, low, close, volume };
}

const DAY_SEC = 86_400;
// 2026-01-05 00:00 UTC (a Monday) as an anchor for deterministic UTC-day tests.
const MONDAY_UTC = Date.UTC(2026, 0, 5) / 1000;

describe('parseHHMM', () => {
  it('parses valid HH:MM strings', () => {
    expect(parseHHMM('09:30')).toBe(9 * 60 + 30);
    expect(parseHHMM('0:00')).toBe(0);
    expect(parseHHMM('23:59')).toBe(23 * 60 + 59);
  });

  it('rejects malformed or out-of-range strings', () => {
    expect(parseHHMM('9:3')).toBeNull();
    expect(parseHHMM('24:00')).toBeNull();
    expect(parseHHMM('12:60')).toBeNull();
    expect(parseHHMM('garbage')).toBeNull();
  });
});

describe('partitionBarsIntoSessions — period=day (UTC)', () => {
  it('groups bars by UTC calendar day', () => {
    const bars: Bar[] = [
      bar(MONDAY_UTC + 0, 1, 1, 1, 1, 1),
      bar(MONDAY_UTC + 3600, 1, 1, 1, 1, 1),
      bar(MONDAY_UTC + DAY_SEC, 1, 1, 1, 1, 1), // next day
      bar(MONDAY_UTC + DAY_SEC + 3600, 1, 1, 1, 1, 1),
    ];
    const groups = partitionBarsIntoSessions(bars, 'day', 'utc', '09:30', '16:00');
    expect(groups).toHaveLength(2);
    expect(groups[0].bars).toHaveLength(2);
    expect(groups[1].bars).toHaveLength(2);
  });

  it('returns an empty array for an empty bars array', () => {
    expect(partitionBarsIntoSessions([], 'day', 'utc', '09:30', '16:00')).toEqual([]);
  });
});

describe('partitionBarsIntoSessions — period=week (UTC)', () => {
  it('groups bars into the same session across a UTC week (Monday-anchored)', () => {
    const bars: Bar[] = [
      bar(MONDAY_UTC, 1, 1, 1, 1, 1), // Monday
      bar(MONDAY_UTC + 3 * DAY_SEC, 1, 1, 1, 1, 1), // Thursday, same week
      bar(MONDAY_UTC + 7 * DAY_SEC, 1, 1, 1, 1, 1), // next Monday — new session
    ];
    const groups = partitionBarsIntoSessions(bars, 'week', 'utc', '09:30', '16:00');
    expect(groups).toHaveLength(2);
    expect(groups[0].bars).toHaveLength(2);
    expect(groups[1].bars).toHaveLength(1);
  });
});

describe('partitionBarsIntoSessions — period=month (UTC)', () => {
  it('groups bars into the same session across a UTC month', () => {
    const jan15 = Date.UTC(2026, 0, 15) / 1000;
    const feb1 = Date.UTC(2026, 1, 1) / 1000;
    const bars: Bar[] = [
      bar(jan15, 1, 1, 1, 1, 1),
      bar(jan15 + DAY_SEC, 1, 1, 1, 1, 1),
      bar(feb1, 1, 1, 1, 1, 1),
    ];
    const groups = partitionBarsIntoSessions(bars, 'month', 'utc', '09:30', '16:00');
    expect(groups).toHaveLength(2);
    expect(groups[0].bars).toHaveLength(2);
    expect(groups[1].bars).toHaveLength(1);
  });
});

describe('partitionBarsIntoSessions — period=custom', () => {
  it('excludes bars outside a same-day window and groups the rest', () => {
    const dayStart = MONDAY_UTC;
    const bars: Bar[] = [
      bar(dayStart + 8 * 3600, 1, 1, 1, 1, 1), // 08:00 — before 09:30, excluded
      bar(dayStart + 10 * 3600, 1, 1, 1, 1, 1), // 10:00 — inside window
      bar(dayStart + 12 * 3600, 1, 1, 1, 1, 1), // 12:00 — inside window
      bar(dayStart + 18 * 3600, 1, 1, 1, 1, 1), // 18:00 — after 16:00, excluded
    ];
    const groups = partitionBarsIntoSessions(bars, 'custom', 'utc', '09:30', '16:00');
    expect(groups).toHaveLength(1);
    expect(groups[0].bars).toHaveLength(2);
  });

  it('handles an overnight window (start >= end), grouping the wrap correctly', () => {
    const dayStart = MONDAY_UTC;
    const bars: Bar[] = [
      bar(dayStart + 19 * 3600, 1, 1, 1, 1, 1), // 19:00 day 1 — belongs to session starting day 1
      bar(dayStart + 23 * 3600, 1, 1, 1, 1, 1), // 23:00 day 1 — same session
      bar(dayStart + DAY_SEC + 2 * 3600, 1, 1, 1, 1, 1), // 02:00 day 2 — still same overnight session
      bar(dayStart + DAY_SEC + 12 * 3600, 1, 1, 1, 1, 1), // 12:00 day 2 — outside window (12:00 not in [18:00,06:00))
    ];
    const groups = partitionBarsIntoSessions(bars, 'custom', 'utc', '18:00', '06:00');
    expect(groups).toHaveLength(1);
    expect(groups[0].bars).toHaveLength(3);
  });

  it('produces no groups when the custom window strings are malformed', () => {
    const bars: Bar[] = [bar(MONDAY_UTC + 10 * 3600, 1, 1, 1, 1, 1)];
    const groups = partitionBarsIntoSessions(bars, 'custom', 'utc', 'garbage', '16:00');
    expect(groups).toEqual([]);
  });
});

describe('deriveSessionRowSize', () => {
  it('snaps to a nice 1/2/5 step targeting ~targetRowCount rows', () => {
    const size = deriveSessionRowSize(150, 50, 50); // range=100, raw=2 -> nice step 2
    expect(size).toBe(2);
  });

  it('returns 0 for a degenerate (zero or negative) range', () => {
    expect(deriveSessionRowSize(100, 100, 50)).toBe(0);
    expect(deriveSessionRowSize(50, 100, 50)).toBe(0);
  });
});

describe('distributeBarVolumeToBins', () => {
  it('splits volume evenly across every overlapping bin', () => {
    const acc = new Map<number, number>();
    // low=100, high=104, rowSize=2 -> bins at 100, 102, 104 (3 bins)
    distributeBarVolumeToBins(bar(0, 101, 104, 100, 102, 30), 2, acc);
    expect(acc.size).toBe(3);
    for (const vol of acc.values()) expect(vol).toBeCloseTo(10, 5);
  });

  it('is a no-op for zero/undefined volume or non-positive rowSize', () => {
    const acc = new Map<number, number>();
    distributeBarVolumeToBins(bar(0, 1, 2, 1, 1, 0), 1, acc);
    distributeBarVolumeToBins({ time: 0 as UTCTimestamp, open: 1, high: 2, low: 1, close: 1 }, 1, acc);
    distributeBarVolumeToBins(bar(0, 1, 2, 1, 1, 10), 0, acc);
    expect(acc.size).toBe(0);
  });
});

describe('computeSessionProfiles', () => {
  it('computes POC/VAH/VAL and totals per session', () => {
    const dayStart = MONDAY_UTC;
    const bars: Bar[] = [
      bar(dayStart, 100, 110, 100, 105, 100),
      bar(dayStart + 3600, 105, 108, 102, 104, 50),
    ];
    const profiles = computeSessionProfiles(bars, 'day', 'utc', '09:30', '16:00');
    expect(profiles).toHaveLength(1);
    const p = profiles[0];
    expect(p.sessionStartSec).toBe(dayStart);
    expect(p.rows.length).toBeGreaterThan(0);
    expect(p.poc).not.toBeNull();
    expect(p.totalVol).toBeCloseTo(150, 5);
  });

  it('detects a vPOC violation in a later bar after the session ends', () => {
    const dayStart = MONDAY_UTC;
    // Session 1: tight range around 100, all volume concentrated there -> POC ~100.
    const bars: Bar[] = [
      bar(dayStart, 99, 101, 99, 100, 1000),
      // Session 2 (next day): price trades back through the ~100 level.
      bar(dayStart + DAY_SEC, 150, 160, 150, 155, 10),
      bar(dayStart + DAY_SEC + 3600, 100, 102, 98, 101, 10), // violates session 1's POC
    ];
    const profiles = computeSessionProfiles(bars, 'day', 'utc', '09:30', '16:00');
    expect(profiles).toHaveLength(2);
    const session1 = profiles[0];
    expect(session1.pocViolationSec).toBe(dayStart + DAY_SEC + 3600);
  });

  it('leaves pocViolationSec null when price never returns to the POC level', () => {
    const dayStart = MONDAY_UTC;
    const bars: Bar[] = [
      bar(dayStart, 99, 101, 99, 100, 1000),
      bar(dayStart + DAY_SEC, 200, 210, 200, 205, 10),
    ];
    const profiles = computeSessionProfiles(bars, 'day', 'utc', '09:30', '16:00');
    expect(profiles[0].pocViolationSec).toBeNull();
  });

  it('returns an empty array for an empty bars array', () => {
    expect(computeSessionProfiles([], 'day', 'utc', '09:30', '16:00')).toEqual([]);
  });
});

describe('startOfCivilDaySec', () => {
  it('returns UTC midnight for the "utc" zone', () => {
    const t = MONDAY_UTC + 15 * 3600 + 42 * 60; // Monday 15:42 UTC
    expect(startOfCivilDaySec(t, 'utc')).toBe(MONDAY_UTC);
  });

  it('is idempotent at exactly midnight UTC', () => {
    expect(startOfCivilDaySec(MONDAY_UTC, 'utc')).toBe(MONDAY_UTC);
  });

  it('resolves a fixed IANA zone offset (America/New_York, EST/UTC-5 in January)', () => {
    // Jan 5 2026 03:00 UTC = Jan 4 2026 22:00 EST -> civil day is Jan 4,
    // whose midnight (00:00 EST) is Jan 4 05:00 UTC.
    const t = MONDAY_UTC + 3 * 3600;
    const expected = Date.UTC(2026, 0, 4, 5, 0, 0) / 1000;
    expect(startOfCivilDaySec(t, 'America/New_York')).toBe(expected);
  });

  it('handles a timestamp already within the New York trading day (no earlier UTC-day rollback)', () => {
    // Jan 5 2026 16:00 UTC = Jan 5 2026 11:00 EST -> civil day is Jan 5,
    // whose midnight (00:00 EST) is Jan 5 05:00 UTC.
    const t = MONDAY_UTC + 16 * 3600;
    const expected = Date.UTC(2026, 0, 5, 5, 0, 0) / 1000;
    expect(startOfCivilDaySec(t, 'America/New_York')).toBe(expected);
  });
});
