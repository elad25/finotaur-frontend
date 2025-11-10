// src/services/secClient.ts
// Single, robust client for SEC data:
//  - getCikForTicker: loads SEC ticker list once and resolves to a 10-digit CIK
//  - getCompanyFacts: fetches companyfacts with fallback bases
// Works in dev with Vite proxy on /api -> http://localhost:3000
let _tickerIndexPromise: Promise<Map<string,string>> | null = null;

function secBases() {
  const bases = [
    (import.meta as any)?.env?.VITE_SEC_PROXY_BASE?.replace(/\/$/, "") || "",
    "/api/sec",
    "https://sec-proxy.elad2550.workers.dev/api/sec"
  ].filter(Boolean);
  return bases;
}

async function fetchJson(url: string) {
  const r = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!r.ok) throw new Error("status_" + r.status);
  return await r.json();
}

export async function getCikForTicker(ticker: string): Promise<string | null> {
  const t = (ticker || "").trim().toUpperCase();
  if (!t) return null;
  if (!_tickerIndexPromise) {
    // Build once
    _tickerIndexPromise = (async () => {
      const bases = secBases();
      const paths = [
        "/files/company_tickers.json",             // ~5k companies
        "/files/company_tickers_exchange.json"     // with exchange info
      ];
      let lastErr: any = null;
      for (const b of bases) {
        for (const p of paths) {
          try {
            const data = await fetchJson(`${b}${p}`);
            // Normalize into Map<TICKER, CIK(10d)>
            const map = new Map<string,string>();
            const push = (sym: string, cik: number|string) => {
              if (!sym) return;
              let c = String(cik ?? "").replace(/\D/g, "");
              if (!c) return;
              c = c.padStart(10, "0");
              map.set(sym.toUpperCase(), c);
            };
            if (Array.isArray(data)) {
              for (const row of data) push(row?.ticker, row?.cik);
            } else if (data && typeof data === "object") {
              // { 0: {ticker, cik}, ... }  OR  {data: [...]}
              const arr = Array.isArray((data as any).data) ? (data as any).data : Object.values(data);
              for (const row of arr as any[]) push(row?.ticker, row?.cik);
            }
            if (map.size) return map;
          } catch (e) { lastErr = e; }
        }
      }
      throw lastErr || new Error("ticker_index_failed");
    })();
  }
  const idx = await _tickerIndexPromise;
  return idx.get(t) ?? null;
}

export async function getCompanyFacts(cik: string) {
  const padded = String(cik || "").replace(/\D/g, "").padStart(10, "0");
  const bases = secBases();
  const urls = bases.map(b => `${b}/api/xbrl/companyfacts/CIK${padded}.json`);
  let lastErr: any = null;
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { "Accept": "application/json" } });
      if (!r.ok) throw new Error("status_" + r.status);
      return await r.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("facts_failed");
}
