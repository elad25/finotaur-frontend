// =====================================================
// 🛠️ SECTOR ANALYZER - UTILS
// src/components/SectorAnalyzer/utils.ts
// =====================================================

import type { RiskLevel, ImpactType, SignalType, SentimentType } from './types';

// Colors
export const colors = {
  gold: { primary: '#C9A646', light: '#F4D97B', dark: '#8B7232' },
  positive: '#22C55E',
  negative: '#EF4444',
  warning: '#F59E0B',
  neutral: '#8B8B8B',
};

// Class name utility
type ClassValue = string | number | boolean | undefined | null | ClassValue[];
export function cn(...inputs: ClassValue[]): string {
  return inputs.flat().filter(x => typeof x === 'string' && x.length > 0).join(' ');
}

// Formatting
export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

// Color getters
export function getScoreColor(score: number): string {
  if (score >= 80) return colors.positive;
  if (score >= 60) return '#84CC16';
  if (score >= 40) return colors.warning;
  return colors.negative;
}

export function getRiskColor(level: RiskLevel): string {
  return { High: colors.negative, Medium: colors.warning, Low: colors.positive }[level];
}

export function getImpactColor(impact: ImpactType): string {
  return { Positive: colors.positive, Negative: colors.negative, Neutral: colors.warning }[impact];
}

export function getSignalColor(signal: SignalType): string {
  return { BUY: colors.positive, HOLD: colors.warning, WATCH: colors.neutral, AVOID: colors.negative }[signal];
}

export function getSentimentColor(sentiment: SentimentType): string {
  return { bullish: colors.positive, bearish: colors.negative, neutral: colors.warning }[sentiment];
}

// Calculations
export function calculateSignal(score: number): SignalType {
  if (score >= 80) return 'BUY';
  if (score >= 60) return 'HOLD';
  if (score >= 40) return 'WATCH';
  return 'AVOID';
}

export function calculateRiskScore(probability: RiskLevel, impact: RiskLevel): number {
  const probValue = { High: 3, Medium: 2, Low: 1 }[probability];
  const impactValue = { High: 3, Medium: 2, Low: 1 }[impact];
  return probValue * impactValue;
}

// Sorting
export function sortByKey<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'desc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key], bVal = b[key];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    }
    return 0;
  });
}
