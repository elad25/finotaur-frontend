// src/services/secService.ts
import type { Request, Response } from "express";

const SEC_BASE = process.env.SEC_BASE_URL || "https://data.sec.gov";
const SEC_UA = process.env.SEC_USER_AGENT || "Finotaur/1.0 (mailto:dev@finotaur.com)";
const SEC_CONTACT = process.env.SEC_CONTACT || "dev@finotaur.com";

const cache: Record<string, any> = {};

function classifyForm(form: string): 'annual' | 'quarterly' | 'other' {
  const f = (form || '').toUpperCase();
  if (f === '10-K' || f === '20-F') return 'annual';
  if (f === '10-Q') return 'quarterly';
  return 'other'; // 6-K handled separately if it contains interim/quarterly results
}


async function fetchJSON(url: string) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": SEC_UA,
      "Accept": "application/json",
      "From": SEC_CONTACT
    }
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`SEC request failed ${r.status}: ${text}`);
  }
  return r.json();
}

function padCIK(n: number | string) {
  const s = String(n);
  return s.padStart(10, "0");
}

function stripLeadingZeros(s: string) { return s.replace(/^0+/, '') || '0'; }
function buildFilingUrl(cik: string, accessionNumber: string, primaryDocument: string) {
  const c = stripLeadingZeros(cik);
  const acc = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${c}/${acc}/${primaryDocument}`;
}




async function fetchIndexJson(cik: string, accessionNumber: string) {
  const c = String(cik).replace(/^0+/, '') || '0';
  const acc = accessionNumber.replace(/-/g, '');
  const url = `${SEC_BASE}/Archives/edgar/data/${c}/${acc}/index.json`;
  return await fetchJSON(url);
}

function normalize(s: any) { return String(s || '').toLowerCase(); }

async function isInterim6K(cik: string, accessionNumber: string, primaryDocument: string) {
  try {
    const idx = await fetchIndexJson(cik, accessionNumber);
    const docs = idx?.directory?.item || [];
    const hay = [
  normalize(primaryDocument),
  ...docs.map((d: any) => normalize(d?.name)),
  ...docs.map((d: any) => normalize(d?.type)),
  ...docs.map((d: any) => normalize(d?.desc || d?.description)),
].join(" ");
const kw = keywords.some(k => hay.includes(k));
if (!kw) return false;
const hasDoc = docs.some((d:any) => {
  const n = normalize(d?.name);
  return (n.endsWith('.htm') || n.endsWith('.html') || n.endsWith('.pdf')) &&
         (n.includes('result') || n.includes('financial') || n.includes('report') || n.includes('earnings'));
});
return hasDoc;
  } catch { return false; }
}

function yq(dateStr?: string) {
  if (!dateStr) return "NA";
  const d = new Date(dateStr);
  if (isNaN(d as any)) return "NA";
  const q = Math.floor(d.getUTCMonth()/3)+1;
  return `${d.getUTCFullYear()}-Q${q}`;
}
async function getCIKFromTicker(ticker: string): Promise<string | null> {
  const key = `cik:${ticker}`.toUpperCase();
  if (cache[key]) return cache[key];

  const listKey = "sec:tickerList";
  if (!cache[listKey]) {
    const url = `${SEC_BASE}/files/company_tickers.json`;
    cache[listKey] = await fetchJSON(url);
  }
  const list = cache[listKey];
  const arr = Object.values(list) as Array<any>;
  const found = arr.find((row) => String(row.ticker).toUpperCase() === ticker.toUpperCase());
  if (!found) return null;
  const cik = padCIK(found.cik_str);
  cache[key] = cik;
  return cik;
}

export async function getCompanyFilings(req: Request, res: Response) {
  try {
    const symbol = String(req.query.symbol || "").trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: "symbol is required" });
    const cik = await getCIKFromTicker(symbol);
    if (!cik) return res.status(404).json({ error: `CIK not found for ${symbol}` });

    const url = `${SEC_BASE}/submissions/CIK${cik}.json`;
    const data = await fetchJSON(url);

    const cacheKey = `filings:${symbol}`;
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].ts) < 15*60*1000) {
      return res.json(cache[cacheKey].payload);
    }

    const filings = data?.filings?.recent;
    if (!filings) return res.json({ symbol, cik, filings: [] });

    const result: any[] = [];
    const n = filings.form?.length || 0;
    const buckets: Record<string, any> = {};
    for (let i = 0; i < n; i++) {
      const form = filings.form[i];
      if (form === "10-K" || form === "10-Q" || form === "20-F") {
  const friendlyType = classifyForm(form);
  const row: any = {
    form,
    accessionNumber: filings.accessionNumber[i],
    filingDate: filings.filingDate[i],
    reportDate: filings.reportDate?.[i],
    primaryDocument: filings.primaryDocument?.[i],
    friendlyType,
    documentUrl: buildFilingUrl(cik, filings.accessionNumber[i], filings.primaryDocument?.[i] || ''),
    downloadPath: `/api/sec/download?cik=${cik}&accessionNumber=${encodeURIComponent(filings.accessionNumber[i])}&primaryDocument=${encodeURIComponent(filings.primaryDocument?.[i] || '')}`
  };
  if (friendlyType === 'quarterly') {
    const key = yq(row.reportDate || row.filingDate);
    const prev = buckets[key];
    if (!prev || (prev.filingDate || '') < (row.filingDate || '')) buckets[key] = row;
  } else {
    result.push(row);
  }
} else if (form === "6-K") {
  // Only include 6-K that actually contain interim/quarterly results, classify as quarterly
  const ok = await isInterim6K(cik, filings.accessionNumber[i], filings.primaryDocument?.[i] || '');
  if (ok) {
    const row: any = {
      form,
      accessionNumber: filings.accessionNumber[i],
      filingDate: filings.filingDate[i],
      reportDate: filings.reportDate?.[i],
      primaryDocument: filings.primaryDocument?.[i],
      friendlyType: 'quarterly',
      documentUrl: buildFilingUrl(cik, filings.accessionNumber[i], filings.primaryDocument?.[i] || ''),
      downloadPath: `/api/sec/download?cik=${cik}&accessionNumber=${encodeURIComponent(filings.accessionNumber[i])}&primaryDocument=${encodeURIComponent(filings.primaryDocument?.[i] || '')}`
    };
    const key = yq(row.reportDate || row.filingDate);
    const prev = buckets[key];
    if (!prev || (prev.filingDate || '') < (row.filingDate || '')) buckets[key] = row;
  }
}&accessionNumber=${encodeURIComponent(filings.accessionNumber[i])}&primaryDocument=${encodeURIComponent(filings.primaryDocument?.[i] || '')}``
        });
      }
    }
    const payload = { symbol, cik, filings: result };
    cache[cacheKey] = { ts: Date.now(), payload };
    return res.json(payload);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to fetch SEC filings" });
  }
}

export async function getInsiderTrades(_req: Request, res: Response) {
  return res.status(501).json({ error: "Insider endpoint not implemented yet. Filings endpoint is working." });
}
