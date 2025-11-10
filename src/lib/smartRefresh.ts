import { supabase } from '@/lib/supabase';

// Cache לשמירת מצב הרענון
const refreshCache = new Map<string, {
  isRefreshing: boolean;
  lastRefresh: number;
  promise: Promise<void> | null;
}>();

/**
 * 🔄 רענון חכם עם Lock - מונע כפילויות
 */
export async function smartRefresh(
  viewName: 'webhook_stats' | 'strategy_stats_view',
  maxAgeMinutes: number = 5
): Promise<{ success: boolean; fromCache: boolean; duration?: number }> {
  
  const now = Date.now();
  const storageKey = `${viewName}_last_refresh`;
  
  // בדיקה 1: האם רענון כבר רץ?
  let cacheEntry = refreshCache.get(viewName);
  
  if (!cacheEntry) {
    cacheEntry = {
      isRefreshing: false,
      lastRefresh: parseInt(localStorage.getItem(storageKey) || '0'),
      promise: null
    };
    refreshCache.set(viewName, cacheEntry);
  }
  
  // בדיקה 2: האם הנתונים עדיין טריים?
  const age = now - cacheEntry.lastRefresh;
  const maxAge = maxAgeMinutes * 60 * 1000;
  
  if (age < maxAge) {
    console.log(`✅ ${viewName} is fresh (${Math.round(age / 1000)}s old)`);
    return { success: true, fromCache: true };
  }
  
  // בדיקה 3: האם רענון כבר רץ עכשיו?
  if (cacheEntry.isRefreshing && cacheEntry.promise) {
    console.log(`⏳ ${viewName} refresh already in progress, waiting...`);
    await cacheEntry.promise;
    return { success: true, fromCache: true };
  }
  
  // הפעלת רענון חדש
  console.log(`🔄 Starting ${viewName} refresh...`);
  cacheEntry.isRefreshing = true;
  
  const startTime = Date.now();
  
  const refreshPromise = (async () => {
    try {
      const functionName = viewName === 'webhook_stats' 
        ? 'refresh_webhook_stats'
        : 'refresh_strategy_stats';
      
      const { error } = await supabase.rpc(functionName);
      
      if (error) throw error;
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${viewName} refreshed in ${duration}ms`);
      
      // עדכון Cache
      cacheEntry!.lastRefresh = Date.now();
      cacheEntry!.isRefreshing = false;
      cacheEntry!.promise = null;
      localStorage.setItem(storageKey, Date.now().toString());
      
      return duration;
    } catch (error) {
      console.error(`❌ Failed to refresh ${viewName}:`, error);
      cacheEntry!.isRefreshing = false;
      cacheEntry!.promise = null;
      throw error;
    }
  })();
  
  cacheEntry.promise = refreshPromise.then(() => {});
  
  const duration = await refreshPromise;
  
  return { success: true, fromCache: false, duration };
}

// 🆕 פונקציה חדשה: Invalidate Cache
/**
 * 🗑️ מחיקת cache - כדי לכפות רענון בפעם הבאה
 */
export function invalidateCache(
  viewName: 'webhook_stats' | 'strategy_stats_view' | 'all'
) {
  if (viewName === 'all') {
    // מחק הכל
    localStorage.removeItem('webhook_stats_last_refresh');
    localStorage.removeItem('strategy_stats_view_last_refresh');
    refreshCache.clear();
    console.log('🗑️ All caches invalidated');
  } else {
    // מחק ספציפי
    localStorage.removeItem(`${viewName}_last_refresh`);
    refreshCache.delete(viewName);
    console.log(`🗑️ ${viewName} cache invalidated`);
  }
}