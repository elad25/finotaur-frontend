
export type TimePoint = { date: string; value: number | null };

export type Snapshot = {
  symbol: string;
  price: number | null;
  revenueTTM: number | null;
  netIncomeTTM: number | null;
  epsTTM: number | null;
  grossProfitTTM: number | null;
  operatingIncomeTTM: number | null;
  totalDebt: number | null;
  equity: number | null;
  dividendPerShare: number | null;
  pe: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio?: number | null;
  marketCap?: number | null;
};

export type Series = {
  revenue: TimePoint[];
  netIncome: TimePoint[];
  eps?: TimePoint[];
  grossMargin?: TimePoint[];
  operatingMargin?: TimePoint[];
  netMargin?: TimePoint[];
  debt?: TimePoint[];
  equity?: TimePoint[];
  cashFlowCFO?: TimePoint[];
  cashFlowCFI?: TimePoint[];
  cashFlowCFF?: TimePoint[];
};

export type Multiples = {
  peTTM?: number | null;
  peForward?: number | null;
  peg?: number | null;
  pb?: number | null;
  ps?: number | null;
  evEbitda?: number | null;
};

export type FundamentalsResponse = {
  snapshot: Snapshot;
  series: Series;
  rows?: Record<string, any>[];
  insight?: string;
  valuation?: { multiples?: Multiples | Array<{label: string; value: number | null}>; dcf?: any };
  health?: Record<string, number | null>;
  peers?: { tickers?: string[] } | null;
  context?: { name?: string; sector?: string; industry?: string; sic?: string | number } | null;
};
