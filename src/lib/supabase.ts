// src/lib/supabase.ts
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// Supabase Client Configuration
// ============================================

// P0.4 fix (incident 2026-05-30): when Cloudflare Pages env vars are not
// injected at build time, `import.meta.env.VITE_SUPABASE_URL` is undefined.
// The previous behaviour fell back to the literal placeholder
// `https://your-project.supabase.co` — a non-existent domain — so every
// auth request resolved to ERR_NAME_NOT_RESOLVED and the site became
// completely unusable (login, getSession, refresh all silently broken).
//
// New contract: if either env var is missing OR equals the dev-template
// placeholder, throw at module init. The module never instantiates a
// broken client. The GlobalErrorBoundary above the app then renders the
// error rather than a silently-broken login screen — and Sentry captures
// it via the boundary's reportError path. ADL-040: structural failure over
// silent fallback.
//
// The Vite build-time guard added in vite.config.ts
// (`assertSupabaseEnvAtBuild`) also blocks deploys missing these vars from
// reaching production at all.
const PLACEHOLDER_URL = 'https://your-project.supabase.co';
const PLACEHOLDER_KEY = 'your-anon-key';

const rawSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl || rawSupabaseUrl === PLACEHOLDER_URL) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL is missing or set to the placeholder. ' +
    'Set it in the Cloudflare Pages environment for the production project. ' +
    `Got: ${rawSupabaseUrl ? '(placeholder)' : '(undefined)'}`
  );
}
if (!rawSupabaseAnonKey || rawSupabaseAnonKey === PLACEHOLDER_KEY) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_ANON_KEY is missing or set to the placeholder. ' +
    'Set it in the Cloudflare Pages environment for the production project.'
  );
}

const supabaseUrl = rawSupabaseUrl;
const supabaseAnonKey = rawSupabaseAnonKey;

// Boot-time observability — URL is public, key prefix is the public anon key
// (NOT service_role). Safe to log; helps debugging stale CDN caches.
if (import.meta.env.DEV) {
  console.log('🔑 [Supabase Init] URL:', supabaseUrl);
  console.log('🔑 [Supabase Init] Anon Key loaded:', !!supabaseAnonKey);
  console.log('🔑 [Supabase Init] Key starts with:', supabaseAnonKey.substring(0, 20) + '...');
}

// ============================================
// 🔁 Transient PostgREST 503 resilience (schema-cache reload / pool contention)
// ============================================
// A PostgREST wedge returns HTTP 503 (often PGRST002 "Could not query the
// database for the schema cache. Retrying.") to ALL /rest/v1 and /auth/v1
// calls for a window (seconds→minutes) — this is what broke the app on
// 2026-07-09 while Postgres itself was fully healthy. A 503 means the request
// never reached Postgres, so retrying is safe for every HTTP method (no
// double-write). 502/504 and network errors are retried only for idempotent
// methods. This transport wrapper rides out short reloads transparently;
// longer outages still surface to React Query's own retry.
const REST_RETRY_MAX = 4;
const REST_RETRY_BASE_MS = 800;

const restRetrySleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRestRetry(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const idempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let res: Response;
    try {
      res = await fetch(input, init);
    } catch (err) {
      // Network-level failure (e.g. TypeError "Failed to fetch"). Only retry
      // idempotent methods — a mutation may have executed before the socket died.
      if (idempotent && attempt < REST_RETRY_MAX) {
        attempt += 1;
        await restRetrySleep(REST_RETRY_BASE_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 250));
        continue;
      }
      throw err;
    }

    // 503 = never executed → safe to retry for any method.
    // 502/504 = gateway may have forwarded the request → idempotent-only.
    const retryable =
      res.status === 503 || (idempotent && (res.status === 502 || res.status === 504));

    if (retryable && attempt < REST_RETRY_MAX) {
      attempt += 1;
      await restRetrySleep(REST_RETRY_BASE_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 250));
      continue;
    }
    return res;
  }
}

// 🔥 SINGLETON - instance יחיד לכל האפליקציה
let supabaseInstance: SupabaseClient | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // SSR-safe: window is undefined during the prerender build (Node).
        // supabase-js falls back to in-memory storage when this is undefined;
        // in the browser it is identical to window.localStorage.
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'finotaur-auth-token',
      },
      global: {
        headers: { 'x-client-info': 'finotaur-web@1.0.0' },
        fetch: fetchWithRestRetry,
      },
      realtime: {
        params: { eventsPerSecond: 10 }
      }
    });
  }
  return supabaseInstance;
})();

// ============================================
// 🔥 CACHE SYSTEM - In-memory cache
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class SupabaseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 30000; // 30 שניות

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  invalidate(keyPattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateMultiple(patterns: string[]): void {
    for (const pattern of patterns) {
      this.invalidate(pattern);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  startAutoCleanup(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => this.cleanupExpired(), intervalMs);
  }
}

export const supabaseCache = new SupabaseCache();

// Start auto-cleanup every minute
if (typeof window !== 'undefined') {
  supabaseCache.startAutoCleanup();
}

// ============================================
// 🔥 REQUEST DEDUPLICATION
// ============================================

const pendingRequests = new Map<string, Promise<any>>();

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = supabaseCache.get<T>(key);
  if (cached) return cached;

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = queryFn()
    .then(data => {
      supabaseCache.set(key, data, ttl);
      pendingRequests.delete(key);
      return data;
    })
    .catch(error => {
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, promise);
  return promise;
}

export function invalidateCachePatterns(...patterns: string[]): void {
  supabaseCache.invalidateMultiple(patterns);
}

// ============================================
// 🔥 NEW: REALTIME SUBSCRIPTION HELPERS
// ============================================

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: RealtimeEventType;
  new: T;
  old: T | null;
}

/**
 * Subscribe to profile changes for admin dashboard
 * Payment-provider agnostic - works with Whop, Stripe, or any provider
 */
export function subscribeToProfileChanges(
  callback: (payload: RealtimePayload) => void
): () => void {
  console.log('🔌 Setting up profile changes subscription...');
  
  const channel = supabase
    .channel('admin-profile-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
      },
      (payload) => {
        console.log('📡 Profile change received:', payload.eventType);
        callback({
          eventType: payload.eventType as RealtimeEventType,
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown> | null,
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 Realtime subscription status:', status);
    });

  // Return cleanup function
  return () => {
    console.log('🔌 Cleaning up profile changes subscription...');
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to payment history changes (optional)
 */
export function subscribeToPaymentChanges(
  callback: (payload: RealtimePayload) => void
): () => void {
  const channel = supabase
    .channel('admin-payment-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'payment_history',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as RealtimeEventType,
          new: payload.new as Record<string, unknown>,
          old: null,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// Type Definitions
// ============================================

export interface Trade {
  id?: string;
  user_id?: string;
  open_at?: string;
  close_at?: string;
  symbol?: string;
  asset_class?: string;
  side?: "LONG" | "SHORT";
  quantity?: number;
  entry_price?: number;
  stop_price?: number;
  take_profit_price?: number;
  exit_price?: number;
  fees?: number;
  fees_mode?: string;
  session?: string;
  strategy_id?: string;
  strategy_name?: string;
  setup?: string;
  notes?: string;
  mistake?: string;
  next_time?: string;
  tags?: string[];
  screenshot_url?: string;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  pnl?: number;
  quality_tag?: string;
  metrics?: {
    rr?: number;
    riskUSD?: number;
    rewardUSD?: number;
    riskPts?: number;
    rewardPts?: number;
    actual_r?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category?: string;
  timeframe?: string;
  setup_type?: string;
  default_stop_loss?: number;
  default_take_profit?: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      trades: {
        Row: Trade;
        Insert: Partial<Trade>;
        Update: Partial<Trade>;
      };
      strategies: {
        Row: Strategy;
        Insert: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Strategy, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}

export default supabase;