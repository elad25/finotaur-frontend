// ==================== DATA CACHE SERVICE ====================
// IndexedDB-based caching for market data
// Stores candles locally for instant replay

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CachedDataset {
  id: string;
  symbol: string;
  timeframe: string;
  source: 'binance' | 'polygon' | 'manual';
  candles: CandleData[];
  lastUpdated: number;
  metadata?: {
    startTime?: number;
    endTime?: number;
    candleCount?: number;
  };
}

interface BacktestDB extends DBSchema {
  datasets: {
    key: string;
    value: CachedDataset;
    indexes: {
      'by-symbol': string;
      'by-timeframe': string;
      'by-source': string;
      'by-updated': number;
    };
  };
}

export class DataCacheService {
  private dbName = 'finotaur-backtest';
  private version = 1;
  private db: IDBPDatabase<BacktestDB> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<BacktestDB>(this.dbName, this.version, {
        upgrade(db) {
          // Create datasets store
          if (!db.objectStoreNames.contains('datasets')) {
            const store = db.createObjectStore('datasets', { keyPath: 'id' });
            
            // Create indexes
            store.createIndex('by-symbol', 'symbol');
            store.createIndex('by-timeframe', 'timeframe');
            store.createIndex('by-source', 'source');
            store.createIndex('by-updated', 'lastUpdated');
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize cache database:', error);
      throw error;
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(symbol: string, timeframe: string, source: string): string {
    return `${source}_${symbol}_${timeframe}`.toLowerCase();
  }

  /**
   * Save dataset to cache
   */
  async saveDataset(
    symbol: string,
    timeframe: string,
    source: 'binance' | 'polygon' | 'manual',
    candles: CandleData[],
    metadata?: CachedDataset['metadata']
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = this.getCacheKey(symbol, timeframe, source);
    const dataset: CachedDataset = {
      id,
      symbol,
      timeframe,
      source,
      candles,
      lastUpdated: Date.now(),
      metadata: metadata || {
        startTime: candles[0]?.time,
        endTime: candles[candles.length - 1]?.time,
        candleCount: candles.length,
      },
    };

    try {
      await this.db.put('datasets', dataset);
      console.log(`✅ Cached ${candles.length} candles for ${symbol} ${timeframe}`);
    } catch (error) {
      console.error('Failed to save dataset:', error);
      throw error;
    }
  }

  /**
   * Get dataset from cache
   */
  async getDataset(
    symbol: string,
    timeframe: string,
    source: 'binance' | 'polygon' | 'manual'
  ): Promise<CachedDataset | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = this.getCacheKey(symbol, timeframe, source);
    
    try {
      const dataset = await this.db.get('datasets', id);
      return dataset || null;
    } catch (error) {
      console.error('Failed to get dataset:', error);
      return null;
    }
  }

  /**
   * Check if dataset exists and is fresh
   */
  async isCached(
    symbol: string,
    timeframe: string,
    source: 'binance' | 'polygon' | 'manual',
    maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): Promise<boolean> {
    const dataset = await this.getDataset(symbol, timeframe, source);
    
    if (!dataset) return false;
    
    const age = Date.now() - dataset.lastUpdated;
    return age < maxAgeMs;
  }

  /**
   * Get all cached datasets
   */
  async getAllDatasets(): Promise<CachedDataset[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      return await this.db.getAll('datasets');
    } catch (error) {
      console.error('Failed to get all datasets:', error);
      return [];
    }
  }

  /**
   * Get datasets by symbol
   */
  async getDatasetsBySymbol(symbol: string): Promise<CachedDataset[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      return await this.db.getAllFromIndex('datasets', 'by-symbol', symbol);
    } catch (error) {
      console.error('Failed to get datasets by symbol:', error);
      return [];
    }
  }

  /**
   * Delete dataset
   */
  async deleteDataset(
    symbol: string,
    timeframe: string,
    source: 'binance' | 'polygon' | 'manual'
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = this.getCacheKey(symbol, timeframe, source);
    
    try {
      await this.db.delete('datasets', id);
      console.log(`🗑️ Deleted cache for ${symbol} ${timeframe}`);
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      throw error;
    }
  }

  /**
   * Clear old datasets
   */
  async clearOldDatasets(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const datasets = await this.getAllDatasets();
    const cutoff = Date.now() - maxAgeMs;
    let deletedCount = 0;

    for (const dataset of datasets) {
      if (dataset.lastUpdated < cutoff) {
        await this.db.delete('datasets', dataset.id);
        deletedCount++;
      }
    }

    console.log(`🗑️ Cleared ${deletedCount} old datasets`);
    return deletedCount;
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.clear('datasets');
      console.log('🗑️ Cleared all cached datasets');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalDatasets: number;
    totalCandles: number;
    totalSizeBytes: number;
    oldestDataset: number | null;
    newestDataset: number | null;
    sources: Record<string, number>;
  }> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const datasets = await this.getAllDatasets();
    
    let totalCandles = 0;
    let totalSizeBytes = 0;
    let oldestDataset: number | null = null;
    let newestDataset: number | null = null;
    const sources: Record<string, number> = {};

    for (const dataset of datasets) {
      totalCandles += dataset.candles.length;
      totalSizeBytes += JSON.stringify(dataset.candles).length;
      
      if (!oldestDataset || dataset.lastUpdated < oldestDataset) {
        oldestDataset = dataset.lastUpdated;
      }
      
      if (!newestDataset || dataset.lastUpdated > newestDataset) {
        newestDataset = dataset.lastUpdated;
      }
      
      sources[dataset.source] = (sources[dataset.source] || 0) + 1;
    }

    return {
      totalDatasets: datasets.length,
      totalCandles,
      totalSizeBytes,
      oldestDataset,
      newestDataset,
      sources,
    };
  }

  /**
   * Export dataset as JSON
   */
  async exportDataset(
    symbol: string,
    timeframe: string,
    source: 'binance' | 'polygon' | 'manual'
  ): Promise<string | null> {
    const dataset = await this.getDataset(symbol, timeframe, source);
    
    if (!dataset) return null;
    
    return JSON.stringify(dataset, null, 2);
  }

  /**
   * Import dataset from JSON
   */
  async importDataset(jsonString: string): Promise<void> {
    try {
      const dataset: CachedDataset = JSON.parse(jsonString);
      
      // Validate dataset
      if (!dataset.id || !dataset.symbol || !dataset.timeframe || !dataset.candles) {
        throw new Error('Invalid dataset format');
      }
      
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
      
      await this.db.put('datasets', dataset);
      console.log(`✅ Imported dataset for ${dataset.symbol} ${dataset.timeframe}`);
    } catch (error) {
      console.error('Failed to import dataset:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dataCacheService = new DataCacheService();