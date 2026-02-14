// src/services/stock-analyzer.cache.ts
// =====================================================
// 🗄️ STOCK ANALYZER — Earnings-Based Smart Cache v2.0
// =====================================================
// Strategy:
//   ✅ Company profile — Cached until next earnings
//   ✅ Financials      — Cached until next earnings
//   ✅ Analyst data    — Cached until next earnings
//   ✅ AI Brief        — Cached until next earnings
//   ✅ Options Flow    — Cached until next earnings
//   ❌ Price/quote     — NEVER cached (real-time)
//   ❌ News            — NEVER cached (real-time)
//
// How it works:
//   1. On first search, fetch next earnings date from Polygon
//   2. Store all fundamental data in localStorage with key:
//      `finotaur:TICKER:nextEarnings:2026-04-23`
//   3. On subsequent searches, check if nextEarnings date has passed
//   4. If passed → invalidate everything → re-fetch fresh data
//   5. If not passed → serve from localStorage instantly
//
// Benefits:
//   - Survives page refresh (localStorage)
//   - Survives tab switches (in-memory + localStorage)
//   - Zero API calls for cached tickers (except price)
//   - Auto-invalidates when earnings report drops
//   - Works for 10K+ users (each browser has own cache)
// =====================================================

const STORAGE_PREFIX = 'finotaur:stock:';
const EARNINGS_CACHE_PREFIX = 'finotaur:earnings:';
const FALLBACK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days fallback if no earnings date

// =====================================================
// EARNINGS DATE FETCHER
// =====================================================

interface EarningsInfo {
  nextEarningsDate: string | null; // YYYY-MM-DD
  fetchedAt: number;
}

/**
 * Fetch next earnings date from Polygon Benzinga endpoint
 * Falls back to estimating ~90 days from last filing
 */
async function fetchNextEarningsDate(ticker: string): Promise<string | null> {
  try {
    // Try Polygon Benzinga earnings endpoint
    const res = await fetch(
      `/api/market-data/earnings-date/${ticker}`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.nextEarningsDate) return data.nextEarningsDate;
    }
  } catch {
    // Silent fail
  }

  // Fallback: estimate next quarter end + 45 days (typical filing delay)
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const quarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
  const estimatedEarnings = new Date(quarterEnd.getTime() + 45 * 24 * 60 * 60 * 1000);
  
  // If estimated date is in the past, push to next quarter
  if (estimatedEarnings.getTime() < now.getTime()) {
    estimatedEarnings.setMonth(estimatedEarnings.getMonth() + 3);
  }
  
  return estimatedEarnings.toISOString().split('T')[0];
}

/**
 * Get cached earnings date or fetch fresh one
 * Earnings date itself is cached for 24h (it doesn't change often)
 */
async function getNextEarningsDate(ticker: string): Promise<string | null> {
  const key = `${EARNINGS_CACHE_PREFIX}${ticker}`;
  
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const info: EarningsInfo = JSON.parse(stored);
      const age = Date.now() - info.fetchedAt;
      
      // Refresh earnings date every 24h
      if (age < 24 * 60 * 60 * 1000 && info.nextEarningsDate) {
        return info.nextEarningsDate;
      }
    }
  } catch {
    // Corrupted data, continue to fetch
  }

  const nextDate = await fetchNextEarningsDate(ticker);
  
  try {
    localStorage.setItem(key, JSON.stringify({
      nextEarningsDate: nextDate,
      fetchedAt: Date.now(),
    }));
  } catch {
    // localStorage full, continue without caching
  }

  return nextDate;
}

// =====================================================
// CACHE ENTRY STRUCTURE
// =====================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  nextEarningsDate: string | null;
  ticker: string;
}

// =====================================================
// MAIN CACHE CLASS
// =====================================================

class StockDataCache {
  // In-memory mirror for fast access (avoids JSON.parse on every get)
  private memoryStore = new Map<string, CacheEntry<any>>();
  private maxMemorySize = 200;

  /**
   * Check if cache entry is still valid
   * Valid = next earnings date hasn't passed yet
   */
  private isValid(entry: CacheEntry<any>): boolean {
    if (!entry) return false;

    const now = new Date();
    
    // If we have an earnings date, check if it's passed
    if (entry.nextEarningsDate) {
      const earningsDate = new Date(entry.nextEarningsDate + 'T00:00:00');
      // Add 1 day buffer after earnings (data needs time to update)
      earningsDate.setDate(earningsDate.getDate() + 1);
      
      if (now >= earningsDate) {
        return false; // Earnings have passed → invalidate
      }
      return true; // Earnings haven't happened yet → cache is valid
    }
    
    // No earnings date → use fallback TTL (7 days)
    const age = Date.now() - entry.timestamp;
    return age < FALLBACK_TTL_MS;
  }

  /**
   * Get cached data if still valid
   */
  get<T>(key: string): T | null {
    // Check memory first (fast path)
    const memEntry = this.memoryStore.get(key);
    if (memEntry && this.isValid(memEntry)) {
      return memEntry.data as T;
    }

    // Check localStorage (survives page refresh)
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (this.isValid(entry)) {
          // Restore to memory for fast subsequent access
          this.memoryStore.set(key, entry);
          return entry.data;
        }
        // Expired → clean up
        localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      }
    } catch {
      // Corrupted data or localStorage unavailable
    }

    // Clean up memory too
    this.memoryStore.delete(key);
    return null;
  }

  /**
   * Store data with earnings-based expiration
   */
  set<T>(key: string, data: T, nextEarningsDate: string | null, ticker: string): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      nextEarningsDate,
      ticker,
    };

    // Store in memory
    if (this.memoryStore.size >= this.maxMemorySize) {
      const oldest = this.memoryStore.keys().next().value;
      if (oldest) this.memoryStore.delete(oldest);
    }
    this.memoryStore.set(key, entry);

    // Persist to localStorage
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // localStorage full → clear old entries and retry
      this.cleanupLocalStorage();
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
      } catch {
        // Still full, skip persistence
      }
    }
  }

  /**
   * Get data, or fetch & cache it with earnings-based TTL
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ticker: string,
    nextEarningsDate: string | null
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    if (data !== null && data !== undefined) {
      this.set(key, data, nextEarningsDate, ticker);
    }

    return data;
  }

  /**
   * Invalidate all data for a specific ticker
   * Called when earnings date has passed and we need fresh data
   */
  invalidateTicker(ticker: string): void {
    const upperTicker = ticker.toUpperCase();
    
    // Clear memory
    for (const key of this.memoryStore.keys()) {
      if (key.startsWith(upperTicker)) {
        this.memoryStore.delete(key);
      }
    }

    // Clear localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${STORAGE_PREFIX}${upperTicker}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore errors
    }

    // Also clear earnings date cache
    try {
      localStorage.removeItem(`${EARNINGS_CACHE_PREFIX}${upperTicker}`);
    } catch {
      // Ignore
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.memoryStore.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX) || key?.startsWith(EARNINGS_CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }

  /**
   * Clean up old localStorage entries when storage is full
   */
  private cleanupLocalStorage(): void {
    try {
      const entries: { key: string; timestamp: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          try {
            const val = localStorage.getItem(key);
            if (val) {
              const parsed = JSON.parse(val);
              entries.push({ key, timestamp: parsed.timestamp || 0 });
            }
          } catch {
            // Remove corrupted entries
            if (key) localStorage.removeItem(key);
          }
        }
      }
      // Remove oldest 50%
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, Math.ceil(entries.length / 2));
      toRemove.forEach(e => localStorage.removeItem(e.key));
    } catch {
      // Ignore
    }
  }

  /**
   * Get cache stats for debugging
   */
  get stats() {
    let localStorageCount = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) localStorageCount++;
      }
    } catch {
      // Ignore
    }

    return {
      memorySize: this.memoryStore.size,
      localStorageSize: localStorageCount,
      maxMemorySize: this.maxMemorySize,
    };
  }
}

// Singleton — shared across the entire app
export const stockCache = new StockDataCache();

// Export the earnings date helper for use in api.ts
export { getNextEarningsDate };