import express from "express";
import fetch from "node-fetch";
const router = express.Router();

const UA = process.env.SEC_USER_AGENT || "Finotaur/1.0 (+support@finotaur.local)";
const SEC_PROXY = process.env.SEC_PROXY_URL; // optional

async function getJSON(url, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Encoding": "gzip, deflate", "Accept": "application/json" },
      });
      if (!r.ok) throw new Error(`Bad ${r.status}`);
      return await r.json();
    } catch (e) {
      err = e;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw err;
}

let companyTickersCache = null;
async function ensureCompanyTickers() {
  if (companyTickersCache) return companyTickersCache;
  const base = SEC_PROXY || "https://www.sec.gov";
  const url = `${base}/files/company_tickers.json`;
  companyTickersCache = await getJSON(url);
  return companyTickersCache;
}

function symbolToCik(cache, symbol) {
  const arr = Object.values(cache || {});
  const s = (symbol || "").toUpperCase();
  for (const row of arr) {
    if ((row?.ticker || "").toUpperCase() === s) return String(row?.cik_str).padStart(10, "0");
  }
  return null;
}

// GET /api/sec/filings?symbol=TSLA&forms=annual,quarterly&limit=20
router.get("/filings", async (req, res) => {
  try {
    const { symbol = "", forms = "annual,quarterly", limit = 20 } = req.query;
    const cache = await ensureCompanyTickers();
    const cik = symbolToCik(cache, symbol);
    if (!cik) return res.json({ symbol, cik: null, filings: [] });

    const base = SEC_PROXY || "https://data.sec.gov";
    const url = `${base}/submissions/CIK${cik}.json`;
    const data = await getJSON(url);

    const wantAnnual = String(forms).includes("annual");
    const wantQuarterly = String(forms).includes("quarter");

    const formsWanted = new Set();
    if (wantAnnual) ["10-K", "20-F", "40-F", "N-CSR"].forEach((f) => formsWanted.add(f));
    if (wantQuarterly) ["10-Q", "6-K"].forEach((f) => formsWanted.add(f));

    const filings = [];
    const f = data?.filings?.recent;
    if (f && Array.isArray(f.form)) {
      const n = f.form.length;
      for (let i = 0; i < n; i++) {
        const form = f.form[i];
        if (!formsWanted.has(form)) continue;
        filings.push({
          form,
          filedAt: f.filingDate?.[i] || null,
          reportDate: f.reportDate?.[i] || null,
          docUrl: f.accessionNumber?.[i]
            ? `https://www.sec.gov/ixviewer/doc?action=display&source=content&accno=${encodeURIComponent(f.accessionNumber[i])}`
            : null,
        });
        if (filings.length >= Number(limit)) break;
      }
    }
    return res.json({ symbol, cik, filings });
  } catch (err) {
    console.error("[sec/filings]", err);
    return res.status(200).json({ symbol: req.query.symbol || "", cik: null, filings: [] });
  }
});

export default router;