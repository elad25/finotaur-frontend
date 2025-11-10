import fetch from "node-fetch";

const FMP_BASE = process.env.FMP_BASE_URL || "https://financialmodelingprep.com";
const API_KEY = process.env.FMP_API_KEY;

if (!API_KEY) {
  // We don't throw here to avoid crashing the server. Requests will fail with clear message instead.
  console.warn("[FMP] Missing FMP_API_KEY in environment. Set it to enable FMP routes.");
}

export async function fmpGet(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(FMP_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  if (API_KEY) url.searchParams.set("apikey", API_KEY);

  const res = await fetch(url.toString(), { headers: { "User-Agent": "Finotaur/analyst-upgrades" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FMP request failed ${res.status}: ${text}`);
  }
  return res.json();
}
