// ============================================================================
// INDEXEDDB SERVICE - Offline Data Caching with Dexie
// ============================================================================

import Dexie, { Table } from 'dexie';
import type { Candle, Timeframe, CandleBuffer } from '../../types';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

interface CandleRecord {
  id: string; // `${symbol}_${timeframe}_${timestamp}`
  symbol: string;
  timeframe: Timeframe;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandleBufferRecord {
  id: string; // `${symbol}_${timeframe}`
  symbol: string;
  timeframe: Timeframe;
  data: Float64Array;
  count: number;
  lastUpdate: number;
}

interface MetadataRecord {
  key: string;
  value: any;
  lastUpdate: number;
}

class FinotaurDatabase extends Dexie {
  candles!: Table<CandleRecord, string>;
  candleBuffers!: Table<CandleBufferRecord, string>;
  metadata!: Table<MetadataRecord, string>;
  
  constructor() {
    super('FinotaurBacktest');
    
    this.version(1).stores({
      candles: 'id, symbol, timeframe, timestamp',
      candleBuffers: 'id, symbol, timeframe, lastUpdate',
      metadata: 'key, lastUpdate',
    });
  }
}

const db = new FinotaurDatabase();

// ============================================================================
// INDEXEDDB SERVICE
// ============================================================================

class IndexedDBService {
  /**
   * Store candles (batch insert for performance)
   */
  async storeCandles(
    symbol: string,
    timeframe: Timeframe,
    candles: Candle[]
  ): Promise<void> {
    const records: CandleRecord[] = candles.map(candle => ({
      id: `${symbol}_${timeframe}_${candle.time}`,
      symbol,
      timeframe,
      timestamp: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));
    
    // Bulk insert (much faster than individual inserts)
    await db.candles.bulkPut(records);
    
    console.log(`✅ Cached ${records.length} candles for ${symbol} ${timeframe}`);
  }
  
  /**
   * Get candles in time range
   */
  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    from: number,
    to: number
  ): Promise<Candle[] | null> {
    try {
      const fromSeconds = Math.floor(from / 1000);
      const toSeconds = Math.floor(to / 1000);
      
      const records = await db.candles
        .where('symbol').equals(symbol)
        .and(record => 
          record.timeframe === timeframe &&
          record.timestamp >= fromSeconds &&
          record.timestamp <= toSeconds
        )
        .sortBy('timestamp');
      
      if (records.length === 0) {
        return null;
      }
      
      return records.map(record => ({
        time: record.timestamp,
        open: record.open,
        high: record.high,
        low: record.low,
        close: record.close,
        volume: record.volume,
      }));
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  }
  
  /**
   * Store candles as binary buffer (more efficient)
   */
  async storeCandleBuffer(
    symbol: string,
    timeframe: Timeframe,
    candles: Candle[]
  ): Promise<void> {
    // Convert to Float64Array for efficient storage
    const buffer = new Float64Array(candles.length * 6); // 6 values per candle
    
    candles.forEach((candle, i) => {
      const offset = i * 6;
      buffer[offset] = candle.time;
      buffer[offset + 1] = candle.open;
      buffer[offset + 2] = candle.high;
      buffer[offset + 3] = candle.low;
      buffer[offset + 4] = candle.close;
      buffer[offset + 5] = candle.volume;
    });
    
    const record: CandleBufferRecord = {
      id: `${symbol}_${timeframe}`,
      symbol,
      timeframe,
      data: buffer,
      count: candles.length,
      lastUpdate: Date.now(),
    };
    
    await db.candleBuffers.put(record);
    
    console.log(`✅ Cached ${candles.length} candles as binary buffer (${buffer.byteLength} bytes)`);
  }
  
  /**
   * Get candles from binary buffer
   */
  async getCandleBuffer(
    symbol: string,
    timeframe: Timeframe
  ): Promise<Candle[] | null> {
    try {
      const record = await db.candleBuffers.get(`${symbol}_${timeframe}`);
      
      if (!record) {
        return null;
      }
      
      // Convert Float64Array back to candles
      const candles: Candle[] = [];
      for (let i = 0; i < record.count; i++) {
        const offset = i * 6;
        candles.push({
          time: record.data[offset],
          open: record.data[offset + 1],
          high: record.data[offset + 2],
          low: record.data[offset + 3],
          close: record.data[offset + 4],
          volume: record.data[offset + 5],
        });
      }
      
      return candles;
    } catch (error) {
      console.error('IndexedDB buffer get error:', error);
      return null;
    }
  }
  
  /**
   * Delete old candles to free space
   */
  async deleteOldCandles(
    symbol: string,
    timeframe: Timeframe,
    beforeTimestamp: number
  ): Promise<void> {
    await db.candles
      .where('symbol').equals(symbol)
      .and(record => 
        record.timeframe === timeframe &&
        record.timestamp < beforeTimestamp
      )
      .delete();
    
    console.log(`🗑️ Deleted old candles before ${new Date(beforeTimestamp * 1000).toISOString()}`);
  }
  
  /**
   * Clear all data for a symbol
   */
  async clearSymbol(symbol: string): Promise<void> {
    await db.candles.where('symbol').equals(symbol).delete();
    await db.candleBuffers.where('symbol').equals(symbol).delete();
    
    console.log(`🗑️ Cleared all data for ${symbol}`);
  }
  
  /**
   * Get database size
   */
  async getDatabaseSize(): Promise<{
    candles: number;
    buffers: number;
    total: number;
  }> {
    const candlesCount = await db.candles.count();
    const buffersCount = await db.candleBuffers.count();
    
    // Estimate size (rough calculation)
    const candlesSize = candlesCount * 48; // ~48 bytes per candle record
    const buffersSize = buffersCount * 1000 * 48; // Assuming avg 1000 candles per buffer
    
    return {
      candles: candlesCount,
      buffers: buffersCount,
      total: candlesSize + buffersSize,
    };
  }
  
  /**
   * Store metadata
   */
  async setMetadata(key: string, value: any): Promise<void> {
    await db.metadata.put({
      key,
      value,
      lastUpdate: Date.now(),
    });
  }
  
  /**
   * Get metadata
   */
  async getMetadata(key: string): Promise<any | null> {
    const record = await db.metadata.get(key);
    return record?.value || null;
  }
  
  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await db.candles.clear();
    await db.candleBuffers.clear();
    await db.metadata.clear();
    
    console.log('🗑️ Cleared all IndexedDB data');
  }
  
  /**
   * Export data as JSON
   */
  async exportData(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
    const records = await db.candles
      .where('symbol').equals(symbol)
      .and(record => record.timeframe === timeframe)
      .sortBy('timestamp');
    
    return records.map(record => ({
      time: record.timestamp,
      open: record.open,
      high: record.high,
      low: record.low,
      close: record.close,
      volume: record.volume,
    }));
  }
  
  /**
   * Import data from JSON
   */
  async importData(
    symbol: string,
    timeframe: Timeframe,
    candles: Candle[]
  ): Promise<void> {
    await this.storeCandles(symbol, timeframe, candles);
    console.log(`📥 Imported ${candles.length} candles`);
  }
  
  /**
   * Check if data exists for symbol/timeframe
   */
  async hasData(symbol: string, timeframe: Timeframe): Promise<boolean> {
    const count = await db.candles
      .where('symbol').equals(symbol)
      .and(record => record.timeframe === timeframe)
      .count();
    
    return count > 0;
  }
  
  /**
   * Get last candle timestamp
   */
  async getLastCandleTimestamp(
    symbol: string,
    timeframe: Timeframe
  ): Promise<number | null> {
    const records = await db.candles
      .where('symbol').equals(symbol)
      .and(record => record.timeframe === timeframe)
      .reverse()
      .limit(1)
      .toArray();
    
    return records[0]?.timestamp || null;
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
export default indexedDBService;