import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BinanceDataService } from '../binanceDataService';
import { CandleFetchError } from '../errors';

// Helper to build a Binance kline row (positional tuple).
function klineRow(openTimeMs: number, o: number, h: number, l: number, c: number, v = 1): (string | number)[] {
  return [openTimeMs, String(o), String(h), String(l), String(c), String(v), openTimeMs + 999, '0', 1, '0', '0', '0'];
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('BinanceDataService', () => {
  let service: BinanceDataService;

  beforeEach(() => {
    service = new BinanceDataService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('retries after 429 honoring Retry-After, then succeeds on the 2nd attempt', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      new Response('rate limited', { status: 429, headers: { 'Retry-After': '1' } }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse([klineRow(1_000_000, 1, 2, 0.5, 1.5)]));
    vi.stubGlobal('fetch', fetchMock);

    const promise = service.fetchKlines('BTCUSDT', '1h', 10);

    // Allow the first attempt's rejection + backoff timer to be scheduled.
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ open: 1, high: 2, low: 0.5, close: 1.5 });
  });

  it('does not retry on 400 and throws CandleFetchError with kind symbol-not-found', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: -1121, msg: 'Invalid symbol.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.fetchKlines('NOTREAL', '1h', 10)).rejects.toMatchObject({
      kind: 'symbol-not-found',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps an aborted fetch (AbortError) to a CandleFetchError with kind timeout', async () => {
    // fetchKlines' internal retry wrapper always uses a real 15s timeout via
    // fetchWithTimeout, which is impractical to fast-forward with fake timers
    // (AbortController's own timer doesn't advance with vi.useFakeTimers()).
    // Instead, verify the exact mapping BinanceDataService relies on: a fetch
    // that rejects with an AbortError is translated to kind 'timeout' via
    // candleFetchErrorFromThrown — the same function fetchKlines' catch calls.
    vi.useRealTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.fetchKlines('BTCUSDT', '1h', 10)).rejects.toMatchObject({
      kind: 'timeout',
    } as Partial<CandleFetchError>);
  });

  it('filters out rows with non-finite time/OHLC', async () => {
    const goodRow = klineRow(1_000_000, 1, 2, 0.5, 1.5);
    const badRow = [1_001_000, 'not-a-number', '2', '0.5', '1.5', '1', 1_001_999, '0', 1, '0', '0', '0'];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([goodRow, badRow]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await service.fetchKlines('BTCUSDT', '1h', 10);

    expect(result).toHaveLength(1);
    expect(result[0].open).toBe(1);
  });

  it('fetchHistoricalData respects endTime and stops paging at fromMs', async () => {
    // Page 1 (most recent, ending at endTime): candles at t=3000s..3999s (limit small for the test)
    // Page 2 (older): candles at t=1000s..1999s, oldest candle time*1000 <= fromMs -> loop stops.
    const page1 = [klineRow(3_000_000, 10, 11, 9, 10.5)];
    const page2 = [klineRow(1_000_000, 5, 6, 4, 5.5)];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(page1))
      .mockResolvedValueOnce(jsonResponse(page2));
    vi.stubGlobal('fetch', fetchMock);

    const endTime = 3_999_999;
    const fromMs = 1_500_000; // page2's candle time*1000 (1_000_000) <= fromMs -> stop after page2

    const promise = service.fetchHistoricalData('BTCUSDT', '1h', 5, false, endTime, fromMs);
    // Rate-limit delay (250ms) between pages inside the loop.
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // First call must have used the provided endTime.
    const firstCallUrl = String(fetchMock.mock.calls[0][0]);
    expect(firstCallUrl).toContain(`endTime=${endTime}`);

    expect(result.map((c) => c.time)).toEqual([1000, 3000]);
  });
});
