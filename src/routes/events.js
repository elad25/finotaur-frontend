
// finotaur-server/src/routes/events.js
// ESM router for event markers (dividends, earnings, filings) via Polygon v3 reference endpoints.

import express from "express";

const router = express.Router();
const BASE = "https://api.polygon.io/v3/reference";

function asISO(d) {
  if (!d) return null;
  try { return new Date(d).toISOString(); } catch { return null; }
}

async function fetchAll(url, key) {
  const acc = [];
  let next = url;
  for (let i = 0; i < 5 && next; i++) {
    const r = await fetch(next + (next.includes("?") ? "&" : "?") + "apiKey=" + key);
    if (!r.ok) break;
    const j = await r.json();
    if (Array.isArray(j.results)) acc.push(...j.results);
    next = j.next_url || null;
  }
  return acc;
}

router.get("/events", async (req, res) => {
  try {
    const key = process.env.POLYGON_API_KEY;
    if (!key) return res.status(500).json({ status: "ERROR", error: "Missing POLYGON_API_KEY" });

    const symbol = (req.query.symbol || "").toUpperCase().trim();
    const types = (req.query.types || "dividends,earnings,filings")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    if (!symbol) return res.status(400).json({ status: "ERROR", error: "symbol is required" });

    const out = [];

    if (types.includes("dividends")) {
      const url = `${BASE}/dividends?ticker=${encodeURIComponent(symbol)}&limit=100`;
      const rows = await fetchAll(url, key);
      for (const r of rows) {
        const t = r.ex_dividend_date || r.pay_date || r.declaration_date;
        if (!t) continue;
        out.push({ t: new Date(t).getTime(), type: "dividend", label: `Dividend ${r.cash_amount ?? ""}`.trim() });
      }
    }

    if (types.includes("earnings")) {
      const url = `${BASE}/corporate-actions?ticker=${encodeURIComponent(symbol)}&types=Earnings&limit=100`;
      const rows = await fetchAll(url, key);
      for (const r of rows) {
        const t = r.declared_date || r.effective_date || r.announcement_date;
        if (!t) continue;
        out.push({ t: new Date(t).getTime(), type: "earnings", label: "Earnings" });
      }
    }

    if (types.includes("filings")) {
      const url = `${BASE}/filings?ticker=${encodeURIComponent(symbol)}&limit=100`;
      const rows = await fetchAll(url, key);
      for (const r of rows) {
        const t = r.accepted_datetime || r.filing_date;
        if (!t) continue;
        const form = r.form || "Filing";
        out.push({ t: new Date(t).getTime(), type: "filing", label: form });
      }
    }

    out.sort((a,b) => a.t - b.t);
    res.json(out);
  } catch (err) {
    console.error("[/api/events] error", err);
    res.status(500).json({ status: "ERROR", error: String(err?.message || err) });
  }
});

export default router;
