// src/hooks/usePortfolioTracking.ts
// 🚀 Automatic Portfolio Tracking Hook
// Monitors trades and updates portfolio dynamically
// ✅ FIXED: Uses useRiskSettings hook instead of direct functions

import { useEffect, useRef } from 'react';
import { useTrades } from './useTradesData';
import { useRiskSettings } from '@/hooks/useRiskSettings';

interface UsePortfolioTrackingOptions {
  enabled?: boolean; // Enable/disable tracking
  autoRecalculate?: boolean; // Recalculate on mount
}

/**
 * Hook that automatically tracks portfolio changes from trades
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isTracking, currentPortfolio } = usePortfolioTracking();
 *   return <div>Portfolio: ${currentPortfolio}</div>
 * }
 * ```
 */
export function usePortfolioTracking(options: UsePortfolioTrackingOptions = {}) {
  const { enabled = true, autoRecalculate = true } = options;
  const { data: trades = [], isLoading } = useTrades();
  const previousTradesRef = useRef<any[]>([]);
  const hasRecalculatedRef = useRef(false);

  // ✅ Get current risk settings from hook
  const { settings, updateSettings } = useRiskSettings();
  const isTracking = settings.isDynamic && enabled;

  // 🔥 FEATURE 1: Auto-recalculate portfolio on mount (if enabled)
  useEffect(() => {
    if (!autoRecalculate || !isTracking || isLoading || hasRecalculatedRef.current) {
      return;
    }

    // Get all closed trades with P&L
    const closedTrades = trades.filter(
      trade => trade.exit_price && trade.pnl !== undefined && trade.pnl !== null
    );

    if (closedTrades.length > 0) {
      console.log('🔄 Auto-recalculating portfolio from', closedTrades.length, 'closed trades');
      
      // Calculate total P&L
      const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      // Update portfolio
      updateSettings({
        currentPortfolio: settings.initialPortfolio + totalPnL,
        totalPnL: totalPnL,
        tradeCount: closedTrades.length,
      });
      
      hasRecalculatedRef.current = true;
    }
  }, [trades, isTracking, isLoading, autoRecalculate, settings.initialPortfolio, updateSettings]);

  // 🔥 FEATURE 2: Detect new closed trades and update portfolio
  useEffect(() => {
    if (!isTracking || isLoading) {
      return;
    }

    // Get all closed trades
    const closedTrades = trades.filter(
      trade => trade.exit_price && trade.pnl !== undefined && trade.pnl !== null
    );

    // Get previous closed trades
    const previousClosedTrades = previousTradesRef.current.filter(
      trade => trade.exit_price && trade.pnl !== undefined && trade.pnl !== null
    );

    // Find newly closed trades
    const newClosedTrades = closedTrades.filter(
      trade => !previousClosedTrades.some(prev => prev.id === trade.id)
    );

    // Update portfolio for each new closed trade
    if (newClosedTrades.length > 0) {
      console.log('💰 Detected', newClosedTrades.length, 'new closed trade(s)');
      
      // Calculate P&L from new trades
      const newPnL = newClosedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      // Update portfolio
      updateSettings({
        currentPortfolio: settings.currentPortfolio + newPnL,
        totalPnL: settings.totalPnL + newPnL,
        tradeCount: (settings.tradeCount || 0) + newClosedTrades.length,
      });
      
      newClosedTrades.forEach(trade => {
        console.log('📊 Updated portfolio from trade:', {
          id: trade.id,
          symbol: trade.symbol,
          pnl: trade.pnl
        });
      });
    }

    // Update reference
    previousTradesRef.current = trades;
  }, [trades, isTracking, isLoading, settings, updateSettings]);

  // 🔥 FEATURE 3: Return useful data
  return {
    isTracking,
    currentPortfolio: settings.currentPortfolio || settings.portfolioSize,
    initialPortfolio: settings.initialPortfolio || settings.portfolioSize,
    totalPnL: settings.totalPnL || 0,
    tradeCount: settings.tradeCount || 0,
    portfolioChange: settings.totalPnL || 0,
    portfolioChangePercent: settings.initialPortfolio 
      ? ((settings.totalPnL || 0) / settings.initialPortfolio) * 100
      : 0
  };
}

/**
 * Simple hook to just get current portfolio info without tracking
 */
export function useCurrentPortfolio() {
  const { settings } = useRiskSettings();
  
  return {
    currentPortfolio: settings.currentPortfolio || settings.portfolioSize,
    initialPortfolio: settings.initialPortfolio || settings.portfolioSize,
    totalPnL: settings.totalPnL || 0,
    tradeCount: settings.tradeCount || 0,
    isDynamic: settings.isDynamic || false
  };
}