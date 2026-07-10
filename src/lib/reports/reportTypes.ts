// src/lib/reports/reportTypes.ts
// =====================================================
// FINO REPORTS — shared types
// =====================================================
// Single source of truth for the report-framework shapes used by
// ReportShell, KeyTakeaway, reportApi, and the per-report data builders
// (journalReportData.ts / portfolioReportData.ts). Keep this file
// dependency-free (types only) so it can be imported from anywhere
// without pulling in React or chart libraries.
// =====================================================

/** One slide in a report carousel — the minimal identity used for the
 *  dot-progress indicator and for building the AI takeaways request. */
export interface ReportSlide {
  key: string;
  title: string;
}

export type ReportType = 'journal' | 'portfolio';

// ---------------------------------------------------------------------------
// AI takeaways — POST /api/ai-reports/report-takeaways
// ---------------------------------------------------------------------------

export interface TakeawaySlideInput {
  key: string;
  title: string;
  /** Numbers only — no raw trades. Keep the total request payload small. */
  stats: Record<string, unknown>;
}

export interface ReportTakeawaysRequest {
  reportType: ReportType;
  /** Deterministic cache key for the period covered by this report run. */
  periodKey: string;
  slides: TakeawaySlideInput[];
}

export interface ReportTakeawaysResponse {
  /** Keyed by slide `key`. */
  takeaways: Record<string, string>;
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Markets report — GET /api/ai-reports/markets-report
// ---------------------------------------------------------------------------

export interface MarketsReportSection {
  key: string;
  title: string;
  text: string;
}

export interface MarketsReportPayload {
  asOf: string;
  headline: string;
  sections: MarketsReportSection[];
}

export interface MarketsReportResponse {
  report: MarketsReportPayload;
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Journal report — client-computed data (journalReportData.ts)
// ---------------------------------------------------------------------------

export type StatusBadge = 'GREAT' | 'GOOD' | 'NEEDS WORK' | 'WATCH OUT';

export interface ConsistencyStatCard {
  key: string;
  label: string;
  /** Raw numeric value used for thresholding. */
  value: number;
  /** Formatted for display, e.g. "58.2%", "1.74", "12.3%". */
  displayValue: string;
  status: StatusBadge;
  /** One-line deterministic explanation of the status. */
  explanation: string;
  /** Info-tooltip copy — what the metric means. */
  tooltip: string;
}

export interface EdgeScoreMetric {
  key: string;
  label: string;
  rawValue: number;
  /** Formatted underlying metric, e.g. "58.2%", "1.74:1". */
  rawLabel: string;
  /** 0-100 normalized sub-score (one radar spoke). */
  score: number;
}

export interface EdgeScoreData {
  /** 0-100 overall composite score — equal-weighted mean of the 6 metrics. */
  overall: number;
  metrics: EdgeScoreMetric[];
}

export interface DayOfWeekRow {
  day: string;
  pnl: number;
  wins: number;
  losses: number;
  trades: number;
}

export interface EntryHourBucket {
  hour: number;
  label: string;
  pnl: number;
  trades: number;
}

export type PatternClassification = 'Strength' | 'Area to Improve' | 'Neutral';

export interface PatternResult {
  key: string;
  name: string;
  description: string;
  pct: number;
  count: number;
  classification: PatternClassification;
}

export interface EquityPoint {
  /** ISO date (close_at, falling back to open_at). */
  date: string;
  cumulativePnl: number;
  /** True for points inside the worst drawdown window (peak → trough). */
  inDrawdown: boolean;
}

export interface RiskDrawdownData {
  equityCurve: EquityPoint[];
  maxDrawdown: number;
  recoveryFactor: number;
  largestLoss: number;
  longestLosingStreak: number;
}

export interface MistakeTagStat {
  tag: string;
  count: number;
  avgPnlImpact: number;
}

export interface SessionComparison {
  label: string;
  winRate: number;
  netPnl: number;
  trades: number;
}

export interface DisciplineData {
  mistakeTags: MistakeTagStat[];
  bestSession: SessionComparison | null;
  worstSession: SessionComparison | null;
}

export interface JournalReportData {
  totalTrades: number;
  dateRangeLabel: string;
  consistency: ConsistencyStatCard[];
  edgeScore: EdgeScoreData;
  dayOfWeek: DayOfWeekRow[];
  entryHourByDay: Record<string, EntryHourBucket[]>;
  patterns: PatternResult[];
  risk: RiskDrawdownData;
  discipline: DisciplineData;
  /** Patterns that were skipped because the underlying fields aren't on
   *  these trades (e.g. no trade legs → Scale In/Out omitted). Surfaced
   *  for debugging / QA, never shown to the user. */
  degradedPatterns: string[];
}

// ---------------------------------------------------------------------------
// Portfolio report — client-computed data (portfolioReportData.ts)
// ---------------------------------------------------------------------------

export interface AllocationSlice {
  key: string;
  label: string;
  pnl: number;
  /** Share of total trade count, 0-100. */
  tradeShare: number;
  tradeCount: number;
}

export interface DirectionStats {
  direction: 'LONG' | 'SHORT';
  trades: number;
  winRate: number;
  netPnl: number;
  expectancy: number;
}

export interface ConcentrationSymbol {
  symbol: string;
  tradeCount: number;
  /** Share of total trade count, 0-100 — trade-count proxy for volume
   *  (dollar notional isn't uniformly comparable across asset classes). */
  volumeSharePct: number;
}

export interface SymbolEdgeRow {
  symbol: string;
  trades: number;
  expectancy: number;
  winRate: number;
}

export interface PortfolioReportData {
  byAssetClass: AllocationSlice[];
  topSymbols: AllocationSlice[];
  direction: DirectionStats[];
  concentration: {
    symbols: ConcentrationSymbol[];
    top5SharePct: number;
    warning: boolean;
  };
  symbolEdge: {
    best: SymbolEdgeRow[];
    worst: SymbolEdgeRow[];
  };
}
