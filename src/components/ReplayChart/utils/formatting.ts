// utils/formatting.ts - UPDATED WITH SIDE ENUM SUPPORT

/**
 * ===================================
 * FORMATTING UTILITIES
 * Price, number, date formatting
 * ===================================
 */

import { Side } from '../types';

/**
 * Format price with appropriate decimals
 */
export const formatPrice = (
  price: number,
  decimals: number = 2,
  symbol: string = '$'
): string => {
  return `${symbol}${price.toFixed(decimals)}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (
  value: number,
  decimals: number = 2,
  includeSign: boolean = true
): string => {
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatLargeNumber = (num: number, decimals: number = 1): string => {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(decimals)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(decimals)}K`;
  }
  return num.toFixed(decimals);
};

/**
 * Format P&L with color class
 */
export const formatPnL = (
  pnl: number,
  decimals: number = 2
): { text: string; colorClass: string } => {
  const sign = pnl > 0 ? '+' : '';
  const text = `${sign}$${pnl.toFixed(decimals)}`;
  const colorClass = pnl >= 0 ? 'text-green-600' : 'text-red-600';
  
  return { text, colorClass };
};

/**
 * Format timestamp to readable date
 */
export const formatDate = (
  timestamp: number,
  includeTime: boolean = true
): string => {
  const date = new Date(timestamp * 1000);
  
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (!includeTime) return dateStr;

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateStr} ${timeStr}`;
};

/**
 * Format duration in milliseconds to readable string
 */
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

/**
 * Format volume
 */
export const formatVolume = (volume: number): string => {
  return formatLargeNumber(volume, 2);
};

/**
 * Get color for P&L value
 */
export const getPnLColor = (pnl: number, isDark: boolean = true): string => {
  if (pnl >= 0) {
    return isDark ? '#10B981' : '#059669'; // green
  }
  return isDark ? '#EF4444' : '#DC2626'; // red
};

/**
 * Format side (long/short) with color - ✅ UPDATED TO SUPPORT SIDE ENUM
 */
export const formatSide = (
  side: Side | 'long' | 'short'
): { text: string; colorClass: string } => {
  // Convert enum to string if needed
  const sideStr = side === Side.BUY ? 'long' : side === Side.SELL ? 'short' : side;
  
  if (sideStr === 'long') {
    return {
      text: 'LONG',
      colorClass: 'text-green-600',
    };
  }
  
  return {
    text: 'SHORT',
    colorClass: 'text-red-600',
  };
};

/**
 * Abbreviate symbol (remove USDT, BUSD, etc.)
 */
export const abbreviateSymbol = (symbol: string): string => {
  return symbol
    .replace(/USDT$/, '')
    .replace(/BUSD$/, '')
    .replace(/USD$/, '')
    .replace(/BTC$/, '');
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number, decimals: number = 0): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format time from seconds to HH:MM:SS
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

/**
 * Format risk-reward ratio
 */
export const formatRiskReward = (rr: number): string => {
  return `${rr.toFixed(2)}R`;
};

/**
 * Calculate and format change
 */
export const calculateChange = (
  current: number,
  previous: number
): { value: number; percentage: number; text: string; colorClass: string } => {
  const value = current - previous;
  const percentage = previous !== 0 ? (value / previous) * 100 : 0;
  const sign = value >= 0 ? '+' : '';
  
  return {
    value,
    percentage,
    text: `${sign}${value.toFixed(2)} (${sign}${percentage.toFixed(2)}%)`,
    colorClass: value >= 0 ? 'text-green-600' : 'text-red-600',
  };
};