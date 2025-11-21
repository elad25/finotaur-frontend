// data/DataFetcher.ts
import { CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { Candle, BinanceKline, Timeframe } from '../types';
import { API_ENDPOINTS, API_LIMITS, TIMEFRAME_CONFIGS } from '../constants';

interface FetchOptions {
  symbol: string;
  timeframe: Timeframe;
  limit?: number;
  startTime?: number;
  endTime?: number;
  retries?: number;
  timeout?: number;
}

interface FetchResult {
  data: CandlestickData[];
  symbol: string;
  timeframe: Timeframe;
  count: number;
  fromCache: boolean;
}

/**
 * ===================================
 * DATA FETCHER
 * Handles API calls with retry logic, timeout, and error handling
 * ===================================
 */
export class DataFetcher {
  private abortControllers: Map<string, AbortController> = new Map();
  private requestQueue: Map<string, Promise<CandlestickData[]>> = new Map();
  private lastRequestTime: Map<string, number> = new Map();

  /**
   * Fetch candle data with automatic retry and deduplication
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    const {
      symbol,
      timeframe,
      limit = 1000,
      startTime,
      endTime,
      retries = API_LIMITS.maxRetries,
      timeout = API_LIMITS.timeoutMs,
    } = options;

    // Create request key for deduplication
    const requestKey = this.getRequestKey(symbol, timeframe, limit, startTime, endTime);

    // If same request is in progress, return existing promise
    if (this.requestQueue.has(requestKey)) {
      const data = await this.requestQueue.get(requestKey)!;
      return {
        data,
        symbol,
        timeframe,
        count: data.length,
        fromCache: true,
      };
    }

    // Rate limiting check
    await this.enforceRateLimit(symbol);

    // Cancel any existing request for this symbol
    this.cancel(symbol);

    // Create new abort controller
    const controller = new AbortController();
    this.abortControllers.set(symbol, controller);

    // Create the fetch promise
    const fetchPromise = this.fetchWithRetry(
      symbol,
      timeframe,
      limit,
      startTime,
      endTime,
      controller.signal,
      timeout,
      retries
    );

    // Add to queue
    this.requestQueue.set(requestKey, fetchPromise);

    try {
      const data = await fetchPromise;

      // Update last request time
      this.lastRequestTime.set(symbol, Date.now());

      return {
        data,
        symbol,
        timeframe,
        count: data.length,
        fromCache: false,
      };
    } finally {
      // Clean up
      this.requestQueue.delete(requestKey);
      this.abortControllers.delete(symbol);
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    symbol: string,
    timeframe: Timeframe,
    limit: number,
    startTime: number | undefined,
    endTime: number | undefined,
    signal: AbortSignal,
    timeout: number,
    retries: number
  ): Promise<CandlestickData[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const data = await this.fetchWithTimeout(
          symbol,
          timeframe,
          limit,
          startTime,
          endTime,
          signal,
          timeout
        );

        return data;
      } catch (error) {
        lastError = error as Error;

        // Don't retry if aborted
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Failed to fetch data after retries');
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    symbol: string,
    timeframe: Timeframe,
    limit: number,
    startTime: number | undefined,
    endTime: number | undefined,
    signal: AbortSignal,
    timeout: number
  ): Promise<CandlestickData[]> {
    // Create timeout
    const timeoutId = setTimeout(() => {
      const controller = this.abortControllers.get(symbol);
      if (controller) {
        controller.abort();
      }
    }, timeout);

    try {
      // Build URL
      const url = this.buildBinanceUrl(symbol, timeframe, limit, startTime, endTime);

      // Fetch
      const response = await fetch(url, { signal });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData: BinanceKline[] = await response.json();

      // Normalize data
      return this.normalizeBinanceData(rawData);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Build Binance API URL
   */
  private buildBinanceUrl(
    symbol: string,
    timeframe: Timeframe,
    limit: number,
    startTime?: number,
    endTime?: number
  ): string {
    const config = TIMEFRAME_CONFIGS[timeframe];
    if (!config) {
      throw new Error(`Invalid timeframe: ${timeframe}`);
    }

    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      interval: config.binanceInterval || timeframe,
      limit: Math.min(limit, 1000).toString(),
    });

    if (startTime) {
      params.append('startTime', (startTime * 1000).toString());
    }

    if (endTime) {
      params.append('endTime', (endTime * 1000).toString());
    }

    return `${API_ENDPOINTS.binance.base}${API_ENDPOINTS.binance.klines}?${params.toString()}`;
  }

  /**
   * Normalize Binance data to CandlestickData format
   */
  private normalizeBinanceData(rawData: BinanceKline[]): CandlestickData[] {
    return rawData.map(candle => ({
      time: Math.floor(candle[0] / 1000) as UTCTimestamp,
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
    }));
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(symbol: string): Promise<void> {
    const lastRequest = this.lastRequestTime.get(symbol);
    if (!lastRequest) return;

    const timeSinceLastRequest = Date.now() - lastRequest;
    const minInterval = 1000 / API_LIMITS.binance.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await this.delay(waitTime);
    }
  }

  /**
   * Create request key for deduplication
   */
  private getRequestKey(
    symbol: string,
    timeframe: Timeframe,
    limit: number,
    startTime?: number,
    endTime?: number
  ): string {
    return `${symbol}-${timeframe}-${limit}-${startTime || 'none'}-${endTime || 'none'}`;
  }

  /**
   * Cancel ongoing request
   */
  cancel(symbol: string): void {
    const controller = this.abortControllers.get(symbol);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(symbol);
    }
  }

  /**
   * Cancel all ongoing requests
   */
  cancelAll(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    this.requestQueue.clear();
  }

  /**
   * Check if a request is in progress
   */
  isLoading(symbol: string): boolean {
    return this.abortControllers.has(symbol);
  }

  /**
   * Get loading status for all symbols
   */
  getLoadingStatus(): Map<string, boolean> {
    const status = new Map<string, boolean>();
    this.abortControllers.forEach((_, symbol) => {
      status.set(symbol, true);
    });
    return status;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.cancelAll();
    this.lastRequestTime.clear();
  }
}

/**
 * ===================================
 * SINGLETON INSTANCE
 * ===================================
 */
export const dataFetcher = new DataFetcher();