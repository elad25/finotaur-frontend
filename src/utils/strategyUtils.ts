// utils/strategyUtils.ts

/**
 * Get strategy name by ID from localStorage
 */
export function getStrategyName(strategyId: string | undefined): string {
  if (!strategyId || strategyId === 'none' || strategyId === 'create_new') {
    return 'No Strategy';
  }
  
  try {
    const stored = localStorage.getItem('finotaur_strategies');
    if (!stored) return strategyId;
    
    const strategies = JSON.parse(stored);
    const strategy = strategies.find((s: any) => s.id === strategyId);
    
    return strategy ? strategy.name : strategyId;
  } catch (e) {
    console.error('Failed to get strategy name:', e);
    return strategyId;
  }
}

/**
 * Get full strategy object by ID
 */
export function getStrategyById(strategyId: string) {
  try {
    const stored = localStorage.getItem('finotaur_strategies');
    if (!stored) return null;
    
    const strategies = JSON.parse(stored);
    return strategies.find((s: any) => s.id === strategyId);
  } catch (e) {
    console.error('Failed to get strategy:', e);
    return null;
  }
}

/**
 * Get all strategies
 */
export function getAllStrategies() {
  try {
    const stored = localStorage.getItem('finotaur_strategies');
    if (!stored) return [];
    
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to get strategies:', e);
    return [];
  }
}

/**
 * Get trades count for a strategy
 */
export function getStrategyTradesCount(strategyId: string, trades: any[]): number {
  return trades.filter(t => t.strategyId === strategyId).length;
}

/**
 * Calculate strategy statistics
 */
export function calculateStrategyStats(strategyId: string, trades: any[]) {
  const strategyTrades = trades.filter(t => t.strategyId === strategyId);
  
  if (strategyTrades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalR: 0,
      netPnL: 0,
    };
  }
  
  const winningTrades = strategyTrades.filter(t => t.resultR > 0);
  const totalR = strategyTrades.reduce((sum, t) => sum + (t.resultR || 0), 0);
  const netPnL = strategyTrades.reduce((sum, t) => sum + (t.pnlUsd || 0), 0);
  
  return {
    totalTrades: strategyTrades.length,
    winRate: (winningTrades.length / strategyTrades.length) * 100,
    totalR,
    netPnL,
  };
}