/**
 * Minimal, backwards‑compatible SEC client utilities.
 * Fixes: ensure calls go to the backend origin (not :5173) and avoid direct Workers CORS.
 * No env changes required; uses VITE_API_BASE_URL if present, otherwise http://localhost:3000.
 */

// @ts-nocheck
const API_BASE = (import.meta?.env?.VITE_API_BASE_URL) || "http://localhost:3000";

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      "Accept": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=> "");
    throw new Error(`HTTP ${res.status} on ${url} :: ${txt}`);
  }
  return res.json();
}

/**
 * Get CIK for a ticker using backend proxy to SEC static files.
 * Falls back to exchange list if not found in primary file.
 */
export async function getCikForTicker(ticker) {
  const t = (ticker || "").trim().toUpperCase();
  if (!t) return null;

  const primary = await fetchJson(`${API_BASE}/api/sec/files/company_tickers.json`);
  let byTicker = {};
  for (const k in primary) {
    const row = primary[k];
    if (row && row.ticker) byTicker[row.ticker.toUpperCase()] = row;
  }
  if (byTicker[t]) return String(byTicker[t].cik_str).padStart(10, "0");

  const ex = await fetchJson(`${API_BASE}/api/sec/files/company_tickers_exchange.json`);
  for (const item of ex) {
    if (item.ticker && item.ticker.toUpperCase() === t) {
      return String(item.cik).padStart(10, "0");
    }
  }
  return null;
}

/**
 * Lightweight passthrough for company facts (SEC XBRL).
 */
export async function getCompanyFactsByCik(cik) {
  const c = String(cik || "").padStart(10, "0");
  if (!c) return null;
  return fetchJson(`${API_BASE}/api/sec/companyfacts?cik=${c}`);
}

export const SecClient = { getCikForTicker, getCompanyFactsByCik };
