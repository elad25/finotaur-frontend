// finotaur-server/src/services/providers/polygon.ts
const BASE = process.env.POLYGON_BASE || "https://api.polygon.io";
const KEY = process.env.POLYGON_API_KEY || process.env.VITE_POLYGON_API_KEY || "";

async function getJson(url: string) {
  const r = await fetch(url, { headers: { "accept": "application/json" } });
  if (!r.ok) throw new Error(`Polygon HTTP ${r.status}`);
  return r.json();
}

export async function getTickerDetails(ticker: string) {
  if (!KEY) return null;
  const url = `${BASE}/v3/reference/tickers/${encodeURIComponent(ticker)}?apiKey=${KEY}`;
  try { return await getJson(url); } catch { return null; }
}

export async function getSnapshotTicker(ticker: string) {
  if (!KEY) return null;
  const url = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}?apiKey=${KEY}`;
  try { return await getJson(url); } catch { return null; }
}

export async function getAggs(ticker: string, timespan: "day"|"week"|"month", from: string, to: string) {
  if (!KEY) return null;
  const url = `${BASE}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${KEY}`;
  try { return await getJson(url); } catch { return null; }
}
