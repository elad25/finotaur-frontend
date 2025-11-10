// src/lib/fmp.js
const API_KEY = process.env.FMP_API_KEY || "";
const BASE = "https://financialmodelingprep.com/api/v3";

async function getJSON(path) {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}apikey=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FMP ${path} -> ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}
function pickNum(n) { if (n === null || n === undefined || Number.isNaN(Number(n))) return null; return Number(n); }
function pctDelta(curr, prev) { if (curr == null || prev == null || prev === 0) return null; return ((curr - prev) / Math.abs(prev)) * 100; }
function tryStr(s) { return (s ?? "") + ""; }
module.exports = { getJSON, pickNum, pctDelta, tryStr };
