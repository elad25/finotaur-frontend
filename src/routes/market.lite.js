// src/routes/market.lite.js
import express from 'express';
const router = express.Router();

const polyKey = process.env.POLYGON_API_KEY || process.env.POLYGON_KEY || '';
const UA = process.env.HTTP_USER_AGENT || 'Finotaur/1.0';

async function j(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' }});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

router.get('/api/quote', async (req, res) => {
  try {
    const symbol = String(req.query.symbol||'').toUpperCase();
    if (!symbol) return res.status(200).json({ symbol:null, price:null, change:null });
    if (!polyKey) return res.json({ symbol, price:null, change:null });
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${polyKey}`;
    try {
      const jn = await j(url);
      const r = (jn?.results||[])[0] || null;
      const price = r ? r.c : null;
      return res.json({ symbol, price, change:null });
    } catch (e) {
      return res.json({ symbol, price:null, change:null });
    }
  } catch {
    return res.json({ symbol:null, price:null, change:null });
  }
});

router.get('/api/top-movers', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit||'6',10)||6, 50));
    if (!polyKey) return res.json({ gainers: [], losers: [] });
    const soft = async (url)=> { try { return await j(url); } catch { return null; } };
    const g = await soft(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${polyKey}`);
    const l = await soft(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/losers?apiKey=${polyKey}`);
    const take = (arr)=> (arr||[]).slice(0,limit).map(x=>({ symbol: x?.ticker, change: x?.todaysChangePerc }));
    return res.json({ gainers: take(g?.tickers), losers: take(l?.tickers) });
  } catch {
    return res.json({ gainers: [], losers: [] });
  }
});

export default router;
