// src/services/copilotFundamentalsApi.ts
// FINOTAUR — COPILOT per-holding fundamentals API (Phase B).
// Mirrors the auth-header pattern used by copilotSynthesisBriefApi.ts.

import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

/** Batch fetches this large are split into chunks of this size. */
const BATCH_LIMIT = 50;

/** In-memory cache TTL — 5 minutes. */
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || '';
    const accessToken = session?.access_token || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return headers;
  } catch {
    return {
      'Content-Type': 'application/json',
      'x-user-id': '',
    };
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FundamentalsGrades {
  valuation: number | null;
  growth: number | null;
  profitability: number | null;
  health: number | null;
}

export interface FundamentalsSnapshot {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  price: number | null;
  marketCap: number | null;
  peRatio: number | null;
  forwardPe: number | null;
  pegRatio: number | null;
  psRatio: number | null;
  pbRatio: number | null;
  evEbitda: number | null;
  revenueTTM: number | null;
  revenueGrowthYoy: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  epsTtm: number | null;
  epsGrowthYoy: number | null;
  dividendYield: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  fcfYield: number | null;
  high52w: number | null;
  low52w: number | null;
  grades: FundamentalsGrades;
  asOf: string;
}

export interface HoldingsFundamentalsResponse {
  fundamentals: Record<string, FundamentalsSnapshot>;
  requested: string[];
  resolved: string[];
}

// ---------------------------------------------------------------------------
// In-memory cache — 5 min TTL, keyed by uppercased symbol.
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: FundamentalsSnapshot;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return !!entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

/**
 * Fetches fundamentals snapshots for a batch of symbols, using an in-memory
 * 5-minute cache. Symbols already cached and fresh are served without a
 * network call; only missing/stale symbols trigger a request (chunked to
 * BATCH_LIMIT per call, per the server contract).
 *
 * Any symbol without available data is simply absent from the returned map
 * — callers must handle missing entries gracefully.
 */
export async function fetchHoldingsFundamentals(
  symbols: string[],
): Promise<Record<string, FundamentalsSnapshot>> {
  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).filter(Boolean);
  if (uniqueSymbols.length === 0) return {};

  const result: Record<string, FundamentalsSnapshot> = {};
  const toFetch: string[] = [];

  for (const symbol of uniqueSymbols) {
    const cached = cache.get(symbol);
    if (isFresh(cached)) {
      result[symbol] = cached.data;
    } else {
      toFetch.push(symbol);
    }
  }

  if (toFetch.length === 0) return result;

  const headers = await getAuthHeaders();
  const batches = chunk(toFetch, BATCH_LIMIT);

  for (const batch of batches) {
    try {
      const query = batch.map(encodeURIComponent).join(',');
      const response = await fetch(
        `${API_BASE}/api/ai/copilot/holdings-fundamentals?symbols=${query}`,
        { headers },
      );

      if (!response.ok) continue; // graceful degradation — missing symbols stay absent

      const payload = (await response.json()) as HoldingsFundamentalsResponse;
      const fundamentals = payload?.fundamentals ?? {};

      for (const [symbol, snapshot] of Object.entries(fundamentals)) {
        const key = symbol.toUpperCase();
        cache.set(key, { data: snapshot, fetchedAt: Date.now() });
        result[key] = snapshot;
      }
    } catch {
      // Network/parse failure — skip this batch, leave its symbols absent.
      continue;
    }
  }

  return result;
}
