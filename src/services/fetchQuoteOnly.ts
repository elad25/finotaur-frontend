// src/services/fetchQuoteOnly.ts
// =====================================================
// ⚡ LIGHTWEIGHT QUOTE-ONLY FETCH
// =====================================================
// Used by usePricePolling to refresh ONLY price data
// without re-fetching company, financials, analyst, etc.
// =====================================================

export interface QuoteUpdate {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  previousClose: number;
  marketStatus: string;
  lastUpdated: string;
}

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api/market-data`;

/**
 * Fetch ONLY quote/price data for a ticker.
 * Lightweight — no company profile, no financials, no analyst data.
 */
export async function fetchQuoteOnly(ticker: string): Promise<QuoteUpdate> {
  const res = await fetch(`${API_BASE}/quote-extended/${ticker}`);
  if (!res.ok) throw new Error(`Quote fetch failed: ${res.status}`);
  const json = await res.json();

  const q = json.quote || json;

  return {
    price: q.price ?? q.c ?? q.lastPrice ?? 0,
    change: q.change ?? q.d ?? 0,
    changePercent: q.changePercent ?? q.dp ?? q.changesPercentage ?? 0,
    volume: q.volume ?? q.v ?? 0,
    dayHigh: q.dayHigh ?? q.h ?? q.high ?? 0,
    dayLow: q.dayLow ?? q.l ?? q.low ?? 0,
    open: q.open ?? q.o ?? 0,
    previousClose: q.previousClose ?? q.pc ?? 0,
    marketStatus: q.marketStatus ?? q.market_status ?? 'unknown',
    lastUpdated: q.lastUpdated ?? q.timestamp ?? new Date().toISOString(),
  };
}