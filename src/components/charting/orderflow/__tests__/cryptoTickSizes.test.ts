// src/components/charting/orderflow/__tests__/cryptoTickSizes.test.ts
//
// Coverage for the hardcoded-map fallback, Binance exchangeInfo parsing, and
// the 7-day localStorage/in-memory cache — mirrors BinanceTradeSource.test.ts's
// `vi.stubGlobal('fetch', ...)` mocking convention.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCryptoTickSize, refineCryptoTickSize } from '../cryptoTickSizes';

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

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

function exchangeInfoBody(tickSize: string) {
  return {
    symbols: [
      {
        filters: [
          { filterType: 'LOT_SIZE', stepSize: '0.001' },
          { filterType: 'PRICE_FILTER', tickSize },
        ],
      },
    ],
  };
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: makeMemoryLocalStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCryptoTickSize', () => {
  it('returns the hardcoded value for known symbols', () => {
    expect(getCryptoTickSize('BTCUSDT')).toBe(0.01);
    expect(getCryptoTickSize('XRPUSDT')).toBe(0.0001);
    expect(getCryptoTickSize('LINKUSDT')).toBe(0.001);
  });

  it('is case-insensitive', () => {
    expect(getCryptoTickSize('btcusdt')).toBe(0.01);
  });

  it('falls back to the default (0.01) for an unknown symbol', () => {
    expect(getCryptoTickSize('UNKNOWNUSDT')).toBe(0.01);
  });
});

describe('refineCryptoTickSize — parse + resolve', () => {
  it('parses PRICE_FILTER.tickSize from exchangeInfo and resolves it', async () => {
    const fetchMock = vi.fn(async (_url: string) => jsonResponse(exchangeInfoBody('0.05')));
    vi.stubGlobal('fetch', fetchMock);

    const result = await refineCryptoTickSize('BTCUSDT');
    expect(result).toBe(0.05);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('symbol=BTCUSDT');
  });

  it('falls back to the hardcoded value on a non-OK response', async () => {
    // Distinct symbol from the "parses PRICE_FILTER" test above — the
    // module-level cache is shared across tests in this file, so reusing a
    // symbol already resolved+cached there would short-circuit before
    // `fetch` is ever called and defeat this test's purpose.
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false)));
    const result = await refineCryptoTickSize('DOGEUSDT');
    expect(result).toBe(getCryptoTickSize('DOGEUSDT'));
  });

  it('falls back to the hardcoded value when the network call throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const result = await refineCryptoTickSize('ETHUSDT');
    expect(result).toBe(getCryptoTickSize('ETHUSDT'));
  });

  it('falls back to the hardcoded value when PRICE_FILTER is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ symbols: [{ filters: [{ filterType: 'LOT_SIZE', stepSize: '1' }] }] })),
    );
    const result = await refineCryptoTickSize('SOLUSDT');
    expect(result).toBe(getCryptoTickSize('SOLUSDT'));
  });

  it('falls back to the hardcoded value on a malformed (non-numeric) tickSize', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(exchangeInfoBody('not-a-number'))));
    const result = await refineCryptoTickSize('BNBUSDT');
    expect(result).toBe(getCryptoTickSize('BNBUSDT'));
  });
});

describe('refineCryptoTickSize — cache', () => {
  it('caches the resolved value in localStorage and does not re-fetch on a second call', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(exchangeInfoBody('0.02')));
    vi.stubGlobal('fetch', fetchMock);

    const first = await refineCryptoTickSize('ADAUSDT');
    const second = await refineCryptoTickSize('ADAUSDT');

    expect(first).toBe(0.02);
    expect(second).toBe(0.02);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a fresh (non-expired) localStorage cache entry is used without any fetch call', async () => {
    const localStorage = makeMemoryLocalStorage();
    localStorage.setItem(
      'finotaur:arena:cryptoTicks:v1',
      JSON.stringify({ AVAXUSDT: { tickSize: 0.03, fetchedAt: Date.now() } }),
    );
    vi.stubGlobal('window', { localStorage });

    const fetchMock = vi.fn(async () => jsonResponse(exchangeInfoBody('0.99')));
    vi.stubGlobal('fetch', fetchMock);

    const result = await refineCryptoTickSize('AVAXUSDT');
    expect(result).toBe(0.03);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('an expired (>7 day old) localStorage cache entry triggers a fresh fetch', async () => {
    const localStorage = makeMemoryLocalStorage();
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      'finotaur:arena:cryptoTicks:v1',
      JSON.stringify({ LTCUSDT: { tickSize: 0.5, fetchedAt: eightDaysAgo } }),
    );
    vi.stubGlobal('window', { localStorage });

    const fetchMock = vi.fn(async () => jsonResponse(exchangeInfoBody('0.06')));
    vi.stubGlobal('fetch', fetchMock);

    const result = await refineCryptoTickSize('LTCUSDT');
    expect(result).toBe(0.06);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
