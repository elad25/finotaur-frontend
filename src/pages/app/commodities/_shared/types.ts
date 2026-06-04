// ─── Commodities domain type contracts ────────────────────────────────────────
// Pure interfaces — no runtime logic.

// ── Live snapshot types (matches GET /api/commodities/snapshot) ───────────────

export interface CommodityQuote {
  symbol: string;
  name: string;
  sector: 'energy' | 'metals' | 'agriculture';
  unit: string;
  price: number | null;
  changePct: number | null;
  asOf: string | null;
}

export interface CommodityMacro {
  dxy: number | null;
  realYield10y: number | null;
  breakeven10y: number | null;
  nominal10y: number | null;
  asOf: string | null;
}

export interface CommoditiesSnapshot {
  commodities: CommodityQuote[];
  macro: CommodityMacro;
  ts: number;
}

// ── Legacy / futures-specific types (kept for Seasonality, Positioning, etc.) ─

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
