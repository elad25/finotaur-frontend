/**
 * routes/quote.ts
 * Returns last close price & percent change using Polygon (if key provided).
 * Never 500 on missing provider; returns nulls instead.
 */
import type { Request, Response } from "express";
import express from "express";
import fetch from "node-fetch";
import { getCache, setCache, withInflight } from "../utils/cache";

const router = express.Router();
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const POLY_TTL = Number(process.env.POLYGON_TTL_SEC || 300);

async function fetchJson(url: string) {
  const r = await fetch(url);
  const txt = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url} :: ${txt}`);
  try { return JSON.parse(txt); } catch { return null; }
}

router.get("/api/quote", async (req: Request, res: Response) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
    const symbol = String(req.query.symbol || "").toUpperCase().trim();
    if (!symbol) return res.status(400).json({ error: "missing_symbol" });

    const key = process.env.POLYGON_API_KEY || "";
    if (!key) {
      // no provider key; return soft-null instead of 500
      return res.status(200).json({ symbol, price: null, changePercent: null, provider: "none" });
    }
    const cacheKey = `poly:prev:${symbol}`;
    const hit = getCache(cacheKey);
    if (hit) return res.status(200).json(hit);

    const prev = await fetchJson(`https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${key}`);
    const c = prev?.results?.[0]?.c ?? null;
    const o = prev?.results?.[0]?.o ?? null;
    const pct = (c!=null && o!=null && o!==0) ? ((c - o) / o * 100) : null;
    const payload = { symbol, price: c, changePercent: pct, provider: "polygon" };
    setCache(cacheKey, payload, POLY_TTL);
    return res.status(200).json(payload);
  } catch (err: any) {
    // never explode to frontend
    return res.status(200).json({ symbol: String(req.query.symbol||"").toUpperCase(), price: null, changePercent: null, provider: "error_soft" });
  }
});

export default router;
