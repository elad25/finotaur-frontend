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

  it('ignores stale floorMode/sizeFilterPct fields from a pre-Phase-1 record (no migration, no crash)', () => {
    const result = sanitizeLiquidityPreferences({ floorMode: 500_000, sizeFilterPct: 10, palette: 'thermal' });
    expect(result).not.toHaveProperty('floorMode');
    expect(result).not.toHaveProperty('sizeFilterPct');
    expect(result.palette).toBe('thermal');
  });

  it("accepts only the 3 valid sensitivity presets, falls back to 'balanced' otherwise", () => {
    for (const valid of ['quiet', 'balanced', 'detailed'] as const) {
      expect(sanitizeLiquidityPreferences({ sensitivity: valid }).sensitivity).toBe(valid);
    }
    expect(sanitizeLiquidityPreferences({ sensitivity: 'loud' }).sensitivity).toBe(DEFAULT_LIQUIDITY_PREFERENCES.sensitivity);
    expect(sanitizeLiquidityPreferences({ sensitivity: 1 }).sensitivity).toBe(DEFAULT_LIQUIDITY_PREFERENCES.sensitivity);
    expect(sanitizeLiquidityPreferences({}).sensitivity).toBe('balanced');
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
    expect(result.sensitivity).toBe(DEFAULT_LIQUIDITY_PREFERENCES.sensitivity);
  });
});

describe('readLiquidityPreferencesForSymbol — round-trip + corrupt JSON', () => {
  it('returns DEFAULT_LIQUIDITY_PREFERENCES when nothing is stored', () => {
    expect(readLiquidityPreferencesForSymbol('BTCUSDT')).toEqual(DEFAULT_LIQUIDITY_PREFERENCES);
  });

  it('round-trips a record written directly to localStorage', () => {
    localStorageMock.setItem(
      liquiditySymbolStorageKey('BTCUSDT'),
      JSON.stringify({ palette: 'thermal', sensitivity: 'detailed' }),
    );
    const result = readLiquidityPreferencesForSymbol('BTCUSDT');
    expect(result.palette).toBe('thermal');
    expect(result.sensitivity).toBe('detailed');
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
      JSON.stringify({ palette: 'classic', sensitivity: 'quiet' }),
    );

    const btc = readLiquidityPreferencesForSymbol('BTCUSDT');
    expect(btc.palette).toBe('classic');
    expect(btc.sensitivity).toBe('quiet');

    const eth = readLiquidityPreferencesForSymbol('ETHUSDT');
    expect(eth).toEqual(DEFAULT_LIQUIDITY_PREFERENCES);
  });
});
