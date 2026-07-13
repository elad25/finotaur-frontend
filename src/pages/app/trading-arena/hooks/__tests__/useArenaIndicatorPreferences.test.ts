// src/pages/app/trading-arena/hooks/__tests__/useArenaIndicatorPreferences.test.ts
//
// Exercises the pure read/sanitize/migrate functions the hook is built on
// (no React render harness in this codebase — see useFootprintPreferences's
// sibling test for the same pattern): v1→v2 migration, sanitizer field-by-
// field validation, and round-trip persistence.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ARENA_INDICATORS_STORAGE_KEY_V1,
  ARENA_INDICATORS_STORAGE_KEY_V2,
  migrateV1ToV2,
  readArenaIndicatorPreferences,
} from '../useArenaIndicatorPreferences';
import {
  ARENA_INDICATOR_ENABLED_DEFAULTS,
  ARENA_INDICATOR_PARAM_DEFAULTS,
  DEFAULT_ARENA_INDICATOR_PREFERENCES,
  MAX_ACTIVE_INDICATORS,
  countActiveIndicators,
  sanitizeArenaIndicatorEnabled,
  sanitizeArenaIndicatorParams,
  sanitizeArenaIndicatorPreferences,
  buildIndicatorsFromArenaSettings,
} from '../../components/indicatorsSettings';

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

describe('sanitizeArenaIndicatorEnabled', () => {
  it('falls back to defaults for non-object / null input', () => {
    expect(sanitizeArenaIndicatorEnabled(null)).toEqual(ARENA_INDICATOR_ENABLED_DEFAULTS);
    expect(sanitizeArenaIndicatorEnabled('garbage')).toEqual(ARENA_INDICATOR_ENABLED_DEFAULTS);
    expect(sanitizeArenaIndicatorEnabled(42)).toEqual(ARENA_INDICATOR_ENABLED_DEFAULTS);
  });

  it('field-by-field validates: wrong types fall back per-field, valid booleans pass through', () => {
    const raw = { sma: true, ema: 'yes', rsi: false, volumeProfile: false };
    const result = sanitizeArenaIndicatorEnabled(raw, ARENA_INDICATOR_ENABLED_DEFAULTS);
    expect(result.sma).toBe(true);
    expect(result.ema).toBe(ARENA_INDICATOR_ENABLED_DEFAULTS.ema); // wrong type -> fallback
    expect(result.rsi).toBe(false);
    expect(result.volumeProfile).toBe(false);
    expect(result.vwap).toBe(ARENA_INDICATOR_ENABLED_DEFAULTS.vwap); // missing -> fallback
  });
});

describe('sanitizeArenaIndicatorParams', () => {
  it('falls back to defaults for non-object / null input', () => {
    expect(sanitizeArenaIndicatorParams(null)).toEqual(ARENA_INDICATOR_PARAM_DEFAULTS);
    expect(sanitizeArenaIndicatorParams('garbage')).toEqual(ARENA_INDICATOR_PARAM_DEFAULTS);
  });

  it('clamps out-of-range numeric values to the field range', () => {
    const raw = {
      ema: { period: 5000 }, // > max(500) -> clamped
      sma: { period: 0 }, // < min(2) -> clamped
      atr: { period: 14 }, // in range -> passes through
    };
    const result = sanitizeArenaIndicatorParams(raw, ARENA_INDICATOR_PARAM_DEFAULTS);
    expect(result.ema.period).toBe(500);
    expect(result.sma.period).toBe(2);
    expect(result.atr.period).toBe(14);
  });

  it('rounds non-integer period values, but keeps bbands.stdDev as a float', () => {
    const raw = {
      rsi: { period: 14.6 },
      bbands: { period: 20, stdDev: 2.5 },
    };
    const result = sanitizeArenaIndicatorParams(raw, ARENA_INDICATOR_PARAM_DEFAULTS);
    expect(result.rsi.period).toBe(15);
    expect(result.bbands.stdDev).toBe(2.5);
  });

  it('wrong-type fields fall back per-field, valid fields pass through', () => {
    const raw = {
      macd: { fast: 'ten', slow: 30, signal: 9 },
    };
    const result = sanitizeArenaIndicatorParams(raw, ARENA_INDICATOR_PARAM_DEFAULTS);
    expect(result.macd.fast).toBe(ARENA_INDICATOR_PARAM_DEFAULTS.macd.fast); // wrong type -> fallback
    expect(result.macd.slow).toBe(30);
    expect(result.macd.signal).toBe(9);
  });

  it('missing entirely (empty object) merges cleanly to defaults', () => {
    expect(sanitizeArenaIndicatorParams({}, ARENA_INDICATOR_PARAM_DEFAULTS)).toEqual(ARENA_INDICATOR_PARAM_DEFAULTS);
  });
});

describe('sanitizeArenaIndicatorPreferences', () => {
  it('sanitizes both enabled and params, falling back per-field', () => {
    const raw = { enabled: { sma: true }, params: { ema: { period: 12 } } };
    const result = sanitizeArenaIndicatorPreferences(raw, DEFAULT_ARENA_INDICATOR_PREFERENCES);
    expect(result.enabled.sma).toBe(true);
    expect(result.enabled.volumeProfile).toBe(DEFAULT_ARENA_INDICATOR_PREFERENCES.enabled.volumeProfile);
    expect(result.params.ema.period).toBe(12);
    expect(result.params.sma.period).toBe(DEFAULT_ARENA_INDICATOR_PREFERENCES.params.sma.period);
  });
});

describe('countActiveIndicators + MAX_ACTIVE_INDICATORS', () => {
  it('counts every true boolean, including volumeProfile', () => {
    expect(countActiveIndicators(ARENA_INDICATOR_ENABLED_DEFAULTS)).toBe(1); // only volumeProfile defaults true
    expect(
      countActiveIndicators({ ...ARENA_INDICATOR_ENABLED_DEFAULTS, sma: true, ema: true, rsi: true, atr: true }),
    ).toBe(5);
  });

  it('MAX_ACTIVE_INDICATORS is 5', () => {
    expect(MAX_ACTIVE_INDICATORS).toBe(5);
  });
});

describe('buildIndicatorsFromArenaSettings', () => {
  it('omits volumeProfile from the returned Indicator[] (it renders via sessionVolumeProfile, not the indicators array)', () => {
    const enabled = { ...ARENA_INDICATOR_ENABLED_DEFAULTS, volumeProfile: true, sma: true };
    const list = buildIndicatorsFromArenaSettings(enabled, ARENA_INDICATOR_PARAM_DEFAULTS, '15m');
    expect(list.some((i) => (i.type as string) === 'volumeProfile')).toBe(false);
    expect(list).toEqual([{ type: 'SMA', period: ARENA_INDICATOR_PARAM_DEFAULTS.sma.period }]);
  });

  it('gates VWAP on intraday intervals', () => {
    const enabled = { ...ARENA_INDICATOR_ENABLED_DEFAULTS, vwap: true, volumeProfile: false };
    expect(buildIndicatorsFromArenaSettings(enabled, ARENA_INDICATOR_PARAM_DEFAULTS, '15m')).toHaveLength(1);
    expect(buildIndicatorsFromArenaSettings(enabled, ARENA_INDICATOR_PARAM_DEFAULTS, '1d')).toHaveLength(0);
  });

  it('threads macdParams / bbandsStdDev onto the Indicator objects', () => {
    const enabled = { ...ARENA_INDICATOR_ENABLED_DEFAULTS, macd: true, bbands: true, volumeProfile: false };
    const params = {
      ...ARENA_INDICATOR_PARAM_DEFAULTS,
      macd: { fast: 5, slow: 35, signal: 5 },
      bbands: { period: 25, stdDev: 3 },
    };
    const list = buildIndicatorsFromArenaSettings(enabled, params, '15m');
    const macd = list.find((i) => i.type === 'MACD');
    const bbands = list.find((i) => i.type === 'BBANDS');
    expect(macd?.macdParams).toEqual({ fast: 5, slow: 35, signal: 5 });
    expect(bbands?.period).toBe(25);
    expect(bbands?.bbandsStdDev).toBe(3);
  });
});

describe('migrateV1ToV2', () => {
  it('converts a legacy flat-boolean record into the v2 shape, volumeProfile defaults true', () => {
    const v1 = { sma: true, ema: false, rsi: true, vwap: false, macd: false, bbands: false, atr: false };
    const result = migrateV1ToV2(v1);
    expect(result.enabled.sma).toBe(true);
    expect(result.enabled.rsi).toBe(true);
    expect(result.enabled.ema).toBe(false);
    expect(result.enabled.volumeProfile).toBe(true);
    expect(result.params).toEqual(ARENA_INDICATOR_PARAM_DEFAULTS);
    // The research-based EMA-period-9 default applies even to migrated users.
    expect(result.params.ema.period).toBe(9);
  });

  it('handles a garbage/non-object input safely (all-false enabled, volumeProfile still true)', () => {
    const result = migrateV1ToV2('not-an-object');
    expect(result.enabled.sma).toBe(false);
    expect(result.enabled.ema).toBe(false);
    expect(result.enabled.volumeProfile).toBe(true);
  });
});

describe('readArenaIndicatorPreferences — round-trip + migration + corrupt JSON', () => {
  it('returns DEFAULT_ARENA_INDICATOR_PREFERENCES when nothing is stored', () => {
    expect(readArenaIndicatorPreferences()).toEqual(DEFAULT_ARENA_INDICATOR_PREFERENCES);
  });

  it('v2 record wins when present (round-trip)', () => {
    const custom = {
      enabled: { ...ARENA_INDICATOR_ENABLED_DEFAULTS, ema: true },
      params: { ...ARENA_INDICATOR_PARAM_DEFAULTS, ema: { period: 21 } },
    };
    localStorageMock.setItem(ARENA_INDICATORS_STORAGE_KEY_V2, JSON.stringify(custom));

    const result = readArenaIndicatorPreferences();
    expect(result.enabled.ema).toBe(true);
    expect(result.params.ema.period).toBe(21);
  });

  it('migrates a legacy v1-only record when no v2 record exists', () => {
    localStorageMock.setItem(ARENA_INDICATORS_STORAGE_KEY_V1, JSON.stringify({ sma: true, rsi: true }));

    const result = readArenaIndicatorPreferences();
    expect(result.enabled.sma).toBe(true);
    expect(result.enabled.rsi).toBe(true);
    expect(result.enabled.volumeProfile).toBe(true);
    expect(result.params.ema.period).toBe(9);
  });

  it('v2 wins over v1 when both are present', () => {
    localStorageMock.setItem(ARENA_INDICATORS_STORAGE_KEY_V1, JSON.stringify({ sma: true }));
    localStorageMock.setItem(
      ARENA_INDICATORS_STORAGE_KEY_V2,
      JSON.stringify({ enabled: { ...ARENA_INDICATOR_ENABLED_DEFAULTS, ema: true }, params: ARENA_INDICATOR_PARAM_DEFAULTS }),
    );

    const result = readArenaIndicatorPreferences();
    expect(result.enabled.ema).toBe(true);
    expect(result.enabled.sma).toBe(false); // v1's sma:true is ignored once v2 exists
  });

  it('corrupt JSON in v2 degrades to defaults, never throws', () => {
    localStorageMock.setItem(ARENA_INDICATORS_STORAGE_KEY_V2, '{not valid json');
    expect(() => readArenaIndicatorPreferences()).not.toThrow();
    expect(readArenaIndicatorPreferences()).toEqual(DEFAULT_ARENA_INDICATOR_PREFERENCES);
  });

  it('corrupt JSON in v1 (with no v2) degrades to defaults, never throws', () => {
    localStorageMock.setItem(ARENA_INDICATORS_STORAGE_KEY_V1, '{{{garbage');
    expect(() => readArenaIndicatorPreferences()).not.toThrow();
    expect(readArenaIndicatorPreferences()).toEqual(DEFAULT_ARENA_INDICATOR_PREFERENCES);
  });
});
