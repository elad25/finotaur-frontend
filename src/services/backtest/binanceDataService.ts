// ==================== BINANCE DATA SERVICE ====================
// Fetch real market data from Binance API

import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { candleFetchErrorFromResponse, candleFetchErrorFromThrown } from './errors';

const FETCH_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;

/**
 * Retry wrapper for Binance requests.
 * Retries ONLY on network errors, 5xx, 429, and 418 — never on other 4xx
 * (those are permanent, e.g. bad symbol/params). Honors Retry-After when the
 * server provides one; otherwise falls back to exponential backoff + jitter.
 */
async function fetchBinanceWithRetry(url: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(url, undefined, FETCH_TIMEOUT_MS);

      if (response.ok) return response;

      const isRetryableStatus =
        response.status === 429 || response.status === 418 || response.status >= 500;

      if (!isRetryableStatus || attempt === MAX_ATTEMPTS - 1) {
        throw await candleFetchErrorFromResponse(response);
      }

      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterMs = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : undefined;
      const backoffMs =
        Number.isFinite(retryAfterMs) && retryAfterMs !== undefined
          ? retryAfterMs
          : BASE_BACKOFF_MS * 2 ** attempt + Math.random() * 250;

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    } catch (error) {
      if (error instanceof Error && error.name === 'CandleFetchError') {
        // Already a typed, non-retryable error (e.g. symbol-not-found) —
        // surfaced from candleFetchErrorFromResponse above.
        throw error;
      }

      lastError = error;
      const typed = candleFetchErrorFromThrown(error);
      const isRetryable = typed.kind === 'network' || typed.kind === 'timeout';

      if (!isRetryable || attempt === MAX_ATTEMPTS - 1) {
        throw typed;
      }

      const backoffMs = BASE_BACKOFF_MS * 2 ** attempt + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  // Unreachable in practice — loop always returns or throws — but keep
  // TypeScript happy and preserve the last error for debugging.
  throw candleFetchErrorFromThrown(lastError);
}

export interface BinanceCandle {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w';

export class BinanceDataService {
  private baseUrl = 'https://api.binance.com/api/v3';
  private futuresUrl = 'https://fapi.binance.com/fapi/v1';

  /**
   * Fetch historical klines/candlesticks data
   * @param symbol - Trading pair (e.g., 'BTCUSDT')
   * @param interval - Timeframe (e.g., '1d', '1h', '15m')
   * @param limit - Number of candles to fetch (max 1000)
   * @param startTime - Optional start time in ms
   * @param endTime - Optional end time in ms
   * @param futures - Use futures endpoint (default: false)
   */
  async fetchKlines(
    symbol: string,
    interval: Timeframe,
    limit: number = 500,
    startTime?: number,
    endTime?: number,
    futures: boolean = false
  ): Promise<CandleData[]> {
    try {
      const baseUrl = futures ? this.futuresUrl : this.baseUrl;
      const endpoint = `${baseUrl}/klines`;
      
      const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        interval,
        limit: limit.toString(),
      });

      if (startTime) params.append('startTime', startTime.toString());
      if (endTime) params.append('endTime', endTime.toString());

      const response = await fetchBinanceWithRetry(`${endpoint}?${params}`);

      // Binance /klines returns POSITIONAL tuples, not named objects:
      // [openTime, open, high, low, close, volume, closeTime, quoteVol, trades, ...]
      // Reading named fields (candle.open) yields undefined → NaN for every OHLC.
      const data = (await response.json()) as Array<Array<string | number>>;

      const candles: CandleData[] = [];
      for (const k of data) {
        const time = Math.floor(Number(k[0]) / 1000); // openTime ms → seconds
        const open = parseFloat(String(k[1]));
        const high = parseFloat(String(k[2]));
        const low = parseFloat(String(k[3]));
        const close = parseFloat(String(k[4]));
        const volume = parseFloat(String(k[5]));

        // Drop malformed rows instead of poisoning the dataset with NaN OHLC
        // (matches the skip pattern in BinanceSource.ts).
        if (![time, open, high, low, close].every(Number.isFinite)) continue;

        candles.push({ time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 });
      }

      return candles;
    } catch (error) {
      console.error('Error fetching Binance data:', error);
      throw candleFetchErrorFromThrown(error);
    }
  }

  /**
   * Fetch multiple pages of historical data
   * Useful for getting more than 1000 candles.
   *
   * Pages BACKWARD from `endTime` (defaults to now) so callers requesting an
   * older window (e.g. "6 months ago to 3 months ago") get the correct
   * candles instead of always the most recent `totalCandles` bars. When
   * `fromMs` is provided, the loop also stops as soon as the oldest fetched
   * candle reaches or passes it — avoids over-fetching beyond the requested
   * range.
   */
  async fetchHistoricalData(
    symbol: string,
    interval: Timeframe,
    totalCandles: number,
    futures: boolean = false,
    endTimeParam: number = Date.now(),
    fromMs?: number
  ): Promise<CandleData[]> {
    const allCandles: CandleData[] = [];
    const maxLimit = 1000;
    let endTime = endTimeParam;

    while (allCandles.length < totalCandles) {
      const remaining = totalCandles - allCandles.length;
      const limit = Math.min(remaining, maxLimit);

      const candles = await this.fetchKlines(
        symbol,
        interval,
        limit,
        undefined,
        endTime,
        futures
      );

      if (candles.length === 0) break;

      allCandles.unshift(...candles);
      endTime = candles[0].time * 1000 - 1; // Move back in time

      if (fromMs !== undefined && candles[0].time * 1000 <= fromMs) break;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    return allCandles.slice(-totalCandles);
  }

  /**
   * Get current price for a symbol
   */
  async getCurrentPrice(symbol: string, futures: boolean = false): Promise<number> {
    try {
      const baseUrl = futures ? this.futuresUrl : this.baseUrl;
      const endpoint = `${baseUrl}/ticker/price`;
      
      const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
      });

      const response = await fetchBinanceWithRetry(`${endpoint}?${params}`);

      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error('Error fetching current price:', error);
      throw candleFetchErrorFromThrown(error);
    }
  }

  /**
   * Get exchange info for a symbol
   */
  async getSymbolInfo(symbol: string, futures: boolean = false) {
    try {
      const baseUrl = futures ? this.futuresUrl : this.baseUrl;
      const endpoint = `${baseUrl}/exchangeInfo`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const data = await response.json();
      const symbolInfo = data.symbols.find((s: any) => s.symbol === symbol.toUpperCase());
      
      return symbolInfo;
    } catch (error) {
      console.error('Error fetching symbol info:', error);
      throw error;
    }
  }

  /**
   * Get list of all trading pairs
   */
  async getAllSymbols(futures: boolean = false): Promise<string[]> {
    try {
      const baseUrl = futures ? this.futuresUrl : this.baseUrl;
      const endpoint = `${baseUrl}/exchangeInfo`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.symbols.map((s: any) => s.symbol);
    } catch (error) {
      console.error('Error fetching symbols:', error);
      throw error;
    }
  }

  /**
   * Calculate timeframe duration in milliseconds
   */
  getTimeframeDuration(interval: Timeframe): number {
    const durations: Record<Timeframe, number> = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };

    return durations[interval] || durations['1d'];
  }
}

// Export singleton instance
export const binanceService = new BinanceDataService();