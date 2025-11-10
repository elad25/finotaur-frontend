// finotaur-server/src/routes/price.js
// ESM router for price series (Polygon) + in-memory caching & 429 fallback.
// Supports interval: 2min, 5min, 4h, day
// Optional: from/to (YYYY-MM-DD or unix ms).
// Optional: closes=1 -> [{t, close}] only (default). closes=0 -> include ohlc, v.

import express from "express";
const router = express.Router();

const POLYGON_BASE = "https://api.polygon.io";

// ---------- small in-memory cache & in-flight de-dupe ----------
const cache = new Map();       // key -> { ts, data }
const inflight = new Map();    // key -> Promise
const DEFAULT_TTLS = {
  "2min": 30_000,  // 30s
  "5min": 45_000,  // 45s
  "4h":   300_000, // 5m
  "day":  600_000, // 10m
};

function getTTLFor(interval, override) {
  if (override != null) {
    const n = Number(override);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return DEFAULT_TTLS[interval] ?? 60_000;
}

async function cachedFetchJSON(key, url, ttlMs) {
  const now = Date.now();

  // cache hit
  const c = cache.get(key);
  if (c && (now - c.ts < ttlMs)) {
    return { json: c.data, cache: "HIT" };
  }

  // de-dupe concurrent fetches
  if (inflight.has(key)) {
    const json = await inflight.get(key);
    return { json, cache: "HIT(inflight)" };
  }

  // fetch (store promise)
  const p = (async () => {
    const r = await fetch(url);
    // If rate-limited and we have stale-but-recent cache (<= 5*ttl), return it
    if (r.status === 429) {
      const stale = cache.get(key);
      if (stale && (now - stale.ts) < (ttlMs * 5)) {
        return stale.data;
      }
      // propagate error text so caller can surface gently
      throw new Error(`429 Too Many Requests from upstream: ${await r.text()}`);
    }
    if (!r.ok) {
      throw new Error(`Upstream error ${r.status}: ${await r.text()}`);
    }
    return r.json();
  })();

  inflight.set(key, p);
  try {
    const json = await p;
    cache.set(key, { ts: Date.now(), data: json });
    return { json, cache: "MISS" };
  } finally {
    inflight.delete(key);
  }
}
// ----------------------------------------------------------------

function parseDateInput(v) {
  if (!v) return null;
  // allow YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ or unix/epoch (ms or s)
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v);
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Date(n < 1e12 ? n * 1000 : n);
}

// Map UI intervals to Polygon v2 aggs range
const INTERVALS = {
  "2min": { mult: 2, unit: "minute", lookbackDays: 1 },
  "5min": { mult: 5, unit: "minute", lookbackDays: 7 },
  "4h":   { mult: 4, unit: "hour",   lookbackDays: 30 },
  "day":  { mult: 1, unit: "day",    lookbackDays: 365 },
};

router.get("/price", async (req, res) => {
  try {
    const key = process.env.POLYGON_API_KEY;
    if (!key) {
      return res.status(500).json({ status: "ERROR", error: "Missing POLYGON_API_KEY" });
    }

    const symbol = (req.query.symbol || "").toUpperCase().trim();
    const interval = (req.query.interval || "day").toLowerCase();
    const closesOnly = (req.query.closes ?? "1") === "1";
    const ttlOverride = req.query.ttl; // optional ?ttl=60000 (ms)

    if (!symbol) {
      return res.status(400).json({ status: "ERROR", error: "symbol is required" });
    }
    if (!INTERVALS[interval]) {
      return res.status(400).json({ status: "ERROR", error: `Unsupported interval '${interval}'. Use 2min|5min|4h|day` });
    }
    const { mult, unit, lookbackDays } = INTERVALS[interval];

    const now = new Date();
    const to = parseDateInput(req.query.to) ?? now;
    let from = parseDateInput(req.query.from);
    if (!from) {
      // default lookback window
      from = new Date(to.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    }

    const fromISO = from.toISOString().slice(0, 10);
    const toISO = to.toISOString().slice(0, 10);

    const url = `${POLYGON_BASE}/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${mult}/${unit}/${fromISO}/${toISO}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`;

    const cacheKey = `${symbol}|${interval}|${fromISO}|${toISO}|${closesOnly ? "c" : "full"}`;
    const { json, cache: cacheState } = await cachedFetchJSON(cacheKey, url, getTTLFor(interval, ttlOverride));
    res.setHeader("X-Cache", cacheState);

    const results = Array.isArray(json?.results) ? json.results : [];
    const out = results.map((row) => ({
      t: row.t,               // epoch ms
      o: row.o, h: row.h, l: row.l, c: row.c, v: row.v,
      close: row.c,
    }));

    if (closesOnly) {
      return res.json(out.map(({ t, close }) => ({ t, close })));
    }
    return res.json(out);
  } catch (err) {
    // graceful error surfacing
    const msg = String(err?.message || err);
    if (/429/i.test(msg)) {
      // 429 from upstream and no usable cache
      return res.status(429).json({ status: "ERROR", error: "Upstream rate-limited. Try again shortly.", detail: msg });
    }
    console.error("[/api/price] error", err);
    return res.status(500).json({ status: "ERROR", error: msg });
  }
});

export default router;
