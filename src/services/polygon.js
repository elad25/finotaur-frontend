
const fetch = require('node-fetch');

const BASE = process.env.POLYGON_BASE || 'https://api.polygon.io';
const API_KEY = process.env.POLYGON_API_KEY;

if (!API_KEY) {
  console.warn('[polygon] POLYGON_API_KEY is missing. Requests will fail.');
}

function withKey(url) {
  const u = new URL(url);
  u.searchParams.set('apiKey', API_KEY || '');
  return u.toString();
}

async function j(url) {
  const res = await fetch(url, { timeout: 10000 });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Polygon ${res.status} ${url} :: ${text.slice(0,200)}`);
  }
  return res.json();
}

// Price snapshot (current/prev etc.)
async function getSnapshot(symbol) {
  const url = withKey(`${BASE}/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`);
  return j(url);
}

// Previous close for ranges (52w can be computed elsewhere; keeping here for future use)
async function getPrevClose(symbol) {
  const url = withKey(`${BASE}/v2/aggs/ticker/${symbol}/prev`);
  return j(url);
}

// Company details / profile
async function getTickerDetails(symbol) {
  const url = withKey(`${BASE}/v3/reference/tickers/${symbol}`);
  return j(url);
}

// News
async function getNews(symbol, limit = 5) {
  const url = withKey(`${BASE}/v2/reference/news?ticker=${symbol}&limit=${limit}`);
  return j(url);
}

// Dividends / Earnings (for overlays on chart)
async function getDividends(symbol, limit = 10) {
  const url = withKey(`${BASE}/v3/reference/dividends?ticker=${symbol}&limit=${limit}`);
  return j(url);
}

async function getEarnings(symbol, limit = 6) {
  // Some accounts may not have vX endpoints - keep try/catch at route layer
  const url = withKey(`${BASE}/vX/reference/earnings?ticker=${symbol}&limit=${limit}`);
  return j(url);
}

module.exports = {
  getSnapshot,
  getPrevClose,
  getTickerDetails,
  getNews,
  getDividends,
  getEarnings,
};
