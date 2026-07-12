// src/components/charting/orderflow/cryptoTickSizes.ts
//
// Per-symbol crypto tick sizes — replaces sourceRegistry.ts's old flat
// 0.01-for-everything fallback. Two tiers:
//  - `getCryptoTickSize` — synchronous, hardcoded-map lookup. Safe to call
//    from anywhere (including render) with zero latency; this is what
//    sourceRegistry.ts uses for the initial/default tickSize.
//  - `refineCryptoTickSize` — async, fetches the REAL tick size from
//    Binance's exchangeInfo endpoint and caches it (in-memory +
//    localStorage, 7-day TTL). NEVER throws and NEVER blocks the caller —
//    any failure (network, parse, missing filter) resolves to the same
//    value `getCryptoTickSize` already returned, so callers can always
//    safely `await` it without try/catch.

const HARDCODED_TICK_SIZES: Record<string, number> = {
  BTCUSDT: 0.01,
  ETHUSDT: 0.01,
  BNBUSDT: 0.1,
  SOLUSDT: 0.01,
  XRPUSDT: 0.0001,
  DOGEUSDT: 0.00001,
  ADAUSDT: 0.0001,
  AVAXUSDT: 0.01,
  LINKUSDT: 0.001,
  LTCUSDT: 0.01,
};

const DEFAULT_TICK_SIZE = 0.01;

/**
 * Synchronous, hardcoded-map tick size for `symbol`. Falls back to
 * DEFAULT_TICK_SIZE (0.01) for any symbol not in the table.
 */
export function getCryptoTickSize(symbol: string): number {
  return HARDCODED_TICK_SIZES[symbol.toUpperCase()] ?? DEFAULT_TICK_SIZE;
}

// ─── Exchange-verified (refined) tick size, cached ─────────────────────────

const STORAGE_KEY = 'finotaur:arena:cryptoTicks:v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  tickSize: number;
  fetchedAt: number; // epoch ms
}

// Module-level in-memory cache — avoids re-parsing localStorage on every
// call within the same page session.
const memoryCache = new Map<string, CacheEntry>();

function readDiskCache(): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

function writeDiskCache(all: Record<string, CacheEntry>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage full / blocked — non-fatal, in-memory cache still works this session.
  }
}

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return !!entry && Number.isFinite(entry.fetchedAt) && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

/**
 * Resolves the exchange-verified tick size for `symbol` from Binance's
 * exchangeInfo endpoint (`filters[].filterType === 'PRICE_FILTER'`.tickSize),
 * with a 7-day cache (in-memory, backed by localStorage). Any failure —
 * network error, non-OK response, missing/malformed filter — resolves to
 * `getCryptoTickSize(symbol)` (the hardcoded fallback) instead of
 * rejecting, so this is always safe to `await` from a render effect.
 */
export async function refineCryptoTickSize(symbol: string): Promise<number> {
  const key = symbol.toUpperCase();
  const fallback = getCryptoTickSize(symbol);

  const memoized = memoryCache.get(key);
  if (isFresh(memoized)) return memoized.tickSize;

  const disk = readDiskCache();
  const diskEntry = disk[key];
  if (isFresh(diskEntry)) {
    memoryCache.set(key, diskEntry);
    return diskEntry.tickSize;
  }

  try {
    const res = await fetch(`https://api.binance.com/api/v3/exchangeInfo?symbol=${encodeURIComponent(key)}`);
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      symbols?: { filters?: { filterType?: string; tickSize?: string }[] }[];
    };
    const symbolInfo = Array.isArray(data.symbols) ? data.symbols[0] : undefined;
    const filters = Array.isArray(symbolInfo?.filters) ? symbolInfo!.filters! : [];
    const priceFilter = filters.find((f) => f.filterType === 'PRICE_FILTER');
    const tickSize = priceFilter ? Number(priceFilter.tickSize) : NaN;

    if (!Number.isFinite(tickSize) || tickSize <= 0) return fallback;

    const entry: CacheEntry = { tickSize, fetchedAt: Date.now() };
    memoryCache.set(key, entry);
    writeDiskCache({ ...disk, [key]: entry });
    return tickSize;
  } catch {
    return fallback;
  }
}
