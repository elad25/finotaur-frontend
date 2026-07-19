// src/lib/journal/assetMultipliers.test.ts
// Vitest suite for the canonical asset-multiplier resolver.
// Regression coverage for the micro-contract symbols (MCL/MGC/SIL) that
// tradeDebrief.ts's former duplicate map was missing — see tradeDebrief.ts
// Task D refactor (delegates to this module instead of a local copy).

import { describe, it, expect } from 'vitest';
import { resolveMultiplier, rootSymbol, ASSET_MULTIPLIERS } from './assetMultipliers';

describe('resolveMultiplier — micro contracts resolve via the canonical map', () => {
  it('MCL resolves to 100, not the 1 fallback', () => {
    expect(resolveMultiplier('MCL', undefined)).toBe(100);
  });

  it('MGC resolves to 10, not the 1 fallback', () => {
    expect(resolveMultiplier('MGC', undefined)).toBe(10);
  });

  it('SIL resolves to 1000, not the 1 fallback', () => {
    expect(resolveMultiplier('SIL', undefined)).toBe(1000);
  });

  it('MCL/MGC/SIL are present in ASSET_MULTIPLIERS (canonical source of truth)', () => {
    expect(ASSET_MULTIPLIERS.MCL).toBe(100);
    expect(ASSET_MULTIPLIERS.MGC).toBe(10);
    expect(ASSET_MULTIPLIERS.SIL).toBe(1000);
  });
});

describe('resolveMultiplier — precedence and fallback', () => {
  it('prefers an explicit positive trade multiplier over the symbol lookup', () => {
    expect(resolveMultiplier('MCL', 7)).toBe(7);
  });

  it('ignores a non-positive trade multiplier and falls back to the symbol lookup', () => {
    expect(resolveMultiplier('MCL', 0)).toBe(100);
    expect(resolveMultiplier('MCL', -5)).toBe(100);
  });

  it('strips a trailing numeric contract-year suffix before lookup', () => {
    expect(resolveMultiplier('MCL4', undefined)).toBe(100);
    expect(rootSymbol('MCL4')).toBe('MCL');
  });

  it('unknown symbol falls back to 1', () => {
    expect(resolveMultiplier('ZZZZ', undefined)).toBe(1);
  });
});
