import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the data cache module BEFORE importing candleSource (hoisted by vitest).
vi.mock('../dataCache', async () => {
  const actual = await vi.importActual<typeof import('../dataCache')>('../dataCache');
  return {
    ...actual,
    dataCacheService: {
      getDataset: vi.fn(),
      saveDataset: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock BinanceDataService's network methods so getCandles never hits the network.
const fetchKlinesMock = vi.fn();
const fetchHistoricalDataMock = vi.fn();
vi.mock('../binanceDataService', async () => {
  const actual = await vi.importActual<typeof import('../binanceDataService')>('../binanceDataService');
  class MockBinanceDataService extends actual.BinanceDataService {
    fetchKlines = fetchKlinesMock;
    fetchHistoricalData = fetchHistoricalDataMock;
  }
  return { ...actual, BinanceDataService: MockBinanceDataService };
});

import { BinanceCandleSource } from '../candleSource';
import { dataCacheService } from '../dataCache';

const HOUR_MS = 60 * 60 * 1000;

function fakeNetworkCandles(fromSec: number, toSec: number, stepSec: number) {
  const out = [];
  for (let t = fromSec; t <= toSec; t += stepSec) {
    out.push({ time: t, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 });
  }
  return out;
}

describe('BinanceCandleSource.getCandles — cache coverage matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchKlinesMock.mockResolvedValue(fakeNetworkCandles(1000, 100_000, 3600));
    fetchHistoricalDataMock.mockResolvedValue(fakeNetworkCandles(1000, 100_000, 3600));
  });

  it('serves from cache when it fully covers the requested range', async () => {
    const now = Date.now();
    (dataCacheService.getDataset as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'binance_btcusdt_1h',
      symbol: 'BTCUSDT',
      timeframe: '1h',
      source: 'binance',
      candles: fakeNetworkCandles(0, 200_000, 3600),
      lastUpdated: now, // fresh
    });

    const source = new BinanceCandleSource();
    const result = await source.getCandles('BTCUSDT', '1h', 10_000 * 1000, 90_000 * 1000);

    expect(result.length).toBeGreaterThan(0);
    expect(fetchKlinesMock).not.toHaveBeenCalled();
    expect(fetchHistoricalDataMock).not.toHaveBeenCalled();
  });

  it('falls through to network when cache only partially covers the range', async () => {
    const now = Date.now();
    (dataCacheService.getDataset as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'binance_btcusdt_1h',
      symbol: 'BTCUSDT',
      timeframe: '1h',
      source: 'binance',
      // Cache only has recent data; request asks for a much older range.
      candles: fakeNetworkCandles(80_000, 100_000, 3600),
      lastUpdated: now,
    });

    const source = new BinanceCandleSource();
    const from = 0;
    const to = 90_000 * 1000;
    await source.getCandles('BTCUSDT', '1h', from, to);

    const networkCalled = fetchKlinesMock.mock.calls.length > 0 || fetchHistoricalDataMock.mock.calls.length > 0;
    expect(networkCalled).toBe(true);
  });

  it('falls through to network for a `to ~ now` request even when a stale-ish cache exists but lacks recent coverage', async () => {
    const now = Date.now();
    (dataCacheService.getDataset as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'binance_btcusdt_1h',
      symbol: 'BTCUSDT',
      timeframe: '1h',
      source: 'binance',
      // Cache's last candle is far in the past relative to "now".
      candles: fakeNetworkCandles(0, 1000, 3600),
      lastUpdated: now, // fresh by age, but doesn't cover "to ~ now"
    });

    const source = new BinanceCandleSource();
    const nowMs = Date.now();
    await source.getCandles('BTCUSDT', '1h', nowMs - 10 * HOUR_MS, nowMs);

    const networkCalled = fetchKlinesMock.mock.calls.length > 0 || fetchHistoricalDataMock.mock.calls.length > 0;
    expect(networkCalled).toBe(true);
  });

  it('passes `to` as endTime into fetchHistoricalData for large ranges', async () => {
    (dataCacheService.getDataset as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const source = new BinanceCandleSource();
    const from = 0;
    // Force estimatedBars > 1000 for 1m timeframe over a long range.
    const to = 2000 * 60 * 1000 * 1000; // large enough to exceed 1000 bars at 1m
    await source.getCandles('BTCUSDT', '1m', from, to);

    expect(fetchHistoricalDataMock).toHaveBeenCalled();
    const args = fetchHistoricalDataMock.mock.calls[0];
    // (symbol, interval, totalCandles, futures, endTime, fromMs)
    expect(args[4]).toBe(to);
    expect(args[5]).toBe(from);
  });
});
