// ============================================================
// src/pages/app/stocks/_screener/filters.ts
// Declarative filter group definitions + preset pills
// ============================================================

import type { Filters } from './types';

export type FilterUnit = '$' | '%' | 'x' | '';

export interface NumericFilterDef {
  type: 'numeric';
  key: string;       // param prefix (e.g. 'pe' → peMin / peMax)
  label: string;
  unit: FilterUnit;
  group: FilterGroup;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

export interface MultiSelectFilterDef {
  type: 'multiselect';
  key: 'sector' | 'exchange';
  label: string;
  group: FilterGroup;
}

export interface SmaFilterDef {
  type: 'sma';
  key: 'smaPos20' | 'smaPos50' | 'smaPos200';
  label: string;
  group: FilterGroup;
}

export type FilterDef = NumericFilterDef | MultiSelectFilterDef | SmaFilterDef;

export type FilterGroup = 'descriptive' | 'valuation' | 'profitability' | 'technical';

export const FILTER_GROUPS: { id: FilterGroup; label: string; icon: string }[] = [
  { id: 'descriptive', label: 'Descriptive', icon: '🏷️' },
  { id: 'valuation',   label: 'Valuation',   icon: '💰' },
  { id: 'profitability', label: 'Profitability & Growth', icon: '📈' },
  { id: 'technical',   label: 'Technical',   icon: '📊' },
];

export const FILTER_DEFS: FilterDef[] = [
  // ── Descriptive ──────────────────────────────────────────────
  { type: 'multiselect', key: 'sector',   label: 'Sector',      group: 'descriptive' },
  { type: 'multiselect', key: 'exchange', label: 'Exchange',    group: 'descriptive' },
  { type: 'numeric', key: 'mktcap', label: 'Market Cap',  unit: '$', group: 'descriptive', minPlaceholder: '1B', maxPlaceholder: '2T' },
  { type: 'numeric', key: 'price',  label: 'Price',       unit: '$', group: 'descriptive', minPlaceholder: '1',  maxPlaceholder: '500' },

  // ── Valuation ─────────────────────────────────────────────────
  { type: 'numeric', key: 'pe',       label: 'P/E Ratio',      unit: 'x', group: 'valuation', minPlaceholder: '0',  maxPlaceholder: '50' },
  { type: 'numeric', key: 'ps',       label: 'P/S Ratio',      unit: 'x', group: 'valuation', minPlaceholder: '0',  maxPlaceholder: '20' },
  { type: 'numeric', key: 'pb',       label: 'P/B Ratio',      unit: 'x', group: 'valuation', minPlaceholder: '0',  maxPlaceholder: '10' },
  { type: 'numeric', key: 'peg',      label: 'PEG Ratio',      unit: 'x', group: 'valuation', minPlaceholder: '0',  maxPlaceholder: '3' },
  { type: 'numeric', key: 'divYield', label: 'Dividend Yield', unit: '%', group: 'valuation', minPlaceholder: '0',  maxPlaceholder: '10' },

  // ── Profitability & Growth ────────────────────────────────────
  { type: 'numeric', key: 'grossMargin',  label: 'Gross Margin',       unit: '%', group: 'profitability', minPlaceholder: '0',   maxPlaceholder: '80' },
  { type: 'numeric', key: 'opMargin',     label: 'Operating Margin',   unit: '%', group: 'profitability', minPlaceholder: '-50', maxPlaceholder: '50' },
  { type: 'numeric', key: 'netMargin',    label: 'Net Margin',         unit: '%', group: 'profitability', minPlaceholder: '-50', maxPlaceholder: '50' },
  { type: 'numeric', key: 'roe',          label: 'ROE',                unit: '%', group: 'profitability', minPlaceholder: '0',   maxPlaceholder: '50' },
  { type: 'numeric', key: 'roa',          label: 'ROA',                unit: '%', group: 'profitability', minPlaceholder: '0',   maxPlaceholder: '30' },
  { type: 'numeric', key: 'revGrowth',    label: 'Revenue Growth YoY', unit: '%', group: 'profitability', minPlaceholder: '-20', maxPlaceholder: '50' },
  { type: 'numeric', key: 'epsGrowth',    label: 'EPS Growth YoY',     unit: '%', group: 'profitability', minPlaceholder: '-20', maxPlaceholder: '50' },
  { type: 'numeric', key: 'de',           label: 'Debt / Equity',      unit: 'x', group: 'profitability', minPlaceholder: '0',   maxPlaceholder: '5' },
  { type: 'numeric', key: 'currentRatio', label: 'Current Ratio',      unit: 'x', group: 'profitability', minPlaceholder: '0.5', maxPlaceholder: '5' },

  // ── Technical ─────────────────────────────────────────────────
  { type: 'numeric', key: 'chg1d',       label: 'Change 1D',         unit: '%', group: 'technical', minPlaceholder: '-10', maxPlaceholder: '10' },
  { type: 'numeric', key: 'perf1w',      label: 'Perf 1W',           unit: '%', group: 'technical', minPlaceholder: '-20', maxPlaceholder: '20' },
  { type: 'numeric', key: 'perf1m',      label: 'Perf 1M',           unit: '%', group: 'technical', minPlaceholder: '-30', maxPlaceholder: '30' },
  { type: 'numeric', key: 'perf3m',      label: 'Perf 3M',           unit: '%', group: 'technical', minPlaceholder: '-40', maxPlaceholder: '40' },
  { type: 'numeric', key: 'perf6m',      label: 'Perf 6M',           unit: '%', group: 'technical', minPlaceholder: '-50', maxPlaceholder: '50' },
  { type: 'numeric', key: 'perf1y',      label: 'Perf 1Y',           unit: '%', group: 'technical', minPlaceholder: '-60', maxPlaceholder: '100' },
  { type: 'numeric', key: 'rsi',         label: 'RSI (14)',           unit: '',  group: 'technical', minPlaceholder: '20',  maxPlaceholder: '80' },
  { type: 'numeric', key: 'beta',        label: 'Beta',               unit: 'x', group: 'technical', minPlaceholder: '0',   maxPlaceholder: '3' },
  { type: 'numeric', key: 'relVol',      label: 'Relative Volume',    unit: 'x', group: 'technical', minPlaceholder: '0.5', maxPlaceholder: '5' },
  { type: 'numeric', key: 'from52wHigh', label: '% from 52W High',   unit: '%', group: 'technical', minPlaceholder: '-50', maxPlaceholder: '0' },
  { type: 'numeric', key: 'from52wLow',  label: '% from 52W Low',    unit: '%', group: 'technical', minPlaceholder: '0',   maxPlaceholder: '200' },
  { type: 'sma', key: 'smaPos20',  label: 'Price vs SMA 20',  group: 'technical' },
  { type: 'sma', key: 'smaPos50',  label: 'Price vs SMA 50',  group: 'technical' },
  { type: 'sma', key: 'smaPos200', label: 'Price vs SMA 200', group: 'technical' },
];

// ── Presets ───────────────────────────────────────────────────

export interface Preset {
  id: string;
  label: string;
  icon: string;
  filters: Partial<Filters>;
}

export const PRESETS: Preset[] = [
  {
    id: 'quality',
    label: 'Quality Compounders',
    icon: '🏆',
    filters: { roeMin: '15', netMarginMin: '10', deMax: '1', revGrowthMin: '5' },
  },
  {
    id: 'value',
    label: 'Deep Value',
    icon: '💎',
    filters: { peMax: '15', pbMax: '2', divYieldMin: '2' },
  },
  {
    id: 'momentum',
    label: 'Momentum Breakout',
    icon: '🚀',
    filters: { perf3mMin: '20', smaPos50: 'above', smaPos200: 'above', rsiMax: '75' },
  },
  {
    id: 'oversold',
    label: 'Oversold Bounce',
    icon: '📉',
    filters: { rsiMax: '30', perf1mMax: '-10', mktcapMin: '2000000000' },
  },
  {
    id: 'growth',
    label: 'High Growth',
    icon: '⚡',
    filters: { revGrowthMin: '25', epsGrowthMin: '20' },
  },
  {
    id: 'dividend',
    label: 'Dividend Income',
    icon: '💵',
    filters: { divYieldMin: '3', peMax: '25', deMax: '1.5' },
  },
  {
    id: 'highs',
    label: 'Near 52W High',
    icon: '🎯',
    filters: { from52wHighMin: '-3', perf6mMin: '10' },
  },
];
