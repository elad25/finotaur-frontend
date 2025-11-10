import fetch from 'node-fetch';
let lastPriceCache: Record<string, { t: number; v: number }> = {};

export async function getLastPricePolygon(symbol: string): Promise<number | null> {
  const now = Date.now();
  const cache = lastPriceCache[symbol];
  if (cache && now - cache.t < 60_000) return cache.v;

  const key = process.env.POLYGON_API_KEY || '';
  if (!key) return null;
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${key}`;
  const res = await fetch(url);
  if (!res.ok) return cache?.v ?? null;
  const json: any = await res.json();
  const v = json?.results?.[0]?.c ?? null;
  if (v) lastPriceCache[symbol] = { t: now, v };
  return v;
}
