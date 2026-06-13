// src/services/stock-compare.api.ts
// =====================================================
// STOCK COMPARE — API Service
// =====================================================
// Provides fetchStockFundamentals and fetchStockQuotes
// for the Compare Stocks page. Uses the same SERVER_BASE
// pattern as etf-analyzer.api.ts.
// =====================================================

const SERVER_BASE =
  import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

// ─── Cache config ─────────────────────────────────────────────────────────────

const FUND_CACHE_TTL_MS   = 5 * 60 * 1000; // 5 minutes
const QUOTES_CACHE_TTL_MS = 60 * 1000;      // 60 seconds

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const fundCache   = new Map<string, CacheEntry<StockFundamentals>>();
const quotesCache = new Map<string, CacheEntry<Record<string, StockQuote>>>();

// ─── Typed fetch helper ───────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── StockFundamentals ────────────────────────────────────────────────────────

export interface StockFundamentals {
  symbol:           string;
  marketCap:        number | null;
  pe:               number | null;
  grossMargin:      number | null;
  operatingMargin:  number | null;
  netMargin:        number | null;
  roe:              number | null;
  roa:              number | null;
  debtToEquity:     number | null;
  currentRatio:     number | null;
  altmanZ:          number | null;
  piotroskiF:       number | null;
  sector:           string | null;
}

// Raw shape returned by /api/fundamentals/all
interface RawFundamentals {
  kpis?: {
    marketCap?:        { value?: unknown };
    grossMargin?:      { value?: unknown };
    operatingMargin?:  { value?: unknown };
    netMargin?:        { value?: unknown };
    roe?:              { value?: unknown };
    roa?:              { value?: unknown };
    debtToEquity?:     { value?: unknown };
    currentRatio?:     { value?: unknown };
  };
  valuation?: {
    multiples?: Array<{ metric: string; value: unknown }>;
  };
  health?: {
    altmanZ?:    unknown;
    piotroskiF?: unknown;
  };
  context?: {
    sector?: unknown;
  };
}

/** Coerce a raw value to a finite number or null. */
function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Like num() but also returns null for values <= 0.
 * Used for ratio-type metrics where 0 or negative is an invalid sentinel
 * (e.g. PE, PS, PB, EV/EBITDA).
 */
function posNum(v: unknown): number | null {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
}

/**
 * Margin sanity-gate. Margins are percentages: a value of exactly 0 almost
 * always means "missing data", and a value above 100% is physically
 * impossible (you cannot earn more than 100% of revenue). Losses (negative)
 * are legitimate down to a floor, beyond which it is a data error.
 * Returns null for out-of-range values so the UI shows "—" instead of nonsense
 * (e.g. the upstream feed reports MSFT net margin as 163% / gross margin as 0%).
 */
function marginNum(v: unknown): number | null {
  const n = num(v);
  if (n === null || n === 0 || n > 100 || n < -150) return null;
  return n;
}

export async function fetchStockFundamentals(symbol: string): Promise<StockFundamentals> {
  const sym = symbol.toUpperCase().trim();

  const cached = fundCache.get(sym);
  if (cached && Date.now() - cached.fetchedAt < FUND_CACHE_TTL_MS) {
    return cached.data;
  }

  const raw = await apiFetch<RawFundamentals>(
    `${SERVER_BASE}/api/fundamentals/all?symbol=${sym}`,
  );

  // Helper to extract a multiple by its metric key string
  const mult = (k: string): number | null =>
    num(raw.valuation?.multiples?.find((x) => x.metric === k)?.value);

  const data: StockFundamentals = {
    symbol:          sym,
    marketCap:       num(raw.kpis?.marketCap?.value),
    grossMargin:     marginNum(raw.kpis?.grossMargin?.value),
    operatingMargin: marginNum(raw.kpis?.operatingMargin?.value),
    netMargin:       marginNum(raw.kpis?.netMargin?.value),
    roe:             num(raw.kpis?.roe?.value),
    roa:             num(raw.kpis?.roa?.value),
    debtToEquity:    num(raw.kpis?.debtToEquity?.value),
    currentRatio:    num(raw.kpis?.currentRatio?.value),
    altmanZ:         num(raw.health?.altmanZ),
    piotroskiF:      num(raw.health?.piotroskiF),
    sector:          typeof raw.context?.sector === 'string' ? raw.context.sector : null,
    // Valuation multiple: treat 0 / negative as invalid sentinel → null
    pe:              posNum(mult('PE')),
  };

  fundCache.set(sym, { data, fetchedAt: Date.now() });
  return data;
}

// ─── StockQuote ───────────────────────────────────────────────────────────────

export interface StockQuote {
  symbol:        string;
  price:         number | null;
  changePercent: number | null;
  previousClose: number | null;
  high52w:       number | null;
  low52w:        number | null;
  volume:        number | null;
}

interface RawQuoteItem {
  symbol:        string;
  price?:        unknown;
  changePercent?: unknown;
  previousClose?: unknown;
  high52w?:       unknown;
  low52w?:        unknown;
  volume?:        unknown;
}

interface RawQuotesResponse {
  quotes?: RawQuoteItem[];
}

export async function fetchStockQuotes(
  symbols: string[],
): Promise<Record<string, StockQuote>> {
  if (symbols.length === 0) return {};

  const syms = symbols.map((s) => s.toUpperCase().trim());
  const cacheKey = [...syms].sort().join(',');

  const cached = quotesCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < QUOTES_CACHE_TTL_MS) {
    return cached.data;
  }

  const raw = await apiFetch<RawQuotesResponse>(
    `${SERVER_BASE}/api/market-data/watchlist-quotes?symbols=${syms.join(',')}`,
  );

  const result: Record<string, StockQuote> = {};
  for (const q of raw.quotes ?? []) {
    const sym = (q.symbol ?? '').toUpperCase();
    if (!sym) continue;
    result[sym] = {
      symbol:        sym,
      price:         num(q.price),
      changePercent: num(q.changePercent),
      previousClose: num(q.previousClose),
      high52w:       num(q.high52w),
      low52w:        num(q.low52w),
      volume:        num(q.volume),
    };
  }

  quotesCache.set(cacheKey, { data: result, fetchedAt: Date.now() });
  return result;
}
