// src/constants/stock-analyzer.constants.ts
// =====================================================
// 🎨 STOCK ANALYZER — Design System & Constants
// =====================================================

import type { StockSuggestion } from '@/types/stock-analyzer.types';

// =====================================================
// DESIGN TOKENS
// =====================================================

export const C = {
  gold: '#C9A646',
  goldLight: '#F4D97B',
  goldDark: '#B8963F',
  bg: '#0a0a0a',
  bgCard: '#0d0b08',
  bgCardAlt: '#151210',
  border: 'rgba(201,166,70,0.15)',
  borderHover: 'rgba(201,166,70,0.3)',
  borderActive: 'rgba(201,166,70,0.5)',
  text: '#ffffff',
  textSoft: '#E8DCC4',
  textMuted: '#8B8B8B',
  textDim: '#6B6B6B',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
  purple: '#A855F7',
  amber: '#F59E0B',
  cyan: '#06B6D4',
} as const;

export const cardStyle = (highlight = false) => ({
  background: highlight
    ? 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(13,11,8,0.95))'
    : 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
  border: highlight ? `1px solid ${C.borderHover}` : `1px solid ${C.border}`,
});

// =====================================================
// POPULAR TICKERS
// =====================================================

export const POPULAR_TICKERS: StockSuggestion[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Technology' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Technology' },
  { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', sector: 'Technology' },
  { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Consumer Cyclical' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Financial Services' },
  { ticker: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Financial Services' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', sector: 'Healthcare' },
  { ticker: 'PG', name: 'Procter & Gamble Co', exchange: 'NYSE', sector: 'Consumer Defensive' },
  { ticker: 'UNH', name: 'UnitedHealth Group Inc.', exchange: 'NYSE', sector: 'Healthcare' },
];

// =====================================================
// CACHE CONFIGURATION — Earnings-Based (v2.0)
// =====================================================

export const CACHE_CONFIG = {
  /** Earnings date check interval — 24 hours */
  EARNINGS_DATE_TTL_MS: 24 * 60 * 60 * 1000,
  /** Fallback TTL if no earnings date available — 7 days */
  FALLBACK_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  /** Price/quote — NO CACHE (always fresh) */
  QUOTE_TTL_MS: 0,
  /** News — NO CACHE (always fresh) */
  NEWS_TTL_MS: 0,
  /** Max items in memory cache before eviction */
  MAX_CACHE_SIZE: 200,
} as const;

// TAB_CONFIG lives in: @/components/stock-analyzer/TabNav.tsx