// src/pages/app/trading-arena/utils/__tests__/intervals.test.ts
//
// Coverage for the arbitrary ArenaInterval model: parsing (intervalToSeconds),
// label formatting, and native-vs-aggregate resolution (resolveIntervalPlan).

import { describe, it, expect } from 'vitest';
import {
  intervalToSeconds,
  formatIntervalLabel,
  formatIntervalShort,
  buildCustomInterval,
  resolveIntervalPlan,
  getIntervalCapability,
} from '../intervals';

describe('intervalToSeconds', () => {
  it('parses seconds/minutes/hours/day/week/month units', () => {
    expect(intervalToSeconds('1s')).toBe(1);
    expect(intervalToSeconds('45s')).toBe(45);
    expect(intervalToSeconds('1m')).toBe(60);
    expect(intervalToSeconds('45m')).toBe(2700);
    expect(intervalToSeconds('3h')).toBe(10800);
    expect(intervalToSeconds('1D')).toBe(86400);
    expect(intervalToSeconds('1W')).toBe(7 * 86400);
    expect(intervalToSeconds('1M')).toBe(30 * 86400);
  });

  it('falls back to 60 seconds for malformed input instead of throwing', () => {
    expect(intervalToSeconds('garbage')).toBe(60);
    expect(intervalToSeconds('')).toBe(60);
    expect(intervalToSeconds('0m')).toBe(60);
    expect(intervalToSeconds('-5m')).toBe(60);
  });
});

describe('formatIntervalLabel / formatIntervalShort', () => {
  it('formats plural + singular unit labels', () => {
    expect(formatIntervalLabel('1m')).toBe('1 minute');
    expect(formatIntervalLabel('45m')).toBe('45 minutes');
    expect(formatIntervalLabel('1h')).toBe('1 hour');
    expect(formatIntervalLabel('1D')).toBe('1 day');
  });

  it('short form is the raw interval string', () => {
    expect(formatIntervalShort('5m')).toBe('5m');
    expect(formatIntervalShort('1D')).toBe('1D');
  });
});

describe('buildCustomInterval', () => {
  it('builds an ArenaInterval string from a value + unit', () => {
    expect(buildCustomInterval(10, 'seconds')).toBe('10s');
    expect(buildCustomInterval(45, 'minutes')).toBe('45m');
    expect(buildCustomInterval(3, 'hours')).toBe('3h');
    expect(buildCustomInterval(2, 'days')).toBe('2D');
  });

  it('clamps to a positive integer', () => {
    expect(buildCustomInterval(0, 'minutes')).toBe('1m');
    expect(buildCustomInterval(-5, 'minutes')).toBe('1m');
    expect(buildCustomInterval(5.9, 'minutes')).toBe('5m');
  });
});

describe('resolveIntervalPlan', () => {
  it('resolves a native Binance interval directly', () => {
    expect(resolveIntervalPlan('binance', '5m')).toEqual({ kind: 'native', interval: '5m' });
    expect(resolveIntervalPlan('binance', '1s')).toEqual({ kind: 'native', interval: '1s' });
    expect(resolveIntervalPlan('binance', '1D')).toEqual({ kind: 'native', interval: '1d' });
  });

  it('aggregates a non-native minute target from the 1m base', () => {
    const plan = resolveIntervalPlan('binance', '45m');
    expect(plan).toEqual({ kind: 'aggregate', baseInterval: '1m', targetSeconds: 2700 });
  });

  it('aggregates a non-native seconds target for crypto from the 1s base', () => {
    const plan = resolveIntervalPlan('binance', '45s');
    expect(plan).toEqual({ kind: 'aggregate', baseInterval: '1s', targetSeconds: 45 });
  });

  it('never picks a seconds base for a non-crypto source (yahoo/databento have none)', () => {
    const plan = resolveIntervalPlan('yahoo', '45s');
    expect(plan.kind).toBe('aggregate');
    if (plan.kind === 'aggregate') {
      expect(plan.baseInterval).toBe('1m');
    }
  });

  it('aggregates weeks/months from the 1d base', () => {
    const week = resolveIntervalPlan('binance', '2W');
    expect(week).toEqual({ kind: 'aggregate', baseInterval: '1d', targetSeconds: 14 * 86400 });
  });
});

describe('getIntervalCapability', () => {
  it('enables seconds for crypto only', () => {
    expect(getIntervalCapability('crypto').secondsEnabled).toBe(true);
    expect(getIntervalCapability('stocks').secondsEnabled).toBe(false);
    expect(getIntervalCapability('futures').secondsEnabled).toBe(false);
  });
});
