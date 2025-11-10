
import express from "express";
const router = express.Router();

async function j(url, headers={}){
  const r = await fetch(url, { headers });
  if(!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}
const pad10 = (s) => String(s||'').padStart(10,'0');

async function resolveCikBySymbol(symbol){
  const data = await j('https://www.sec.gov/files/company_tickers.json', { 'User-Agent': process.env.SEC_USER_AGENT || 'Finotaur/1.0' });
  const u = String(symbol||'').toUpperCase();
  for (const k in data) {
    const row = data[k];
    if ((row?.ticker||'').toUpperCase() === u) return pad10(row.cik_str);
  }
  return null;
}

router.get("/profile", async (req, res) => {
  try {
    const symbol = (req.query.symbol || "").toUpperCase().trim();
    if (!symbol) return res.status(400).json({ status: "ERROR", error: "symbol is required" });

    // Try Polygon reference for a proper description
    let description = "";
    try {
      const k = process.env.POLYGON_API_KEY;
      if (k) {
        const url = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${k}`;
        const data = await j(url);
        description = data?.results?.description || "";
      }
    } catch {}

    res.json({ profile: { description } });
  } catch (err) {
    res.status(500).json({ status: "ERROR", error: String(err?.message || err) });
  }
});

router.get("/snapshot", async (req, res) => {
  try {
    const symbol = (req.query.symbol || "").toUpperCase().trim();
    if (!symbol) return res.status(400).json({ status: "ERROR", error: "symbol is required" });

    // last price
    let last = null;
    try{
      const key = process.env.POLYGON_API_KEY;
      if (key){
        const d = await j(`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${key}`);
        last = d?.results?.[0]?.c ?? null;
      }
    }catch{}

    const snapshot = {
      marketCap: null,
      peTTM: null, peFwd: null, beta: null,
      dividendYield: null, avgVolume: null,
      wk52Low: null, wk52High: null, last,
      analyst: { consensus: "—", targetAvg: null, targetHigh: null, targetLow: null }
    };
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ status: "ERROR", error: String(err?.message || err) });
  }
});

export default router;
