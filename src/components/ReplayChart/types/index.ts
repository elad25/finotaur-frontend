// types/index.ts - COMPLETE & FINAL VERSION WITH BINANCE KLINE
// ============================================================================
// UNIFIED TYPE DEFINITIONS FOR FINOTAUR REPLAY CHART & BACKTEST ENGINE
// ============================================================================

import { 
  Time, 
  UTCTimestamp,
  CandlestickData as LWCandlestickData,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
} from 'lightweight-charts';

// ============================================================================
// ✅ EXTENDED CANDLESTICK DATA (FIX FOR VOLUME)
// ============================================================================

/**
 * Extended CandlestickData with volume support
 * Fixes TypeScript error: Property 'volume' does not exist
 */
export interface CandlestickData extends LWCandlestickData<Time> {
  volume?: number;
}

/**
 * Standard candle format (alias for backward compatibility)
 */
export interface Candle {
  time: number | UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ============================================================================
// ✅ BINANCE API TYPES
// ============================================================================

/**
 * Binance Kline (candlestick) raw response format
 * Array format: [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]
 */
export type BinanceKline = [
  number,  // 0: Open time (milliseconds)
  string,  // 1: Open price
  string,  // 2: High price
  string,  // 3: Low price
  string,  // 4: Close price
  string,  // 5: Volume
  number,  // 6: Close time (milliseconds)
  string,  // 7: Quote asset volume
  number,  // 8: Number of trades
  string,  // 9: Taker buy base asset volume
  string,  // 10: Taker buy quote asset volume
  string   // 11: Ignore
];

// ============================================================================
// CHART DATA TYPES
// ============================================================================

/**
 * Timeframe value - string representation
 */
export type Timeframe = 
  | '1m' | '3m' | '5m' | '15m' | '30m' 
  | '1h' | '2h' | '4h' 
  | '1d' | '1w' | '1M';

/**
 * Timeframe configuration object - UNIFIED VERSION
 * ✅ This is the SINGLE SOURCE OF TRUTH for timeframe objects
 */
export interface TimeframeConfig {
  value: Timeframe;
  label: string;
  seconds: number;
  minutes: number;
  limit: number;
  binanceInterval?: string;
}

/**
 * Optimized candle buffer for high-performance scenarios
 */
export interface CandleBuffer {
  symbol: string;
  timeframe: Timeframe;
  data: Float64Array; // [time, open, high, low, close, volume] repeated
  count: number;
  lastUpdate: number;
}

// ============================================================================
// SYMBOL TYPES
// ============================================================================

export type SymbolCategory = 'Crypto' | 'Stocks' | 'Forex' | 'Futures';

export interface Symbol {
  symbol: string;
  name: string;
  category: SymbolCategory;
  baseAsset?: string;
  quoteAsset?: string;
  exchange?: string;
  logo?: string;
}

export interface SymbolMeta {
  symbol: string;
  displayName: string;
  name: string;
  category: SymbolCategory;
  exchange: string;
  precision?: number;
  minPrice?: number;
  maxPrice?: number;
  tickSize?: number;
  minQty?: number;
  maxQty?: number;
  lotSize?: number;
}

// ============================================================================
// THEME & CHART TYPES
// ============================================================================

export type Theme = 'light' | 'dark';
export type CandleStyle = 'candles' | 'hollow' | 'bars' | 'line' | 'area' | 'heikin-ashi';

export interface ChartOptions {
  theme: Theme;
  width?: number;
  height?: number;
  autoSize?: boolean;
}

export interface ChartSettings {
  theme: Theme;
  showGrid: boolean;
  showCrosshair: boolean;
  showVolume: boolean;
  showWatermark: boolean;
  candleStyle: CandleStyle;
  showSessionBreaks: boolean;
  showCountdown: boolean;
  timezone: string;
  locale: string;
}

export interface ChartConfig {
  symbol: string;
  interval: Timeframe;
  container: string;
  theme: Theme;
  locale: string;
  timezone: string;
  autosize: boolean;
  disabled_features?: string[];
  enabled_features?: string[];
  overrides?: Record<string, any>;
  studies_overrides?: Record<string, any>;
  custom_css_url?: string;
}

// ============================================================================
// REPLAY TYPES
// ============================================================================

export type ReplayMode = 'live' | 'replay';
export type ReplaySpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8 | 10;
export type PlaybackSpeed = ReplaySpeed; // Alias

export interface ReplayState {
  mode: ReplayMode;
  startIndex: number;
  endIndex: number;
  currentIndex: number | null;
  isPlaying: boolean;
  speed: ReplaySpeed;
  autoScroll: boolean;
}

// ============================================================================
// ✅ TRADING ENUMS - CRITICAL: MUST BE EXPORTED
// ============================================================================

/**
 * Trade direction / position side
 */
export enum Side {
  BUY = 'BUY',
  SELL = 'SELL',
}

/**
 * Order type
 */
export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP = 'STOP',
  STOP_LIMIT = 'STOP_LIMIT',
}

/**
 * Order status
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

// ============================================================================
// ✅ UI-FRIENDLY TYPES
// ============================================================================

/**
 * UI-friendly position side (lowercase)
 * Used in OrderTicket and other UI components
 */
export type PositionSide = 'long' | 'short';

/**
 * UI-friendly order type (lowercase)
 * Used in OrderTicket and other UI components
 */
export type OrderTypeUI = 'market' | 'limit';

// ============================================================================
// ✅ CONVERSION HELPERS
// ============================================================================

export function positionSideToSide(side: PositionSide): Side {
  return side === 'long' ? Side.BUY : Side.SELL;
}

export function sideToPositionSide(side: Side): PositionSide {
  return side === Side.BUY ? 'long' : 'short';
}

export function orderTypeUIToEnum(type: OrderTypeUI): OrderType {
  return type === 'market' ? OrderType.MARKET : OrderType.LIMIT;
}

export function orderTypeEnumToUI(type: OrderType): OrderTypeUI {
  return type === OrderType.MARKET ? 'market' : 'limit';
}

// ============================================================================
// TRADING TYPE ALIASES (for backward compatibility)
// ============================================================================

export type TradeDirection = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'cancelled';
export type ExitReason = 'manual' | 'stop_loss' | 'take_profit' | 'liquidation' | 'timeout';

// ============================================================================
// ✅ TRADING INTERFACES - UPDATED WITH ENUMS
// ============================================================================

/**
 * Order structure
 */
export interface Order {
  orderId: string;
  symbol: string;
  side: Side;
  orderType: OrderType;
  size: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  initialRisk?: number;
  status: OrderStatus;
  timestamp: number;
}

/**
 * Trade execution event
 */
export interface TradeExecution {
  orderId: string;
  symbol?: string;
  side: Side;
  size: number;
  price: number;
  time: number | UTCTimestamp;
  orderType: OrderType;
  isEntry: boolean;
  stopLoss?: number;
  takeProfit?: number;
  initialRisk?: number;
}

/**
 * Complete position structure - ✅ UPDATED WITH ALL ALIASES
 */
export interface Position {
  // Identification
  positionId: string;
  id?: string;  // ✅ Alias for positionId (for UI compatibility)
  symbol: string;
  
  // Direction & Entry
  side: Side;
  entryPrice: number;
  entryTime: number | UTCTimestamp;
  size: number;
  
  // Exit
  exitPrice?: number;
  exitTime?: number | UTCTimestamp;
  exitReason?: ExitReason;
  
  // Risk Management
  stopLoss: number | null;
  takeProfit: number | null;
  initialRisk: number | null;
  trailingStop?: number;
  
  // Status
  status?: TradeStatus;
  isClosed?: boolean;
  
  // P&L - ✅ UPDATED WITH ALL VARIANTS
  currentPnL: number;
  currentPnLPercent: number;
  unrealizedPnL?: number;      // ✅ Unrealized P&L (capital L)
  unrealizedPnl?: number;      // ✅ Unrealized P&L (lowercase l) - alias
  pips: number;
  realizedPnL?: number;
  realizedPnl?: number; // Alias
  
  // Risk metrics
  riskAmount?: number;
  rewardAmount?: number;
  riskRewardRatio?: number;
  rMultiple?: number;
  
  // Costs
  commission?: number;
  slippage?: number;
  fees?: number;
  
  // Metadata
  notes?: string;
  tags?: string[];
  strategyId?: string;
  strategyName?: string;
  sessionId?: string;
  screenshotUrl?: string;
  chartSnapshotUrl?: string;
  
  // Timestamps
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Trade result after closing
 */
export interface TradeResult {
  positionId: string;
  symbol: string;
  side: Side;
  entryPrice: number;
  exitPrice: number;
  entryTime: number | UTCTimestamp;
  exitTime: number | UTCTimestamp;
  size: number;
  pnl: number;
  pnlPercent: number;
  rMultiple: number;
  reason: 'SL' | 'TP' | 'MARKET';
  commission?: number;
  slippage?: number;
  tags?: TradeTag[];
  notes?: string;
}

/**
 * Order draft for UI
 */
export interface PositionDraft {
  side: TradeDirection;
  size: number;
  orderType: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  notes?: string;
  tags?: string[];
}

// ============================================================================
// BACKTEST STATE TYPES
// ============================================================================

export interface BacktestState {
  // Configuration
  symbol: string;
  timeframe: Timeframe;
  startDate: number;
  endDate: number;
  initialBalance: number;
  
  // Playback
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentIndex: number;
  totalCandles: number;
  mode: ReplayMode;
  
  // Data
  candles: Candle[];
  visibleCandles: Candle[];
  
  // Positions & Orders
  activePosition?: Position;
  openPositions: Position[];
  closedPositions: Position[];
  orders: Order[];
  
  // Account
  balance: number;
  equity: number;
  margin: number;
  marginLevel: number;
  availableBalance: number;
  
  // Statistics
  statistics: BacktestStatistics;
  
  // UI State
  showBacktestPanel: boolean;
  showStatistics: boolean;
  autoScroll: boolean;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface BacktestStatistics {
  // Basic metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades?: number;
  
  // Win rate
  winRate: number;
  lossRate?: number;
  
  // P&L
  totalPnl: number;
  totalPnlPercent?: number;
  grossProfit?: number;
  grossLoss?: number;
  netProfit?: number;
  netProfitPercent?: number;
  
  // Average metrics
  avgWin?: number;
  avgWinPercent?: number;
  avgLoss?: number;
  avgLossPercent?: number;
  avgRR?: number;
  avgTradeDuration?: number;
  avgBarsInTrade?: number;
  
  // Advanced metrics
  profitFactor: number;
  expectancy?: number;
  expectancyPercent?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  
  // Drawdown
  maxDrawdown: number;
  maxDrawdownPercent?: number;
  maxDrawdownDuration?: number;
  currentDrawdown?: number;
  currentDrawdownPercent?: number;
  recoveryFactor?: number;
  maxPnl: number;
  
  // Consecutive
  maxConsecutiveWins?: number;
  maxConsecutiveLosses?: number;
  currentStreak?: number;
  currentStreakType?: 'win' | 'loss' | 'none';
  
  // Risk metrics
  largestWin?: number;
  largestWinPercent?: number;
  largestLoss?: number;
  largestLossPercent?: number;
  avgRiskAmount?: number;
  totalRiskTaken?: number;
  
  // R-Multiple
  averageR: number;
  totalR: number;
  
  // Time-based
  tradingDays?: number;
  avgTradesPerDay?: number;
  firstTradeDate?: number;
  lastTradeDate?: number;
  totalTradingTime?: number;
  
  // Equity curve
  cumulativePnl: Array<{ time: number; value: number }>;
  equityCurve?: EquityPoint[];
  drawdownCurve?: DrawdownPoint[];
  
  // Open positions
  openPositions?: number;
  
  // R-Multiple Distribution
  rMultipleDistribution?: {
    '< -2R': number;
    '-2R to -1R': number;
    '-1R to 0R': number;
    '0R to 1R': number;
    '1R to 2R': number;
    '2R to 3R': number;
    '> 3R': number;
  };
}

export interface BacktestStats {
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxPnl: number;
  cumulativePnl: Array<{ time: number; value: number }>;
  averageR: number;
  totalR: number;
  openPositions?: number;
  grossProfit?: number;
  grossLoss?: number;
}

export interface EquityPoint {
  time: number;
  balance: number;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface DrawdownPoint {
  time: number;
  drawdown: number;
  drawdownPercent: number;
  inDrawdown: boolean;
  peakBalance: number;
}

// ============================================================================
// ✅ DRAWING TYPES (COMPLETE WITH ALL TOOLS)
// ============================================================================

export type DrawingTool = 
  | 'cursor' 
  | 'cross' 
  | 'trendline' 
  | 'horizontal' 
  | 'vertical'
  | 'ray' 
  | 'extended'
  | 'rectangle' 
  | 'circle' 
  | 'ellipse'
  | 'triangle'
  | 'text' 
  | 'note'
  | 'brush'
  | 'measure'
  | 'fibonacci'
  | 'fibonacci-extension'
  | 'pitchfork'
  | 'gann-fan'
  | 'arrow';

export type DrawingType = DrawingTool; // Alias

export interface Point {
  time: Time;
  price: number;
}

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  fillOpacity?: number;
  text?: string;
  fontSize?: number;
  backgroundColor?: string;
  borderColor?: string;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  tool: DrawingTool;
  points: DrawingPoint[];
  style?: DrawingStyle;
  color: string;
  lineWidth: number;
  visible: boolean;
  locked: boolean;
  selected?: boolean;
  
  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  
  // Layer & ordering
  layer?: number;
  zIndex?: number;
  
  // Metadata
  timestamp: number;
  createdAt?: number;
  updatedAt?: number;
  author?: string;
  symbol?: string;
  
  // Fibonacci specific
  levels?: number[];
  showLabels?: boolean;
  extendLeft?: boolean;
  extendRight?: boolean;
}

// ============================================================================
// TAG TYPES
// ============================================================================

export interface TradeTag {
  category: 'setup' | 'session' | 'quality' | 'pattern' | 'custom';
  value: string;
  color?: string;
}

// ============================================================================
// INDICATOR TYPES
// ============================================================================

export interface IndicatorSettings {
  // Moving Averages
  sma?: { length: number; color: string; lineWidth?: number };
  ema?: { length: number; color: string; lineWidth?: number };
  wma?: { length: number; color: string };
  vwma?: { length: number; color: string };
  
  // Momentum
  rsi?: { length: number; overbought: number; oversold: number; color?: string };
  macd?: { fast: number; slow: number; signal: number };
  stochastic?: { kPeriod: number; dPeriod: number; smooth: number };
  
  // Volatility
  bollinger?: { length: number; stdDev: number; color?: string };
  atr?: { length: number; color?: string };
  keltner?: { length: number; multiplier: number };
  
  // Volume
  volume?: { color: string; upColor?: string; downColor?: string };
  obv?: { color: string };
  
  // Trend
  supertrend?: { atrPeriod: number; multiplier: number };
  ichimoku?: { 
    conversionPeriod: number; 
    basePeriod: number; 
    spanBPeriod: number; 
    displacement: number;
  };
  
  // Support/Resistance
  pivotPoints?: { type: 'standard' | 'fibonacci' | 'camarilla' };
}

export interface IndicatorValue {
  time: Time;
  value: number;
  color?: string;
}

export interface IndicatorData {
  id: string;
  name: string;
  type: string;
  values: IndicatorValue[];
  settings: any;
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  change?: number;
  changePercent?: number;
  time?: number;
  volume?: number;
}

export interface CrosshairData {
  time: Time | null;
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
}

export interface ChartMarker {
  id: string;
  time: number | UTCTimestamp;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown' | 'flag' | 'text';
  text?: string;
  size?: 'auto' | 'tiny' | 'small' | 'normal' | 'large' | 'huge';
  tooltip?: string;
}

export interface ChartLine {
  id: string;
  price: number;
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  title?: string;
  axisLabelVisible?: boolean;
  editable?: boolean;
  showLabel?: boolean;
}

export interface ChartShape {
  id: string;
  time: number;
  price: number;
  type: 'arrow' | 'circle' | 'rectangle' | 'text' | 'icon';
  text?: string;
  color?: string;
  size?: number;
  icon?: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface ChartClickEvent {
  time: number;
  price: number;
  x: number;
  y: number;
  seriesData?: any;
}

export interface CrosshairMoveEvent {
  time: number | null;
  price: number | null;
  seriesData: any;
  point?: { x: number; y: number };
}

export interface TradeEvent {
  type: 'POSITION_OPENED' | 'POSITION_CLOSED' | 'SL_HIT' | 'TP_HIT' | 'ORDER_FILLED' | 'ORDER_CANCELLED';
  timestamp: number;
  position?: Position;
  order?: Order;
  candle?: Candle;
  reason?: string;
}

export interface PlaybackEvent {
  type: 'CANDLE_UPDATE' | 'PLAYBACK_STARTED' | 'PLAYBACK_STOPPED' | 'PLAYBACK_ENDED' | 'PLAYBACK_PAUSED';
  timestamp: number;
  currentIndex: number;
  candle?: Candle;
  speed?: PlaybackSpeed;
}

// ============================================================================
// PERFORMANCE TYPES
// ============================================================================

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  dataPoints: number;
  warnings?: string[];
  timestamp?: number;
}

export interface PerformanceBudget {
  renderMs: number;
  eventMs: number;
  dataProcessingMs: number;
  maxMemoryMB: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface BacktestConfig {
  symbol: string;
  timeframe: Timeframe;
  initialBalance: number;
  leverage: number;
  commissionRate: number;
  slippageRate: number;
  compoundProfits: boolean;
  maxPositionSize: number;
  maxDrawdown: number;
  maxDailyLoss?: number;
  maxPositions?: number;
  dateRange: {
    from: number;
    to: number;
  };
  riskManagement?: {
    maxRiskPerTrade: number;
    maxRiskTotal: number;
    useTrailingStop: boolean;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ChartError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'ChartError';
  }
}

export class BacktestError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'BacktestError';
  }
}

export type ErrorCode =
  | 'INVALID_POSITION'
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_PRICE'
  | 'INVALID_SIZE'
  | 'POSITION_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'DATA_LOAD_FAILED'
  | 'CHART_INIT_FAILED'
  | 'WORKER_ERROR'
  | 'CACHE_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_ERROR';

// ============================================================================
// STRATEGY TYPES (for Phase 2)
// ============================================================================

export interface StrategyConfig {
  id: string;
  name: string;
  description?: string;
  riskPerTrade: number;
  maxPositions: number;
  maxDailyLoss?: number;
  positionSizing: 'fixed' | 'percent' | 'risk-based';
  defaultStopLoss?: number;
  defaultTakeProfit?: number;
  useTrailingStop?: boolean;
  sessions?: ('NY' | 'London' | 'Asia')[];
  minVolume?: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface BacktestRun {
  id: string;
  strategyId: string;
  symbol: string;
  timeframe: Timeframe;
  startTime: number;
  endTime: number;
  positions: Position[];
  stats: BacktestStats;
  equityCurve: Array<{ time: number; equity: number }>;
  completedAt: number;
  duration: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

// ============================================================================
// EXPORTS FROM LIGHTWEIGHT-CHARTS
// ============================================================================

export type {
  Time,
  UTCTimestamp,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  LWCandlestickData,
};