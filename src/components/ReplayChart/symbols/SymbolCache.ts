// symbols/SymbolCache.ts
import { CandlestickData } from 'lightweight-charts';
import { CACHE_SETTINGS } from '../constants'; // ✅ תוקן
import { CacheEntry, CacheStats } from '../types'; // ✅ נוסף

interface CacheEntryInternal {
  data: CandlestickData[];
  timestamp: number;
  symbol: string;
  timeframe: string;
  sizeBytes: number;
}

/**
 * ===================================
 * SYMBOL CACHE
 * Advanced caching with memory management
 * ===================================
 */
export class SymbolCache {
  private cache: Map<string, CacheEntryInternal> = new Map();
  private maxSize: number;
  private ttlMs: number;
  private maxMemoryBytes: number;
  
  // Statistics
  private hits = 0;
  private misses = 0;
  private currentMemoryBytes = 0;

  constructor(
    maxSize: number = CACHE_SETTINGS.maxSymbols,
    ttlMinutes: number = CACHE_SETTINGS.ttlMinutes,
    maxMemoryMB: number = CACHE_SETTINGS.maxMemoryMB
  ) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
  }

  /**
   * Create unique cache key
   */
  private getKey(symbol: string, timeframe: string): string {
    return `${symbol}-${timeframe}`;
  }

  /**
   * Estimate entry size in bytes
   */
  private estimateSize(data: CandlestickData[]): number {
    // Each candle: time(4) + open(8) + high(8) + low(8) + close(8) = 36 bytes
    // Add overhead for object structure
    return data.length * 36 + 100;
  }

  /**
   * Check if entry exists and is valid
   */
  has(symbol: string, timeframe: string): boolean {
    const key = this.getKey(symbol, timeframe);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return false;
    }

    // Check expiration
    const isExpired = Date.now() - entry.timestamp > this.ttlMs;
    if (isExpired) {
      this.delete(symbol, timeframe);
      this.misses++;
      return false;
    }

    this.hits++;
    return true;
  }

  /**
   * Get cached data
   */
  get(symbol: string, timeframe: string): CandlestickData[] | null {
    if (!this.has(symbol, timeframe)) {
      return null;
    }

    const key = this.getKey(symbol, timeframe);
    const entry = this.cache.get(key);
    
    return entry ? [...entry.data] : null; // Return copy
  }

  /**
   * Set cached data
   */
  set(symbol: string, timeframe: string, data: CandlestickData[]): void {
    const key = this.getKey(symbol, timeframe);
    const sizeBytes = this.estimateSize(data);

    // Check memory limit
    if (this.currentMemoryBytes + sizeBytes > this.maxMemoryBytes) {
      this.evictToFreeMemory(sizeBytes);
    }

    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentMemoryBytes -= oldEntry.sizeBytes;
    }

    // Add new entry
    const entry: CacheEntryInternal = {
      data: [...data], // Store copy
      timestamp: Date.now(),
      symbol,
      timeframe,
      sizeBytes,
    };

    this.cache.set(key, entry);
    this.currentMemoryBytes += sizeBytes;
  }

  /**
   * Delete specific entry
   */
  delete(symbol: string, timeframe: string): void {
    const key = this.getKey(symbol, timeframe);
    const entry = this.cache.get(key);
    
    if (entry) {
      this.currentMemoryBytes -= entry.sizeBytes;
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.currentMemoryBytes -= entry.sizeBytes;
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Evict entries to free memory
   */
  private evictToFreeMemory(neededBytes: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedBytes = 0;
    
    for (const [key, entry] of entries) {
      if (freedBytes >= neededBytes) break;
      
      this.cache.delete(key);
      this.currentMemoryBytes -= entry.sizeBytes;
      freedBytes += entry.sizeBytes;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    
    return {
      totalEntries: this.cache.size,
      totalMemoryMB: this.currentMemoryBytes / (1024 * 1024),
      hitRate: totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.misses / totalRequests) * 100 : 0,
    };
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        this.currentMemoryBytes -= entry.sizeBytes;
        cleaned++;
      }
    });

    return cleaned;
  }

  /**
   * Prefetch data (mark as accessed)
   */
  touch(symbol: string, timeframe: string): void {
    const key = this.getKey(symbol, timeframe);
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.timestamp = Date.now();
    }
  }
}

/**
 * ===================================
 * SINGLETON INSTANCE
 * ===================================
 */
export const symbolCache = new SymbolCache();