// src/lib/api.ts
// =====================================================
// FINOTAUR API HELPERS - OPTIMIZED v2.0
// =====================================================
// Added optional caching to prevent duplicate requests
// =====================================================

// ═══════════════════════════════════════════════════════════════
// CACHE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_CACHE_DURATION_MS = 60 * 1000; // 1 minute default

// ═══════════════════════════════════════════════════════════════
// CACHE HELPERS (exported for use in other modules)
// ═══════════════════════════════════════════════════════════════

export function getCached<T>(key: string, maxAge = DEFAULT_CACHE_DURATION_MS): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > maxAge) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(keyPrefix?: string): void {
  if (keyPrefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

export function getCacheAge(key: string): number | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return Date.now() - entry.timestamp;
}

// ═══════════════════════════════════════════════════════════════
// MAIN API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Simple JSON fetch without caching (original behavior)
 */
export async function getJSON<T = any>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json();
}

/**
 * JSON fetch with optional caching
 * @param url - URL to fetch
 * @param cacheKey - Optional cache key (uses URL if not provided)
 * @param cacheDuration - Cache duration in ms (default 60s)
 */
export async function getJSONCached<T = any>(
  url: string, 
  cacheKey?: string,
  cacheDuration: number = DEFAULT_CACHE_DURATION_MS
): Promise<T> {
  const key = cacheKey || url;
  
  // Check cache first
  const cached = getCached<T>(key, cacheDuration);
  if (cached !== null) {
    console.log(`[API] Cache HIT: ${key}`);
    return cached;
  }
  
  // Fetch fresh data
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  
  const data = await r.json();
  
  // Cache the result
  setCache(key, data);
  
  return data;
}

/**
 * Fetch with timeout and optional caching
 */
export async function fetchWithTimeout<T = any>(
  url: string,
  options: {
    timeout?: number;
    cacheKey?: string;
    cacheDuration?: number;
    signal?: AbortSignal;
  } = {}
): Promise<T | null> {
  const { 
    timeout = 8000, 
    cacheKey, 
    cacheDuration = DEFAULT_CACHE_DURATION_MS,
    signal 
  } = options;
  
  // Check cache first
  if (cacheKey) {
    const cached = getCached<T>(cacheKey, cacheDuration);
    if (cached !== null) {
      console.log(`[API] Cache HIT: ${cacheKey}`);
      return cached;
    }
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: signal || controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`[API] HTTP ${response.status} for ${url}`);
      return null;
    }
    
    const data = await response.json();
    
    // Cache successful response
    if (cacheKey) {
      setCache(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[API] Timeout: ${url}`);
    }
    return null;
  }
}

/**
 * Fetch multiple URLs in parallel with caching
 */
export async function fetchAllCached<T = any>(
  requests: Array<{ url: string; cacheKey: string }>
): Promise<(T | null)[]> {
  return Promise.all(
    requests.map(({ url, cacheKey }) => 
      fetchWithTimeout<T>(url, { cacheKey })
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// API BASE URL HELPER
// ═══════════════════════════════════════════════════════════════

export function getApiBase(): string {
  return import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app/api';
}

// ═══════════════════════════════════════════════════════════════
// EXPORT DEFAULT FOR BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════════

export default {
  getJSON,
  getJSONCached,
  fetchWithTimeout,
  fetchAllCached,
  getApiBase,
  getCached,
  setCache,
  clearCache,
  getCacheAge,
};