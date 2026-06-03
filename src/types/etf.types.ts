// src/types/etf.types.ts
// =====================================================
// ETF ANALYZER — Type Definitions
// =====================================================
// Mirrors the server contract from GET /api/etf/:ticker
// =====================================================

export interface EtfProfile {
  ticker: string;
  name: string;
  type: string;
  primaryExchange: string;
  listDate: string | null;
  issuer: string;
  description: string;
}

export interface EtfQuote {
  ticker: string;
  closePrice: number;
  prevClose: number;
  changeAbs: number;
  changePercent: number;
  asOf: string;
  delayed: true;
}

export interface EtfFundamentals {
  expenseRatioNet: number | null;
  expenseRatioGross: number | null;
  aum: number | null;
  nav: number | null;
  inceptionDate: string | null;
  sectorWeights: Array<{ sector: string; weight: number }> | null;
  geoWeights: Array<{ country: string; weight: number }> | null;
}

export interface EtfFundFlows {
  ytd: number | null;
  oneMonth: number | null;
  threeMonth: number | null;
}

export interface EtfHolding {
  ticker: string;
  name: string;
  weight: number;
  shares: number | null;
  marketValue: number | null;
}

export interface EtfConcentration {
  top10Weight: number | null;
  effectiveHoldings: number | null;
  count: number | null;
}

export interface EtfNewsItem {
  title: string;
  url: string;
  publisher: string;
  publishedUtc: string;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
}

export interface EtfTrailingReturns {
  m1: number | null;
  m3: number | null;
  m6: number | null;
  ytd: number | null;
  y1: number | null;
  y3: number | null;
  y5: number | null;
  sinceInception: number | null;
}

export interface EtfCalendarReturn {
  year: number;
  returnPct: number;
}

export interface EtfRiskStats {
  stdDev: number | null;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdown: number | null;
  beta: number | null;
  rSquared: number | null;
  week52High: number | null;
  week52Low: number | null;
}

export interface EtfDividend {
  exDate: string;
  payDate: string | null;
  cashAmount: number;
  frequency: string | null;
}

export interface EtfFinoFactor {
  factor: string;
  grade: string | null;
  score: number | null;
  included: boolean;
}

export interface EtfFinoScore {
  overall: string | null;
  numeric: number | null;
  factors: EtfFinoFactor[];
  note: string;
}

export interface EtfEntitlements {
  etfGlobal: boolean;
}

export interface OhlcBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface EtfData {
  ticker: string;
  profile: EtfProfile | null;
  quote: EtfQuote | null;
  fundamentals: EtfFundamentals | null;
  flows: EtfFundFlows | null;
  holdings: EtfHolding[] | null;
  concentration: EtfConcentration | null;
  news: EtfNewsItem[];
  returns: EtfTrailingReturns;
  calendarReturns: EtfCalendarReturn[];
  risk: EtfRiskStats;
  dividends: EtfDividend[];
  dividendYield: number | null;
  finoScore: EtfFinoScore;
  entitlements: EtfEntitlements;
  meta: { delayed: true; source: 'polygon' };
}

export type EtfTabId =
  | 'overview'
  | 'holdings'
  | 'performance'
  | 'risk'
  | 'dividends'
  | 'cost'
  | 'verdict';

// ─── EtfVerdict — AI-generated investment verdict (GET /api/etf/:ticker/verdict) ─

export interface EtfVerdict {
  ticker: string;
  summary: string;
  pros: string[];
  cons: string[];
  asOf: string;
  model: string;
  disclaimer: string;
}
