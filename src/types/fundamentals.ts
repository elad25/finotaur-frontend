export type TF = 'TTM' | 'Annual' | 'Quarterly';

export interface Series { periods: string[]; [key: string]: any }

export interface KPI {
  value: number | null;
  deltaYoY?: number | null;
  spark?: number[]; // length = n periods
}

export interface KpiMap {
  marketCap?: KPI;
  revenueTTM?: KPI;
  netIncomeTTM?: KPI;
  grossMargin?: KPI;
  operatingMargin?: KPI;
  netMargin?: KPI;
  roe?: KPI;
  roa?: KPI;
  debtToEquity?: KPI;
  currentRatio?: KPI;
  quickRatio?: KPI;
  [key: string]: KPI | undefined;
}

export interface Valuation {
  multiples: { metric: string; value: number | null; avg5y?: number | null; sectorAvg?: number | null; trend?: 'up'|'down'|'flat' }[];
  grades: { valuation: number; growth: number; profitability: number; health: number };
}

export interface Health {
  altmanZ: number | null;
  piotroskiF: number | null;
  interestCoverage: number | null;
}

export interface Peers {
  tickers: string[];
  metrics: Record<string, Record<string, number> & { sectorAvg: number }>;
}

export interface Context {
  sector: string;
  industry: string;
  sic: string;
}

export interface FundamentalsPayload {
  symbol: string;
  asOf: string;
  ai: { summary: string; insights: string[] };
  fairValue: { value: number | null; premiumPct: number | null; method: 'DCF'|'—' };
  assumptions: { wacc: number | null; ltGrowth: number | null; taxRate: number | null };
  kpis: KpiMap;
  trends: Series;
  valuation: Valuation;
  health: Health;
  peers: Peers;
  context: Context;
}