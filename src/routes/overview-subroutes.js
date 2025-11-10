// src/routes/overview-subroutes.js - OPTIMIZED v4
import express from 'express';
import NodeCache from 'node-cache'; // npm install node-cache

const router = express.Router();

// Thread-safe cache with automatic TTL cleanup
const cache = new NodeCache({ 
  stdTTL: 180, // 3 minutes - reduce churn
  checkperiod: 60,
  useClones: false // return references for speed
});

// In-flight request deduplication
const inflight = new Map();

// Parallel probe with timeout
const probe = async (urls, timeoutMs = 8000) => {
  const promises = urls.map(u => 
    Promise.race([
      fetch(u).then(r => r.ok ? r.json() : null),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]).catch(() => null)
  );
  
  const results = await Promise.all(promises);
  return results.find(r => r !== null) || null;
};

const normalizeTs = (t) => {
  let ts = Number(t ?? 0);
  if (!Number.isFinite(ts)) return NaN;
  if (ts < 1e11) ts = ts * 1000;
  return ts;
};

// Generic handler with deduplication
const cachedHandler = (key, fetcher) => async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').toUpperCase();
    const tf = String(req.query.tf || '6M');
    if (!symbol) return res.status(400).json({ error: 'symbol_required' });

    const cacheKey = `${key}:${symbol}:${tf}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Check if request is already in-flight
    if (inflight.has(cacheKey)) {
      const result = await inflight.get(cacheKey);
      res.setHeader('X-Cache', 'INFLIGHT');
      return res.json(result);
    }

    // Start new request
    const promise = fetcher(symbol, tf, req);
    inflight.set(cacheKey, promise);

    try {
      const result = await promise;
      cache.set(cacheKey, result);
      res.setHeader('X-Cache', 'MISS');
      res.json(result);
    } finally {
      inflight.delete(cacheKey);
    }

  } catch (e) {
    res.status(500).json({ error: `${key}_failed`, message: e?.message });
  }
};

// Price endpoint - optimized
router.get('/price', cachedHandler('price', async (symbol, tf, req) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const raw = await probe([
    `${base}/api/chart/series?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(tf)}`,
    `${base}/api/polygon/aggs?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(tf)}`,
    `${base}/api/price/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(tf)}`,
  ]);

  let rows = [];
  if (Array.isArray(raw)) rows = raw;
  else if (raw?.series) rows = raw.series;
  else if (raw?.results) rows = raw.results;

  // Minimize payload - only essential fields
  const series = rows
    .map(d => {
      const t = normalizeTs(d.t ?? d.time ?? d.timestamp ?? d[0]);
      const c = Number(d.c ?? d.close ?? d[1]);
      return Number.isFinite(t) && Number.isFinite(c) ? [t, c] : null;
    })
    .filter(Boolean)
    .sort((a, b) => a[0] - b[0]);

  return { series };
}));

// Events endpoint - optimized
router.get('/events', cachedHandler('events', async (symbol, _, req) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const r = await fetch(`${base}/api/sec/filings?symbol=${encodeURIComponent(symbol)}&forms=annual,quarterly&limit=30`);
  const j = r.ok ? await r.json() : { filings: [] };

  // Minimize payload
  const events = (j.filings || []).map(f => ({
    f: f.form, // shortened keys
    fd: f.filingDate,
    rd: f.reportDate,
  }));

  return { events };
}));

// Analyst endpoint - optimized
router.get('/analyst', cachedHandler('analyst', async (symbol, _, req) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const r = await fetch(`${base}/api/fundamentals/all?symbol=${encodeURIComponent(symbol)}`);
  const j = r.ok ? await r.json() : {};
  const a = j?.analyst || {};

  return {
    buy: a.buy ?? 0,
    hold: a.hold ?? 0,
    sell: a.sell ?? 0,
    tAvg: a.targetAvg ?? null, // shortened keys
    tHi: a.targetHigh ?? null,
    tLo: a.targetLow ?? null,
  };
}));

// About endpoint - optimized
router.get('/about', cachedHandler('about', async (symbol, _, req) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const r = await fetch(`${base}/api/fundamentals/all?symbol=${encodeURIComponent(symbol)}`);
  const j = r.ok ? await r.json() : {};
  const p = j?.profile || {};

  return {
    name: p.name ?? null,
    desc: p.description ?? null, // shortened
    exch: p.exchange ?? null,
    ind: p.industry ?? null,
    src: "SEC EDGAR",
  };
}));

// Header endpoint - optimized
router.get('/header', cachedHandler('header', async (symbol, _, req) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const r = await fetch(`${base}/api/fundamentals/all?symbol=${encodeURIComponent(symbol)}`);
  const j = r.ok ? await r.json() : {};
  const s = j?.snapshot || j || {};

  return {
    p: s.price ?? null, // shortened keys
    chg: s.changePct ?? null,
    mc: s.marketCap ?? null,
    pe: s.peTTM ?? null,
    pef: s.peFwd ?? null,
    b: s.beta ?? null,
    dy: s.dividendYield ?? null,
    vol: s.avgVolume ?? null,
    lo: s.fiftyTwoWkLow ?? null,
    hi: s.fiftyTwoWkHigh ?? null,
  };
}));

export default router;