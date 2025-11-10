const SEC_BASE = 'https://data.sec.gov';

type TickerEntry = { cik: number | string, ticker: string, title?: string, tickers?: string[] };

const _cache: { tickers?: { data: TickerEntry[]; ts: number } } = {};

// Minimal well-known mapping as a last resort if SEC endpoints are blocked locally.
const FALLBACK_TICKERS: Record<string, string> = {
  'AAPL': '0000320193',
  'MSFT': '0000789019',
  'AMZN': '0001018724',
  'GOOGL': '0001652044',
  'GOOG': '0001652044',
  'META': '0001326801',
  'TSLA': '0001318605',
  'NVDA': '0001045810',
  'BRK.A': '0001067983',
  'BRK.B': '0001067983',
  'JPM': '0000019617',
  'BAC': '0000070858',
  'XOM': '0000034088',
  'CVX': '0000093410',
  'V': '0001403161',
  'MA': '0001141391',
  'WMT': '0000104169',
  'PG': '0000080424',
  'KO': '0000021344',
  'PEP': '0000077476',
  'NFLX': '0001065280',
  'AMD': '0000002488',
  'INTC': '0000050863'
};

function normalizeCik(cik: any): string {
  const s = String(cik || '').replace(/\D/g, '');
  return s.padStart(10, '0');
}

function secHeaders() {
  const userAgent = process.env.SEC_USER_AGENT;
  const contact = process.env.SEC_CONTACT;
  const headers: Record<string,string> = {
    'Accept': 'application/json',
  };
  if (userAgent) headers['User-Agent'] = userAgent;
  if (contact) headers['From'] = contact;
  return headers;
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: secHeaders() });
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  let data: any = text;
  if (ct.includes('application/json')) { try { data = JSON.parse(text); } catch {} }
  if (!res.ok) {
    throw new Error(`SEC fetch failed: ${res.status} ${res.statusText}` + (typeof data === 'string' ? ` :: ${data.slice(0,180)}` : ''));
  }
  if (typeof data === 'string') throw new Error(`SEC returned non-JSON for ${url.substring(0,80)}…`);
  return data;
}

async function loadTickerList(): Promise<TickerEntry[]> {
  const now = Date.now();
  if (_cache.tickers && (now - _cache.tickers.ts) < 5 * 60 * 1000) return _cache.tickers.data;
  const urls = [
    `${SEC_BASE}/files/company_tickers.json`,
    `${SEC_BASE}/files/company_tickers_exchange.json`,
  ];
  let entries: TickerEntry[] = [];
  for (const u of urls) {
    try {
      const data = await fetchJson(u);
      if (Array.isArray(data)) entries.push(...data as any);
      else if (data && typeof data === 'object') entries.push(...Object.values(data) as any);
    } catch (_e) {
      // try next list
    }
  }
  if (entries.length) {
    _cache.tickers = { data: entries, ts: now };
    return entries;
  }
  // If lists couldn't be fetched, return empty; caller will use FALLBACK_TICKERS
  return [];
}

export async function resolveCikByTicker(ticker: string): Promise<string | null> {
  const t = (ticker || '').trim().toUpperCase();
  if (!t) return null;

  // First try cache/json lists
  try {
    const entries = await loadTickerList();
    if (entries.length) {
      for (const e of entries) {
        const tk = (e.ticker || (Array.isArray(e.tickers) ? e.tickers[0] : '') || '').toString().toUpperCase();
        const alias = Array.isArray(e.tickers) ? e.tickers.map(x => String(x).toUpperCase()) : [];
        if (tk === t || alias.includes(t)) {
          return normalizeCik((e as any).cik || (e as any).cik_str || (e as any).cik_num);
        }
      }
    }
  } catch (e) {
    // swallow and try fallback
  }

  // Fallback mapping
  if (FALLBACK_TICKERS[t]) return FALLBACK_TICKERS[t];

  return null;
}

export async function fetchCompanyFilings(cik: string, params: Record<string, string> = {}) {
  const url = new URL(`${SEC_BASE}/submissions/CIK${normalizeCik(cik)}.json`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return fetchJson(url.toString());
}
