// =====================================================
// 🎯 COMPANY TYPES - Type Definitions for Company Analysis
// src/components/SectorAnalyzer/companyTypes.ts
// =====================================================

import type { SentimentType, SignalType, RiskLevel } from './types';

// =====================================================
// 🏢 MAIN COMPANY INTERFACE
// =====================================================

export interface Company {
  // Basic Info
  ticker: string;
  name: string;
  sector: string;
  subSector: string;
  description: string;
  founded: number;
  headquarters: string;
  ceo: string;
  employees: number;
  website: string;
  
  // Price Data
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  weekHigh52: number;
  weekLow52: number;
  avgVolume: number;
  volume: number;
  
  // Valuation Metrics
  marketCap: number;
  enterpriseValue: number;
  peRatio: number;
  pegRatio: number;
  priceToSales: number;
  priceToBook: number;
  evToEbitda: number;
  evToRevenue: number;
  
  // Profitability
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roa: number;
  roic: number;
  
  // Growth Metrics
  revenueGrowthYoy: number;
  revenueGrowthQoq: number;
  earningsGrowthYoy: number;
  earningsGrowthQoq: number;
  revenueGrowth3Y: number;
  earningsGrowth3Y: number;
  
  // Financial Health
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  interestCoverage: number;
  freeCashFlow: number;
  freeCashFlowMargin: number;
  
  // Per Share Data
  eps: number;
  epsForward: number;
  bookValuePerShare: number;
  revenuePerShare: number;
  
  // Dividend
  dividendYield: number;
  dividendPerShare: number;
  payoutRatio: number;
  
  // Ownership
  institutionalOwnership: number;
  insiderOwnership: number;
  shortInterest: number;
  shortRatio: number;
  
  // Scores
  finotaurScore: number;
  momentumScore: number;
  valueScore: number;
  qualityScore: number;
  growthScore: number;
  
  // Technical
  rsi14: number;
  macd: number;
  sma20: number;
  sma50: number;
  sma200: number;
  atr14: number;
  beta: number;
  
  // Ratings
  analystRating: AnalystRatingType;
  analystTargetPrice: number;
  analystTargetHigh: number;
  analystTargetLow: number;
  numberOfAnalysts: number;
  
  // Sentiment
  sentiment: SentimentType;
  signalStrength: 'strong' | 'moderate' | 'weak';
}

// =====================================================
// 📊 FINANCIAL METRICS
// =====================================================

export interface FinancialMetrics {
  // Income Statement
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  
  // Balance Sheet
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cash: number;
  totalDebt: number;
  
  // Cash Flow
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  capitalExpenditures: number;
  freeCashFlow: number;
  
  // Per Share
  eps: number;
  dps: number;
  bvps: number;
  
  // Margins
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  
  // Period Info
  fiscalYear: number;
  fiscalQuarter: number;
  reportDate: string;
}

// =====================================================
// 📈 TECHNICAL DATA
// =====================================================

export interface TechnicalData {
  ticker: string;
  timestamp: string;
  
  // Price
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  
  // Moving Averages
  sma5: number;
  sma10: number;
  sma20: number;
  sma50: number;
  sma100: number;
  sma200: number;
  ema12: number;
  ema26: number;
  
  // Momentum Indicators
  rsi14: number;
  rsi9: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  stochK: number;
  stochD: number;
  
  // Volatility
  atr14: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  
  // Volume
  obv: number;
  volumeSma20: number;
  volumeRatio: number;
  
  // Trend
  adx: number;
  plusDi: number;
  minusDi: number;
  
  // Support/Resistance
  pivot: number;
  resistance1: number;
  resistance2: number;
  resistance3: number;
  support1: number;
  support2: number;
  support3: number;
}

// =====================================================
// 👔 INSIDER TRANSACTION
// =====================================================

export interface InsiderTransaction {
  date: string;
  insider: string;
  title: string;
  type: 'buy' | 'sell' | 'exercise';
  shares: number;
  price: number;
  value: number;
}

// =====================================================
// 📅 EARNINGS HISTORY
// =====================================================

export interface EarningsHistory {
  quarter: string;
  date: string;
  epsEstimate: number;
  epsActual: number;
  surprise: number;
  revenueEstimate: number;
  revenueActual: number;
  revenueSurprise: number;
}

// =====================================================
// 📊 ANALYST RATING
// =====================================================

export type AnalystRatingType = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';

export interface AnalystRating {
  firm: string;
  analyst: string;
  rating: AnalystRatingType;
  targetPrice: number;
  date: string;
  previousRating?: AnalystRatingType;
  previousTarget?: number;
}

// =====================================================
// 📰 NEWS ITEM
// =====================================================

export interface NewsItem {
  date: string;
  title: string;
  source: string;
  url?: string;
  summary?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
}

// =====================================================
// 🔄 COMPETITOR COMPARISON
// =====================================================

export interface CompetitorComparison {
  ticker: string;
  name: string;
  marketCap: number;
  peRatio: number;
  revenueGrowth: number;
  grossMargin: number;
  score: number;
}

// =====================================================
// 📊 CHART DATA TYPES
// =====================================================

export interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartAnnotation {
  date: string;
  label: string;
  type: 'earnings' | 'dividend' | 'split' | 'news' | 'insider';
  color: string;
}

// =====================================================
// 💹 PRICE TARGET
// =====================================================

export interface PriceTarget {
  current: number;
  low: number;
  average: number;
  high: number;
  numberOfAnalysts: number;
  upside: number;
  downside: number;
}

// =====================================================
// 📈 GROWTH ESTIMATES
// =====================================================

export interface GrowthEstimates {
  currentQtrEps: number;
  nextQtrEps: number;
  currentYearEps: number;
  nextYearEps: number;
  next5YearsGrowth: number;
  past5YearsGrowth: number;
  currentQtrRevenue: number;
  nextQtrRevenue: number;
  currentYearRevenue: number;
  nextYearRevenue: number;
}

// =====================================================
// 🎯 VALUATION MODEL
// =====================================================

export interface ValuationModel {
  dcfValue: number;
  dcfUpside: number;
  comparableValue: number;
  comparableUpside: number;
  averageValue: number;
  averageUpside: number;
  assumptions: {
    wacc: number;
    terminalGrowth: number;
    taxRate: number;
    forecastYears: number;
  };
}

// =====================================================
// 📊 SECTOR COMPARISON
// =====================================================

export interface SectorComparison {
  metric: string;
  company: number;
  sectorAvg: number;
  sp500Avg: number;
  percentile: number;
}

// =====================================================
// 🔔 ALERT CONDITION
// =====================================================

export interface AlertCondition {
  id: string;
  ticker: string;
  type: 'price' | 'volume' | 'technical' | 'fundamental';
  condition: 'above' | 'below' | 'crosses';
  value: number;
  indicator?: string;
  triggered: boolean;
  triggeredAt?: string;
}

// =====================================================
// 📋 WATCHLIST ITEM
// =====================================================

export interface WatchlistItem {
  ticker: string;
  addedAt: string;
  targetPrice?: number;
  stopLoss?: number;
  notes?: string;
  alerts: AlertCondition[];
}

// =====================================================
// 📊 PORTFOLIO POSITION
// =====================================================

export interface PortfolioPosition {
  ticker: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  gain: number;
  gainPercent: number;
  weight: number;
  dayChange: number;
  dayChangePercent: number;
}

// =====================================================
// 🔧 SCREENING CRITERIA
// =====================================================

export interface ScreeningCriteria {
  // Valuation
  peRatioMin?: number;
  peRatioMax?: number;
  pegRatioMax?: number;
  priceToSalesMax?: number;
  priceToBookMax?: number;
  
  // Growth
  revenueGrowthMin?: number;
  earningsGrowthMin?: number;
  
  // Profitability
  grossMarginMin?: number;
  netMarginMin?: number;
  roeMin?: number;
  
  // Financial Health
  currentRatioMin?: number;
  debtToEquityMax?: number;
  
  // Technical
  rsiMin?: number;
  rsiMax?: number;
  aboveSma200?: boolean;
  
  // Size
  marketCapMin?: number;
  marketCapMax?: number;
  
  // Score
  finotaurScoreMin?: number;
}

// =====================================================
// 📊 ANALYSIS TAB TYPES
// =====================================================

export type CompanyAnalysisTab = 
  | 'overview'
  | 'financials'
  | 'valuation'
  | 'technicals'
  | 'earnings'
  | 'ownership'
  | 'news'
  | 'competitors';

export interface CompanyAnalysisState {
  selectedTicker: string | null;
  activeTab: CompanyAnalysisTab;
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';
  chartType: 'line' | 'candlestick' | 'area';
  showVolume: boolean;
  showIndicators: string[];
}