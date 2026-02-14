// =====================================================
// 🎯 STOCK ANALYZER - TYPE DEFINITIONS
// =====================================================
// Types matching the /api/stock-analyzer/:ticker endpoint
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export type VerdictType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
export type ConvictionLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type TimeHorizon = 'SHORT' | 'MEDIUM' | 'LONG';
export type InsiderSentiment = 'BULLISH' | 'NEUTRAL' | 'BEARISH';

// =====================================================
// FINOTAUR SCORE
// =====================================================

export interface FinotaurBreakdown {
  fundamentals: number;
  valuation: number;
  momentum: number;
  quality: number;
  safety: number;
}

export interface FinotaurScore {
  overall: number;
  breakdown: FinotaurBreakdown;
  percentile: number | null;
}

// =====================================================
// EXECUTIVE SUMMARY
// =====================================================

export interface KeyNumbers {
  price: number | null;
  target: number | null;
  upside: number | null;
  pe: number | null;
  dividend: number | null;
  beta: number | null;
}

export interface ExecutiveSummary {
  finotaurScore: FinotaurScore;
  verdict: VerdictType;
  conviction: ConvictionLevel;
  timeHorizon: TimeHorizon;
  oneLineThesis: string;
  keyNumbers: KeyNumbers;
}

// =====================================================
// OWNERSHIP - INSTITUTIONAL
// =====================================================

export interface InstitutionalHolder {
  name: string;
  shares: number | null;
  percentOfCompany: number | null;
  value: number | null;
  changeQoQ: number | null;
}

export interface InstitutionalOwnership {
  totalPercent: number | null;
  totalInstitutions: number | null;
  top10Holders: InstitutionalHolder[];
}

// =====================================================
// OWNERSHIP - INSIDER
// =====================================================

export interface InsiderTransaction {
  name: string;
  title: string;
  transactionType: 'BUY' | 'SELL' | 'OPTION_EXERCISE';
  shares: number | null;
  value: number | null;
  date: string | null;
}

export interface InsiderLast90Days {
  buyerCount: number | null;
  sellerCount: number | null;
  netShares: number | null;
}

export interface InsiderActivity {
  insiderOwnershipPercent: number | null;
  last90Days: InsiderLast90Days;
  recentTransactions: InsiderTransaction[];
  sentiment: InsiderSentiment;
}

// =====================================================
// OWNERSHIP - SHORT INTEREST
// =====================================================

export interface ShortInterest {
  sharesShort: number | null;
  shortPercent: number | null;
  shortRatio: number | null;
}

// =====================================================
// OWNERSHIP DATA (Combined)
// =====================================================

export interface OwnershipData {
  institutional: InstitutionalOwnership;
  insider: InsiderActivity;
  shortInterest: ShortInterest;
}

// =====================================================
// VALUATION
// =====================================================

export interface ValuationConclusion {
  fairValueLow: number | null;
  fairValueMid: number | null;
  fairValueHigh: number | null;
  currentPrice: number | null;
  upsideToMid: number | null;
}

export interface HistoricalValuation {
  currentPE: number | null;
  forwardPE: number | null;
}

export interface ValuationData {
  dcf: null; // Future: DCF model
  comparables: null; // Future: Peer comparison
  historical: HistoricalValuation;
  conclusion: ValuationConclusion;
}

// =====================================================
// FULL API RESPONSE
// =====================================================

export interface StockAnalyzerData {
  // Basic Info
  ticker: string;
  company_name: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  employees: number | null;
  website: string | null;
  description: string | null;
  
  // Price Data
  current_price: number | null;
  price_change: number | null;
  price_change_percent: number | null;
  day_high: number | null;
  day_low: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  volume: number | null;
  avg_volume: number | null;
  
  // Valuation Metrics
  pe_ratio: number | null;
  forward_pe: number | null;
  peg_ratio: number | null;
  ps_ratio: number | null;
  pb_ratio: number | null;
  ev_ebitda: number | null;
  ev_revenue: number | null;
  
  // Financials
  revenue: number | null;
  revenue_growth: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  free_cash_flow: number | null;
  fcf_yield: number | null;
  
  // Dividends
  dividend_yield: number | null;
  dividend_per_share: number | null;
  payout_ratio: number | null;
  
  // Analyst
  analyst_rating: string | null;
  analyst_count: number | null;
  price_target_low: number | null;
  price_target_avg: number | null;
  price_target_high: number | null;
  
  // FINOTAUR Score
  finotaur_score: number;
  finotaur_breakdown: FinotaurBreakdown;
  
  // Nested Sections
  executive_summary: ExecutiveSummary;
  ownership_data: OwnershipData;
  valuation_analysis: ValuationData;
  
  // Meta
  data_sources: string[];
  last_price_update: string;
  last_full_update: string;
}

export interface StockAnalyzerAPIResponse {
  success: boolean;
  source: 'cache' | 'api';
  cacheAge?: number;
  data: StockAnalyzerData;
}

// =====================================================
// HOOK RETURN TYPE
// =====================================================

export interface UseStockAnalysisReturn {
  data: StockAnalyzerData | null;
  isLoading: boolean;
  error: string | null;
  source: 'cache' | 'api' | null;
  cacheAge: number | null;
  fetch: (ticker: string) => Promise<void>;
  refresh: (ticker: string) => Promise<void>;
  reset: () => void;
}

// =====================================================
// COMPONENT PROP TYPES
// =====================================================

export interface ExecutiveSummaryCardProps {
  data: StockAnalyzerData;
}

export interface OwnershipAnalysisProps {
  data: OwnershipData;
  ticker: string;
}

export interface ValuationDeepDiveProps {
  data: ValuationData;
  ticker: string;
  currentPrice: number;
  peRatio?: number | null;
  forwardPe?: number | null;
  evEbitda?: number | null;
  priceTargets?: {
    low: number | null;
    avg: number | null;
    high: number | null;
  };
}
