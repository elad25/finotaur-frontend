import fetch from 'node-fetch';

const SEC_UA = process.env.SEC_USER_AGENT || 'FinotaurBot/1.0 (contact: support@finotaur.app)';
const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';

type Entry = { cik_str: number; ticker: string; title: string };

let cache: { data: Entry[]; ts: number } | null = null;
const TTL = 60_000; // 60s

function headers() {
  return {
    'User-Agent': SEC_UA,
    'Accept-Encoding': 'gzip, deflate, br',
  } as any;
}

export async function getAllSecTickers(): Promise<Entry[]> {
  const now = Date.now();
  if (cache && now - cache.ts < TTL) return cache.data;
  const res = await fetch(TICKERS_URL, { headers: headers() });
  if (!res.ok) throw new Error('SEC tickers fetch failed: ' + res.status);
  const json = await res.json();
  const arr: Entry[] = Object.values(json || {}) as any;
  cache = { data: arr, ts: now };
  return arr;
}

export async function searchTickers(q: string, limit = 10) {
  const list = await getAllSecTickers();
  const qUp = q.toUpperCase();
  const scored = list
    .map((e) => ({
      symbol: (e.ticker || '').toUpperCase(),
      name: e.title || '',
      score:
        ((e.ticker || '').toUpperCase().startsWith(qUp) ? 3 : 0) +
        ((e.ticker || '').toUpperCase().includes(qUp) ? 1 : 0) +
        ((e.title || '').toUpperCase().includes(qUp) ? 0.5 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}
