
// src/lib/overview/api.ts
export type PricePoint = { t: string; o: number|null; h: number|null; l: number|null; c: number|null; v: number|null };
export type EventPoint = { type: 'filing'|'earning'|'dividend'; label: string; date: string; ts: string|null; docUrl?: string; priceAtEvent?: number };
export type SeriesPayload = { symbol: string; range: string; price: PricePoint[]; events: EventPoint[]; meta: any };
export type SummaryPayload = {
  symbol: string;
  marketCap: number|null;
  peTTM: number|null;
  peForward: number|null;
  beta: number|null;
  dividendYield: number|null;
  range52w: { min: number|null; max: number|null; current: number|null };
  avgVolume: number|null;
  analystConsensus: 'Buy'|'Hold'|'Sell'|null;
  targetPrice: { avg: number|null; high: number|null; low: number|null };
  profile: { name: string|null; description: string|null };
  source: { profile: string|null; analytics: string|null; price: string|null };
};

export async function fetchSeries(symbol: string, range: '1D'|'1W'|'1M'|'6M'|'1Y'|'5Y'): Promise<SeriesPayload> {
  const r = await fetch(`/api/overview/series?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchSummary(symbol: string): Promise<SummaryPayload> {
  const r = await fetch(`/api/overview/summary?symbol=${encodeURIComponent(symbol)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
