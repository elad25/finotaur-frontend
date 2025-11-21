// ==================== USE MARKET DATA HOOK ====================
// Custom hook for fetching and caching market data

import { useState, useEffect, useCallback } from 'react';
import { binanceService, type Timeframe as BinanceTimeframe } from '@/services/backtest/binanceDataService';
import { polygonService } from '@/services/backtest/polygonDataService';
import { dataCacheService, type CandleData } from '@/services/backtest/dataCache';

export type DataSource = 'binance' | 'binance-futures' | 'polygon-stocks' | 'polygon-crypto' | 'polygon-forex' | 'cache';
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export interface UseMarketDataOptions {
  symbol: string;
  timeframe: Timeframe;
  source: DataSource;
  candleCount?: number;
  autoFetch?: boolean;
  useCache?: boolean;
  cacheMaxAge?: number; // milliseconds
}

export interface UseMarketDataReturn {
  data: CandleData[];
  loading: boolean;
  error: string | null;
  progress: number;
  fetchData: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearCache: () => Promise<void>;
  exportData: () => Promise<string | null>;
  importData: (jsonString: string) => Promise<void>;
}

export const useMarketData = (options: UseMarketDataOptions): UseMarketDataReturn => {
  const {
    symbol,
    timeframe,
    source,
    candleCount = 500,
    autoFetch = true,
    useCache = true,
    cacheMaxAge = 24 * 60 * 60 * 1000, // 24 hours
  } = options;

  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Map timeframe to service-specific format
   */
  const mapTimeframe = useCallback((tf: Timeframe, src: DataSource): string => {
    if (src.startsWith('polygon')) {
      const polygonMap: Record<Timeframe, string> = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '1hour',
        '4h': '4hour',
        '1d': '1day',
        '1w': '1week',
      };
      return polygonMap[tf] || '1day';
    }
    // Binance uses the same format
    return tf;
  }, []);

  /**
   * Calculate days needed based on timeframe
   */
  const calculateDays = useCallback((tf: Timeframe, count: number): number => {
    const timeframeMinutes: Record<Timeframe, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080,
    };

    const minutes = timeframeMinutes[tf] * count;
    return Math.ceil(minutes / 1440) + 1; // Add 1 day buffer
  }, []);

  /**
   * Fetch data from Binance
   */
  const fetchFromBinance = useCallback(async (isFutures: boolean): Promise<CandleData[]> => {
    setProgress(25);
    
    const candles = await binanceService.fetchHistoricalData(
      symbol,
      timeframe as BinanceTimeframe,
      candleCount,
      isFutures
    );
    
    setProgress(75);
    return candles;
  }, [symbol, timeframe, candleCount]);

  /**
   * Fetch data from Polygon
   */
  const fetchFromPolygon = useCallback(async (type: 'stocks' | 'crypto' | 'forex'): Promise<CandleData[]> => {
    setProgress(25);
    
    const interval = mapTimeframe(timeframe, source);
    const days = calculateDays(timeframe, candleCount);
    
    let candles: CandleData[];
    
    if (type === 'stocks') {
      candles = await polygonService.fetchStockData(symbol, interval, days);
    } else if (type === 'crypto') {
      candles = await polygonService.fetchCryptoData(symbol, interval, days);
    } else {
      candles = await polygonService.fetchForexData(symbol, interval, days);
    }
    
    setProgress(75);
    
    // Limit to requested count
    return candles.slice(-candleCount);
  }, [symbol, timeframe, source, candleCount, mapTimeframe, calculateDays]);

  /**
   * Main fetch function
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Check cache first if enabled
      if (useCache) {
        setProgress(10);
        
        const cacheSource = source.startsWith('binance') ? 'binance' : 'polygon';
        const isCached = await dataCacheService.isCached(symbol, timeframe, cacheSource, cacheMaxAge);
        
        if (isCached) {
          const cached = await dataCacheService.getDataset(symbol, timeframe, cacheSource);
          if (cached && cached.candles.length > 0) {
            console.log('✅ Using cached data');
            setData(cached.candles);
            setProgress(100);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch from source
      let candles: CandleData[];

      switch (source) {
        case 'binance':
          candles = await fetchFromBinance(false);
          break;
        
        case 'binance-futures':
          candles = await fetchFromBinance(true);
          break;
        
        case 'polygon-stocks':
          if (!polygonService.isConfigured()) {
            throw new Error('Polygon API key not configured. Please set VITE_POLYGON_API_KEY in your .env file');
          }
          candles = await fetchFromPolygon('stocks');
          break;
        
        case 'polygon-crypto':
          if (!polygonService.isConfigured()) {
            throw new Error('Polygon API key not configured');
          }
          candles = await fetchFromPolygon('crypto');
          break;
        
        case 'polygon-forex':
          if (!polygonService.isConfigured()) {
            throw new Error('Polygon API key not configured');
          }
          candles = await fetchFromPolygon('forex');
          break;
        
        default:
          throw new Error(`Unknown data source: ${source}`);
      }

      if (candles.length === 0) {
        throw new Error('No data returned from API');
      }

      setData(candles);
      setProgress(90);

      // Save to cache if enabled
      if (useCache) {
        const cacheSource = source.startsWith('binance') ? 'binance' : 'polygon';
        await dataCacheService.saveDataset(symbol, timeframe, cacheSource, candles);
      }

      setProgress(100);
      console.log(`✅ Fetched ${candles.length} candles for ${symbol} ${timeframe}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Error fetching market data:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, source, candleCount, useCache, cacheMaxAge, fetchFromBinance, fetchFromPolygon]);

  /**
   * Refresh data (bypass cache)
   */
  const refreshData = useCallback(async () => {
    const cacheSource = source.startsWith('binance') ? 'binance' : 'polygon';
    await dataCacheService.deleteDataset(symbol, timeframe, cacheSource);
    await fetchData();
  }, [symbol, timeframe, source, fetchData]);

  /**
   * Clear cache for this symbol/timeframe
   */
  const clearCache = useCallback(async () => {
    const cacheSource = source.startsWith('binance') ? 'binance' : 'polygon';
    await dataCacheService.deleteDataset(symbol, timeframe, cacheSource);
    console.log('🗑️ Cache cleared');
  }, [symbol, timeframe, source]);

  /**
   * Export data as JSON
   */
  const exportData = useCallback(async (): Promise<string | null> => {
    const cacheSource = source.startsWith('binance') ? 'binance' : 'polygon';
    return await dataCacheService.exportDataset(symbol, timeframe, cacheSource);
  }, [symbol, timeframe, source]);

  /**
   * Import data from JSON
   */
  const importData = useCallback(async (jsonString: string) => {
    await dataCacheService.importDataset(jsonString);
    await fetchData();
  }, [fetchData]);

  /**
   * Auto-fetch on mount if enabled
   */
  useEffect(() => {
    if (autoFetch && symbol && timeframe) {
      fetchData();
    }
  }, [symbol, timeframe, source, autoFetch]); // Intentionally exclude fetchData to avoid loops

  return {
    data,
    loading,
    error,
    progress,
    fetchData,
    refreshData,
    clearCache,
    exportData,
    importData,
  };
};