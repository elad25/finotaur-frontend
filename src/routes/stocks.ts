// src/routes/stocks.ts
import { Router } from "express";
import fetch from "node-fetch";
import * as cache from "../utils/cache.js";

const router = Router();

const FMP = process.env.FMP_API_KEY || "";
const SHORT = 60 * 1000;      // 1m
const MED   = 5 * 60 * 1000;  // 5m

async function j(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "finotaur/1.0" } });
  if (!r.ok) throw new Error("bad_status_" + r.status);
  return r.json();
}

type Mover = { symbol: string; price: number|null; chp: number|null; name?: string };

async function fmpMovers(kind: "gainers"|"losers", limit: number): Promise<Mover[]> {
  const url = `https://financialmodelingprep.com/api/v3/stock/${kind}?apikey=${encodeURIComponent(FMP)}`;
  const data = await j(url);
  // FMP returns an array with fields: ticker, changes, price, changesPercentage, companyName
  return (Array.isArray(data) ? data : []).slice(0, limit).map((d:any) => ({
    symbol: d.ticker || d.symbol || "",
    price: typeof d.price === "number" ? d.price : (d.price ? parseFloat(d.price) : null),
    chp: typeof d.changesPercentage === "number" ? d.changesPercentage : (
      d.changesPercentage ? parseFloat(String(d.changesPercentage).replace(/[()%]/g,"")) : null
    ),
    name: d.companyName || d.company || undefined,
  }));
}

// Basic Yahoo fallback using quote endpoint
async function yahooQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const data = await j(url);
  const q = data?.quoteResponse?.result?.[0] || {};
  const price = q.preMarketPrice ?? q.regularMarketPrice ?? q.postMarketPrice ?? null;
  const prev  = q.previousClose ?? null;
  const chp   = (price!=null && prev!=null && prev!==0) ? ((price - prev)/prev)*100 : null;
  return { price, chp };
}

async function yahooMoversFromList(list: string[], limit: number): Promise<Mover[]> {
  const out: Mover[] = [];
  for (const s of list.slice(0, limit)) {
    try {
      const q = await yahooQuote(s);
      out.push({ symbol: s, price: q.price, chp: q.chp });
    } catch {}
  }
  return out;
}

router.get("/top-movers", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit ?? "6"), 10) || 6));
    const kind = String(req.query.kind ?? "both"); // "gainers" | "losers" | "both"

    const payload = await cache.wrap(`movers_${kind}_${limit}`, SHORT, async () => {
      if (FMP) {
        const resG = (kind === "losers") ? [] : await fmpMovers("gainers", limit);
        const resL = (kind === "gainers") ? [] : await fmpMovers("losers", limit);
        return { gainers: resG, losers: resL, source: "fmp", ts: Date.now() };
      }
      // Fallback: simple popular list (SPY components sample)
      const sample = ["AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","AMD","AVGO","NFLX","CRM","COST"];
      const g = await yahooMoversFromList(sample, limit);
      // Sort by change%
      const sorted = g.filter(x=>x.chp!=null).sort((a,b)=> (b.chp as number) - (a.chp as number));
      return { gainers: sorted.slice(0, Math.ceil(limit/2)), losers: sorted.slice(-Math.ceil(limit/2)).reverse(), source: "yahoo_fallback", ts: Date.now() };
    });

    res.setHeader("Cache-Control", "no-store");
    res.json(payload);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "movers_failed" });
  }
});

export default router;
