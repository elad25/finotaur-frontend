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
  ARENA_INDICATORS_STORAGE_KEY_V4,
  ARENA_INDICATORS_STORAGE_KEY_V5,
  migrateV1ToV2,
  migrateV4ToV5,
  readArenaIndicatorPreferences,
  readArenaIndicatorPreferencesV5,
} from '../useArenaIndicatorPreferences';
import {
  ARENA_INDICATOR_ENABLED_DEFAULTS,
  ARENA_INDICATOR_PARAM_DEFAULTS,
  DEFAULT_ARENA_INDICATOR_PREFERENCES,
  DEFAULT_ARENA_INDICATOR_PREFERENCES_V3,
  DEFAULT_ARENA_INDICATOR_STYLES,
  MAX_ACTIVE_INDICATORS,
  countActiveIndicators,
  createIndicatorInstance,
  migrateV3ToV4,
  sanitizeArenaIndicatorEnabled,
  sanitizeArenaIndicatorInstances,
  sanitizeArenaIndicatorParams,
  sanitizeArenaIndicatorPreferences,
  buildIndicatorsFromArenaSettings,
  type ArenaIndicatorPreferencesV3,
  type ArenaIndicatorPreferencesV4,
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
  it('counts every true boolean (volumeProfile counts too, but defaults false)', () => {
    expect(countActiveIndicators(ARENA_INDICATOR_ENABLED_DEFAULTS)).toBe(0); // every indicator (incl. volumeProfile) defaults false
    expect(
      countActiveIndicators({ ...ARENA_INDICATOR_ENABLED_DEFAULTS, sma: true, ema: true, rsi: true, atr: true }),
    ).toBe(4);
  });

  it('MAX_ACTIVE_INDICATORS is 5', () => {
    expect(MAX_ACTIVE_INDICATORS).toBe(5);
  });
});

describe('buildIndicatorsFromArenaSettings (INSTANCES model)', () => {
  it('omits volumeProfile from the returned Indicator[] (it renders via sessionVolumeProfile, not the indicators array)', () => {
    const instances = [createIndicatorInstance('volumeProfile'), createIndicatorInstance('sma')];
    const list = buildIndicatorsFromArenaSettings(instances, '15m');
    expect(list.some((i) => (i.type as string) === 'volumeProfile')).toBe(false);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ type: 'SMA', period: ARENA_INDICATOR_PARAM_DEFAULTS.sma.period });
  });

  it('gates VWAP on intraday intervals', () => {
    const instances = [createIndicatorInstance('vwap')];
    expect(buildIndicatorsFromArenaSettings(instances, '15m')).toHaveLength(1);
    expect(buildIndicatorsFromArenaSettings(instances, '1d')).toHaveLength(0);
  });

  it('threads macdParams / bbandsStdDev onto the Indicator objects', () => {
    const macdInstance = createIndicatorInstance('macd');
    macdInstance.params = { fast: 5, slow: 35, signal: 5 };
    const bbandsInstance = createIndicatorInstance('bbands');
    bbandsInstance.params = { period: 25, stdDev: 3 };

    const list = buildIndicatorsFromArenaSettings([macdInstance, bbandsInstance], '15m');
    const macd = list.find((i) => i.type === 'MACD');
    const bbands = list.find((i) => i.type === 'BBANDS');
    expect(macd?.macdParams).toEqual({ fast: 5, slow: 35, signal: 5 });
    expect(bbands?.period).toBe(25);
    expect(bbands?.bbandsStdDev).toBe(3);
  });

  it('supports the SAME type added multiple times, each with its own instanceId and params (e.g. EMA 9 + EMA 21)', () => {
    const ema9 = createIndicatorInstance('ema');
    const ema21 = createIndicatorInstance('ema');
    ema21.params = { period: 21 };

    const list = buildIndicatorsFromArenaSettings([ema9, ema21], '15m');
    expect(list).toHaveLength(2);
    expect(list[0].instanceId).toBe(ema9.id);
    expect(list[1].instanceId).toBe(ema21.id);
    expect(list[0].instanceId).not.toBe(list[1].instanceId);
    expect(list[0].period).toBe(9); // ARENA_INDICATOR_PARAM_DEFAULTS.ema.period
    expect(list[1].period).toBe(21);
  });
});

describe('sanitizeArenaIndicatorInstances', () => {
  it('drops unknown types and caps at MAX_ACTIVE_INDICATORS', () => {
    const raw = [
      { id: 'a', type: 'ema', params: { period: 12 }, styles: {} },
      { id: 'b', type: 'not-a-real-type', params: {}, styles: {} },
      { id: 'c', type: 'sma' },
      { id: 'd', type: 'rsi' },
      { id: 'e', type: 'atr' },
      { id: 'f', type: 'macd' },
      { id: 'g', type: 'bbands' }, // 6th valid entry — dropped by the MAX_ACTIVE_INDICATORS(5) cap
    ];
    const result = sanitizeArenaIndicatorInstances(raw, []);
    expect(result).toHaveLength(MAX_ACTIVE_INDICATORS);
    expect(result.some((i) => (i.type as string) === 'not-a-real-type')).toBe(false);
    expect(result[0].params).toEqual({ period: 12 });
  });

  it('de-dupes colliding persisted ids', () => {
    const raw = [
      { id: 'dup', type: 'ema' },
      { id: 'dup', type: 'sma' },
    ];
    const result = sanitizeArenaIndicatorInstances(raw, []);
    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('falls back to the provided default when raw is not an array', () => {
    const fallback = [createIndicatorInstance('vwap', 'vwap')];
    expect(sanitizeArenaIndicatorInstances(null, fallback)).toBe(fallback);
    expect(sanitizeArenaIndicatorInstances('garbage', fallback)).toBe(fallback);
  });
});

describe('migrateV3ToV4', () => {
  it('converts each enabled type into one instance carrying that type\'s v3 params/styles', () => {
    const v3: ArenaIndicatorPreferencesV3 = {
      ...DEFAULT_ARENA_INDICATOR_PREFERENCES_V3,
      enabled: { ...ARENA_INDICATOR_ENABLED_DEFAULTS, ema: true, macd: true },
      params: { ...ARENA_INDICATOR_PARAM_DEFAULTS, ema: { period: 21 } },
    };
    const v4 = migrateV3ToV4(v3);

    // volumeProfile now defaults false — only ema + macd = 2 instances
    expect(v4.instances).toHaveLength(2);
    const ema = v4.instances.find((i) => i.type === 'ema');
    expect(ema?.params).toEqual({ period: 21 });
    const macd = v4.instances.find((i) => i.type === 'macd');
    expect(macd?.params).toEqual(ARENA_INDICATOR_PARAM_DEFAULTS.macd);
    expect(macd?.styles).toEqual(DEFAULT_ARENA_INDICATOR_STYLES.macd);
    expect(v4.visibility).toBe(v3.visibility);
  });

  it('produces no instances for an untouched v3 default record (every field, incl. volumeProfile, defaults false)', () => {
    const v4 = migrateV3ToV4(DEFAULT_ARENA_INDICATOR_PREFERENCES_V3);
    expect(v4.instances).toHaveLength(0);
  });

  it('every instance gets a unique id', () => {
    const v3: ArenaIndicatorPreferencesV3 = {
      ...DEFAULT_ARENA_INDICATOR_PREFERENCES_V3,
      enabled: { ...ARENA_INDICATOR_ENABLED_DEFAULTS, ema: true, sma: true, rsi: true },
    };
    const v4 = migrateV3ToV4(v3);
    const ids = new Set(v4.instances.map((i) => i.id));
    expect(ids.size).toBe(v4.instances.length);
  });
});

describe('migrateV1ToV2', () => {
  it('converts a legacy flat-boolean record into the v2 shape, volumeProfile defaults false', () => {
    const v1 = { sma: true, ema: false, rsi: true, vwap: false, macd: false, bbands: false, atr: false };
    const result = migrateV1ToV2(v1);
    expect(result.enabled.sma).toBe(true);
    expect(result.enabled.rsi).toBe(true);
    expect(result.enabled.ema).toBe(false);
    expect(result.enabled.volumeProfile).toBe(false);
    expect(result.params).toEqual(ARENA_INDICATOR_PARAM_DEFAULTS);
    // The research-based EMA-period-9 default applies even to migrated users.
    expect(result.params.ema.period).toBe(9);
  });

  it('handles a garbage/non-object input safely (all-false enabled, incl. volumeProfile)', () => {
    const result = migrateV1ToV2('not-an-object');
    expect(result.enabled.sma).toBe(false);
    expect(result.enabled.ema).toBe(false);
    expect(result.enabled.volumeProfile).toBe(false);
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
    expect(result.enabled.volumeProfile).toBe(false);
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

describe('migrateV4ToV5 — one-time Volume Profile default-OFF cleanup', () => {
  it('drops every volumeProfile instance, keeps every other instance untouched', () => {
    const vp = createIndicatorInstance('volumeProfile');
    const ema = createIndicatorInstance('ema');
    const v4: ArenaIndicatorPreferencesV4 = {
      instances: [vp, ema],
      visibility: DEFAULT_ARENA_INDICATOR_PREFERENCES_V3.visibility,
    };

    const v5 = migrateV4ToV5(v4);
    expect(v5.instances).toHaveLength(1);
    expect(v5.instances[0].id).toBe(ema.id);
    expect(v5.instances.some((i) => i.type === 'volumeProfile')).toBe(false);
    expect(v5.visibility).toBe(v4.visibility);
  });

  it('is a no-op when no volumeProfile instance is present', () => {
    const sma = createIndicatorInstance('sma');
    const rsi = createIndicatorInstance('rsi');
    const v4: ArenaIndicatorPreferencesV4 = {
      instances: [sma, rsi],
      visibility: DEFAULT_ARENA_INDICATOR_PREFERENCES_V3.visibility,
    };

    const v5 = migrateV4ToV5(v4);
    expect(v5.instances).toHaveLength(2);
  });

  it('produces an empty array when every instance is volumeProfile', () => {
    const v4: ArenaIndicatorPreferencesV4 = {
      instances: [createIndicatorInstance('volumeProfile')],
      visibility: DEFAULT_ARENA_INDICATOR_PREFERENCES_V3.visibility,
    };

    expect(migrateV4ToV5(v4).instances).toEqual([]);
  });
});

describe('readArenaIndicatorPreferencesV5 — round-trip + v4 cleanup migration', () => {
  it('returns an empty-instances default when nothing is stored', () => {
    const result = readArenaIndicatorPreferencesV5();
    expect(result.instances).toEqual([]);
  });

  it('v5 record wins when present (round-trip) — even a persisted volumeProfile instance survives once explicitly re-added', () => {
    const vp = createIndicatorInstance('volumeProfile');
    localStorageMock.setItem(
      ARENA_INDICATORS_STORAGE_KEY_V5,
      JSON.stringify({ instances: [vp], visibility: DEFAULT_ARENA_INDICATOR_PREFERENCES_V3.visibility }),
    );

    const result = readArenaIndicatorPreferencesV5();
    expect(result.instances).toHaveLength(1);
    expect(result.instances[0].type).toBe('volumeProfile');
  });

  it('cleans up a legacy v4-only record: drops its auto-seeded volumeProfile instance but keeps every other instance', () => {
    const vp = createIndicatorInstance('volumeProfile');
    const ema = createIndicatorInstance('ema');
    localStorageMock.setItem(
      ARENA_INDICATORS_STORAGE_KEY_V4,
      JSON.stringify({ instances: [vp, ema], visibility: DEFAULT_ARENA_INDICATOR_PREFERENCES_V3.visibility }),
    );

    const result = readArenaIndicatorPreferencesV5();
    expect(result.instances).toHaveLength(1);
    expect(result.instances[0].type).toBe('ema');
  });

  it('v5 wins over v4 when both are present', () => {
    localStorageMock.setItem(
      ARENA_INDICATORS_STORAGE_KEY_V4,
      JSON.stringify({ instances: [createIndicatorInstance('volumeProfile')], visibility: DEFAULT_ARENA_INDICATOR_PREFERENCES_V3.visibility }),
    );
    localStorageMock.setItem(
      ARENA_INDICATORS_STORAGE_KEY_V5,
      JSON.stringify({ instances: [createIndicatorInstance('sma')], visibility: DEFAULT_ARENA_INDICATOR_PREFERENCES_V3.visibility }),
    );

    const result = readArenaIndicatorPreferencesV5();
    expect(result.instances).toHaveLength(1);
    expect(result.instances[0].type).toBe('sma');
  });

  it('corrupt JSON in v5 (with no usable v4) degrades to an empty-instances default, never throws', () => {
    localStorageMock.setItem(ARENA_INDICATORS_STORAGE_KEY_V5, '{not valid json');
    expect(() => readArenaIndicatorPreferencesV5()).not.toThrow();
    expect(readArenaIndicatorPreferencesV5().instances).toEqual([]);
  });
});
