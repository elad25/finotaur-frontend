
// finotaur-server/src/routes/news.js
// Rewritten to use Polygon Reference News (free-tier compatible subset).
// GET /api/news?symbol=MSFT&limit=4

import express from "express";
const router = express.Router();

const POLY_BASE = "https://api.polygon.io/v2/reference/news";

router.get("/news", async (req, res) => {
  try {
    const key = process.env.POLYGON_API_KEY;
    if (!key) return res.status(500).json({ status: "ERROR", error: "Missing POLYGON_API_KEY" });
    const symbol = String(req.query.symbol || "").toUpperCase().trim();
    const limit = Math.min(parseInt(req.query.limit || "4", 10), 10);
    if (!symbol) return res.status(400).json({ status: "ERROR", error: "symbol is required" });

    const url = `${POLY_BASE}?ticker=${encodeURIComponent(symbol)}&limit=${limit}&order=desc&sort=published_utc&apiKey=${key}`;
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ status: "ERROR", error: await r.text() });
    const j = await r.json();
    const rows = Array.isArray(j.results) ? j.results : [];

    const out = rows.map(n => ({
      id: n.id || n.article_url,
      title: n.title,
      source: n.publisher?.name,
      url: n.article_url,
      publishedAt: n.published_utc,
      sentiment: "Neutral", // keep simple; can enhance later
    }));
    res.json(out);
  } catch (err) {
    res.status(500).json({ status: "ERROR", error: String(err?.message || err) });
  }
});

export default router;
