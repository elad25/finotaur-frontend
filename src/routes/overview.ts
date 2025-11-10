// src/routes/overview.ts
import { Router } from "express";
import fetch from "node-fetch";
import * as cache from "../utils/cache.js";

const router = Router();

// TTLs
const SHORT = 60 * 1000;      // 1m
const MED   = 5 * 60 * 1000;  // 5m
const LONG  = 30 * 60 * 1000; // 30m

async function j(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "finotaur/1.0" }});
  if (!r.ok) throw new Error("bad_status_" + r.status);
  return r.json();
}

async function text(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "finotaur/1.0" }});
  if (!r.ok) throw new Error("bad_status_" + r.status);
  return r.text();
}

/** Yahoo quote helper (unofficial) */
async function yahooQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const data = await j(url);
  const q = data?.quoteResponse?.result?.[0] || {};
  const price = q.preMarketPrice ?? q.regularMarketPrice ?? q.postMarketPrice ?? null;
  const prev  = q.previousClose ?? null;
  const ch  = (price!=null && prev!=null) ? price - prev : null;
  const chp = (price!=null && prev!=null && prev!==0) ? (ch/prev)*100 : null;
  return { symbol, price, ch, chp, prev, marketState: q.marketState };
}

/** Trending tickers (US) */
async function yahooTrending() {
  const url = `https://query1.finance.yahoo.com/v1/finance/trending/US`;
  const data = await j(url);
  const list = data?.finance?.result?.[0]?.quotes || [];
  return list.slice(0, 10).map((q: any) => ({ symbol: q.symbol || q, shortName: q.shortName || "", score: q.score ?? null }));
}

/** CoinGecko simple prices */
async function cgSimple(ids: string[]) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=usd&include_24hr_change=true`;
  const data = await j(url);
  return ids.map((id) => ({
    id, price: data?.[id]?.usd ?? null, chp24h: data?.[id]?.usd_24h_change ?? null
  }));
}

/** FRED macro series */
async function fredSeries(series: string) {
  const key = process.env.FRED_API_KEY || "";
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${key}&file_type=json&observation_start=2020-01-01`;
  const data = await j(url);
  const obs = data?.observations || [];
  const last = obs.filter((o:any)=>o.value!=='.').slice(-1)[0];
  return { series, date: last?.date || null, value: last ? Number(last.value) : null };
}

router.get("/overview/home", async (req, res) => {
  try {
    const payload = await cache.wrap("overview_home", MED, async () => {
      const [spy, qqq, dia] = await Promise.all([
        cache.wrap("q_spy", SHORT, () => yahooQuote("SPY")),
        cache.wrap("q_qqq", SHORT, () => yahooQuote("QQQ")),
        cache.wrap("q_dia", SHORT, () => yahooQuote("DIA")),
      ]);
      const crypto = await cache.wrap("cg_top", SHORT, () => cgSimple(["bitcoin","ethereum","solana"]));
      const trending = await cache.wrap("y_trending", MED, () => yahooTrending());
      const [cpi, unemp, rate] = await Promise.all([
        cache.wrap("fred_cpi", LONG, () => fredSeries("CPIAUCSL")),
        cache.wrap("fred_unemp", LONG, () => fredSeries("UNRATE")),
        cache.wrap("fred_fedfunds", LONG, () => fredSeries("FEDFUNDS")),
      ]);
      return { indices: [spy, qqq, dia], crypto, trending, macro: { cpi, unemp, fedfunds: rate }, ts: Date.now() };
    });

    res.setHeader("Cache-Control", "no-store");
    res.json(payload);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "overview_failed" });
  }
});

export default router;