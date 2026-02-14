// =====================================================
// 🎯 SECTOR ANALYZER - TYPES
// src/components/SectorAnalyzer/types.ts
// =====================================================

export type SentimentType = 'bullish' | 'bearish' | 'neutral';
export type RiskLevel = 'High' | 'Medium' | 'Med' | 'Low';
export type ImpactType = 'Positive' | 'Negative' | 'Neutral';
export type TabType = 'overview' | 'heatmap' | 'breakout' | 'trades' | 'risks';
export type SignalType = 'BUY' | 'HOLD' | 'WATCH' | 'AVOID' | 'OVERWEIGHT' | 'UNDERWEIGHT' | 'NEUTRAL';

export interface SectorETF {
  ticker: string;
  name: string;
  aum: string;
}

export interface SectorHolding {
  ticker: string;
  name: string;
  weight: number;
  change: number;
  score: number;
  volumeVsAvg?: number;
  peVsSector?: number;
  insiderActivity?: 'buy' | 'sell' | 'none';
}

export interface CorrelationData {
  ticker: string;
  correlation: number;
}

export interface MacroSensitivity {
  factor: string;
  sensitivity: RiskLevel;
  impact: string;
}

export interface IndustryTrend {
  trend: string;
  impact: ImpactType;
  description: string;
}

export interface RiskItem {
  risk: string;
  probability: RiskLevel;
  impact: RiskLevel;
}

export interface BreakoutCandidate {
  ticker: string;
  name: string;
  score: number;
  correlation: number;
  reasons: string[];
  entry: string;
  target: string;
  stop: string;
  riskReward: string;
  fundamentalEdge?: string[];
  technicalSetup?: string[];
  catalysts?: { date: string; event: string }[];
  ownershipTailwinds?: string[];
  aiDivergerAnalysis?: string;
}

export interface TradeIdea {
  strategy: string;
  trade: string;
  thesis: string;
  target: string;
  // Optional fields used by TradeIdeasTab UI
  entry?: string;          // ✅ fixes error line 624
  stop?: string;           // ✅ fixes error line 626
  riskReward?: string;     // ✅ fixes error line 628
  positionSize?: string;
  timeHorizon?: string;
  conviction?: number;
  risks?: string[];
  // Fields from cron-cached data (Top-Down analysis)
  direction?: 'long' | 'short';
  ticker?: string;
  ismBacking?: string;
}

export interface SectorVerdict {
  rating: number;
  signal: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
  summary: string;
}

export interface SectorVsMarket {
  period: string;
  sectorReturn: number;
  spyReturn: number;
  alpha: number;
}

export interface SectorFundamentals {
  peForward: number;
  peVsSpAvg: number;
  evEbitda: number;
  evEbitdaVsSpAvg: number;
  revGrowth: number;
  revGrowthVsSpAvg: number;
  earningsGrowth: number;
  earningsGrowthVsSpAvg: number;
  valuationAssessment: string;
}

export interface MoneyFlow {
  netInflow: number;
  signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  etfFlows: { ticker: string; flow: number }[];
  hedgeFundActivity: { netBuying: number; newPositions: number; closedPositions: number };
}

export interface EarningsCalendarItem {
  date: string;
  ticker: string;
  estimate: number;
  whisper: number;
  impact: RiskLevel;
}

export interface SubSector {
  name: string;
  weight: number;
  ytd: number;
  pe: number;
  rating: number;
  signal: SignalType;
}

export interface IntraSectorCorrelation {
  average: number;
  historicalRange: { min: number; max: number };
  regime: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface CorrelationBreaker {
  ticker: string;
  name: string;
  normalCorrelation: number;
  currentCorrelation: number;
  divergencePercent: number;
  type: 'BREAKOUT' | 'LAGGING';
  reasons: string[];
  signal: 'BULLISH_DIVERGENCE' | 'BEARISH_DIVERGENCE';
}

export interface PairsTrade {
  longTicker: string;
  shortTicker: string;
  normalCorrelation: number;
  currentCorrelation: number;
  divergence: number;
  signal: string;
}

export interface HeatMapFilters {
  sortBy: 'score' | 'change' | 'weight' | 'volume' | 'momentum';
  filterBy: 'all' | 'buy' | 'score80' | 'unusualVolume';
  viewMode: 'table' | 'treemap';
}

export interface Sector {
  id: string;
  name: string;
  ticker: string;
  icon: string;
  price: number;
  changePercent: number;
  weekChange: number;
  monthChange: number;
  ytdChange: number;
  momentum: number;
  relativeStrength: number;
  sentiment: SentimentType;
  beta: number;
  marketCap: string;
  spWeight: number;
  companies: number;
  description: string;
  etfs: SectorETF[];
  topHoldings: SectorHolding[];
  correlations: CorrelationData[];
  macroSensitivity: MacroSensitivity[];
  industryTrends: IndustryTrend[];
  risks: RiskItem[];
  breakoutCandidate: BreakoutCandidate;
  tradeIdeas: TradeIdea[];
  verdict?: SectorVerdict;
  vsMarket?: SectorVsMarket[];
  fundamentals?: SectorFundamentals;
  moneyFlow?: MoneyFlow;
  earningsCalendar?: EarningsCalendarItem[];
  subSectors?: SubSector[];
  intraSectorCorrelation?: IntraSectorCorrelation;
  correlationBreakers?: CorrelationBreaker[];
  pairsTrades?: PairsTrade[];
}