// ============================================================================
// STATISTICS ENGINE - Backtest Analytics & Metrics
// ============================================================================

import type { Position, BacktestStatistics, EquityPoint, DrawdownPoint } from '../../types';

export class StatisticsEngine {
  /**
   * Calculate all backtest statistics
   */
  public calculate(
    closedPositions: Position[],
    initialBalance: number,
    currentBalance: number
  ): BacktestStatistics {
    const trades = closedPositions.filter(p => p.realizedPnl !== undefined);
    
    if (trades.length === 0) {
      return this.getEmptyStatistics();
    }
    
    // Basic counts
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => (t.realizedPnl || 0) > 0).length;
    const losingTrades = trades.filter(t => (t.realizedPnl || 0) < 0).length;
    const breakEvenTrades = trades.filter(t => t.realizedPnl === 0).length;
    
    // Win rates
    const winRate = (winningTrades / totalTrades) * 100;
    const lossRate = (losingTrades / totalTrades) * 100;
    
    // P&L calculations
    const totalPnl = trades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
    const totalPnlPercent = ((currentBalance - initialBalance) / initialBalance) * 100;
    
    const grossProfit = trades
      .filter(t => (t.realizedPnl || 0) > 0)
      .reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
    
    const grossLoss = Math.abs(
      trades
        .filter(t => (t.realizedPnl || 0) < 0)
        .reduce((sum, t) => sum + (t.realizedPnl || 0), 0)
    );
    
    const netProfit = grossProfit - grossLoss;
    
    // Averages
    const avgWin = winningTrades > 0
      ? grossProfit / winningTrades
      : 0;
    
    const avgLoss = losingTrades > 0
      ? grossLoss / losingTrades
      : 0;
    
    const avgRR = trades
      .filter(t => t.riskRewardRatio)
      .reduce((sum, t) => sum + (t.riskRewardRatio || 0), 0) / 
      trades.filter(t => t.riskRewardRatio).length || 0;
    
    const avgTradeDuration = trades.reduce((sum, t) => {
      if (t.exitTime && t.entryTime) {
        return sum + (t.exitTime - t.entryTime);
      }
      return sum;
    }, 0) / totalTrades;
    
    // Advanced metrics
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    const expectancy = totalPnl / totalTrades;
    
    // Calculate Sharpe Ratio
    const returns = trades.map(t => (t.realizedPnlPercent || 0) / 100);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    
    // Calculate drawdown
    const { maxDrawdown, maxDrawdownPercent, drawdownCurve } = 
      this.calculateDrawdown(trades, initialBalance);
    
    const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : 0;
    
    // Consecutive wins/losses
    const { maxConsecutiveWins, maxConsecutiveLosses, currentStreak } = 
      this.calculateStreaks(trades);
    
    // Largest win/loss
    const largestWin = Math.max(...trades.map(t => t.realizedPnl || 0));
    const largestLoss = Math.min(...trades.map(t => t.realizedPnl || 0));
    
    // Risk metrics
    const avgRiskAmount = trades
      .filter(t => t.riskAmount)
      .reduce((sum, t) => sum + (t.riskAmount || 0), 0) / 
      trades.filter(t => t.riskAmount).length || 0;
    
    const totalRiskTaken = trades
      .reduce((sum, t) => sum + (t.riskAmount || 0), 0);
    
    // Time-based
    const firstTradeTime = trades[0]?.entryTime || 0;
    const lastTradeTime = trades[trades.length - 1]?.exitTime || 0;
    const tradingDays = (lastTradeTime - firstTradeTime) / (24 * 60 * 60);
    const avgTradesPerDay = tradingDays > 0 ? totalTrades / tradingDays : 0;
    
    // Equity curve
    const equityCurve = this.calculateEquityCurve(trades, initialBalance);
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      breakEvenTrades,
      winRate,
      lossRate,
      totalPnl,
      totalPnlPercent,
      grossProfit,
      grossLoss,
      netProfit,
      avgWin,
      avgLoss,
      avgRR,
      avgTradeDuration,
      profitFactor,
      expectancy,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      recoveryFactor,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      currentStreak,
      largestWin,
      largestLoss,
      avgRiskAmount,
      totalRiskTaken,
      tradingDays,
      avgTradesPerDay,
      equityCurve,
      drawdownCurve,
    };
  }
  
  /**
   * Calculate Sharpe Ratio
   * Measures risk-adjusted returns
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    const variance = returns.reduce((sum, r) => {
      const diff = r - avgReturn;
      return sum + (diff * diff);
    }, 0) / (returns.length - 1);
    
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    // Annualized Sharpe Ratio (assuming daily returns)
    const sharpe = (avgReturn / stdDev) * Math.sqrt(252); // 252 trading days
    
    return sharpe;
  }
  
  /**
   * Calculate maximum drawdown
   */
  private calculateDrawdown(
    trades: Position[],
    initialBalance: number
  ): {
    maxDrawdown: number;
    maxDrawdownPercent: number;
    drawdownCurve: DrawdownPoint[];
  } {
    let balance = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    const drawdownCurve: DrawdownPoint[] = [];
    
    trades.forEach(trade => {
      balance += trade.realizedPnl || 0;
      
      if (balance > peak) {
        peak = balance;
      }
      
      const drawdown = peak - balance;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
      
      drawdownCurve.push({
        time: trade.exitTime || 0,
        drawdown,
        drawdownPercent,
        inDrawdown: drawdown > 0,
      });
    });
    
    return { maxDrawdown, maxDrawdownPercent, drawdownCurve };
  }
  
  /**
   * Calculate consecutive win/loss streaks
   */
  private calculateStreaks(trades: Position[]): {
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
    currentStreak: number;
  } {
    let maxWins = 0;
    let maxLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;
    let currentStreak = 0;
    
    trades.forEach((trade, index) => {
      const pnl = trade.realizedPnl || 0;
      
      if (pnl > 0) {
        currentWins++;
        currentLosses = 0;
        if (currentWins > maxWins) maxWins = currentWins;
      } else if (pnl < 0) {
        currentLosses++;
        currentWins = 0;
        if (currentLosses > maxLosses) maxLosses = currentLosses;
      } else {
        currentWins = 0;
        currentLosses = 0;
      }
      
      // Calculate current streak at end
      if (index === trades.length - 1) {
        currentStreak = currentWins > 0 ? currentWins : -currentLosses;
      }
    });
    
    return {
      maxConsecutiveWins: maxWins,
      maxConsecutiveLosses: maxLosses,
      currentStreak,
    };
  }
  
  /**
   * Calculate equity curve over time
   */
  private calculateEquityCurve(
    trades: Position[],
    initialBalance: number
  ): EquityPoint[] {
    const curve: EquityPoint[] = [{
      time: trades[0]?.entryTime || 0,
      balance: initialBalance,
      equity: initialBalance,
      drawdown: 0,
    }];
    
    let balance = initialBalance;
    let peak = initialBalance;
    
    trades.forEach(trade => {
      balance += trade.realizedPnl || 0;
      
      if (balance > peak) {
        peak = balance;
      }
      
      const drawdown = peak - balance;
      
      curve.push({
        time: trade.exitTime || 0,
        balance,
        equity: balance,
        drawdown,
      });
    });
    
    return curve;
  }
  
  /**
   * Get empty statistics (when no trades)
   */
  private getEmptyStatistics(): BacktestStatistics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      lossRate: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      avgWin: 0,
      avgLoss: 0,
      avgRR: 0,
      avgTradeDuration: 0,
      profitFactor: 0,
      expectancy: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      recoveryFactor: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      currentStreak: 0,
      largestWin: 0,
      largestLoss: 0,
      avgRiskAmount: 0,
      totalRiskTaken: 0,
      tradingDays: 0,
      avgTradesPerDay: 0,
      equityCurve: [],
      drawdownCurve: [],
    };
  }
  
  /**
   * Calculate monthly breakdown
   */
  public calculateMonthlyStats(trades: Position[]): Array<{
    month: string;
    trades: number;
    pnl: number;
    winRate: number;
  }> {
    const monthlyMap = new Map<string, Position[]>();
    
    trades.forEach(trade => {
      const date = new Date((trade.exitTime || 0) * 1000);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, []);
      }
      monthlyMap.get(monthKey)!.push(trade);
    });
    
    const monthlyStats: Array<{
      month: string;
      trades: number;
      pnl: number;
      winRate: number;
    }> = [];
    
    monthlyMap.forEach((monthTrades, month) => {
      const pnl = monthTrades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
      const wins = monthTrades.filter(t => (t.realizedPnl || 0) > 0).length;
      const winRate = (wins / monthTrades.length) * 100;
      
      monthlyStats.push({
        month,
        trades: monthTrades.length,
        pnl,
        winRate,
      });
    });
    
    return monthlyStats.sort((a, b) => a.month.localeCompare(b.month));
  }
}