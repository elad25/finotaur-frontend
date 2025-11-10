
// finotaur-server/src/routes/overview.summary.js
// Stable summary payload for Snapshot Cards
import express from "express";
const router = express.Router();

const POLY_BASE = "https://api.polygon.io";
const REF_TICKER = POLY_BASE + "/v3/reference/tickers";
const V3_REF = POLY_BASE + "/v3/reference";
const V2_AGGS = POLY_BASE + "/v2/aggs/ticker";

function toNum(x){ const n = Number(x); return Number.isFinite(n) ? n : null; }
function iso(d){ try { return new Date(d).toISOString().slice(0,10); } catch { return null; } }

async function j(url){
  const r = await fetch(url, { headers: { "Accept":"application/json" } });
  if(!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  try { return await r.json(); } catch { return null; }
}

function rangeDates(days){
  const now = new Date();
  const to = now.toISOString().slice(0,10);
  const from = new Date(now.getTime()-days*24*3600*1000).toISOString().slice(0,10);
  return { from, to };
}

router.get("/overview/summary", async (req, res) => {
  const symbol = String(req.query.symbol || "").toUpperCase().trim();
  const key = process.env.POLYGON_API_KEY || process.env.POLYGON || "";
  if(!symbol) return res.status(400).json({ error: "symbol_required" });

  const out = {
    symbol,
    marketCap: null,
    peTTM: null,
    peForward: null,
    beta: null,
    dividendYield: null,
    range52w: { min: null, max: null, current: null },
    avgVolume: null,
    analystConsensus: null,
    targetPrice: { avg: null, high: null, low: null },
    profile: { name: null, description: null },
    source: { profile: null, analytics: null, price: null }
  };

  try{
    if(key){
      const tkr = await j(`${REF_TICKER}/${encodeURIComponent(symbol)}?apiKey=${key}`);
      out.marketCap = tkr?.results?.market_cap ?? null;
      out.profile.name = tkr?.results?.name ?? null;
      out.profile.description = tkr?.results?.description ?? null;
      out.beta = tkr?.results?.beta ?? null;
      out.source.profile = "polygon";
    }
  }catch{}

  try{
    if(key){
      const div = await j(`${V3_REF}/dividends?ticker=${encodeURIComponent(symbol)}&limit=5&order=desc&apiKey=${key}`);
      const last = Array.isArray(div?.results) ? div.results[0] : null;
      if(last && last.indicated_annual_dividend_yield!=null){
        out.dividendYield = toNum(last.indicated_annual_dividend_yield);
      }
    }
  }catch{}

  try{
    // 52w stats + avg volume via daily bars
    const { from, to } = rangeDates(366);
    const aggs = key ? await j(`${V2_AGGS}/${encodeURIComponent(symbol)}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`) : null;
    const rows = aggs?.results || [];
    const highs = rows.map(r => r.h).filter(x=>x!=null);
    const lows  = rows.map(r => r.l).filter(x=>x!=null);
    const vols  = rows.map(r => r.v).filter(x=>x!=null);
    const closes= rows.map(r => r.c).filter(x=>x!=null);
    if(highs.length){ out.range52w.max = Math.max(...highs); }
    if(lows.length){  out.range52w.min = Math.min(...lows); }
    if(closes.length){ out.range52w.current = closes[closes.length-1]; }
    if(vols.length){ out.avgVolume = Math.round(vols.reduce((a,b)=>a+b,0)/vols.length); }
    out.source.price = "polygon";
  }catch{}

  // Analyst consensus / targets: best-effort via existing internal route (if present)
  try{
    const base = `${req.protocol}://${req.get("host")}`;
    const r = await fetch(`${base}/api/analyst/summary?symbol=${encodeURIComponent(symbol)}`);
    if(r.ok){
      const a = await r.json();
      const buy = toNum(a.buy), hold = toNum(a.hold), sell = toNum(a.sell);
      let consensus = null;
      if(buy!=null && hold!=null && sell!=null){
        if(buy > (hold+sell)) consensus = "Buy";
        else if(sell > (buy+hold)) consensus = "Sell";
        else consensus = "Hold";
      }
      out.analystConsensus = consensus;
      out.targetPrice = { avg: toNum(a.targetAvg), high: toNum(a.targetHigh), low: toNum(a.targetLow) };
      out.source.analytics = "fmp";
    }
  }catch{}

  res.json(out);
});

export default router;
