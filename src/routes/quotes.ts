
// src/routes/quotes.ts
import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

async function yahooQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const r = await fetch(url, { headers: { "User-Agent": "finotaur/1.0" } });
  if (!r.ok) throw new Error("yahoo_status_"+r.status);
  const data = await r.json() as any;
  const q = data?.quoteResponse?.result?.[0] || {};
  const price = q.preMarketPrice ?? q.regularMarketPrice ?? q.postMarketPrice ?? null;
  const prev  = q.previousClose ?? null;
  const chp   = (price!=null && prev!=null && prev!==0) ? ((price - prev)/prev)*100 : null;
  return { price, chp };
}

router.get("/quote", async (req, res) => {
  const symbol = String(req.query.symbol || "").toUpperCase();
  if (!symbol) return res.status(400).json({ error: "symbol_required" });
  try {
    const q = await yahooQuote(symbol);
    res.setHeader("Cache-Control", "no-store");
    return res.json(q);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "quote_failed" });
  }
});

export default router;
