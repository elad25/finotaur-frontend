// ================================================
// OPTIMIZED FOR 5000+ USERS - Market Data Router
// File: src/routes/market.ts
// 🔥 PRODUCTION-READY VERSION
// ================================================

import { Router } from "express";
import NodeCache from "node-cache";

const router = Router();

// ================================================
// CONFIGURATION
// ================================================

const FMP_API_KEY = process.env.FMP_API_KEY || "demo";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "";
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || "";

const CACHE_TTL = 15; // 15 seconds for high-traffic stability
const MAX_SYMBOLS_PER_REQUEST = 50;
const BATCH_SIZE = 10;
const REQUEST_TIMEOUT = 8000; // 8 seconds

// ================================================
// TYPES
// ================================================

type Quote = {
  price: number | null;
  ch: number | null;
  chp: number | null;
  chOpen: number | null;
  chPrev: number | null;
  isPremarket: boolean;
};

// ================================================
// CACHING & DEDUPLICATION
// ================================================

const cache = new NodeCache({ 
  stdTTL: CACHE_TTL, 
  useClones: false,
  checkperiod: 30
});

const inflight = new Map<string, Promise<Quote>>();

// ================================================
// RATE LIMITER (Token Bucket Algorithm)
// ================================================

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    
    // Refill tokens based on time elapsed
    this.tokens = Math.min(
      this.maxTokens, 
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;

    if (this.tokens < 1) {
      // Wait until we have a token
      const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.tokens = 0;
    } else {
      this.tokens -= 1;
    }
  }
}

const rateLimiter = new RateLimiter(100, 10); // 100 burst, 10/sec sustained

// ================================================
// HELPER: Fetch with Timeout
// ================================================

async function fetchWithTimeout(
  url: string, 
  timeoutMs: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// ================================================
// SYMBOL NORMALIZATION
// ================================================

function resolveSymbol(symbol: string): string {
  const s = symbol.toUpperCase().trim();
  
  // Common conversions
  const mappings: Record<string, string> = {
    'SPY': 'SPY',
    'QQQ': 'QQQ',
    'IWM': 'IWM',
    'DIA': 'DIA',
    'BTC': 'BTC-USD',
    'ETH': 'ETH-USD',
  };

  return mappings[s] || s;
}

// ================================================
// QUOTE FETCHERS
// ================================================

async function fetchFromFMP(symbol: string): Promise<Quote | null> {
  if (!FMP_API_KEY || FMP_API_KEY === 'demo') return null;

  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`;
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const q = data[0];
    return {
      price: q.price ?? null,
      ch: q.change ?? null,
      chp: q.changesPercentage ?? null,
      chOpen: q.open ?? null,
      chPrev: q.previousClose ?? null,
      isPremarket: false,
    };
  } catch (error) {
    console.error(`[FMP] Error fetching ${symbol}:`, error);
    return null;
  }
}

async function fetchFromFinnhub(symbol: string): Promise<Quote | null> {
  if (!FINNHUB_API_KEY) return null;

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) return null;

    const q = await response.json();
    
    if (!q || !q.c) return null;

    return {
      price: q.c ?? null,
      ch: q.d ?? null,
      chp: q.dp ?? null,
      chOpen: q.o ?? null,
      chPrev: q.pc ?? null,
      isPremarket: false,
    };
  } catch (error) {
    console.error(`[Finnhub] Error fetching ${symbol}:`, error);
    return null;
  }
}

async function fetchFromPolygon(symbol: string): Promise<Quote | null> {
  if (!POLYGON_API_KEY) return null;

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${POLYGON_API_KEY}`;
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) return null;

    const data = await response.json();
    
    if (!data?.results?.[0]) return null;

    const r = data.results[0];
    const change = r.c - r.o;
    const changePct = r.o > 0 ? (change / r.o) * 100 : 0;

    return {
      price: r.c ?? null,
      ch: change,
      chp: changePct,
      chOpen: r.o ?? null,
      chPrev: r.o ?? null,
      isPremarket: false,
    };
  } catch (error) {
    console.error(`[Polygon] Error fetching ${symbol}:`, error);
    return null;
  }
}

// ================================================
// FALLBACK CHAIN
// ================================================

async function fetchOneSymbol(symbol: string): Promise<Quote> {
  const sources = [
    fetchFromFMP,
    fetchFromFinnhub,
    fetchFromPolygon,
  ];

  for (const fetcher of sources) {
    try {
      const result = await fetcher(symbol);
      if (result && result.price !== null) {
        return result;
      }
    } catch (error) {
      // Continue to next source
      continue;
    }
  }

  // Return empty quote if all sources fail
  return {
    price: null,
    ch: null,
    chp: null,
    chOpen: null,
    chPrev: null,
    isPremarket: false,
  };
}

// ================================================
// SMART CACHING WITH DEDUPLICATION
// ================================================

async function getQuoteCached(symbol: string): Promise<Quote> {
  // Check cache first
  const cached = cache.get<Quote>(symbol);
  if (cached) {
    return cached;
  }

  // Check if request is already in-flight
  if (inflight.has(symbol)) {
    return inflight.get(symbol)!;
  }

  // Start new request
  const promise = (async () => {
    try {
      await rateLimiter.acquire();
      const quote = await fetchOneSymbol(symbol);
      cache.set(symbol, quote);
      return quote;
    } finally {
      inflight.delete(symbol);
    }
  })();

  inflight.set(symbol, promise);
  return promise;
}

// ================================================
// ENDPOINTS
// ================================================

// Single quote endpoint
router.get("/quote", async (req, res) => {
  try {
    const symbol = String(req.query.symbol || "").trim();
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }

    const canonical = resolveSymbol(symbol);
    const quote = await getQuoteCached(canonical);

    res.json({
      symbol: canonical,
      ...quote,
    });
  } catch (error) {
    console.error("[market/quote] Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch quote",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Batch quotes endpoint with smart chunking
router.get("/quotes", async (req, res) => {
  try {
    const raw = String(req.query.symbols || "").trim();
    
    if (!raw) {
      return res.json({});
    }

    // Parse and normalize symbols
    const symbols = raw
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(s => s.toUpperCase())
      .slice(0, MAX_SYMBOLS_PER_REQUEST);

    if (symbols.length === 0) {
      return res.json({});
    }

    const result: Record<string, Quote> = {};

    // Process in chunks to avoid overwhelming external APIs
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const chunk = symbols.slice(i, i + BATCH_SIZE);
      
      // Fetch all quotes in chunk concurrently
      await Promise.all(
        chunk.map(async (symbol) => {
          const canonical = resolveSymbol(symbol);
          const quote = await getQuoteCached(canonical);
          result[symbol] = quote;
        })
      );
    }

    res.json(result);
  } catch (error) {
    console.error("[market/quotes] Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch quotes",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats(),
    },
    inflight: inflight.size,
    timestamp: new Date().toISOString(),
  });
});

// Cache management endpoint (for admin use)
router.post("/cache/clear", (req, res) => {
  const cleared = cache.keys().length;
  cache.flushAll();
  inflight.clear();
  
  res.json({
    message: "Cache cleared",
    itemsCleared: cleared,
  });
});

export default router;