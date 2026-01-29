// =====================================================
// TopSecretDashboard - Reports Cache Hook v3.0
// 🔥 OPTIMIZED: Memory + localStorage caching
// 🔥 PERFORMANCE: Instant load from cache, background refresh
// =====================================================

import { useCallback, useRef } from 'react';
import type { Report } from '../utils/helpers';

// ========================================
// CONSTANTS
// ========================================

const REPORTS_CACHE_KEY = 'finotaur_topsecret_cache';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_VERSION = '3.0';

interface ReportsCache {
  reports: any[];
  timestamp: number;
  visibilityMode: string;
  version: string;
  lastReportId?: string;
}

// In-memory cache for instant access
const memoryCache = new Map<string, { reports: Report[]; timestamp: number }>();

// ========================================
// CACHE OPERATIONS
// ========================================

function getCacheKey(userId: string, isTester: boolean): string {
  return `${REPORTS_CACHE_KEY}_${userId}_${isTester ? 'tester' : 'regular'}`;
}

function getFromMemoryCache(key: string): Report[] | null {
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    return cached.reports;
  }
  return null;
}

function getFromLocalStorage(userId: string, isTester: boolean): Report[] | null {
  try {
    const cacheKey = `${REPORTS_CACHE_KEY}_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data: ReportsCache = JSON.parse(cached);
    const currentMode = isTester ? 'tester' : 'regular';

    // Validate cache
    if (data.version !== CACHE_VERSION) return null;
    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) return null;
    if (data.visibilityMode !== currentMode) return null;

    // Convert date strings back to Date objects
    return data.reports.map(r => ({
      ...r,
      date: new Date(r.date),
    }));
  } catch {
    return null;
  }
}

function saveToMemoryCache(key: string, reports: Report[]): void {
  memoryCache.set(key, { reports, timestamp: Date.now() });
}

function saveToLocalStorage(userId: string, reports: Report[], isTester: boolean): void {
  try {
    const cacheKey = `${REPORTS_CACHE_KEY}_${userId}`;
    const data: ReportsCache = {
      reports: reports.map(r => ({
        ...r,
        date: r.date.toISOString(),
      })),
      timestamp: Date.now(),
      visibilityMode: isTester ? 'tester' : 'regular',
      version: CACHE_VERSION,
      lastReportId: reports[0]?.id,
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (err) {
    console.warn('[Cache] Failed to save:', err);
  }
}

// ========================================
// HOOK
// ========================================

export function useReportsCache(userId: string | undefined, isTester: boolean) {
  const lastFetchRef = useRef<string>('');

  const getCachedReports = useCallback((): Report[] | null => {
    if (!userId) return null;
    
    const memKey = getCacheKey(userId, isTester);
    
    // Try memory cache first (fastest)
    const memCached = getFromMemoryCache(memKey);
    if (memCached) {
      return memCached;
    }
    
    // Fallback to localStorage
    const localCached = getFromLocalStorage(userId, isTester);
    if (localCached) {
      // Populate memory cache
      saveToMemoryCache(memKey, localCached);
      return localCached;
    }
    
    return null;
  }, [userId, isTester]);

  const setCachedReports = useCallback((reports: Report[]): void => {
    if (!userId) return;
    
    const memKey = getCacheKey(userId, isTester);
    saveToMemoryCache(memKey, reports);
    saveToLocalStorage(userId, reports, isTester);
  }, [userId, isTester]);

  const invalidateCache = useCallback((): void => {
    if (!userId) return;
    
    try {
      const cacheKey = `${REPORTS_CACHE_KEY}_${userId}`;
      localStorage.removeItem(cacheKey);
      
      // Clear memory cache for this user
      for (const key of memoryCache.keys()) {
        if (key.startsWith(cacheKey)) {
          memoryCache.delete(key);
        }
      }
    } catch {
      // Ignore errors
    }
  }, [userId]);

  const updateReportInCache = useCallback((reportId: string, updates: Partial<Report>): void => {
    if (!userId) return;
    
    const memKey = getCacheKey(userId, isTester);
    const cached = memoryCache.get(memKey);
    
    if (cached) {
      const updatedReports = cached.reports.map(r =>
        r.id === reportId ? { ...r, ...updates } : r
      );
      saveToMemoryCache(memKey, updatedReports);
      saveToLocalStorage(userId, updatedReports, isTester);
    }
  }, [userId, isTester]);

  const addReportToCache = useCallback((report: Report): void => {
    if (!userId) return;
    
    const memKey = getCacheKey(userId, isTester);
    const cached = memoryCache.get(memKey);
    
    if (cached) {
      const exists = cached.reports.some(r => r.id === report.id);
      if (!exists) {
        const updatedReports = [report, ...cached.reports].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.date.getTime() - a.date.getTime();
        });
        saveToMemoryCache(memKey, updatedReports);
        saveToLocalStorage(userId, updatedReports, isTester);
      }
    }
  }, [userId, isTester]);

  const shouldFetch = useCallback((params: string): boolean => {
    if (params === lastFetchRef.current) {
      return false;
    }
    lastFetchRef.current = params;
    return true;
  }, []);

  return {
    getCachedReports,
    setCachedReports,
    invalidateCache,
    updateReportInCache,
    addReportToCache,
    shouldFetch,
  };
}
