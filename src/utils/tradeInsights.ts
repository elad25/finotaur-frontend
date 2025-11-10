// src/utils/tradeInsights.ts

import { Trade } from '@/lib/journal';

interface TradeInsight {
  icon: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  showConfetti: boolean;
}

/**
 * Calculate current streak (consecutive wins or losses)
 */
function calculateStreak(trades: Trade[]): { type: 'WIN' | 'LOSS' | null; count: number } {
  if (trades.length === 0) return { type: null, count: 0 };

  const closedTrades = trades
    .filter(t => t.outcome && t.outcome !== 'OPEN')
    .sort((a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime());

  if (closedTrades.length === 0) return { type: null, count: 0 };

  const lastOutcome = closedTrades[0].outcome;
  let count = 0;

  for (const trade of closedTrades) {
    if (trade.outcome === lastOutcome) {
      count++;
    } else {
      break;
    }
  }

  return { type: lastOutcome === 'WIN' ? 'WIN' : 'LOSS', count };
}

/**
 * Calculate average R:R from past trades
 */
function calculateAvgRR(trades: Trade[]): number {
  const tradesWithRR = trades.filter(t => t.metrics?.rr && t.metrics.rr > 0);
  if (tradesWithRR.length === 0) return 0;

  const totalRR = tradesWithRR.reduce((sum, t) => sum + (t.metrics?.rr || 0), 0);
  return totalRR / tradesWithRR.length;
}

/**
 * Calculate win rate
 */
function calculateWinRate(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.outcome && t.outcome !== 'OPEN');
  if (closedTrades.length === 0) return 0;

  const wins = closedTrades.filter(t => t.outcome === 'WIN').length;
  return (wins / closedTrades.length) * 100;
}

/**
 * Calculate win rate for last N trades
 */
function calculateRecentWinRate(trades: Trade[], lastN: number = 20): number {
  const closedTrades = trades
    .filter(t => t.outcome && t.outcome !== 'OPEN')
    .sort((a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime())
    .slice(0, lastN);

  if (closedTrades.length === 0) return 0;

  const wins = closedTrades.filter(t => t.outcome === 'WIN').length;
  return (wins / closedTrades.length) * 100;
}

/**
 * Check if win rate is improving
 */
function isWinRateImproving(trades: Trade[]): { improving: boolean; oldRate: number; newRate: number } {
  const closedTrades = trades
    .filter(t => t.outcome && t.outcome !== 'OPEN')
    .sort((a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime());

  if (closedTrades.length < 30) {
    return { improving: false, oldRate: 0, newRate: 0 };
  }

  const last20 = closedTrades.slice(0, 20);
  const previous20 = closedTrades.slice(20, 40);

  const newRate = (last20.filter(t => t.outcome === 'WIN').length / last20.length) * 100;
  const oldRate = (previous20.filter(t => t.outcome === 'WIN').length / previous20.length) * 100;

  return {
    improving: newRate > oldRate + 3, // At least 3% improvement
    oldRate,
    newRate,
  };
}

/**
 * Calculate if current trade R:R is above average
 */
function isRRAboveAverage(currentRR: number, avgRR: number): { isAbove: boolean; improvement: number } {
  if (avgRR === 0) return { isAbove: false, improvement: 0 };
  
  const improvement = ((currentRR - avgRR) / avgRR) * 100;
  return {
    isAbove: currentRR > avgRR * 1.2, // At least 20% better
    improvement,
  };
}

/**
 * Check if trader is profitable long-term with their stats
 */
function isProfitableLongTerm(winRate: number, avgRR: number): boolean {
  if (avgRR === 0) return false;
  
  // Required win rate = 1 / (R:R + 1)
  const requiredWinRate = (1 / (avgRR + 1)) * 100;
  return winRate >= requiredWinRate;
}

/**
 * Generate smart insight based on trade outcome and trader's history
 */
export function generateTradeInsight(
  currentTrade: Partial<Trade>,
  allTrades: Trade[],
  pnl: number
): TradeInsight {
  const currentRR = currentTrade.metrics?.rr || 0;
  const avgRR = calculateAvgRR(allTrades);
  const winRate = calculateWinRate(allTrades);
  const streak = calculateStreak(allTrades);
  const winRateProgress = isWinRateImproving(allTrades);
  const rrComparison = isRRAboveAverage(currentRR, avgRR);

  // ============================================
  // WINNING TRADE SCENARIOS
  // ============================================
  
  if (pnl > 0) {
    
    // 🔥 HOT STREAK - 3+ wins in a row
    if (streak.type === 'WIN' && streak.count >= 2) { // Will be 3 after this trade
      const totalStreak = streak.count + 1;
      return {
        icon: '🔥',
        title: `${totalStreak} WINS IN A ROW!`,
        message: `+$${pnl.toFixed(2)} | Total Streak: ${totalStreak}W\nYou're in the zone! Stay disciplined and protect these gains.\nDon't let success lead to overtrading.`,
        type: 'success',
        showConfetti: true,
      };
    }

    // 🚀 EXCEPTIONAL R:R - Way above average
    if (avgRR > 0 && rrComparison.isAbove) {
      return {
        icon: '🚀',
        title: `EXCEPTIONAL! +$${pnl.toFixed(2)}`,
        message: `R:R: ${currentRR.toFixed(2)}:1 | Your Average: ${avgRR.toFixed(2)}:1\nThis is ${rrComparison.improvement.toFixed(0)}% better than your usual!\nYou're hunting A+ setups. Keep this standard.`,
        type: 'success',
        showConfetti: true,
      };
    }

    // 📈 WIN RATE IMPROVING
    if (winRateProgress.improving) {
      return {
        icon: '📈',
        title: `WINNER! +$${pnl.toFixed(2)}`,
        message: `Win Rate: ${winRateProgress.oldRate.toFixed(0)}% → ${winRateProgress.newRate.toFixed(0)}% (Last 20 trades)\nYou're adapting and improving!\nConsistency compounds into profits.`,
        type: 'success',
        showConfetti: true,
      };
    }

    // ✨ STANDARD WIN
    return {
      icon: '✨',
      title: `WINNER! +$${pnl.toFixed(2)}`,
      message: `R:R: ${currentRR.toFixed(2)}:1 | Win Rate: ${winRate.toFixed(0)}%\nYou executed your plan. This is how pros trade.\nDiscipline over emotion, every time.`,
      type: 'success',
      showConfetti: true,
    };
  }

  // ============================================
  // LOSING TRADE SCENARIOS
  // ============================================

  // 😰 LOSING STREAK - 3+ losses
  if (streak.type === 'LOSS' && streak.count >= 2) { // Will be 3 after this trade
    const totalStreak = streak.count + 1;
    const requiredWinRate = avgRR > 0 ? ((1 / (avgRR + 1)) * 100).toFixed(0) : '40';
    
    return {
      icon: '💙',
      title: `Loss: -$${Math.abs(pnl).toFixed(2)}`,
      message: `Streak: ${totalStreak}L | Your Win Rate: ${winRate.toFixed(0)}%\nEven with ${winRate.toFixed(0)}% win rate, streaks happen.\nWith R:R ${avgRR.toFixed(2)}:1, you only need ${requiredWinRate}% to profit.\n\nTake a break. Review your rules. Come back stronger.`,
      type: 'info',
      showConfetti: false,
    };
  }

  // 💪 LOSS BUT PROFITABLE LONG-TERM
  if (isProfitableLongTerm(winRate, avgRR) && avgRR >= 2) {
    const requiredWinRate = ((1 / (avgRR + 1)) * 100).toFixed(0);
    
    return {
      icon: '💪',
      title: `Loss: -$${Math.abs(pnl).toFixed(2)}`,
      message: `R:R: ${currentRR.toFixed(2)}:1 | Your Win Rate: ${winRate.toFixed(0)}%\nWith R:R ${avgRR.toFixed(2)}:1, you only need ${requiredWinRate}% to be profitable.\n\nYou're ${(winRate - parseFloat(requiredWinRate)).toFixed(0)}% above breakeven. Math is on your side.\nThis loss is just variance. Trust your process.`,
      type: 'info',
      showConfetti: false,
    };
  }

  // ⚠️ LOW R:R - Below their average
  if (avgRR > 0 && currentRR < avgRR * 0.7) {
    return {
      icon: '⚠️',
      title: `Loss: -$${Math.abs(pnl).toFixed(2)}`,
      message: `R:R: ${currentRR.toFixed(2)}:1 | Your Average: ${avgRR.toFixed(2)}:1\nThis was ${((1 - currentRR / avgRR) * 100).toFixed(0)}% below your standard.\n\nTrust your process. Wait for A+ setups.\nYou know what works - stick to your rules.`,
      type: 'warning',
      showConfetti: false,
    };
  }

  // ⚠️ LOW R:R - Absolute (for new traders)
  if (currentRR < 1.5) {
    return {
      icon: '⚠️',
      title: `Loss: -$${Math.abs(pnl).toFixed(2)}`,
      message: `R:R: ${currentRR.toFixed(2)}:1 - This is below optimal.\n💡 Next time: Wait for setups with at least 2:1 R:R.\n\nWith low R:R, you need high win rate (65%+) to profit.\nBe patient. Quality over quantity.`,
      type: 'warning',
      showConfetti: false,
    };
  }

  // 💙 GOOD TRADE, UNLUCKY OUTCOME
  if (currentRR >= 2) {
    const requiredWinRate = ((1 / (currentRR + 1)) * 100).toFixed(0);
    
    return {
      icon: '💙',
      title: `Loss: -$${Math.abs(pnl).toFixed(2)}`,
      message: `R:R: ${currentRR.toFixed(2)}:1 - Excellent planning!\nWith this R:R, you only need ${requiredWinRate}% win rate to profit.\n\nYou did everything right. Losses are part of trading.\nStay patient. Your edge will play out.`,
      type: 'info',
      showConfetti: false,
    };
  }

  // 💪 DEFAULT ENCOURAGING MESSAGE
  return {
    icon: '💪',
    title: `Loss: -$${Math.abs(pnl).toFixed(2)}`,
    message: `R:R: ${currentRR.toFixed(2)}:1 | Win Rate: ${winRate.toFixed(0)}%\nTrading is a marathon, not a sprint.\n\nEvery professional trader has losses.\nYour discipline will compound over time.`,
    type: 'info',
    showConfetti: false,
  };
}