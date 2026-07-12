// src/pages/app/trading-arena/hooks/__tests__/useLiquidityPreferences.test.ts
//
// Exercises the pure read/sanitize functions the hook is built on (no React
// render harness in this codebase — see useFootprintPreferences.test.ts's
// header comment for the same convention): round-trip persistence, corrupt-
// JSON safety, per-field validation, and per-symbol key isolation.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_LIQUIDITY_PREFERENCES,
  liquiditySymbolStorageKey,
  readLiquidityPreferencesForSymbol,
  sanitizeLiquidityPreferences,
} from '../useLiquidityPreferences';

function makeMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

let localStorageMock: Storage;

beforeEach(() => {
  localStorageMock = makeMemoryLocalStorage();
  vi.stubGlobal('window', { localStorage: localStorageMock });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sanitizeLiquidityPreferences', () => {
  it('falls back to defaults for non-object / null input', () => {
    expect(sanitizeLiquidityPreferences(null)).toEqual(DEFAULT_LIQUIDITY_PREFERENCES);
    expect(sanitizeLiquidityPreferences('garbage')).toEqual(DEFAULT_LIQUIDITY_PREFERENCES);
    expect(sanitizeLiquidityPreferences(42)).toEqual(DEFAULT_LIQUIDITY_PREFERENCES);
  });

  it('accepts floorMode "auto" and any non-negative finite number', () => {
    expect(sanitizeLiquidityPreferences({ floorMode: 'auto' }).floorMode).toBe('auto');
    expect(sanitizeLiquidityPreferences({ floorMode: 500_000 }).floorMode).toBe(500_000);
    expect(sanitizeLiquidityPreferences({ floorMode: 0 }).floorMode).toBe(0);
  });

  it('rejects invalid floorMode values (negative, NaN, wrong type, unknown string) — falls back', () => {
    expect(sanitizeLiquidityPreferences({ floorMode: -5 }).floorMode).toBe(DEFAULT_LIQUIDITY_PREFERENCES.floorMode);
    expect(sanitizeLiquidityPreferences({ floorMode: NaN }).floorMode).toBe(DEFAULT_LIQUIDITY_PREFERENCES.floorMode);
    expect(sanitizeLiquidityPreferences({ floorMode: 'not-auto' }).floorMode).toBe(DEFAULT_LIQUIDITY_PREFERENCES.floorMode);
    expect(sanitizeLiquidityPreferences({ floorMode: true }).floorMode).toBe(DEFAULT_LIQUIDITY_PREFERENCES.floorMode);
  });

  it('accepts only the 5 valid sizeFilterPct values, falls back otherwise', () => {
    for (const valid of [0, 1, 5, 10, 25]) {
      expect(sanitizeLiquidityPreferences({ sizeFilterPct: valid }).sizeFilterPct).toBe(valid);
    }
    expect(sanitizeLiquidityPreferences({ sizeFilterPct: 7 }).sizeFilterPct).toBe(DEFAULT_LIQUIDITY_PREFERENCES.sizeFilterPct);
    expect(sanitizeLiquidityPreferences({ sizeFilterPct: '5' }).sizeFilterPct).toBe(DEFAULT_LIQUIDITY_PREFERENCES.sizeFilterPct);
    expect(sanitizeLiquidityPreferences({ sizeFilterPct: -1 }).sizeFilterPct).toBe(DEFAULT_LIQUIDITY_PREFERENCES.sizeFilterPct);
  });

  it('field-by-field: one valid + one invalid field in the same object degrade independently', () => {
    const result = sanitizeLiquidityPreferences({ floorMode: 1_000_000, sizeFilterPct: 999 });
    expect(result.floorMode).toBe(1_000_000);
    expect(result.sizeFilterPct).toBe(DEFAULT_LIQUIDITY_PREFERENCES.sizeFilterPct);
  });

  it("accepts a valid palette id, falls back to default ('finotaur') otherwise", () => {
    expect(sanitizeLiquidityPreferences({ palette: 'classic' }).palette).toBe('classic');
    expect(sanitizeLiquidityPreferences({ palette: 'thermal' }).palette).toBe('thermal');
    expect(sanitizeLiquidityPreferences({ palette: 'not-a-palette' }).palette).toBe('finotaur');
    expect(sanitizeLiquidityPreferences({}).palette).toBe('finotaur');
  });

  it('accepts boolean smoothing/bubbles/sideProfile, falls back to defaults otherwise', () => {
    expect(sanitizeLiquidityPreferences({ smoothing: false }).smoothing).toBe(false);
    expect(sanitizeLiquidityPreferences({ smoothing: 'nope' }).smoothing).toBe(true);
    expect(sanitizeLiquidityPreferences({ bubbles: false }).bubbles).toBe(false);
    expect(sanitizeLiquidityPreferences({ bubbles: 1 }).bubbles).toBe(true);
    expect(sanitizeLiquidityPreferences({ sideProfile: false }).sideProfile).toBe(false);
    expect(sanitizeLiquidityPreferences({ sideProfile: null }).sideProfile).toBe(true);
  });

  it("accepts bubbleThreshold 'auto' or a non-negative finite number, falls back otherwise", () => {
    expect(sanitizeLiquidityPreferences({ bubbleThreshold: 'auto' }).bubbleThreshold).toBe('auto');
    expect(sanitizeLiquidityPreferences({ bubbleThreshold: 250 }).bubbleThreshold).toBe(250);
    expect(sanitizeLiquidityPreferences({ bubbleThreshold: -1 }).bubbleThreshold).toBe('auto');
    expect(sanitizeLiquidityPreferences({ bubbleThreshold: NaN }).bubbleThreshold).toBe('auto');
    expect(sanitizeLiquidityPreferences({ bubbleThreshold: 'nope' }).bubbleThreshold).toBe('auto');
  });

  it('defaults match DEFAULT_LIQUIDITY_PREFERENCES for every new field when absent', () => {
    const result = sanitizeLiquidityPreferences({});
    expect(result.palette).toBe(DEFAULT_LIQUIDITY_PREFERENCES.palette);
    expect(result.smoothing).toBe(DEFAULT_LIQUIDITY_PREFERENCES.smoothing);
    expect(result.bubbles).toBe(DEFAULT_LIQUIDITY_PREFERENCES.bubbles);
    expect(result.bubbleThreshold).toBe(DEFAULT_LIQUIDITY_PREFERENCES.bubbleThreshold);
    expect(result.sideProfile).toBe(DEFAULT_LIQUIDITY_PREFERENCES.sideProfile);
  });
});

describe('readLiquidityPreferencesForSymbol — round-trip + corrupt JSON', () => {
  it('returns DEFAULT_LIQUIDITY_PREFERENCES when nothing is stored', () => {
    expect(readLiquidityPreferencesForSymbol('BTCUSDT')).toEqual(DEFAULT_LIQUIDITY_PREFERENCES);
  });

  it('round-trips a record written directly to localStorage', () => {
    localStorageMock.setItem(
      liquiditySymbolStorageKey('BTCUSDT'),
      JSON.stringify({ floorMode: 250_000, sizeFilterPct: 10 }),
    );
    const result = readLiquidityPreferencesForSymbol('BTCUSDT');
    expect(result.floorMode).toBe(250_000);
    expect(result.sizeFilterPct).toBe(10);
  });

  it('corrupt JSON degrades to defaults, never throws', () => {
    localStorageMock.setItem(liquiditySymbolStorageKey('BTCUSDT'), '{not valid json');
    expect(() => readLiquidityPreferencesForSymbol('BTCUSDT')).not.toThrow();
    expect(readLiquidityPreferencesForSymbol('BTCUSDT')).toEqual(DEFAULT_LIQUIDITY_PREFERENCES);
  });
});

describe('readLiquidityPreferencesForSymbol — per-symbol isolation', () => {
  it('a preference written for one symbol does not leak to another symbol', () => {
    localStorageMock.setItem(
      liquiditySymbolStorageKey('BTCUSDT'),
      JSON.stringify({ floorMode: 5_000_000, sizeFilterPct: 25 }),
    );

    const btc = readLiquidityPreferencesForSymbol('BTCUSDT');
    expect(btc.floorMode).toBe(5_000_000);
    expect(btc.sizeFilterPct).toBe(25);

    const eth = readLiquidityPreferencesForSymbol('ETHUSDT');
    expect(eth).toEqual(DEFAULT_LIQUIDITY_PREFERENCES);
  });
});
