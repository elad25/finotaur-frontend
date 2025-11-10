// finotaur-server/src/routes/overview/reference.js
import express from "express";
const router = express.Router();

async function j(url, headers={}){
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

router.get("/overview/reference", async (req, res) => {
  try {
    const key = process.env.POLYGON_API_KEY;
    if (!key) return res.status(500).json({ status:"ERROR", error:"Missing POLYGON_API_KEY" });
    const symbol = String(req.query.symbol||"").toUpperCase().trim();
    if (!symbol) return res.status(400).json({ status:"ERROR", error:"symbol is required" });

    const tkr = await j(`https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${key}`);
    const marketCap = tkr?.results?.market_cap ?? null;
    const description = tkr?.results?.description ?? "";

    let dividendYield = null;
    try {
      const divs = await j(`https://api.polygon.io/v3/reference/dividends?ticker=${encodeURIComponent(symbol)}&limit=50&order=desc&apiKey=${key}`);
      const rows = Array.isArray(divs?.results) ? divs.results : [];
      const last4 = rows.filter(r => !!r.cash_amount).slice(0, 4);
      const total = last4.reduce((s, r) => s + (Number(r.cash_amount)||0), 0);
      if (total > 0) {
        const prev = await j(`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${key}`);
        const last = prev?.results?.[0]?.c ?? null;
        if (last) dividendYield = total / last;
      }
    } catch {}

    res.json({ marketCap, description, dividendYield });
  } catch (err) {
    res.status(500).json({ status:"ERROR", error:String(err?.message||err) });
  }
});

export default router;
