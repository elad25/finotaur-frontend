// src/features/options-ai/services/blockTrades.service.ts
// =====================================================
// BLOCK TRADES — Frontend Service
// =====================================================
// Calls backend at /api/options-ai/block-trades
// Transforms response → BlockTrade[] for FlowTab
// Lightweight frontend cache for tab switching
// =====================================================

import type { BlockTrade } from '../types/options-ai.types';

// ── Types from backend ──
interface BackendBlock {
  id: string;
  symbol: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  premium: string;
  premiumRaw: number;
  premiumTier: '100K' | '500K' | '1M';
  legType: 'single' | 'spread' | 'sweep';
  side: 'buy' | 'sell';
  signal: 'LONG' | 'SHORT';
  volume: number;
  openInterest: number;
  volOiRatio: number;
  timestamp: string;
  aiInsight: string;
  isETF: boolean;
  stockPrice: number;
  stockChange: number;
}

interface BackendBlockResponse {
  blocks: BackendBlock[];
  summary: {
    totalPremium: string;
    totalPremiumRaw: number;
    longPremium: string;
    shortPremium: string;
    longPercent: number;
    shortPercent: number;
    blockCount: number;
    uniqueTickers: number;
    topTickers: { symbol: string; totalPremium: string; bias: string; blockCount: number }[];
    sectorBreakdown: Record<string, number>;
    narrative: string;
  } | null;
  meta: {
    tickersScanned: number;
    totalBlocksFound: number;
    blocksReturned: number;
    apiCalls: number;
    scanDurationMs: number;
    timestamp: string;
    isDelayed: boolean;
  };
}

// ── Frontend cache ──
let cachedResult: { data: BlockTrade[]; meta: BackendBlockResponse['meta']; summary: BackendBlockResponse['summary']; ts: number } | null = null;
const FRONTEND_CACHE_TTL = 2 * 60 * 1000; // 2 min

// ── API Base ──
const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Fetch with retry ──
async function fetchWithRetry<T>(path: string, signal?: AbortSignal, retries = 2): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { Accept: 'application/json' },
        signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`);
      }
      return await res.json();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      lastError = e instanceof Error ? e : new Error(String(e));
      if (i < retries) {
        await new Promise(r => setTimeout(r, 800 * (2 ** i)));
      }
    }
  }
  throw lastError;
}

// ── Transform backend → frontend type ──
function transformBlock(b: BackendBlock): BlockTrade {
  return {
    id: b.id,
    symbol: b.symbol,
    type: b.type,
    strike: b.strike,
    expiry: b.expiry,
    premium: b.premium,
    premiumRaw: b.premiumRaw,
    premiumTier: b.premiumTier,
    legType: b.legType,
    side: b.side,
    signal: b.signal,
    volume: b.volume,
    openInterest: b.openInterest,
    volOiRatio: b.volOiRatio,
    timestamp: b.timestamp,
    aiInsight: b.aiInsight,
    isETF: b.isETF,
    stockPrice: b.stockPrice,
    stockChange: b.stockChange,
  };
}

// ╔══════════════════════════════════════════════════════╗
// ║  PUBLIC API                                          ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Fetch block trades from backend (real Polygon data).
 * Returns BlockTrade[] compatible with FlowTab.
 *
 * @param tickers - Optional list of tickers to scan (defaults to server watchlist)
 * @param signal - AbortSignal for cancellation
 */
export async function fetchBlockTradesLive(
  tickers?: string[],
  signal?: AbortSignal,
): Promise<{
  blocks: BlockTrade[];
  summary: BackendBlockResponse['summary'];
  meta: BackendBlockResponse['meta'];
}> {
  // Check frontend cache
  if (cachedResult && Date.now() - cachedResult.ts < FRONTEND_CACHE_TTL) {
    return { blocks: cachedResult.data, summary: cachedResult.summary, meta: cachedResult.meta };
  }

  const query = tickers?.length ? `?tickers=${tickers.join(',')}` : '';
  const response = await fetchWithRetry<BackendBlockResponse>(
    `/api/options-ai/block-trades${query}`,
    signal,
  );

  const blocks = response.blocks.map(transformBlock);

  // Cache
  cachedResult = { data: blocks, meta: response.meta, summary: response.summary, ts: Date.now() };

  return { blocks, meta: response.meta, summary: response.summary };
}

/**
 * Fetch block trades for a single ticker
 */
export async function fetchBlockTradesForTicker(
  ticker: string,
  signal?: AbortSignal,
): Promise<BlockTrade[]> {
  const response = await fetchWithRetry<BackendBlockResponse>(
    `/api/options-ai/block-trades/ticker/${ticker}`,
    signal,
  );
  return response.blocks.map(transformBlock);
}

/**
 * Clear frontend cache (call after manual refresh)
 */
export function clearBlockTradesCache(): void {
  cachedResult = null;
}