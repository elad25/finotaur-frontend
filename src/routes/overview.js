import express from "express";

const router = express.Router();

function getProviders() {
  return {
    FMP_BASE: process.env.FMP_BASE_URL || "https://financialmodelingprep.com/api",
    FMP_KEY:  process.env.FMP_API_KEY || process.env.FMP_API || "",
    POLY_KEY: process.env.POLYGON_API_KEY || process.env.POLYGON || "",
  };
}

async function getJSON(url) {
  const r = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!r.ok) throw new Error(`Bad ${r.status} for ${url}`);
  return await r.json();
}
async function tryJSON(url) { try { return await getJSON(url); } catch { return null; } }

// Health
router.get("/health", (req, res) => {
  const { POLY_KEY, FMP_KEY } = getProviders();
  res.json({ ok: true, providers: { polygon: Boolean(POLY_KEY), fmp: Boolean(FMP_KEY) } });
});

// ---- SNAPSHOT ----
router.get("/analytics/snapshot", async (req, res) => {
  const symbol = String(req.query.symbol || "").toUpperCase();
  const { FMP_BASE, FMP_KEY, POLY_KEY } = getProviders();
  if (!symbol) return res.status(400).json({ error: "symbol_required" });

  let out = {
    marketCap: null, peTtm: null, peFwd: null, beta: null,
    dividendYield: null, avgVolume: null, week52Low: null, week52High: null,
  };

  if (FMP_KEY) {
    const [profile, quote, ratiosTTM, ratios] = await Promise.all([
      tryJSON(`${FMP_BASE}/v3/profile/${symbol}?apikey=${FMP_KEY}`),
      tryJSON(`${FMP_BASE}/v3/quote/${symbol}?apikey=${FMP_KEY}`),
      tryJSON(`${FMP_BASE}/v3/ratios-ttm/${symbol}?apikey=${FMP_KEY}`),
      tryJSON(`${FMP_BASE}/v3/ratios/${symbol}?limit=1&apikey=${FMP_KEY}`),
    ]);
    const prof = Array.isArray(profile) ? profile[0] : profile || {};
    const q    = Array.isArray(quote) ? quote[0] : quote || {};
    const rTTM = Array.isArray(ratiosTTM) ? ratiosTTM[0] : ratiosTTM || {};
    const r0   = Array.isArray(ratios) ? ratios[0] : ratios || {};

    const price   = q?.price ?? prof?.price ?? null;
    const lastDiv = prof?.lastDiv ?? q?.lastDiv ?? null;

    out.marketCap   = q?.marketCap ?? prof?.mktCap ?? out.marketCap;
    out.peTtm       = q?.pe ?? rTTM?.priceEarningsRatioTTM ?? r0?.priceEarningsRatio ?? out.peTtm;
    out.beta        = prof?.beta ?? out.beta;
    out.dividendYield = (lastDiv && price) ? (Number(lastDiv)/Number(price)) : out.dividendYield;
    out.avgVolume   = q?.avgVolume ?? q?.avgVolume10days ?? prof?.volAvg ?? out.avgVolume;

    if (!out.week52High && prof?.range) {
      const [lowS, highS] = String(prof.range).split("-").map(s => Number(String(s).replace(/[^0-9.\-]/g,'')));
      out.week52Low  = Number.isFinite(lowS) ? lowS : out.week52Low;
      out.week52High = Number.isFinite(highS) ? highS : out.week52High;
    }
    const km = await tryJSON(`${FMP_BASE}/v3/key-metrics/${symbol}?limit=1&apikey=${FMP_KEY}`);
    if (km && Array.isArray(km) && km[0] && km[0].forwardPE != null) {
      out.peFwd = km[0].forwardPE;
    }
  }

  if (POLY_KEY) {
    if (out.marketCap == null) {
      const ref = await tryJSON(`https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${POLY_KEY}`);
      const cap = ref?.results?.market_cap;
      if (cap != null) out.marketCap = cap;
    }
    if (out.week52High == null || out.week52Low == null || out.avgVolume == null) {
      const { from, to } = computeFromTo("1Y");
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${POLY_KEY}`;
      const aggs = await tryJSON(url);
      if (aggs?.results?.length) {
        const highs = aggs.results.map(r => r.h).filter(x => x != null);
        const lows  = aggs.results.map(r => r.l).filter(x => x != null);
        const vols  = aggs.results.map(r => r.v).filter(x => x != null);
        if (highs.length) out.week52High = Math.max(...highs);
        if (lows.length)  out.week52Low  = Math.min(...lows);
        if (vols.length && out.avgVolume == null) {
          out.avgVolume = Math.round(vols.reduce((a,b)=>a+b,0) / vols.length);
        }
      }
    }
  }

  return res.json(out);
});

// ---- COMPANY PROFILE ----
router.get("/company/profile", async (req, res) => {
  const symbol = String(req.query.symbol || "").toUpperCase();
  const { FMP_BASE, FMP_KEY, POLY_KEY } = getProviders();
  if (!symbol) return res.status(400).json({ error: "symbol_required" });
  try {
    if (FMP_KEY) {
      const data = await tryJSON(`${FMP_BASE}/v3/profile/${symbol}?apikey=${FMP_KEY}`);
      const p = Array.isArray(data) ? data[0] : data || {};
      if (p?.description) return res.json({ description: p.description });
    }
    if (POLY_KEY) {
      const ref = await tryJSON(`https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${POLY_KEY}`);
      return res.json({ description: ref?.results?.description || "" });
    }
    return res.json({ description: "" });
  } catch (e) {
    console.error("[overview/profile]", e);
    return res.json({ description: "" });
  }
});

// ---- NEWS ----
router.get("/news/by-symbol", async (req, res) => {
  const symbol = String(req.query.symbol || "").toUpperCase();
  const limit = Number(req.query.limit || 4);
  const { POLY_KEY } = getProviders();
  try {
    if (POLY_KEY) {
      const url = `https://api.polygon.io/v2/reference/news?ticker=${symbol}&order=desc&limit=${Math.min(limit, 10)}&apiKey=${POLY_KEY}`;
      const j = await tryJSON(url);
      const items = (j?.results || []).map(n => ({
        title: n?.title,
        source: n?.publisher?.name,
        publishedAt: n?.published_utc,
        url: n?.article_url,
        sentiment: "Neutral"
      }));
      return res.json({ symbol, items, limit });
    }
    return res.json({ symbol, items: [], limit });
  } catch (e) {
    console.error("[overview/news]", e);
    return res.json({ symbol, items: [], limit });
  }
});

// ---- PRICE HISTORY (intraday-aware) ----
router.get("/prices/history", async (req, res) => {
  const symbol = String(req.query.symbol || "").toUpperCase();
  const range  = String(req.query.range || "1Y").toUpperCase();
  const interval = String(req.query.interval || "").toLowerCase(); // m1/m15/h1/d1
  const { POLY_KEY, FMP_BASE, FMP_KEY } = getProviders();
  if (!symbol) return res.status(400).json({ error: "symbol_required" });
  try {
    if (POLY_KEY) {
      const map = {
        m1:  { span: "minute", mult: 1 },
        m15: { span: "minute", mult: 15 },
        h1:  { span: "hour",   mult: 1 },
        d1:  { span: "day",    mult: 1 },
      };
      let span = "day", mult = 1;
      if (map[interval]) { span = map[interval].span; mult = map[interval].mult; }
      else {
        if (range === "1D") { span = "minute"; mult = 1; }
        else if (range === "1W") { span = "minute"; mult = 15; }
        else if (range === "1M") { span = "hour"; mult = 1; }
        else { span = "day"; mult = 1; }
      }

      const { from, to } = computeFromTo(range);
      const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${mult}/${span}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${POLY_KEY}`;
      const d = await tryJSON(url);
      const points = Array.isArray(d?.results) ? d.results.map(r => ({
        t: Math.floor(Number(r.t)/1000),
        value: Number(r.c),
        c: Number(r.c),
        v: r.v ?? null,
        h: r.h ?? null,
        l: r.l ?? null
      })) : [];
      return res.json({ symbol, range, points });
    }
    if (FMP_KEY) {
      const resp = await tryJSON(`${FMP_BASE}/v3/historical-price-full/${symbol}?serietype=line&timeseries=${rangeToDays(range)}&apikey=${FMP_KEY}`);
      const arr = resp?.historical || [];
      const points = arr.reverse().map(d => ({ t: Math.floor(new Date(d.date).getTime()/1000), value: Number(d.close), c: Number(d.close) }));
      return res.json({ symbol, range, points });
    }
    return res.json({ symbol, range, points: [] });
  } catch (e) {
    console.error("[prices/history]", e);
    return res.json({ symbol, range, points: [] });
  }
});

function rangeToDays(r){
  switch(r){
    case "1D": return 2;
    case "1W": return 7;
    case "1M": return 31;
    case "6M": return 186;
    case "1Y": return 366;
    case "5Y": return 1827;
    default: return 366;
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

export default router;
