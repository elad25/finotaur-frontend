// src/pages/app/trading-arena/hooks/__tests__/useDomPreferences.test.ts
//
// Exercises the pure read/sanitize functions the hook is built on (no React
// render harness in this codebase — see useFootprintPreferences.test.ts's
// header comment for the same convention): corrupt-JSON safety, field-by-
// field range snapping to the allowed option sets, orderQty floor, and
// per-symbol key isolation with write-through persistence.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_DOM_PREFERENCES,
  DOM_STORAGE_PREFIX,
  domSymbolStorageKey,
  readDomPreferencesForSymbol,
  sanitizeDomPreferences,
  type DomPreferences,
} from '../useDomPreferences';

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

describe('sanitizeDomPreferences', () => {
  it('falls back to defaults for non-object / null input', () => {
    expect(sanitizeDomPreferences(null)).toEqual(DEFAULT_DOM_PREFERENCES);
    expect(sanitizeDomPreferences('garbage')).toEqual(DEFAULT_DOM_PREFERENCES);
    expect(sanitizeDomPreferences(42)).toEqual(DEFAULT_DOM_PREFERENCES);
  });

  it('accepts every valid depthCount option, falls back to default for out-of-range values', () => {
    for (const valid of [5, 10, 20, 40] as const) {
      expect(sanitizeDomPreferences({ depthCount: valid }).depthCount).toBe(valid);
    }
    expect(sanitizeDomPreferences({ depthCount: 15 }).depthCount).toBe(DEFAULT_DOM_PREFERENCES.depthCount);
    expect(sanitizeDomPreferences({ depthCount: -10 }).depthCount).toBe(DEFAULT_DOM_PREFERENCES.depthCount);
    expect(sanitizeDomPreferences({ depthCount: '10' }).depthCount).toBe(DEFAULT_DOM_PREFERENCES.depthCount);
  });

  it('accepts every valid updateMs option, falls back to default for out-of-range values', () => {
    for (const valid of [100, 150, 250] as const) {
      expect(sanitizeDomPreferences({ updateMs: valid }).updateMs).toBe(valid);
    }
    expect(sanitizeDomPreferences({ updateMs: 50 }).updateMs).toBe(DEFAULT_DOM_PREFERENCES.updateMs);
    expect(sanitizeDomPreferences({ updateMs: 1000 }).updateMs).toBe(DEFAULT_DOM_PREFERENCES.updateMs);
  });

  it('accepts every valid autoCenterSec option, falls back to default for out-of-range values', () => {
    for (const valid of [15, 30, 60, 120] as const) {
      expect(sanitizeDomPreferences({ autoCenterSec: valid }).autoCenterSec).toBe(valid);
    }
    expect(sanitizeDomPreferences({ autoCenterSec: 45 }).autoCenterSec).toBe(DEFAULT_DOM_PREFERENCES.autoCenterSec);
    expect(sanitizeDomPreferences({ autoCenterSec: 0 }).autoCenterSec).toBe(DEFAULT_DOM_PREFERENCES.autoCenterSec);
  });

  it('accepts every valid recenterTicks option, falls back to default for out-of-range values', () => {
    for (const valid of [3, 5, 10, 20] as const) {
      expect(sanitizeDomPreferences({ recenterTicks: valid }).recenterTicks).toBe(valid);
    }
    expect(sanitizeDomPreferences({ recenterTicks: 7 }).recenterTicks).toBe(DEFAULT_DOM_PREFERENCES.recenterTicks);
    expect(sanitizeDomPreferences({ recenterTicks: -3 }).recenterTicks).toBe(DEFAULT_DOM_PREFERENCES.recenterTicks);
  });

  it('accepts boolean autoCenter/showCenterLine/showVolumeHistogram, falls back to defaults otherwise', () => {
    expect(sanitizeDomPreferences({ autoCenter: false }).autoCenter).toBe(false);
    expect(sanitizeDomPreferences({ autoCenter: 'nope' }).autoCenter).toBe(DEFAULT_DOM_PREFERENCES.autoCenter);
    expect(sanitizeDomPreferences({ showCenterLine: false }).showCenterLine).toBe(false);
    expect(sanitizeDomPreferences({ showCenterLine: 1 }).showCenterLine).toBe(DEFAULT_DOM_PREFERENCES.showCenterLine);
    expect(sanitizeDomPreferences({ showVolumeHistogram: false }).showVolumeHistogram).toBe(false);
    expect(sanitizeDomPreferences({ showVolumeHistogram: null }).showVolumeHistogram).toBe(
      DEFAULT_DOM_PREFERENCES.showVolumeHistogram,
    );
  });

  it('orderQty: accepts any finite number >= the floor, falls back to default otherwise', () => {
    expect(sanitizeDomPreferences({ orderQty: 5 }).orderQty).toBe(5);
    expect(sanitizeDomPreferences({ orderQty: 0.001 }).orderQty).toBe(0.001); // exactly at the floor
    expect(sanitizeDomPreferences({ orderQty: 0 }).orderQty).toBe(DEFAULT_DOM_PREFERENCES.orderQty); // below floor
    expect(sanitizeDomPreferences({ orderQty: -1 }).orderQty).toBe(DEFAULT_DOM_PREFERENCES.orderQty);
    expect(sanitizeDomPreferences({ orderQty: NaN }).orderQty).toBe(DEFAULT_DOM_PREFERENCES.orderQty);
    expect(sanitizeDomPreferences({ orderQty: '2' }).orderQty).toBe(DEFAULT_DOM_PREFERENCES.orderQty);
  });

  it('field-by-field: one valid + one invalid field in the same object degrade independently', () => {
    const result = sanitizeDomPreferences({ depthCount: 20, updateMs: 999 });
    expect(result.depthCount).toBe(20);
    expect(result.updateMs).toBe(DEFAULT_DOM_PREFERENCES.updateMs);
  });

  it('defaults match DEFAULT_DOM_PREFERENCES for every field when absent', () => {
    const result = sanitizeDomPreferences({});
    expect(result).toEqual(DEFAULT_DOM_PREFERENCES);
  });
});

describe('readDomPreferencesForSymbol — round-trip + corrupt JSON', () => {
  it('returns DEFAULT_DOM_PREFERENCES when nothing is stored', () => {
    expect(readDomPreferencesForSymbol('BTCUSDT')).toEqual(DEFAULT_DOM_PREFERENCES);
  });

  it('round-trips a record written directly to localStorage', () => {
    localStorageMock.setItem(
      domSymbolStorageKey('BTCUSDT'),
      JSON.stringify({ depthCount: 40, updateMs: 100, orderQty: 2.5 }),
    );
    const result = readDomPreferencesForSymbol('BTCUSDT');
    expect(result.depthCount).toBe(40);
    expect(result.updateMs).toBe(100);
    expect(result.orderQty).toBe(2.5);
  });

  it('corrupt JSON degrades to defaults, never throws', () => {
    localStorageMock.setItem(domSymbolStorageKey('BTCUSDT'), '{not valid json');
    expect(() => readDomPreferencesForSymbol('BTCUSDT')).not.toThrow();
    expect(readDomPreferencesForSymbol('BTCUSDT')).toEqual(DEFAULT_DOM_PREFERENCES);
  });
});

describe('readDomPreferencesForSymbol — per-symbol key isolation', () => {
  it('a preference written for one symbol does not leak to another symbol', () => {
    localStorageMock.setItem(
      domSymbolStorageKey('BTCUSDT'),
      JSON.stringify({ depthCount: 5, autoCenter: false, orderQty: 10 }),
    );

    const btc = readDomPreferencesForSymbol('BTCUSDT');
    expect(btc.depthCount).toBe(5);
    expect(btc.autoCenter).toBe(false);
    expect(btc.orderQty).toBe(10);

    const eth = readDomPreferencesForSymbol('ETHUSDT');
    expect(eth).toEqual(DEFAULT_DOM_PREFERENCES);
  });

  it('storage keys are namespaced under DOM_STORAGE_PREFIX and include the symbol', () => {
    expect(domSymbolStorageKey('BTCUSDT')).toBe(`${DOM_STORAGE_PREFIX}:BTCUSDT`);
    expect(domSymbolStorageKey('BTCUSDT')).not.toBe(domSymbolStorageKey('ETHUSDT'));
  });
});

describe('write-through persistence (simulating the hook\'s update() path)', () => {
  it('writing a full DomPreferences object under a symbol key round-trips exactly through sanitize', () => {
    const custom: DomPreferences = {
      ...DEFAULT_DOM_PREFERENCES,
      depthCount: 20,
      updateMs: 250,
      autoCenter: false,
      autoCenterSec: 120,
      recenterTicks: 20,
      showCenterLine: false,
      showVolumeHistogram: false,
      orderQty: 3,
    };
    localStorageMock.setItem(domSymbolStorageKey('BTCUSDT'), JSON.stringify(custom));

    expect(readDomPreferencesForSymbol('BTCUSDT')).toEqual(custom);
  });

  it('a partial-patch write (only some fields present) merges the rest to defaults via sanitize, not a stale read', () => {
    // sanitizeDomPreferences always merges against DEFAULT_DOM_PREFERENCES for
    // a bare readDomPreferencesForSymbol call — a raw partial record on disk
    // (e.g. hand-edited or from an older schema) must not leave other fields
    // `undefined`.
    localStorageMock.setItem(domSymbolStorageKey('BTCUSDT'), JSON.stringify({ orderQty: 7 }));
    const result = readDomPreferencesForSymbol('BTCUSDT');
    expect(result.orderQty).toBe(7);
    expect(result.depthCount).toBe(DEFAULT_DOM_PREFERENCES.depthCount);
    expect(result.updateMs).toBe(DEFAULT_DOM_PREFERENCES.updateMs);
    expect(result.autoCenter).toBe(DEFAULT_DOM_PREFERENCES.autoCenter);
  });
});
