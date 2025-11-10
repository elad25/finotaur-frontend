
import fetch from 'node-fetch';
import { globalCache } from '../utils/ttlCache';
const SEC_UA = process.env.SEC_USER_AGENT || 'FinotaurBot/1.0 (contact: support@finotaur.app)';
const SUB_BASE = 'https://data.sec.gov';
function headers() {
  return { 'User-Agent': SEC_UA, 'Accept-Encoding': 'gzip, deflate, br' } as any;
}
export type TickerEntry = { cik_str: number; ticker: string; title: string };
const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
export async function getTickerMap(): Promise<Record<string, TickerEntry>> {
  const key = 'sec:tickerMap:v1';
  const cached = globalCache.get<Record<string, TickerEntry>>(key);
  if (cached) return cached;
  const res = await fetch(TICKERS_URL, { headers: headers() });
  if (!res.ok) throw new Error('SEC tickers fetch failed: ' + res.status);
  const data = await res.json();
  const map: Record<string, TickerEntry> = {};
  for (const k of Object.keys(data)) {
    const row = (data as any)[k];
    if (!row || !row.ticker) continue;
    map[String(row.ticker).toUpperCase()] = { cik_str: row.cik_str, ticker: String(row.ticker).toUpperCase(), title: row.title };
  }
  globalCache.set(key, map, 60_000);
  return map;
}
export function padCik(cik: number | string) { return String(cik).padStart(10, '0'); }
export function stripZeros(s: string) { return s.replace(/^0+/, '') || '0'; }
export function buildFilingUrl(cik: string, accessionNumber: string, primaryDocument: string) {
  const cikNoZeros = stripZeros(cik); const accNoDashes = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cikNoZeros}/${accNoDashes}/${primaryDocument}`;
}
export async function getSubmissionsByCIK(cik: string) {
  const key = `sec:submissions:${cik}`; const hit = globalCache.get<any>(key); if (hit) return hit;
  const url = `${SUB_BASE}/submissions/CIK${cik}.json`; const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error('SEC submissions failed: ' + res.status);
  const json = await res.json(); globalCache.set(key, json, 60_000); return json;
}
export async function getCompanyFactsByCIK(cik: string) {
  const key = `sec:companyfacts:${cik}`; const hit = globalCache.get<any>(key); if (hit) return hit;
  const url = `${SUB_BASE}/api/xbrl/companyfacts/CIK${cik}.json`; const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error('SEC facts failed: ' + res.status); const json = await res.json(); globalCache.set(key, json, 60_000); return json;
}
export function latestFromUnits(units: any) {
  if (!units) return undefined; let best: any;
  for (const unitKey of Object.keys(units)) {
    const arr = units[unitKey]; if (!Array.isArray(arr)) continue;
    for (const pt of arr) { if (!best) best = pt; else if (pt.end && best.end && pt.end > best.end) best = pt; }
  } return best;
}
export function pickFact(facts: any, key: string) {
  const node = facts?.facts?.['us-gaap']?.[key]; return latestFromUnits(node?.units);
}
