// ============================================================
// src/pages/app/stocks/_screener/types.ts
// TypeScript interfaces for the stocks screener
// ============================================================

export interface ScreenerRow {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  price: number | null;
  change_1d_pct: number | null;
  volume: number | null;
  dollar_volume: number | null;
  rel_volume: number | null;
  market_cap: number | null;
  pe: number | null;
  ps: number | null;
  pb: number | null;
  peg: number | null;
  dividend_yield: number | null;
  eps_ttm: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  roe: number | null;
  roa: number | null;
  revenue_growth_yoy: number | null;
  eps_growth_yoy: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  rsi_14: number | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  beta: number | null;
  perf_1w_pct: number | null;
  perf_1m_pct: number | null;
  perf_3m_pct: number | null;
  perf_6m_pct: number | null;
  perf_1y_pct: number | null;
  week52_high: number | null;
  week52_low: number | null;
  pct_from_52w_high: number | null;
  pct_from_52w_low: number | null;
  price_vs_sma20_pct: number | null;
  price_vs_sma50_pct: number | null;
  price_vs_sma200_pct: number | null;
  updated_at: string | null;
}

export interface ScreenerMeta {
  sectors: string[];
  exchanges: string[];
  count: number;
  lastRefresh: string | null;
}

export interface ScreenerResponse {
  items: ScreenerRow[];
  total: number;
  page: number;
  limit: number;
  sort: string;
  dir: 'asc' | 'desc';
}

/** All filter params sent as query string. Numbers stored as strings for input binding. */
export interface Filters {
  // Descriptive
  sector: string[];
  exchange: string[];
  mktcapMin: string;
  mktcapMax: string;
  priceMin: string;
  priceMax: string;
  // Valuation
  peMin: string;
  peMax: string;
  psMin: string;
  psMax: string;
  pbMin: string;
  pbMax: string;
  pegMin: string;
  pegMax: string;
  divYieldMin: string;
  divYieldMax: string;
  // Profitability & Growth
  grossMarginMin: string;
  grossMarginMax: string;
  opMarginMin: string;
  opMarginMax: string;
  netMarginMin: string;
  netMarginMax: string;
  roeMin: string;
  roeMax: string;
  roaMin: string;
  roaMax: string;
  revGrowthMin: string;
  revGrowthMax: string;
  epsGrowthMin: string;
  epsGrowthMax: string;
  deMin: string;
  deMax: string;
  currentRatioMin: string;
  currentRatioMax: string;
  // Technical
  chg1dMin: string;
  chg1dMax: string;
  perf1wMin: string;
  perf1wMax: string;
  perf1mMin: string;
  perf1mMax: string;
  perf3mMin: string;
  perf3mMax: string;
  perf6mMin: string;
  perf6mMax: string;
  perf1yMin: string;
  perf1yMax: string;
  rsiMin: string;
  rsiMax: string;
  betaMin: string;
  betaMax: string;
  relVolMin: string;
  relVolMax: string;
  from52wHighMin: string;
  from52wHighMax: string;
  from52wLowMin: string;
  from52wLowMax: string;
  volMin: string;
  volMax: string;
  smaPos20: 'any' | 'above' | 'below';
  smaPos50: 'any' | 'above' | 'below';
  smaPos200: 'any' | 'above' | 'below';
}

export interface SortState {
  sort: string;
  dir: 'asc' | 'desc';
}

export const EMPTY_FILTERS: Filters = {
  sector: [],
  exchange: [],
  mktcapMin: '', mktcapMax: '',
  priceMin: '', priceMax: '',
  peMin: '', peMax: '',
  psMin: '', psMax: '',
  pbMin: '', pbMax: '',
  pegMin: '', pegMax: '',
  divYieldMin: '', divYieldMax: '',
  grossMarginMin: '', grossMarginMax: '',
  opMarginMin: '', opMarginMax: '',
  netMarginMin: '', netMarginMax: '',
  roeMin: '', roeMax: '',
  roaMin: '', roaMax: '',
  revGrowthMin: '', revGrowthMax: '',
  epsGrowthMin: '', epsGrowthMax: '',
  deMin: '', deMax: '',
  currentRatioMin: '', currentRatioMax: '',
  chg1dMin: '', chg1dMax: '',
  perf1wMin: '', perf1wMax: '',
  perf1mMin: '', perf1mMax: '',
  perf3mMin: '', perf3mMax: '',
  perf6mMin: '', perf6mMax: '',
  perf1yMin: '', perf1yMax: '',
  rsiMin: '', rsiMax: '',
  betaMin: '', betaMax: '',
  relVolMin: '', relVolMax: '',
  from52wHighMin: '', from52wHighMax: '',
  from52wLowMin: '', from52wLowMax: '',
  volMin: '', volMax: '',
  smaPos20: 'any',
  smaPos50: 'any',
  smaPos200: 'any',
};
