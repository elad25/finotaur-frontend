// lib/rate-limit/webhook-limiter.ts
import { LRUCache } from 'lru-cache';

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
  requestCount: number; // For monitoring
}

// Token bucket rate limiter with LRU cache
// More sophisticated than simple counter - allows bursts while preventing sustained abuse
const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 50000, // Support 50k active users
  ttl: 1000 * 60 * 5, // 5 minute TTL (entries auto-purge if inactive)
  updateAgeOnGet: true,
  ttlAutopurge: true,
});

// Configuration
const MAX_TOKENS = 100; // Maximum burst capacity
const REFILL_RATE = 10; // Tokens per second (600 per minute sustained)
const REFILL_INTERVAL = 100; // Refill every 100ms for smooth rate limiting

/**
 * Token bucket rate limiter
 * @param userId - User ID to rate limit
 * @param maxRequests - Legacy parameter (kept for compatibility but uses token system)
 * @returns true if request allowed, false if rate limited
 */
export function checkRateLimit(userId: string, maxRequests = 60): boolean {
  const now = Date.now();
  const key = `webhook:${userId}`;
  const entry = rateLimitCache.get(key);

  if (!entry) {
    // First request - initialize bucket with max tokens minus 1
    rateLimitCache.set(key, {
      tokens: MAX_TOKENS - 1,
      lastRefill: now,
      requestCount: 1,
    });
    return true;
  }

  // Calculate tokens to add based on time passed
  const timePassed = now - entry.lastRefill;
  const tokensToAdd = (timePassed / 1000) * REFILL_RATE;
  
  // Refill tokens (up to max)
  const currentTokens = Math.min(MAX_TOKENS, entry.tokens + tokensToAdd);
  
  // Check if user has tokens available
  if (currentTokens < 1) {
    // Update entry but don't consume token
    rateLimitCache.set(key, {
      ...entry,
      tokens: currentTokens,
      lastRefill: now,
    });
    return false; // Rate limited
  }

  // Consume one token and update entry
  rateLimitCache.set(key, {
    tokens: currentTokens - 1,
    lastRefill: now,
    requestCount: entry.requestCount + 1,
  });

  return true;
}

/**
 * Get remaining tokens for a user (for monitoring/headers)
 */
export function getRemainingTokens(userId: string): number {
  const entry = rateLimitCache.get(`webhook:${userId}`);
  if (!entry) return MAX_TOKENS;

  const now = Date.now();
  const timePassed = now - entry.lastRefill;
  const tokensToAdd = (timePassed / 1000) * REFILL_RATE;
  return Math.min(MAX_TOKENS, entry.tokens + tokensToAdd);
}

/**
 * Reset rate limit for a specific user
 */
export function resetRateLimit(userId: string): void {
  rateLimitCache.delete(`webhook:${userId}`);
}

/**
 * Get rate limiter statistics
 */
export function getRateLimitStats() {
  return {
    activeBuckets: rateLimitCache.size,
    maxBuckets: rateLimitCache.max,
    maxTokens: MAX_TOKENS,
    refillRate: REFILL_RATE,
    refillInterval: REFILL_INTERVAL,
  };
}

/**
 * Get detailed info for a specific user (for debugging)
 */
export function getUserRateLimitInfo(userId: string) {
  const entry = rateLimitCache.get(`webhook:${userId}`);
  if (!entry) {
    return {
      hasEntry: false,
      tokens: MAX_TOKENS,
      requestCount: 0,
    };
  }

  const now = Date.now();
  const timePassed = now - entry.lastRefill;
  const tokensToAdd = (timePassed / 1000) * REFILL_RATE;
  const currentTokens = Math.min(MAX_TOKENS, entry.tokens + tokensToAdd);

  return {
    hasEntry: true,
    tokens: currentTokens,
    requestCount: entry.requestCount,
    lastRefill: entry.lastRefill,
    timeSinceRefill: timePassed,
  };
}

/**
 * Clean up stale entries (optional - autopurge handles this)
 */
export function pruneStaleEntries(): number {
  const before = rateLimitCache.size;
  rateLimitCache.purgeStale();
  return before - rateLimitCache.size;
}