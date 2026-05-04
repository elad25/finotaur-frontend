import { describe, it, expect } from 'vitest';
import { computeRiskReward, inferSide, rrTone } from '../tradeMath';

const close = (actual: number, expected: number, tol = 0.001) =>
  Math.abs(actual - expected) <= tol;

describe('computeRiskReward — B1 multiplier fix', () => {
  it('stock (mult=1): risk = (entry-stop) * qty', () => {
    const r = computeRiskReward({ side: 'LONG', entry: 100, stop: 98, tp: 110, qty: 10, multiplier: 1 });
    expect(r.risk).toBe(20);
    expect(r.reward).toBe(100);
  });

  it('ES futures (mult=50): risk scales by multiplier', () => {
    const r = computeRiskReward({ side: 'LONG', entry: 5000, stop: 4995, tp: 5010, qty: 2, multiplier: 50 });
    expect(r.risk).toBe(500);
    expect(r.reward).toBe(1000);
  });

  it('CL futures (mult=1000): risk = $500 for 0.5pt stop on 1 contract', () => {
    const r = computeRiskReward({ side: 'LONG', entry: 80, stop: 79.5, tp: 81, qty: 1, multiplier: 1000 });
    expect(r.risk).toBe(500);
    expect(r.reward).toBe(1000);
  });

  it('EUR.USD forex (mult=100000): 10 pip stop on 0.1 lot = $10', () => {
    const r = computeRiskReward({ side: 'LONG', entry: 1.085, stop: 1.084, tp: 1.087, qty: 0.1, multiplier: 100000 });
    expect(close(r.risk, 10)).toBe(true);
    expect(close(r.reward, 20)).toBe(true);
  });

  it('default multiplier of 1 when omitted', () => {
    const r = computeRiskReward({ side: 'LONG', entry: 100, stop: 98, tp: 110, qty: 10 });
    expect(r.risk).toBe(20);
  });

  it('SHORT side scales with multiplier', () => {
    const r = computeRiskReward({ side: 'SHORT', entry: 5000, stop: 5005, tp: 4990, qty: 1, multiplier: 50 });
    expect(r.risk).toBe(250);
    expect(r.reward).toBe(500);
  });

  it('resultR is multiplier-invariant (R units cancel mult)', () => {
    const r1 = computeRiskReward({ side: 'LONG', entry: 100, stop: 95, tp: 110, qty: 1, multiplier: 1 });
    const r2 = computeRiskReward({ side: 'LONG', entry: 100, stop: 95, tp: 110, qty: 1, multiplier: 50 });
    expect(r1.resultR).toBe(2);
    expect(r2.resultR).toBe(2);
  });

  it('rr ratio computes correctly (2:1 = 2)', () => {
    const r = computeRiskReward({ side: 'LONG', entry: 100, stop: 98, tp: 104, qty: 1, multiplier: 1 });
    expect(r.rr).toBe(2);
  });

  it('zero qty yields zero risk and zero reward', () => {
    const r = computeRiskReward({ side: 'LONG', entry: 100, stop: 98, tp: 110, qty: 0, multiplier: 1 });
    expect(r.risk).toBe(0);
    expect(r.reward).toBe(0);
    expect(r.rr).toBe(0);
  });

  it('inverted stop (LONG with stop above entry) returns 0 risk via Math.max', () => {
    const r = computeRiskReward({ side: 'LONG', entry: 100, stop: 110, tp: 120, qty: 1, multiplier: 1 });
    expect(r.risk).toBe(0);
  });
});

describe('inferSide', () => {
  it('returns LONG when exit > entry', () => {
    expect(inferSide(100, 110)).toBe('LONG');
  });
  it('returns SHORT when exit < entry', () => {
    expect(inferSide(100, 90)).toBe('SHORT');
  });
  it('returns undefined for non-numeric inputs', () => {
    expect(inferSide(undefined, 100)).toBeUndefined();
    expect(inferSide(NaN, 100)).toBeUndefined();
  });
});

describe('rrTone', () => {
  it('rr >= 2 → emerald', () => {
    expect(rrTone(2)).toBe('text-emerald-400');
    expect(rrTone(3.5)).toBe('text-emerald-400');
  });
  it('1 <= rr < 2 → yellow', () => {
    expect(rrTone(1)).toBe('text-yellow-300');
    expect(rrTone(1.99)).toBe('text-yellow-300');
  });
  it('rr < 1 → red', () => {
    expect(rrTone(0.5)).toBe('text-red-400');
    expect(rrTone(0)).toBe('text-red-400');
  });
});
