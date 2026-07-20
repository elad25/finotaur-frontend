// src/pages/app/trading-arena/hooks/__tests__/useFootprintPreferences.test.ts
//
// Exercises the pure read/sanitize/merge functions the hook is built on
// (no React render harness in this codebase — see the hook file's header
// comment): round-trip persistence, corrupt-JSON safety, and the
// per-symbol / __default merge split.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FOOTPRINT_DEFAULT_STORAGE_KEY,
  footprintSymbolStorageKey,
  readFootprintSettingsForSymbol,
  sanitizeFootprintSettings,
} from '../useFootprintPreferences';
import { DEFAULT_FOOTPRINT_SETTINGS, type FootprintSettings } from '../../components/footprintSettings';

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

describe('sanitizeFootprintSettings', () => {
  it('falls back to defaults for non-object / null input', () => {
    expect(sanitizeFootprintSettings(null, DEFAULT_FOOTPRINT_SETTINGS)).toEqual(DEFAULT_FOOTPRINT_SETTINGS);
    expect(sanitizeFootprintSettings('garbage', DEFAULT_FOOTPRINT_SETTINGS)).toEqual(DEFAULT_FOOTPRINT_SETTINGS);
    expect(sanitizeFootprintSettings(42, DEFAULT_FOOTPRINT_SETTINGS)).toEqual(DEFAULT_FOOTPRINT_SETTINGS);
  });

  it('field-by-field validates: bad enum values / wrong types fall back per-field, valid fields pass through', () => {
    const raw = {
      content: 'not-a-real-mode',
      layout: 'histogram',
      colorScheme: 123,
      imbalanceRatioPct: '300', // wrong type -> fallback
      imbalanceStackedCount: 5,
      imbalanceStackedOnly: 'yes', // wrong type -> fallback
      rowSizeMode: 'ticks',
      rowSizeValue: 4,
      showPoc: false,
      statsRows: { volume: false, delta: 'nope' },
    };
    const result = sanitizeFootprintSettings(raw, DEFAULT_FOOTPRINT_SETTINGS);
    expect(result.content).toBe(DEFAULT_FOOTPRINT_SETTINGS.content); // invalid enum -> fallback
    expect(result.layout).toBe('histogram'); // valid enum -> passes through
    expect(result.colorScheme).toBe(DEFAULT_FOOTPRINT_SETTINGS.colorScheme); // wrong type -> fallback
    expect(result.imbalanceRatioPct).toBe(DEFAULT_FOOTPRINT_SETTINGS.imbalanceRatioPct);
    expect(result.imbalanceStackedCount).toBe(5);
    expect(result.imbalanceStackedOnly).toBe(DEFAULT_FOOTPRINT_SETTINGS.imbalanceStackedOnly);
    expect(result.rowSizeMode).toBe('ticks');
    expect(result.rowSizeValue).toBe(4);
    expect(result.showPoc).toBe(false);
    expect(result.statsRows.volume).toBe(false);
    expect(result.statsRows.delta).toBe(DEFAULT_FOOTPRINT_SETTINGS.statsRows.delta); // wrong type -> fallback
    expect(result.statsRows.deltaPct).toBe(DEFAULT_FOOTPRINT_SETTINGS.statsRows.deltaPct); // missing -> fallback
  });

  it('new ATAS-parity fields: field-by-field validates, invalid falls back per-field', () => {
    const raw = {
      valuesDivider: 1, // valid enum member -> passes through
      minCellPxForText: 55,
      imbalanceMinDiff: 12,
      imbalanceIgnoreZeros: false,
      imbalanceBold: false,
      proportionUpperPercentile: 95,
    };
    const result = sanitizeFootprintSettings(raw, DEFAULT_FOOTPRINT_SETTINGS);
    expect(result.valuesDivider).toBe(1);
    expect(result.minCellPxForText).toBe(55);
    expect(result.imbalanceMinDiff).toBe(12);
    expect(result.imbalanceIgnoreZeros).toBe(false);
    expect(result.imbalanceBold).toBe(false);
    expect(result.proportionUpperPercentile).toBe(95);
  });

  it('new ATAS-parity fields: invalid values / wrong types fall back to defaults', () => {
    const raw = {
      valuesDivider: 7, // not in [1, 1000] -> fallback
      minCellPxForText: 'wide', // wrong type -> fallback
      imbalanceMinDiff: 'none', // wrong type -> fallback
      imbalanceIgnoreZeros: 'nope', // wrong type -> fallback
      imbalanceBold: 1, // wrong type -> fallback
      proportionUpperPercentile: 'all', // wrong type -> fallback
    };
    const result = sanitizeFootprintSettings(raw, DEFAULT_FOOTPRINT_SETTINGS);
    expect(result.valuesDivider).toBe(DEFAULT_FOOTPRINT_SETTINGS.valuesDivider);
    expect(result.minCellPxForText).toBe(DEFAULT_FOOTPRINT_SETTINGS.minCellPxForText);
    expect(result.imbalanceMinDiff).toBe(DEFAULT_FOOTPRINT_SETTINGS.imbalanceMinDiff);
    expect(result.imbalanceIgnoreZeros).toBe(DEFAULT_FOOTPRINT_SETTINGS.imbalanceIgnoreZeros);
    expect(result.imbalanceBold).toBe(DEFAULT_FOOTPRINT_SETTINGS.imbalanceBold);
    expect(result.proportionUpperPercentile).toBe(DEFAULT_FOOTPRINT_SETTINGS.proportionUpperPercentile);
  });

  it('new ATAS-parity fields: missing entirely (old localStorage record) merges cleanly to defaults', () => {
    const result = sanitizeFootprintSettings({ content: 'delta' }, DEFAULT_FOOTPRINT_SETTINGS);
    expect(result.valuesDivider).toBe(DEFAULT_FOOTPRINT_SETTINGS.valuesDivider);
    expect(result.minCellPxForText).toBe(DEFAULT_FOOTPRINT_SETTINGS.minCellPxForText);
    expect(result.imbalanceMinDiff).toBe(DEFAULT_FOOTPRINT_SETTINGS.imbalanceMinDiff);
    expect(result.imbalanceIgnoreZeros).toBe(DEFAULT_FOOTPRINT_SETTINGS.imbalanceIgnoreZeros);
    expect(result.imbalanceBold).toBe(DEFAULT_FOOTPRINT_SETTINGS.imbalanceBold);
    expect(result.proportionUpperPercentile).toBe(DEFAULT_FOOTPRINT_SETTINGS.proportionUpperPercentile);
  });

  it('rowSizeValue: explicit null is preserved (auto mode), missing/invalid falls back', () => {
    const withNull = sanitizeFootprintSettings({ rowSizeValue: null }, { ...DEFAULT_FOOTPRINT_SETTINGS, rowSizeValue: 7 });
    expect(withNull.rowSizeValue).toBeNull();

    const withMissing = sanitizeFootprintSettings({}, { ...DEFAULT_FOOTPRINT_SETTINGS, rowSizeValue: 7 });
    expect(withMissing.rowSizeValue).toBe(7);

    const withInvalid = sanitizeFootprintSettings({ rowSizeValue: 'nope' }, { ...DEFAULT_FOOTPRINT_SETTINGS, rowSizeValue: 7 });
    expect(withInvalid.rowSizeValue).toBe(7);
  });
});

describe('readFootprintSettingsForSymbol — round-trip + corrupt JSON', () => {
  it('returns DEFAULT_FOOTPRINT_SETTINGS when nothing is stored', () => {
    expect(readFootprintSettingsForSymbol('BTCUSDT')).toEqual(DEFAULT_FOOTPRINT_SETTINGS);
  });

  it('round-trips a __default record written directly to localStorage', () => {
    const custom: FootprintSettings = { ...DEFAULT_FOOTPRINT_SETTINGS, content: 'delta', imbalanceRatioPct: 500 };
    localStorageMock.setItem(FOOTPRINT_DEFAULT_STORAGE_KEY, JSON.stringify(custom));

    const result = readFootprintSettingsForSymbol('BTCUSDT');
    expect(result.content).toBe('delta');
    expect(result.imbalanceRatioPct).toBe(500);
  });

  it('corrupt JSON in __default degrades to defaults, never throws', () => {
    localStorageMock.setItem(FOOTPRINT_DEFAULT_STORAGE_KEY, '{not valid json');
    expect(() => readFootprintSettingsForSymbol('BTCUSDT')).not.toThrow();
    expect(readFootprintSettingsForSymbol('BTCUSDT')).toEqual(DEFAULT_FOOTPRINT_SETTINGS);
  });

  it('corrupt JSON in the per-symbol record degrades to __default (or global defaults), never throws', () => {
    localStorageMock.setItem(footprintSymbolStorageKey('BTCUSDT'), '{{{garbage');
    expect(() => readFootprintSettingsForSymbol('BTCUSDT')).not.toThrow();
    expect(readFootprintSettingsForSymbol('BTCUSDT')).toEqual(DEFAULT_FOOTPRINT_SETTINGS);
  });
});

describe('readFootprintSettingsForSymbol — per-symbol merge', () => {
  it('a per-symbol rowSize override applies ONLY to that symbol; other symbols see __default rowSize fields', () => {
    localStorageMock.setItem(
      footprintSymbolStorageKey('BTCUSDT'),
      JSON.stringify({ rowSizeMode: 'price', rowSizeValue: 25 }),
    );

    const btc = readFootprintSettingsForSymbol('BTCUSDT');
    expect(btc.rowSizeMode).toBe('price');
    expect(btc.rowSizeValue).toBe(25);

    const eth = readFootprintSettingsForSymbol('ETHUSDT');
    expect(eth.rowSizeMode).toBe('auto');
    expect(eth.rowSizeValue).toBeNull();
  });

  it('a shared visual preference in __default applies to every symbol, including ones with a rowSize override', () => {
    localStorageMock.setItem(
      FOOTPRINT_DEFAULT_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_FOOTPRINT_SETTINGS, content: 'volume', showValueArea: true }),
    );
    localStorageMock.setItem(
      footprintSymbolStorageKey('BTCUSDT'),
      JSON.stringify({ rowSizeMode: 'ticks', rowSizeValue: 10 }),
    );

    const btc = readFootprintSettingsForSymbol('BTCUSDT');
    expect(btc.content).toBe('volume');
    expect(btc.showValueArea).toBe(true);
    expect(btc.rowSizeMode).toBe('ticks');
    expect(btc.rowSizeValue).toBe(10);
  });

  it('a stray visual field inside a per-symbol record is IGNORED — only rowSizeMode/rowSizeValue can differ per-symbol', () => {
    localStorageMock.setItem(
      footprintSymbolStorageKey('BTCUSDT'),
      JSON.stringify({ rowSizeMode: 'price', rowSizeValue: 25, content: 'trades', showPoc: false }),
    );

    const btc = readFootprintSettingsForSymbol('BTCUSDT');
    expect(btc.rowSizeMode).toBe('price');
    expect(btc.rowSizeValue).toBe(25);
    // content/showPoc must come from __default (global defaults here), NOT the symbol record's stray fields.
    expect(btc.content).toBe(DEFAULT_FOOTPRINT_SETTINGS.content);
    expect(btc.showPoc).toBe(DEFAULT_FOOTPRINT_SETTINGS.showPoc);
  });
});
