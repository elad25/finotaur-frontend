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
  attribution?: string[];
  ts: number;
}

// ── Legacy / futures-specific types (kept for Seasonality, Positioning, etc.) ─

/** @deprecated Use SeasonalityData instead */
export interface SeasonalityProfile {
  symbol: string;
  dayOfYearAvgPct: number[];
  currentYearPct: number[];
}

/** Matches GET /api/commodities/seasonality response. */
export interface SeasonalityData {
  symbol: string;
  /** 12 cumulative % values Jan–Dec from January baseline. May contain nulls. */
  monthlyAvgPct: (number | null)[];
  /** Current-year cumulative % — nulls for future months. */
  currentYearPct: (number | null)[];
  ts: number;
}

/** @deprecated Use CotMarket / CotSnapshot instead */
export interface CotReport {
  market: string;
  specNet: number;
  commercialNet: number;
  reportDate: string;
}

// ── COT (Commitments of Traders) types — matches GET /api/commodities/cot ──

export interface CotMarket {
  symbol: string;
  name: string;
  sector: string;
  reportDate: string;
  managedMoney: { long: number; short: number; net: number };
  producerMerchant: { long: number; short: number; net: number };
  openInterest: number;
}

export interface CotSnapshot {
  reportDate: string | null;
  markets: CotMarket[];
  attribution?: string[];
  ts: number;
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
