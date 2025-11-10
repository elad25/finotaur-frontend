/**
 * Lightweight ticker search backed by SEC files.
 * GET /api/search/tickers?q=TS&limit=10
 * - Loads SEC company_tickers.json once into memory (cached 12h)
 * - Filters tickers that START WITH the query (case-insensitive)
 * - Returns [{symbol,name,cik}] sorted by symbol
 * - Does not impact other routes
 */
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const SEC_PROXY = process.env.SEC_PROXY_URL || '';
let CACHE = { t: 0, data: [] };
const TTL = 12 * 60 * 60 * 1000; // 12h

async function loadTickers() {
  if (Date.now() - CACHE.t < TTL && CACHE.data.length) return CACHE.data;
  const urls = [
    `${SEC_PROXY}/api/sec/files/company_tickers.json`,
    `${SEC_PROXY}/api/sec/files/company_tickers_exchange.json`
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { timeout: 20000 });
      if (!r.ok) continue;
      const j = await r.json();
      let arr = [];
      if (Array.isArray(j)) {
        arr = j.map(x => ({
          symbol: (x.ticker || '').toUpperCase(),
          name: x.title || x.name || '',
          cik: String(x.cik_str || x.cik || '').padStart(10, '0'),
        }));
      } else if (j && Array.isArray(j.data)) {
        arr = j.data.map(x => ({
          symbol: (x.ticker || '').toUpperCase(),
          name: x.title || x.name || '',
          cik: String(x.cik || '').padStart(10, '0'),
        }));
      }
      if (arr.length) {
        arr.sort((a,b)=> a.symbol.localeCompare(b.symbol));
        CACHE = { t: Date.now(), data: arr };
        return CACHE.data;
      }
    } catch(e) { /* try next */ }
  }
  return CACHE.data;
}

router.get('/tickers', async (req, res) => {
  try {
    const q = (req.query.q || '').toUpperCase().trim();
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit||'10',10)));
    if (!q || q.length < 1) return res.json({ items: [] });

    const all = await loadTickers();
    const items = all.filter(x => x.symbol.startsWith(q)).slice(0, limit);
    return res.json({ q, items });
  } catch (e) {
    console.error('[search/tickers]', e);
    return res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;
