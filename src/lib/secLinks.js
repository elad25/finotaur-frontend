// ESM helper utilities for SEC links
const SEC_PROXY_BASE = process.env.SEC_PROXY_BASE || "https://sec-proxy.elad2550.workers.dev";

let _tickerMap = null;
async function getTickerMap() {
  if (_tickerMap) return _tickerMap;
  const url = `${SEC_PROXY_BASE}/api/sec/files/company_tickers.json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`SEC tickers HTTP ${r.status}`);
  const j = await r.json();
  const map = {};
  for (const row of j) {
    map[String(row.ticker || "").toUpperCase()] = row;
  }
  _tickerMap = map;
  return _tickerMap;
}

export async function getCikForSymbol(symbol) {
  const map = await getTickerMap();
  const row = map[String(symbol || "").toUpperCase()];
  if (!row) return null;
  return String(row.cik_str).padStart(10, "0");
}

export function buildDocUrl(cik, accessionNumber, primaryDocument) {
  const cikNoZeros = String(cik || "").replace(/^0+/, "") || "0";
  const accNoDashes = String(accessionNumber || "").replace(/-/g, "");
  if (!cikNoZeros || !accNoDashes || !primaryDocument) return null;
  return `https://www.sec.gov/Archives/edgar/data/${cikNoZeros}/${accNoDashes}/${primaryDocument}`;
}

export async function getCompanySubmissions(cik) {
  const padded = String(cik).padStart(10, "0");
  const r = await fetch(`${SEC_PROXY_BASE}/api/sec/submissions/CIK${padded}.json`);
  if (!r.ok) throw new Error(`SEC submissions HTTP ${r.status}`);
  return r.json();
}

export function findDocUrlFromSubmissions(submissions, targetForm, targetFilingDate) {
  try{
    const recent = submissions?.filings?.recent;
    if (!recent) return null;
    const forms = recent.form || [];
    const dates = recent.filingDate || [];
    const accessions = recent.accessionNumber || [];
    const docs = recent.primaryDocument || [];

    for (let i=0;i<forms.length;i++) {
      if (String(forms[i]).toUpperCase() === String(targetForm||"").toUpperCase()
        && String(dates[i]) === String(targetFilingDate)) {
        const url = buildDocUrl(submissions.cik, accessions[i], docs[i]);
        if (url) return url;
      }
    }
  }catch {}
  return null;
}
