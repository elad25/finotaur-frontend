export type SeriesRange = '1D'|'1W'|'1M'|'6M'|'1Y'|'5Y';

export interface PriceCandle {
  t: string; // ISO datetime
  o: number; h: number; l: number; c: number; v?: number;
}

export type EventType = 'filing'|'earning'|'dividend';

export interface ChartEvent {
  type: EventType;
  label: string;
  date: string;   // YYYY-MM-DD
  ts?: string;    // ISO datetime (optional)
  docUrl?: string; // for filings MUST be non-empty on server; client treats undefined as absent
  priceAtEvent?: number;
}

export interface SeriesResponse {
  symbol: string;
  range: SeriesRange;
  price: PriceCandle[];
  events: ChartEvent[];
  meta: {
    hasDividends: boolean;
    hasEarnings: boolean;
    hasFilings: boolean;
    source: { price: string; events: string[] };
  };
}

export interface SummaryResponse {
  symbol: string;
  marketCap: number | null;
  peTTM: number | null;
  peForward: number | null;
  beta: number | null;
  dividendYield: number | null;
  range52w: { min: number | null; max: number | null; current: number | null };
  avgVolume: number | null;
  analystConsensus: 'Buy'|'Hold'|'Sell'|null;
  targetPrice: { avg: number | null; high: number | null; low: number | null };
  profile: { name: string | null; description: string | null };
  source: { profile: string; analytics: string; price: string };
}
