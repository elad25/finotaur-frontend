
// finotaur-server/src/routes/overview.series.js
// Unified series endpoint: price + events (filings/earnings/dividends)
import express from "express";

const router = express.Router();

const POLY_BASE = "https://api.polygon.io";
const V3_REF = POLY_BASE + "/v3/reference";
const V2_AGGS = POLY_BASE + "/v2/aggs/ticker";

function isoDate(d){ try { return new Date(d).toISOString().slice(0,10); } catch { return null; } }
function asISOts(d){ try { return new Date(d).toISOString(); } catch { return null; } }
function toNum(x){ const n = Number(x); return Number.isFinite(n) ? n : null; }
function daysBetween(a,b){ return Math.abs((new Date(a).getTime() - new Date(b).getTime())/(24*3600*1000)); }

function rangeToDays(r){
  switch(String(r).toUpperCase()){
    case "1D": return 2;
    case "1W": return 7;
    case "1M": return 31;
    case "6M": return 186;
    case "1Y": return 366;
    case "5Y": return 1827;
    default: return 186;
  }
}
function computeFromTo(range){
  const now = new Date();
  const to = now.toISOString().slice(0,10);
  const days = rangeToDays(range);
  const fromDate = new Date(now.getTime() - days*24*60*60*1000);
  const from = fromDate.toISOString().slice(0,10);
  return { from, to };
}

async function j(url){
  const r = await fetch(url, { headers: { "Accept": "application/json" } });
  if(!r.ok){
    const text = await r.text().catch(()=> "");
    throw new Error(`HTTP ${r.status} ${url} :: ${text.slice(0,140)}`);
  }
  try { return await r.json(); } catch { return null; }
}

function nearestPriceAt(eventsDate, price){
  if(!Array.isArray(price) || price.length===0) return null;
  let best = null, bestDiff = 1e9;
  for(const p of price){
    const d = daysBetween(eventsDate, p.t);
    if(d < bestDiff){ bestDiff = d; best = p; }
  }
  return bestDiff <= 5 ? (best?.c ?? null) : null; // within ~3 trading days; use 5 calendar days buffer
}

router.get("/overview/series", async (req, res) => {
  const symbol = String(req.query.symbol || "").toUpperCase().trim();
  const range  = String(req.query.range || "6M").toUpperCase();
  const key = process.env.POLYGON_API_KEY || process.env.POLYGON || "";
  if(!symbol) return res.status(400).json({ error: "symbol_required" });
  const { from, to } = computeFromTo(range);

  const out = { symbol, range, price: [], events: [], meta: { hasDividends:false, hasEarnings:false, hasFilings:false, source:{ price:null, events:[] } } };

  // --- Price (prefer intraday for 1D, else daily) ---
  try{
    let url;
    if(range === "1D"){
      // 5-min intraday in last 2 days
      url = `${V2_AGGS}/${encodeURIComponent(symbol)}/range/5/minute/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`;
    }else{
      url = `${V2_AGGS}/${encodeURIComponent(symbol)}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`;
    }
    const aggs = key ? await j(url) : null;
    const rows = aggs?.results || [];
    const price = rows.map(r => ({
      t: new Date(r.t).toISOString(),
      o: toNum(r.o), h: toNum(r.h), l: toNum(r.l), c: toNum(r.c),
      v: toNum(r.v),
    })).filter(p => p.t && p.c!=null);
    if(price.length === 0 && range === "1D"){
      // Fallback to daily one day
      const daily = await j(`${V2_AGGS}/${encodeURIComponent(symbol)}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`);
      const dr = daily?.results || [];
      out.price = dr.map(r => ({ t: new Date(r.t).toISOString(), o: toNum(r.o), h: toNum(r.h), l: toNum(r.l), c: toNum(r.c), v: toNum(r.v) }));
    }else{
      out.price = price;
    }
    out.meta.source.price = "polygon";
  }catch(e){
    // Keep going, return empty price but still 200
    out.price = [];
  }

  // --- Events ---
  // Filings (via local normalized endpoint to ensure docUrl present)
  let events = [];
  try{
    const base = `${req.protocol}://${req.get("host")}`;
    const filings = await j(`${base}/api/overview/filings?symbol=${encodeURIComponent(symbol)}&annual=1&quarterly=1&limit=50`);
    const fEvents = (Array.isArray(filings) ? filings : []).filter(f => f.docUrl).map(f => {
      const date = isoDate(f.reportDate) || isoDate(f.filingDate);
      const ts = asISOts(f.filingDate || f.reportDate || (date ? date+"T00:00:00Z" : null)) || null;
      return {
        type: "filing",
        label: String(f.form || "Filing"),
        date,
        ts: ts || (date ? date + "T00:00:00Z" : null),
        docUrl: f.docUrl,
      };
    }).filter(x => x.date && x.docUrl);
    out.meta.hasFilings = fEvents.length>0;
    out.meta.source.events.push("sec");
    events = events.concat(fEvents);
  }catch(e){}

  // Dividends
  try{
    const divs = key ? await j(`${V3_REF}/dividends?ticker=${encodeURIComponent(symbol)}&limit=200&order=asc&apiKey=${key}`) : null;
    const rows = divs?.results || [];
    const { from, to } = computeFromTo(range);
    const inRange = rows.filter(r => {
      const d = isoDate(r.ex_dividend_date);
      return d && d >= from && d <= to;
    }).map(r => ({
      type: "dividend",
      label: r.cash_amount!=null ? `$${Number(r.cash_amount).toFixed(2)}` : "$?",
      date: isoDate(r.ex_dividend_date),
      ts: asISOts(r.ex_dividend_date) || (isoDate(r.ex_dividend_date) + "T00:00:00Z"),
      docUrl: "",
    }));
    if(inRange.length){ out.meta.hasDividends = true; out.meta.source.events.push("polygon"); }
    events = events.concat(inRange);
  }catch{}

  // Earnings
  try{
    const earn = key ? await j(`${V3_REF}/earnings?ticker=${encodeURIComponent(symbol)}&limit=200&order=asc&apiKey=${key}`) : null;
    const rows = earn?.results || [];
    const { from, to } = computeFromTo(range);
    const inRange = rows.filter(r => {
      const d = isoDate(r.reported_date || r.period || r.fiscal_period_end_date);
      return d && d >= from && d <= to;
    }).map(r => {
      const q = r.fiscal_quarter ? `Q${r.fiscal_quarter} ` : "";
      const fy = r.fiscal_year ? `FY${String(r.fiscal_year).slice(-2)}` : "";
      return {
        type: "earning",
        label: (q || fy) ? `${q}${fy}`.trim() : "Earnings",
        date: isoDate(r.reported_date || r.period || r.fiscal_period_end_date),
        ts: asISOts(r.announcement_time || r.reported_date) || (isoDate(r.reported_date || r.period) + "T00:00:00Z"),
        docUrl: "",
      };
    });
    if(inRange.length){ out.meta.hasEarnings = true; out.meta.source.events.push("polygon"); }
    events = events.concat(inRange);
  }catch{}

  // Compute priceAtEvent for each event using out.price
  if(Array.isArray(events)){
    for(const ev of events){
      if(out.price && out.price.length && ev.date){
        const p = nearestPriceAt(ev.date, out.price);
        if(p!=null) ev.priceAtEvent = p;
      }
      if(ev.type === "filing" && !ev.docUrl){ continue; }
      out.events.push(ev);
    }
  }

  res.json(out);
});

export default router;
