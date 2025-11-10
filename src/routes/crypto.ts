// src/routes/crypto.ts
import { Router } from "express";
import fetch from "node-fetch";
import * as cache from "../utils/cache.js";

const router = Router();

const CG = process.env.COINGECKO_BASE || "https://api.coingecko.com/api/v3";
const SHORT = 60 * 1000;      // 1m
const MED   = 5 * 60 * 1000;  // 5m
const LONG  = 30 * 60 * 1000; // 30m

async function j(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "finotaur/1.0" } });
  if (!r.ok) throw new Error("bad_status_" + r.status);
  return r.json();
}

router.get("/crypto/overview", async (req, res) => {
  try {
    const perPage = Math.max(10, Math.min(100, parseInt(String(req.query.per_page ?? "50"), 10) || 50));
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const payload = await cache.wrap(`cg_overview_${perPage}_${page}`, SHORT, async () => {
      const url = `${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=1h,24h,7d`;
      const data = await j(url);
      return { items: data, ts: Date.now() };
    });
    res.setHeader("Cache-Control", "no-store");
    res.json(payload);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "crypto_overview_failed" });
  }
});

router.get("/crypto/trending", async (_req, res) => {
  try {
    const payload = await cache.wrap("cg_trending", MED, async () => {
      const data = await j(`${CG}/search/trending`);
      return { items: data?.coins ?? [], ts: Date.now() };
    });
    res.setHeader("Cache-Control", "no-store");
    res.json(payload);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "crypto_trending_failed" });
  }
});

router.get("/crypto/dominance", async (_req, res) => {
  try {
    const payload = await cache.wrap("cg_global", LONG, async () => {
      const data = await j(`${CG}/global`);
      return { data, ts: Date.now() };
    });
    res.setHeader("Cache-Control", "no-store");
    res.json(payload);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "crypto_dominance_failed" });
  }
});

router.get("/crypto/coin/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "bitcoin");
    const payload = await cache.wrap(`cg_coin_${id}`, SHORT, async () => {
      const base = `${CG}/coins/${encodeURIComponent(id)}`;
      const [coin, marketChart] = await Promise.all([
        j(`${base}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`),
        j(`${base}/market_chart?vs_currency=usd&days=1&interval=hourly`)
      ]);
      // Lightweight "AI-like" summary without external LLM calls
      const ch24 = coin?.market_data?.price_change_percentage_24h ?? null;
      const dir = (typeof ch24 === "number" && !Number.isNaN(ch24)) ? (ch24 >= 0 ? "up" : "down") : "flat";
      const aiSummary = `24h: ${dir}${ch24!=null ? ` (${ch24.toFixed(2)}%)` : ""}. Market cap: $${coin?.market_data?.market_cap?.usd?.toLocaleString?.() ?? "N/A"}. Volume: $${coin?.market_data?.total_volume?.usd?.toLocaleString?.() ?? "N/A"}.`;
      return { coin, marketChart, aiSummary, ts: Date.now() };
    });
    res.setHeader("Cache-Control", "no-store");
    res.json(payload);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "crypto_coin_failed" });
  }
});

export default router;
