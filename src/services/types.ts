
export type TF = 'TTM' | 'Annual' | 'Quarterly';
export interface FundamentalsResponse {
  symbol: string; asOf: string;
  ai: { line: string | null; explanations?: string[] };
  fairValue: { value: number | null; premiumPct: number | null; asOf: string | null };
  assumptions: { wacc: number | null; ltGrowth: number | null; taxRate?: number | null };
  kpis: {
    price?: number | null; shares?: number | null; marketCap?: number | null;
    revenueTTM?: number | null; netIncomeTTM?: number | null;
    grossMarginTTM?: number | null; operatingMarginTTM?: number | null; netMarginTTM?: number | null;
    roeTTM?: number | null; roaTTM?: number | null;
    currentRatio?: number | null; quickRatio?: number | null; debtToEquity?: number | null;
    deltaYoY?: Record<string, number>;
  };
  trends: {
    periods: (string|number)[];
    revenue: number[]; netIncome: number[];
    grossMarginPct: number[]; operMarginPct: number[];
    debt: number[]; equity: number[];
    cashFlow: { cfo: number[]; cfi: number[]; cff: number[] };
  };
  valuation: { multiples: { peTTM?: number | null; peForward?: number | null; peg?: number | null; pb?: number | null; ps?: number | null; evEbitda?: number | null; }; miniTrends?: Record<string, number[]>; };
  health: { altmanZ?: number | null; piotroskiF?: number | null; interestCoverage?: number | null };
  peers: { tickers: string[]; table: Array<Record<string, string | number>> };
  context: { company?: string; sector?: string; industry?: string; sic?: string | number };
  sources: string[];
  cache: { server: string; swr: string | number };
}
