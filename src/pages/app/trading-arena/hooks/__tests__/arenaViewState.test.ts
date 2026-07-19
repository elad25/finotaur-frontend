// src/pages/app/trading-arena/hooks/__tests__/arenaViewState.test.ts
//
// Exercises the pure read/write functions the ATAS-parity "synced price
// scale" store is built on (no React render harness in this codebase — see
// useFootprintPreferences.test.ts's header comment for the same
// convention): round-trip persistence, freshness expiry, sessionStorage
// absence tolerance, and malformed-JSON tolerance.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ARENA_VIEW_STATE_STORAGE_KEY,
  ARENA_VIEW_STATE_FRESHNESS_MS,
  buildViewSyncKey,
  readViewState,
  writeViewState,
} from '../arenaViewState';

function makeMemorySessionStorage(): Storage {
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

let sessionStorageMock: Storage;

beforeEach(() => {
  sessionStorageMock = makeMemorySessionStorage();
  vi.stubGlobal('window', { sessionStorage: sessionStorageMock });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildViewSyncKey', () => {
  it('joins assetClass/symbol/interval with a pipe', () => {
    expect(buildViewSyncKey('crypto', 'BTCUSDT', '15m')).toBe('crypto|BTCUSDT|15m');
  });
});

describe('readViewState / writeViewState', () => {
  it('round-trips a written view state', () => {
    const key = buildViewSyncKey('crypto', 'BTCUSDT', '15m');
    const nowMs = 1_000_000;

    writeViewState(
      key,
      { timeRange: { from: 100, to: 200 }, priceRange: { min: 50, max: 60 } },
      nowMs,
    );

    const result = readViewState(key, nowMs);
    expect(result).toEqual({
      timeRange: { from: 100, to: 200 },
      priceRange: { min: 50, max: 60 },
      updatedAt: nowMs,
    });
  });

  it('supports a null priceRange (e.g. CVD pane, which has no real price axis)', () => {
    const key = buildViewSyncKey('crypto', 'ETHUSDT', '5m');
    const nowMs = 2_000_000;

    writeViewState(key, { timeRange: { from: 10, to: 20 }, priceRange: null }, nowMs);

    expect(readViewState(key, nowMs)).toEqual({
      timeRange: { from: 10, to: 20 },
      priceRange: null,
      updatedAt: nowMs,
    });
  });

  it('returns null for a key that was never written', () => {
    expect(readViewState(buildViewSyncKey('crypto', 'SOLUSDT', '1h'))).toBeNull();
  });

  it('keeps distinct entries per key isolated (different symbol/interval do not clash)', () => {
    const keyA = buildViewSyncKey('crypto', 'BTCUSDT', '15m');
    const keyB = buildViewSyncKey('crypto', 'BTCUSDT', '1h');
    const nowMs = 3_000_000;

    writeViewState(keyA, { timeRange: { from: 1, to: 2 }, priceRange: null }, nowMs);
    writeViewState(keyB, { timeRange: { from: 3, to: 4 }, priceRange: null }, nowMs);

    expect(readViewState(keyA, nowMs)?.timeRange).toEqual({ from: 1, to: 2 });
    expect(readViewState(keyB, nowMs)?.timeRange).toEqual({ from: 3, to: 4 });
  });

  it('a later write replaces the earlier entry for the same key', () => {
    const key = buildViewSyncKey('crypto', 'BTCUSDT', '15m');
    const nowMs = 4_000_000;

    writeViewState(key, { timeRange: { from: 1, to: 2 }, priceRange: null }, nowMs);
    writeViewState(key, { timeRange: { from: 9, to: 10 }, priceRange: { min: 1, max: 2 } }, nowMs + 1);

    expect(readViewState(key, nowMs + 1)).toEqual({
      timeRange: { from: 9, to: 10 },
      priceRange: { min: 1, max: 2 },
      updatedAt: nowMs + 1,
    });
  });

  it('defaults `nowMs` to Date.now() when omitted (mockable via vi.spyOn)', () => {
    const key = buildViewSyncKey('crypto', 'BTCUSDT', '15m');
    vi.spyOn(Date, 'now').mockReturnValue(5_000_000);

    writeViewState(key, { timeRange: { from: 1, to: 2 }, priceRange: null });

    expect(readViewState(key)).toEqual({
      timeRange: { from: 1, to: 2 },
      priceRange: null,
      updatedAt: 5_000_000,
    });

    vi.restoreAllMocks();
  });
});

describe('freshness expiry', () => {
  it('returns null once the entry is older than ARENA_VIEW_STATE_FRESHNESS_MS', () => {
    const key = buildViewSyncKey('futures', 'NQ', '5m');
    const writtenAt = 10_000_000;

    writeViewState(key, { timeRange: { from: 1, to: 2 }, priceRange: null }, writtenAt);

    // Still fresh exactly at the boundary.
    expect(readViewState(key, writtenAt + ARENA_VIEW_STATE_FRESHNESS_MS)).not.toBeNull();

    // Stale one ms past the boundary.
    expect(readViewState(key, writtenAt + ARENA_VIEW_STATE_FRESHNESS_MS + 1)).toBeNull();
  });

  it('honors a mocked Date.now() when nowMs is not passed explicitly', () => {
    const key = buildViewSyncKey('futures', 'ES', '1m');
    vi.spyOn(Date, 'now').mockReturnValue(20_000_000);
    writeViewState(key, { timeRange: { from: 1, to: 2 }, priceRange: null });

    vi.spyOn(Date, 'now').mockReturnValue(20_000_000 + ARENA_VIEW_STATE_FRESHNESS_MS + 60_000);
    expect(readViewState(key)).toBeNull();

    vi.restoreAllMocks();
  });
});

describe('sessionStorage absence tolerated', () => {
  it('does not throw and reads/writes are safe no-ops when window has no sessionStorage', () => {
    vi.stubGlobal('window', {});
    const key = buildViewSyncKey('crypto', 'BTCUSDT', '15m');

    expect(() => writeViewState(key, { timeRange: { from: 1, to: 2 }, priceRange: null }, 1)).not.toThrow();
    expect(() => readViewState(key, 1)).not.toThrow();
    expect(readViewState(key, 1)).toBeNull();
  });

  it('does not throw when sessionStorage.getItem/setItem throw (private-mode style failure)', () => {
    const throwingStorage: Storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    vi.stubGlobal('window', { sessionStorage: throwingStorage });
    const key = buildViewSyncKey('crypto', 'BTCUSDT', '15m');

    expect(() => writeViewState(key, { timeRange: { from: 1, to: 2 }, priceRange: null }, 1)).not.toThrow();
    expect(readViewState(key, 1)).toBeNull();
  });
});

describe('malformed JSON tolerated', () => {
  it('treats corrupt JSON in the storage key as "no saved views"', () => {
    sessionStorageMock.setItem(ARENA_VIEW_STATE_STORAGE_KEY, '{not valid json');
    const key = buildViewSyncKey('crypto', 'BTCUSDT', '15m');
    expect(readViewState(key, 1)).toBeNull();
  });

  it('drops malformed individual entries but keeps well-formed siblings', () => {
    const goodKey = buildViewSyncKey('crypto', 'BTCUSDT', '15m');
    sessionStorageMock.setItem(
      ARENA_VIEW_STATE_STORAGE_KEY,
      JSON.stringify({
        [goodKey]: { timeRange: { from: 1, to: 2 }, priceRange: null, updatedAt: 100 },
        'crypto|BROKEN|1h': { timeRange: { from: 'not-a-number' }, updatedAt: 100 },
        'crypto|ALSO_BROKEN|1h': 'not even an object',
      }),
    );

    expect(readViewState(goodKey, 100)).toEqual({
      timeRange: { from: 1, to: 2 },
      priceRange: null,
      updatedAt: 100,
    });
    expect(readViewState('crypto|BROKEN|1h', 100)).toBeNull();
    expect(readViewState('crypto|ALSO_BROKEN|1h', 100)).toBeNull();
  });

  it('treats a non-object top-level JSON value as "no saved views"', () => {
    sessionStorageMock.setItem(ARENA_VIEW_STATE_STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(readViewState(buildViewSyncKey('crypto', 'BTCUSDT', '15m'), 1)).toBeNull();
  });
});
