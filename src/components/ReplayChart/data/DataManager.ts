// data/DataManager.ts - FIXED VERSION
import { CandlestickData } from 'lightweight-charts';
import { Timeframe } from '../types';
import { TIMEFRAME_CONFIGS } from '../constants';
import { DataFetcher } from './DataFetcher';
import { SymbolCache } from '../symbols/SymbolCache';

interface DataManagerOptions {
  useCache?: boolean;
  autoCleanCache?: boolean;
  cleanupIntervalMinutes?: number;
}

/**
 * ===================================
 * DATA MANAGER - FIXED
 * Coordinates data fetching and caching
 * ===================================
 */
export class DataManager {
  private fetcher: DataFetcher;
  private cache: SymbolCache;
  private currentSymbol: string = '';
  private currentTimeframe: Timeframe = '1h';
  private useCache: boolean;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: DataManagerOptions = {}) {
    this.fetcher = new DataFetcher();
    this.cache = new SymbolCache();
    this.useCache = options.useCache ?? true;

    if (options.autoCleanCache) {
      const intervalMs = (options.cleanupIntervalMinutes || 10) * 60 * 1000;
      this.cleanupInterval = setInterval(() => {
        this.cleanupCache();
      }, intervalMs);
    }
  }

  async fetchData(
    symbol: string,
    timeframe: Timeframe,
    options?: {
      limit?: number;
      startTime?: number;
      endTime?: number;
      forceRefresh?: boolean;
    }
  ): Promise<CandlestickData[]> {
    const { limit, startTime, endTime, forceRefresh } = options || {};

    // Check cache
    if (this.useCache && !forceRefresh && !startTime && !endTime) {
      const cached = this.cache.get(symbol, timeframe);
      if (cached) {
        this.currentSymbol = symbol;
        this.currentTimeframe = timeframe;
        return cached;
      }
    }

    // Fetch from API
    try {
      const result = await this.fetcher.fetch({
        symbol,
        timeframe,
        limit,
        startTime,
        endTime,
      });

      // Cache if no specific time range
      if (this.useCache && !startTime && !endTime) {
        this.cache.set(symbol, timeframe, result.data);
      }

      this.currentSymbol = symbol;
      this.currentTimeframe = timeframe;

      return result.data;
    } catch (error) {
      console.error('Failed to fetch data:', error);
      
      // Fallback to cache
      if (this.useCache) {
        const cached = this.cache.get(symbol, timeframe);
        if (cached) {
          console.warn('Using cached data as fallback');
          return cached;
        }
      }

      throw error;
    }
  }

  async prefetch(symbol: string, timeframe: Timeframe): Promise<void> {
    try {
      await this.fetchData(symbol, timeframe);
    } catch (error) {
      console.error('Prefetch failed:', error);
    }
  }

  async prefetchMultiple(symbols: string[], timeframe: Timeframe): Promise<void> {
    const promises = symbols.map(symbol => this.prefetch(symbol, timeframe));
    await Promise.allSettled(promises);
  }

  async refresh(): Promise<CandlestickData[]> {
    if (!this.currentSymbol || !this.currentTimeframe) {
      throw new Error('No current symbol/timeframe to refresh');
    }

    return this.fetchData(this.currentSymbol, this.currentTimeframe, {
      forceRefresh: true,
    });
  }

  getCached(symbol: string, timeframe: Timeframe): CandlestickData[] | null {
    return this.cache.get(symbol, timeframe);
  }

  isCached(symbol: string, timeframe: Timeframe): boolean {
    return this.cache.has(symbol, timeframe);
  }

  clearSymbolCache(symbol: string, timeframe?: Timeframe): void {
    if (timeframe) {
      this.cache.delete(symbol, timeframe);
    } else {
      Object.keys(TIMEFRAME_CONFIGS).forEach(tf => {
        this.cache.delete(symbol, tf as Timeframe);
      });
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  cleanupCache(): number {
    return this.cache.cleanExpired();
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  cancelFetches(symbol?: string): void {
    if (symbol) {
      this.fetcher.cancel(symbol);
    } else {
      this.fetcher.cancelAll();
    }
  }

  isLoading(symbol?: string): boolean {
    if (symbol) {
      return this.fetcher.isLoading(symbol);
    }
    return this.fetcher.getLoadingStatus().size > 0;
  }

  getCurrentSymbol(): string {
    return this.currentSymbol;
  }

  getCurrentTimeframe(): Timeframe {
    return this.currentTimeframe;
  }

  setCacheEnabled(enabled: boolean): void {
    this.useCache = enabled;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.fetcher.destroy();
    this.cache.clear();
  }
}

/**
 * ===================================
 * SINGLETON INSTANCE
 * ===================================
 */
export const dataManager = new DataManager({
  useCache: true,
  autoCleanCache: true,
  cleanupIntervalMinutes: 10,
});