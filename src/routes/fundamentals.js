const express = require('express');
const fetch = require('node-fetch');
const NodeCache = require('node-cache');
const router = express.Router();

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min for fresher data
const cache = new NodeCache({ stdTTL: 600, useClones: false });
const inflight = new Map();

// Helpers remain same...
const SEC_PROXY = process.env.SEC_PROXY_URL || '';
const POLY_KEY = process.env.POLYGON_API_KEY || '';

async function safeJson(res) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}

// Add timeout wrapper
const fetchWithTimeout = (url, timeoutMs = 15000) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};

// ... (keep existing helper functions: resolveCIKFromSEC, latestValue, ttmFromQuarterly, etc.)

router.get('/all', async (req, res) => {
  try {
    const symbol = (req.query.symbol || '').toUpperCase().trim();
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });

    // Check cache
    const cached = cache.get(symbol);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Check inflight
    if (inflight.has(symbol)) {
      const result = await inflight.get(symbol);
      res.setHeader('X-Cache', 'INFLIGHT');
      return res.json(result);
    }

    // Start fetch
    const promise = (async () => {
      const cik = await resolveCIKFromSEC(symbol);
      if (!cik) throw new Error('CIK not found');

      // Parallel with timeout
      const [facts, subs, poly] = await Promise.allSettled([
        fetchWithTimeout(`${SEC_PROXY}/api/sec/companyfacts?cik=${cik}`, 20000)
          .then(r => r.ok ? safeJson(r) : null),
        fetchWithTimeout(`${SEC_PROXY}/api/sec/submissions?cik=${cik}`, 20000)
          .then(r => r.ok ? safeJson(r) : null),
        POLY_KEY ? fetchWithTimeout(`https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${POLY_KEY}`, 15000)
          .then(r => r.ok ? safeJson(r).then(j => j?.results) : null) : null,
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

      const ratios = deriveRatios(facts || {});
      const marketCap = poly?.market_cap ?? null;
      const companyName = poly?.name ?? (subs?.name || symbol);

      // YoY calcs...
      const revSeries = pickFact(facts, 'RevenueFromContractWithCustomerExcludingAssessedTax').series
        .sort((a,b)=> new Date(b.end||0) - new Date(a.end||0));
      const last8 = revSeries.slice(0,8);
      const latest4 = last8.slice(0,4).reduce((a,x)=>a+(Number(x.val)||0),0);
      const prev4 = last8.slice(4,8).reduce((a,x)=>a+(Number(x.val)||0),0);
      const revenueYoY = pct(latest4, prev4);

      // CRITICAL: Don't return full facts object - too large!
      const payload = {
        symbol,
        cik,
        companyName,
        marketCap,
        snapshot: {
          marketCap,
          revenueTTM: ratios.revenueTTM.value || null,
          netIncomeTTM: ratios.netIncomeTTM.value || null,
          grossMargin: ratios.grossMargin,
          roe: ratios.roe,
          roa: ratios.roa,
          debtEquity: ratios.debtEquity,
          currentRatio: ratios.currentRatio,
          yoy: { revenue: revenueYoY },
          sparks: {
            revenue: ratios.trends.revenue.slice(-10), // limit points
            netIncome: ratios.trends.netIncome.slice(-10),
          }
        },
        // Don't send raw facts - frontend should request separately if needed
        lastUpdated: new Date().toISOString()
      };

      return payload;
    })();

    inflight.set(symbol, promise);

    try {
      const result = await promise;
      cache.set(symbol, result);
      res.setHeader('X-Cache', 'MISS');
      res.json(result);
    } finally {
      inflight.delete(symbol);
    }

  } catch (e) {
    console.error('[fundamentals/all] error', e);
    res.status(500).json({ error: 'internal', message: e.message });
  }
});

module.exports = router;