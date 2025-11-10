// src/routes/polygon.aggs.js
import express from 'express';

const router = express.Router();

function getProviders() {
  return {
    POLY_KEY: process.env.POLYGON_API_KEY || process.env.POLYGON || "",
  };
}

const ymd = (d) => d.toISOString().slice(0,10);
function rangeToFrom(range){
  const now = new Date();
  const to = ymd(now);
  const from = new Date(now);
  switch ((range||'').toUpperCase()){
    case '1D': from.setDate(now.getDate()-1); break;
    case '1W': from.setDate(now.getDate()-7); break;
    case '1M': from.setMonth(now.getMonth()-1); break;
    case '6M': from.setMonth(now.getMonth()-6); break;
    case '1Y': from.setFullYear(now.getFullYear()-1); break;
    case '5Y': from.setFullYear(now.getFullYear()-5); break;
    default:   from.setFullYear(now.getFullYear()-1);
  }
  return { from: ymd(from), to };
}

// GET /api/polygon/aggs?symbol=MSFT&range=1W
router.get('/aggs', async (req, res) => {
  try {
    const { POLY_KEY } = getProviders();
    const symbol = String(req.query.symbol||'').toUpperCase();
    const range  = String(req.query.range||'1Y').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol_required' });
    if (!POLY_KEY) return res.status(400).json({ error: 'polygon_key_missing' });

    // infer resolution by range
    let span='day', mult=1;
    if (range==='1D'){ span='minute'; mult=1; }
    else if (range==='1W'){ span='minute'; mult=15; }
    else if (range==='1M'){ span='hour'; mult=1; }

    const { from, to } = rangeToFrom(range);
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${mult}/${span}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${POLY_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const j = await r.json();
    const results = Array.isArray(j?.results) ? j.results : [];
    const series = results.map(x => ({ t: Math.floor(Number(x.t)/1000), c: Number(x.c) }))
                          .filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.c))
                          .sort((a,b)=>a.t-b.t);
    res.json({ series });
  } catch (e) {
    res.status(500).json({ error: 'aggs_failed', message: e?.message });
  }
});

export default router;
