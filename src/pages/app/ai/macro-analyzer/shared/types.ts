// shared/types.ts
// =====================================================
// 📋 ALL TYPES FOR MACRO ANALYZER
// =====================================================

// =====================================================
// TAB & NAVIGATION
// =====================================================

export type TabType = 'overview' | 'indicators' | 'reports' | 'fed' | 'global' | 'ai';

export type CategoryType = 'all' | 'growth' | 'inflation' | 'employment' | 'manufacturing' | 'housing' | 'consumer';

export type ReportType = 'ism' | 'gdp' | 'cpi' | 'ppi' | 'fomc' | 'nfp' | 'pce' | 'retail' | 'housing';

// =====================================================
// ECONOMIC DATA
// =====================================================

export interface EconomicIndicator {
  id: string;
  name: string;
  shortName: string;
  value: number;
  previousValue: number;
  change: number;
  unit: string;
  trend: 'improving' | 'declining' | 'stable';
  lastUpdated: string;
  nextRelease: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: CategoryType;
  components?: ComponentData[];
  historicalData?: number[];
  aiForecast?: AIForecast;
  marketImpact?: MarketImpact;
  correlations?: Correlations;
}

export interface ComponentData {
  name: string;
  contribution: number;
  change: number;
  trend: string;
}

export interface AIForecast {
  value: number;
  consensus: number;
  range: [number, number];
  confidence: number;
  reasoning: string;
  historicalAccuracy: number;
}

export interface MarketImpact {
  beats: { spx: number; yield: number; usd: number; bestSectors: string[] };
  misses: { spx: number; yield: number; usd: number; bestSectors: string[] };
}

export interface Correlations {
  leading: { name: string; value: number }[];
  lagging: { name: string; value: number }[];
}

// =====================================================
// FED
// =====================================================

export interface FedMeeting {
  date: string;
  currentRate: number;
  expectedRate: number;
  probability: number;
  decision: 'hike' | 'cut' | 'hold';
  isNext?: boolean;
}

export interface FedSpeaker {
  name: string;
  role: string;
  date: string;
  tone: 'hawkish' | 'dovish' | 'balanced';
  message: string;
  impact: 'high' | 'medium' | 'low';
}

export interface FedEvent {
  date: string;
  event: string;
  importance: 'high' | 'medium' | 'low';
}

// =====================================================
// GLOBAL
// =====================================================

export interface GlobalPMI {
  country: string;
  flag: string;
  pmi: number;
  trend: 'improving' | 'declining' | 'stable';
  vsUS: 'better' | 'worse' | 'same';
  implication: string;
  correlation: number;
}

export interface GlobalIndex {
  name: string;
  country: string;
  flag: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface GlobalMarket {
  country: string;
  flag: string;
  name: string;
  gdpGrowth: number;
  inflation: number;
  centralBankRate: number;
  rateDirection: 'cutting' | 'hiking' | 'hold';
  currency: string;
  currencyVsUSD: number;
  keyRisk: string;
  opportunity: string;
  indices: GlobalIndex[];
}

export interface CurrencyImpact {
  dxy: number;
  dxyChange: number;
  impacts: { type: string; effect: string; stocks: string[] }[];
}

// =====================================================
// LEADING INDICATORS
// =====================================================

export interface LeadingIndicator {
  name: string;
  value: string;
  signal: 'ok' | 'warn' | 'danger';
  leadTime: string;
  trend: 'improving' | 'declining' | 'stable';
  description: string;
}

// =====================================================
// REPORTS
// =====================================================

export interface MacroReport {
  id: ReportType;
  name: string;
  fullName: string;
  source: string;
  frequency: string;
  lastRelease: string;
  nextRelease: string;
  latestValue: string;
  previousValue: string;
  change: string;
  trend: 'improving' | 'declining' | 'stable';
  impact: 'high' | 'medium' | 'low';
  description: string;
  keyTakeaways: string[];
  aiAnalysis: string;
  marketReaction: string;
  historicalData?: number[];
  components?: ComponentData[];
}

// =====================================================
// REGIME / SECTOR
// =====================================================

export interface RegimeIndicator {
  name: string;
  signal: string;
  weight: number;
  contribution: string;
}

export interface HistoricalPerformance {
  asset: string;
  ticker: string;
  avgReturn: number;
  winRate: number;
  favorable: boolean;
}

export interface SectorAllocation {
  sector: string;
  ticker: string;
  weight: number;
  vsBench: string;
  type: 'ow' | 'mw' | 'uw';
  rationale: string;
}

// =====================================================
// AI PREDICTIONS
// =====================================================

export interface AIPrediction {
  date: string;
  indicator: string;
  aiPrediction: string;
  consensus: string;
  impact: 'high' | 'medium' | 'low';
  divergence?: { direction: string; reason: string; implication: string };
}

export interface TrackRecord {
  metric: string;
  value: number;
  color: string;
}