// ─── Commodities domain type contracts ────────────────────────────────────────
// Pure interfaces — no runtime logic. All data-fetching is deferred (domain locked).

export interface CommodityQuote {
  symbol: string;
  name: string;
  sector: 'energy' | 'metals' | 'agriculture' | 'indices';
  price: number;
  changePct: number;
  unit: string;
  contractMonth?: string;
  asOf: string;
}

export interface MacroDriverSnapshot {
  dxy: number;
  realYield10y: number;
  breakeven10y: number;
  asOf: string;
}

export interface SeasonalityProfile {
  symbol: string;
  dayOfYearAvgPct: number[];
  currentYearPct: number[];
}

export interface CotReport {
  market: string;
  specNet: number;
  commercialNet: number;
  reportDate: string;
}

export interface InventoryReport {
  product: 'crude' | 'natgas';
  actual: number;
  expected: number | null;
  unit: string;
  reportDate: string;
}

export interface TermStructurePoint {
  contract: string;
  expiry: string;
  price: number;
}
