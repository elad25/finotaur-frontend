// src/routes/tickers.js
const express = require("express");
const router = express.Router();
const { getJSON } = require("../lib/fmp");

// GET /api/tickers/search?query=AAP
router.get("/api/tickers/search", async (req, res) => {
  try {
    const q = String(req.query.query || req.query.q || "").trim();
    if (!q) return res.json({ items: [] });
    // FMP search returns symbol + name + exchange; we limit to US primary exchanges
    const data = await getJSON(`/search?query=${encodeURIComponent(q)}&limit=25&exchange=NYSE,NASDAQ,AMEX`);
    const items = (data || []).map(x => ({
      symbol: x.symbol,
      name: x.name || x.companyName || "",
      exchange: x.exchangeShortName || x.exchange || "",
      display: `${x.symbol} - ${x.name || ""}`.trim(),
    }));
    res.json({ items });
  } catch (err) {
    console.error("tickers search error", err);
    res.status(500).json({ error: String(err.message || err), items: [] });
  }
});

module.exports = router;
