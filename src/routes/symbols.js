import express from 'express';

// Node 18+ has global fetch; no need for node-fetch.
// ESM-compatible router for /api/symbols/suggest

const router = express.Router();

let _cache = { ts: 0, items: [] };
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const SEC_LIST = 'https://www.sec.gov/files/company_tickers.json';
const UA = process.env.SEC_USER_AGENT || 'Finotaur/1.0 (contact: support@finotaur.local)';

async function loadSECListing() {
  const res = await fetch(SEC_LIST, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`SEC list HTTP ${res.status}`);
  const json = await res.json();
  const items = Object.values(json).map((row) => ({
    symbol: String(row.ticker || '').toUpperCase(),
    name: String(row.title || ''),
    exchange: 'US',
    assetType: 'stock',
  }));
  const seen = new Set();
  const dedup = [];
  for (const x of items) {
    if (!x.symbol || seen.has(x.symbol)) continue;
    seen.add(x.symbol);
    dedup.push(x);
  }
  dedup.sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));
  _cache = { ts: Date.now(), items: dedup };
}

async function ensureCache() {
  if (!_cache.items.length || (Date.now() - _cache.ts) > TTL_MS) {
    await loadSECListing();
  }
}

router.get('/suggest', async (req, res) => {
  try {
    const qRaw = String(req.query.q || '').trim().toUpperCase();
    if (!qRaw) return res.json({ items: [] });
    await ensureCache();

    const items = _cache.items;
    const starts = items.filter((x) => x.symbol.startsWith(qRaw)).slice(0, 25);
    let final = starts;
    if (final.length < 3) {
      const byName = items.filter((x) => x.name.toUpperCase().startsWith(qRaw)).slice(0, 25);
      final = [...starts, ...byName].slice(0, 25);
    }

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ items: final });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

export default router;
