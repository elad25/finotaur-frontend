// constants/index.ts - COMPLETE FINAL VERSION
import { TimeframeConfig, ReplaySpeed, Theme } from '../types';

// ============================================================================
// TIMEFRAMES
// ============================================================================

export const TIMEFRAMES: TimeframeConfig[] = [
  { value: '1m', label: '1 minute', seconds: 60, minutes: 1, limit: 1000, binanceInterval: '1m' },
  { value: '3m', label: '3 minutes', seconds: 180, minutes: 3, limit: 1000, binanceInterval: '3m' },
  { value: '5m', label: '5 minutes', seconds: 300, minutes: 5, limit: 1000, binanceInterval: '5m' },
  { value: '15m', label: '15 minutes', seconds: 900, minutes: 15, limit: 1000, binanceInterval: '15m' },
  { value: '30m', label: '30 minutes', seconds: 1800, minutes: 30, limit: 1000, binanceInterval: '30m' },
  { value: '1h', label: '1 hour', seconds: 3600, minutes: 60, limit: 1000, binanceInterval: '1h' },
  { value: '2h', label: '2 hours', seconds: 7200, minutes: 120, limit: 1000, binanceInterval: '2h' },
  { value: '4h', label: '4 hours', seconds: 14400, minutes: 240, limit: 1000, binanceInterval: '4h' },
  { value: '1d', label: '1 day', seconds: 86400, minutes: 1440, limit: 1000, binanceInterval: '1d' },
  { value: '1w', label: '1 week', seconds: 604800, minutes: 10080, limit: 1000, binanceInterval: '1w' },
  { value: '1M', label: '1 month', seconds: 2592000, minutes: 43200, limit: 1000, binanceInterval: '1M' },
];

export const getTimeframeConfig = (value: string): TimeframeConfig => {
  return TIMEFRAMES.find(tf => tf.value === value) || TIMEFRAMES[5];
};

export const TIMEFRAME_CONFIGS: Record<string, TimeframeConfig> = TIMEFRAMES.reduce((acc, tf) => {
  acc[tf.value] = tf;
  return acc;
}, {} as Record<string, TimeframeConfig>);

// ============================================================================
// REPLAY
// ============================================================================

export const REPLAY_SPEEDS: ReplaySpeed[] = [0.25, 0.5, 1, 2, 4, 8, 10];
export const DEFAULT_REPLAY_SPEED: ReplaySpeed = 1;

// ============================================================================
// API
// ============================================================================

export const API_ENDPOINTS = {
  binance: {
    base: 'https://api.binance.com',
    klines: '/api/v3/klines',
    ticker: '/api/v3/ticker/24hr',
    exchangeInfo: '/api/v3/exchangeInfo',
  },
} as const;

export const API_LIMITS = {
  binance: {
    requestsPerSecond: 10,
    maxCandles: 1000,
    weight: 1,
  },
  maxRetries: 3,
  timeoutMs: 10000,
} as const;

// ============================================================================
// COLORS
// ============================================================================

export const CHART_COLORS = {
  dark: {
    background: '#0A0A0A',
    text: '#FFFFFF',
    textSecondary: '#C9A646',
    grid: '#2A2A2A',
    border: '#2A2A2A',
    crosshair: '#C9A646',
    upCandle: '#4CAF50',
    downCandle: '#F44336',
    volume: { up: '#4CAF50', down: '#F44336' },
  },
  light: {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#1976D2',
    grid: '#E0E0E0',
    border: '#E0E0E0',
    crosshair: '#1976D2',
    upCandle: '#4CAF50',
    downCandle: '#F44336',
    volume: { up: '#4CAF50', down: '#F44336' },
  },
} as const;

export const DRAWING_COLORS = {
  dark: {
    primary: '#C9A646',
    secondary: '#8B7355',
    success: '#4CAF50',
    danger: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
    text: '#FFFFFF',
    textMuted: '#999999',
    background: '#1A1A1A',
    border: '#2A2A2A',
  },
  light: {
    primary: '#1976D2',
    secondary: '#757575',
    success: '#4CAF50',
    danger: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
    text: '#000000',
    textMuted: '#666666',
    background: '#F5F5F5',
    border: '#E0E0E0',
  },
} as const;

// ============================================================================
// PERFORMANCE
// ============================================================================

export const PERFORMANCE = {
  targetFPS: 60,
  maxRenderTime: 16,
  batchSize: 100,
  throttleDelay: 16,
  debounceDelay: 300,
} as const;

export const PERFORMANCE_BUDGET = {
  renderMs: 16,
  eventMs: 8,
  dataProcessingMs: 50,
  maxMemoryMB: 500,
  maxDataPoints: 10000,
} as const;

export const THROTTLE_MS = 16;
export const DEBOUNCE_MS = 300;

// ============================================================================
// CACHE
// ============================================================================

export const CACHE = {
  maxAge: 5 * 60 * 1000,
  maxEntries: 50,
  cleanupInterval: 10 * 60 * 1000,
} as const;

export const CACHE_SETTINGS = {
  maxAge: 5 * 60 * 1000,
  maxSize: 50 * 1024 * 1024,
  maxEntries: 100,
  maxSymbols: 50,
  ttl: 300000,
  ttlMinutes: 5,
  maxMemoryMB: 50,
  cleanupInterval: 60000,
} as const;

// ============================================================================
// SYMBOLS
// ============================================================================

export const DEFAULT_SYMBOLS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'Crypto' as const, exchange: 'Binance' },
  { symbol: 'ETHUSDT', name: 'Ethereum', category: 'Crypto' as const, exchange: 'Binance' },
  { symbol: 'BNBUSDT', name: 'Binance Coin', category: 'Crypto' as const, exchange: 'Binance' },
  { symbol: 'ADAUSDT', name: 'Cardano', category: 'Crypto' as const, exchange: 'Binance' },
  { symbol: 'SOLUSDT', name: 'Solana', category: 'Crypto' as const, exchange: 'Binance' },
  { symbol: 'XRPUSDT', name: 'Ripple', category: 'Crypto' as const, exchange: 'Binance' },
  { symbol: 'DOTUSDT', name: 'Polkadot', category: 'Crypto' as const, exchange: 'Binance' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'Crypto' as const, exchange: 'Binance' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', category: 'Crypto' as const, exchange: 'Binance' },
  { symbol: 'MATICUSDT', name: 'Polygon', category: 'Crypto' as const, exchange: 'Binance' },
] as const;

// ============================================================================
// STORAGE KEYS - ✅ ADDED
// ============================================================================

export const STORAGE_KEYS = {
  // Symbols
  SYMBOL_CACHE: 'finotaur_symbol_cache',
  RECENT_SYMBOLS: 'finotaur_recent_symbols',
  FAVORITE_SYMBOLS: 'finotaur_favorite_symbols',
  
  // Drawings
  DRAWINGS: 'finotaur_drawings',
  DRAWING_SETTINGS: 'finotaur_drawing_settings',
  
  // Chart Settings
  CHART_SETTINGS: 'finotaur_chart_settings',
  TIMEFRAME_PREFERENCE: 'finotaur_timeframe',
  THEME_PREFERENCE: 'finotaur_theme',
  
  // Backtest
  BACKTEST_CONFIG: 'finotaur_backtest_config',
  BACKTEST_RESULTS: 'finotaur_backtest_results',
  
  // Replay
  REPLAY_STATE: 'finotaur_replay_state',
  REPLAY_SPEED: 'finotaur_replay_speed',
  
  // User Preferences
  USER_PREFERENCES: 'finotaur_user_preferences',
  KEYBOARD_SHORTCUTS: 'finotaur_keyboard_shortcuts',
} as const;

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULTS = {
  symbol: 'BTCUSDT',
  timeframe: '1h' as const,
  initialBalance: 10000,
  leverage: 1,
  commissionRate: 0.001,
  slippageRate: 0.0005,
  theme: 'dark' as Theme,
  candleLimit: 5000,
} as const;

// ============================================================================
// KEYBOARD
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  PLAY_PAUSE: ' ',
  STEP_FORWARD: 'ArrowRight',
  STEP_BACKWARD: 'ArrowLeft',
  JUMP_START: 'Home',
  JUMP_END: 'End',
  SPEED_UP: '+',
  SPEED_DOWN: '-',
  SELECT_CURSOR: 'Escape',
  SELECT_CROSSHAIR: 'C',
  SELECT_TRENDLINE: 'T',
  SELECT_HORIZONTAL: 'H',
  SELECT_VERTICAL: 'V',
  SELECT_RAY: 'R',
  SELECT_FIBONACCI: 'F',
  DELETE: 'Delete',
  UNDO: 'z',
  REDO: 'y',
  BUY: 'B',
  SELL: 'S',
  CLOSE_ALL: 'X',
} as const;

// ============================================================================
// DRAWING
// ============================================================================

export const DRAWING_DEFAULTS = {
  lineWidth: 2,
  color: '#C9A646',
  fontSize: 14,
  fontFamily: 'monospace',
  fillOpacity: 0.1,
} as const;

// ============================================================================
// POSITION
// ============================================================================

export const POSITION_DEFAULTS = {
  minSize: 10,
  maxSize: 100000,
  defaultStopLossPercent: 2,
  defaultTakeProfitPercent: 4,
} as const;