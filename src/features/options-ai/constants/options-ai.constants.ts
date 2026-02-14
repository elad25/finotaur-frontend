// src/features/options-ai/constants/options-ai.constants.ts
// =====================================================
// v4.0 — Removed Deep Dive tab, kept Dark Pool
// =====================================================

import type { OptionsTab } from '../types/options-ai.types';

export const COLORS = {
  gold: '#C9A646', goldLight: '#F4D97B', goldDark: '#B8963F',
  bgDark: '#0a0a0a', bgCard: '#0d0b08', bgCardHover: '#151210',
  border: 'rgba(201,166,70,0.15)', borderHover: 'rgba(201,166,70,0.3)',
  textPrimary: '#ffffff', textSecondary: '#E8DCC4', textMuted: '#8B8B8B',
  bullish: '#22C55E', bearish: '#EF4444', warning: '#F59E0B', purple: '#8B5CF6',
} as const;

export const STATUS_CONFIG = {
  positive: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', gradient: 'linear-gradient(90deg, #22C55E, #34D399)' },
  negative: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', gradient: 'linear-gradient(90deg, #EF4444, #F87171)' },
  neutral:  { color: '#C9A646', bg: 'rgba(201,166,70,0.1)', gradient: 'linear-gradient(90deg, #C9A646, #F4D97B)' },
} as const;

export const LEVEL_TYPE_CONFIG = {
  resistance: { color: '#EF4444', label: 'RESISTANCE' },
  support:    { color: '#22C55E', label: 'SUPPORT' },
  gamma_flip: { color: '#F59E0B', label: 'GAMMA FLIP' },
} as const;

export const STRENGTH_OPACITY = { strong: 1, moderate: 0.7, weak: 0.4 } as const;

export const ALERT_CONFIG = {
  unusual_volume: { color: '#F59E0B', label: 'Unusual Volume' },
  gamma_flip:     { color: '#EF4444', label: 'Gamma Flip' },
  iv_spike:       { color: '#8B5CF6', label: 'IV Spike' },
  smart_money:    { color: '#22C55E', label: 'Smart Money' },
  earnings_edge:  { color: '#C9A646', label: 'Earnings Edge' },
} as const;

export const SEVERITY_CONFIG = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  high:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  medium:   { color: '#C9A646', bg: 'rgba(201,166,70,0.1)' },
} as const;

// ── Squeeze Detector Configs ──
export const SQUEEZE_RISK_CONFIG = {
  extreme:  { color: '#EF4444', label: 'EXTREME', bg: 'rgba(239,68,68,0.1)' },
  high:     { color: '#F59E0B', label: 'HIGH',    bg: 'rgba(245,158,11,0.1)' },
  moderate: { color: '#C9A646', label: 'MODERATE', bg: 'rgba(201,166,70,0.1)' },
  low:      { color: '#8B8B8B', label: 'LOW',     bg: 'rgba(139,139,139,0.1)' },
} as const;

export const SQUEEZE_SIGNAL_CONFIG = {
  oi_cluster:         { color: '#C9A646', label: 'OI Cluster' },
  gex_flip:           { color: '#F59E0B', label: 'GEX Flip' },
  volume_spike:       { color: '#22C55E', label: 'Volume Spike' },
  short_squeeze_combo:{ color: '#EF4444', label: 'Short Squeeze' },
  pc_ratio_drop:      { color: '#8B5CF6', label: 'P/C Drop' },
  wall_approach:      { color: '#F59E0B', label: 'Wall Approach' },
} as const;

// ── Tab Configuration (4 tabs — Deep Dive removed) ──
export const TABS: { id: OptionsTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview',          icon: 'Layers' },
  { id: 'flow',     label: 'Flow Scanner',      icon: 'Zap' },
  { id: 'squeeze',  label: 'Squeeze Detector',  icon: 'Flame' },
  { id: 'darkpool', label: 'Dark Pool',         icon: 'Eye' },
];

// ── Timing — Optimized for 10k+ concurrent users ──
export const CACHE_TTL_MS = 5 * 60 * 1000;        // 5 min — matches backend L1
export const API_RETRY_COUNT = 2;                   // Reduced from 3 — backend is reliable
export const API_RETRY_DELAY_MS = 500;              // Reduced from 800 — faster recovery
export const AUTO_REFRESH_MS = 5 * 60 * 1000;      // 5 min base (jitter added in hook)
export const REFRESH_JITTER_MS = 60 * 1000;         // ±60s jitter to prevent thundering herd

// ╔══════════════════════════════════════════════════════╗
// ║  SHARED ETF/INDEX SET                                 ║
// ╚══════════════════════════════════════════════════════╝

export const INDEX_ETF_SYMBOLS = new Set([
  // S&P 500
  'SPY', 'SPX', 'SPXW', 'VOO', 'IVV', 'SPLG', 'UPRO', 'SPXL', 'SPXS', 'SH', 'SDS',
  // Nasdaq
  'QQQ', 'QQQM', 'TQQQ', 'SQQQ', 'NDX', 'QLD', 'PSQ',
  // Dow
  'DIA', 'UDOW', 'SDOW', 'DDM', 'DOG',
  // Russell
  'IWM', 'TNA', 'TZA', 'URTY', 'SRTY', 'IWO', 'IWN', 'VTWO',
  // Sector ETFs
  'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLU', 'XLP', 'XLY', 'XLB', 'XLRE', 'XLC',
  // Volatility
  'VIX', 'VIXY', 'UVXY', 'SVXY', 'VXX', 'VIXM',
  // Broad Market
  'VTI', 'ITOT', 'SCHB', 'SPTM',
  // International
  'EEM', 'EFA', 'VWO', 'IEMG', 'VEA', 'INDA', 'FXI', 'KWEB', 'MCHI',
  // Bonds
  'TLT', 'TMF', 'TMV', 'TBT', 'IEF', 'SHY', 'BND', 'AGG', 'HYG', 'LQD', 'JNK',
  // Gold / Commodities
  'GLD', 'SLV', 'GDX', 'GDXJ', 'IAU', 'USO', 'UNG', 'DBA', 'DBC',
  // Leveraged
  'SSO', 'SPUU', 'OILU', 'OILD', 'LABU', 'LABD', 'SOXL', 'SOXS',
  // Thematic
  'ARKK', 'ARKW', 'ARKG', 'ARKF', 'XBI', 'IBB', 'SMH', 'SOXX', 'HACK', 'BOTZ',
  'TAN', 'ICLN', 'LIT', 'JETS', 'DFEN', 'NAIL', 'CURE',
]);

export function isIndexOrETF(symbol: string): boolean {
  return INDEX_ETF_SYMBOLS.has(symbol.toUpperCase());
}