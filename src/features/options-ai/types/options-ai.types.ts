// src/features/options-ai/types/options-ai.types.ts

// ——— 1. Flow Scanner ———

export interface UnusualFlow {
  id: string;
  symbol: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  premium: string;
  volume: number;
  openInterest: number;
  volOiRatio: number;
  sentiment: 'bullish' | 'bearish';
  aiInsight: string;
  unusualScore: number;
}

export interface BlockTrade {
  id: string;
  symbol: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  premium: string;
  premiumRaw: number;
  premiumTier: '100K' | '500K' | '1M';
  legType: 'single' | 'spread' | 'sweep';
  side: 'buy' | 'sell';
  signal: 'LONG' | 'SHORT';
  volume: number;
  openInterest: number;
  volOiRatio: number;
  timestamp: string;
  aiInsight: string;
  isETF: boolean;
  stockPrice: number;
  stockChange: number;
}

export interface SweepOrder {
  id: string;
  symbol: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  premium: string;
  exchanges: number;
  fillSpeed: string;
  sentiment: 'bullish' | 'bearish';
  urgencyScore: number;
}

export interface PutCallHeatmapEntry {
  label: string;
  ratio: number;
  change: number;
  type: 'sector' | 'stock' | 'expiry';
}

// ——— 2. Greeks Intelligence (used by backend transformers & OverviewTab Regime) ———

export interface DealerPositioning {
  metric: string;
  value: string;
  status: 'positive' | 'negative' | 'neutral';
  soWhat: string;
}

export interface GammaLevel {
  strike: number;
  gex: number;
  isFlipPoint: boolean;
}

export interface DeltaLevel {
  strike: number;
  callDex: number;
  putDex: number;
  netDex: number;
}

export interface VannaEntry {
  level: number;
  value: number;
  interpretation: string;
}

export interface CharmEntry {
  daysToExpiry: number;
  charmValue: number;
  impact: string;
}

export interface KeyLevel {
  price: number;
  type: 'support' | 'resistance' | 'gamma_flip';
  strength: 'strong' | 'moderate' | 'weak';
  note: string;
}

// ——— 3. Dark Pool ———

export interface DarkPoolTrade {
  id: string;
  symbol: string;
  price: number;
  size: number;
  notional: number;
  notionalFmt: string;
  side: 'buy' | 'sell' | 'unknown';
  exchange: string;
  timestamp: string;
  timeAgo: string;
  premiumToNBBO: number;
  blockType: 'block' | 'sweep' | 'cross';
  optionsCorrelation: string;
  sizeCategory: 'mega' | 'large' | 'notable';
}

export interface DarkPoolSummary {
  totalVolume: number;
  totalNotional: number;
  totalNotionalFmt: string;
  buyVolume: number;
  sellVolume: number;
  unknownVolume: number;
  buyPct: number;
  sellPct: number;
  topSymbol: string;
  topSymbolNotional: string;
  tradeCount: number;
  avgTradeSize: string;
  largestTrade: DarkPoolTrade | null;
  narrative: string;
}

export interface DarkPoolData {
  trades: DarkPoolTrade[];
  summary: DarkPoolSummary;
  lastUpdated: string;
  nextRefresh: string;
}

// ——— 4. Stock Deep Dive (retained for potential modal/drawer usage) ———

export interface ChainStrike {
  strike: number;
  callVol: number;
  putVol: number;
  callOI: number;
  putOI: number;
  callIV: number;
  putIV: number;
}

export interface ExpectedMove {
  period: 'weekly' | 'monthly' | 'earnings';
  range: string;
  upperBound: number;
  lowerBound: number;
  impliedMove: number;
}

export interface EarningsAnalysis {
  ticker: string;
  earningsDate: string;
  daysUntil: number;
  expectedMove: number;
  historicalAvgMove: number;
  ivCrushAvg: number;
  lastMoves: { date: string; move: number; expected: number }[];
  bestStrategies: string[];
  aiInsight: string;
}

export interface SkewData {
  putSkew: number;
  callSkew: number;
  direction: 'put' | 'call' | 'neutral';
  interpretation: string;
}

export interface TermStructurePoint {
  expiry: string;
  daysOut: number;
  iv: number;
}

export interface DeepDiveData {
  ticker: string;
  currentPrice: number;
  chain: ChainStrike[];
  expectedMoves: ExpectedMove[];
  earnings: EarningsAnalysis | null;
  skew: SkewData;
  termStructure: TermStructurePoint[];
  termStructureShape: 'contango' | 'backwardation' | 'flat';
  aiInsight: string;
}

// ——— 5. Volatility (used by backend transformers & OverviewTab Regime) ———

export interface VolRegime {
  ivRank: number;
  ivPercentile: number;
  skew: 'call' | 'put' | 'neutral';
  termStructure: 'contango' | 'backwardation' | 'flat';
  vixLevel: number;
  vixChange: number;
  vixTermStructure: 'contango' | 'backwardation' | 'flat';
  skewIndex: number;
  zeroDteRatio: number;
  interpretation: string;
}

// ——— 6. AI Alerts (used by backend transformers) ———

export type AlertType = 'unusual_volume' | 'gamma_flip' | 'iv_spike' | 'smart_money' | 'earnings_edge';

export interface AIAlert {
  id: string;
  type: AlertType;
  title: string;
  symbol: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium';
  summary: string;
  actionable: string;
  read: boolean;
}

// ——— 7. Daily Report ———

export interface DailyReport {
  date: string;
  topFlows: { flow: UnusualFlow; commentary: string }[];
  gexLevels: { spy: KeyLevel[]; qqq: KeyLevel[] };
  sectorSentiment: { sector: string; sentiment: 'bullish' | 'bearish' | 'neutral'; flowBias: number }[];
  earningsWatchlist: { ticker: string; date: string; expectedMove: number }[];
  keyLevels: KeyLevel[];
  bottomLine: string;
}

// ——— 8. Overview Charts & Tables ———

export interface MarketNetFlowPoint {
  time: string;
  spyPrice: number;
  allCalls: number;
  allPuts: number;
  algoFlow: number;
  convergence: number;
}

export interface OdteFlowPoint {
  time: string;
  price: number;
  netFlow: number;
}

export interface OdteGexPoint {
  hour: string;
  [strikeKey: `s${number}`]: number;
}

export interface OdteGexData {
  strikes: number[];
  points: OdteGexPoint[];
}

export interface SectorRadarPoint {
  sector: string;
  value: number;
}

export interface SectorFlowPoint {
  date: string;
  [sector: string]: string | number;
}

export interface SectorPremiumEntry {
  sector: string;
  value: number;
}

export interface MarketDashboardRow {
  symbol: string;
  orders: number;
  buys: number;
  netPremiums: string;
  avgExpDays: number;
  otmPct: number;
  otmScore: number;
}

export interface OverviewChartsData {
  marketNetFlow: MarketNetFlowPoint[];
  odteFlow: OdteFlowPoint[];
  odteGex: OdteGexData;
  sectorRadar: SectorRadarPoint[];
  sectorFlow: SectorFlowPoint[];
  sectorFlowKeys: string[];
  sectorPremiums: SectorPremiumEntry[];
  callsDashboard: MarketDashboardRow[];
  putsDashboard: MarketDashboardRow[];
}

// ——— 9. Squeeze Detector ———

export interface SqueezeCandidate {
  id: string;
  symbol: string;
  currentPrice: number;
  nearestCallWall: number;
  callWallOI: number;
  gexStatus: 'negative' | 'neutral' | 'positive';
  gexValue: number;
  shortInterest: number;
  floatSize: 'small' | 'medium' | 'large';
  callVolumeSpike: number;
  putCallRatio: number;
  putCallRatioChange: number;
  distanceToWall: number;
  squeezeScore: number;
  riskLevel: 'extreme' | 'high' | 'moderate' | 'low';
  aiInsight: string;
  triggerPrice: number;
  triggerReason: string;
  triggers: string[];
  bullishCatalysts: string[];
  bearishCatalysts: string[];
  lastUpdated: string;
}

export interface SqueezeSignal {
  id: string;
  type: 'oi_cluster' | 'gex_flip' | 'volume_spike' | 'short_squeeze_combo' | 'pc_ratio_drop' | 'wall_approach';
  symbol: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  timestamp: string;
}

export interface SqueezeDetectorData {
  candidates: SqueezeCandidate[];
  topSignals: SqueezeSignal[];
  marketGexStatus: {
    spyGex: number;
    qqyGex: number;
    regime: 'negative_gamma' | 'neutral' | 'positive_gamma';
    interpretation: string;
  };
}

// ——— Combined ———

export interface OptionsData {
  unusualFlows: UnusualFlow[];
  blockTrades: BlockTrade[];
  sweepOrders: SweepOrder[];
  putCallHeatmap: PutCallHeatmapEntry[];
  dealerPositioning: DealerPositioning[];
  gammaLevels: GammaLevel[];
  deltaLevels: DeltaLevel[];
  vannaExposure: VannaEntry[];
  charmFlow: CharmEntry[];
  keyLevels: KeyLevel[];
  volRegime: VolRegime;
  alerts: AIAlert[];
  dailyReport: DailyReport;
  overviewCharts: OverviewChartsData;
  squeezeDetector: SqueezeDetectorData;
  lastUpdated: string;
  cacheExpiry: string;
}

// ——— UI (Deep Dive removed from tab navigation) ———

export type OptionsTab = 'overview' | 'flow' | 'squeeze' | 'darkpool';
export type FilterType = 'all' | 'call' | 'put';
export type FlowSubTab = 'unusual' | 'blocks' | 'sweeps' | 'heatmap';
export type BlockTier = 'all' | '100K' | '500K' | '1M';