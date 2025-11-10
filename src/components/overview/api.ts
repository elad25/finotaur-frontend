
// src/components/overview/api.ts
export type Snapshot = {
  marketCap: number | null;
  peTtm: number | null;
  peFwd: number | null;
  beta: number | null;
  dividendYield: number | null;
  avgVolume: number | null;
  week52Low: number | null;
  week52High: number | null;
  analyst?: any | null;
};

export type PricePoint = { t: number; value: number; c?: number };

export async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as T;
}

export function getSymbolFromContext(fallback: string = "MSFT"): string {
  // Try query (?symbol= / ?ticker=), then pathname /stocks/:symbol, then fallback
  const url = new URL(window.location.href);
  const qSym = (url.searchParams.get("symbol") || url.searchParams.get("ticker") || "").toUpperCase();
  if (qSym) return qSym;
  const m = url.pathname.match(/\/stocks\/([A-Za-z.\-:]+)/) || url.pathname.match(/symbol=([A-Za-z.\-:]+)/);
  if (m && m[1]) return m[1].toUpperCase();
  return fallback;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "—";
  const abs = Math.abs(Number(n));
  if (abs >= 1e12) return (n/1e12).toFixed(2) + "T";
  if (abs >= 1e9)  return (n/1e9).toFixed(2) + "B";
  if (abs >= 1e6)  return (n/1e6).toFixed(2) + "M";
  if (abs >= 1e3)  return (n/1e3).toFixed(2) + "K";
  return String(Math.round(Number(n) * 100) / 100);
}

export function pct(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "—";
  return (Number(n) * 100).toFixed(2) + "%";
}
