// trading/PaperTradingEngine.ts - COMPLETE ENGINE WITH UPDATED POSITION STRUCTURE
import {
  Order,
  OrderType,
  OrderStatus,
  Position,
  TradeResult,
  Side,
  CandlestickData,
} from '../types';

export interface BacktestStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  grossProfit: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  totalR: number;
  averageR: number;
  openPositions: number;
  currentBalance: number;
  currentEquity: number;
}

export class PaperTradingEngine {
  private initialBalance: number;
  private currentBalance: number;
  private leverage: number;
  private positions: Map<string, Position> = new Map();
  private closedTrades: TradeResult[] = [];
  private pendingOrders: Map<string, Order> = new Map();
  private maxEquity: number;
  private maxDrawdown: number = 0;
  private maxDrawdownPercent: number = 0;

  constructor(initialBalance: number = 10000, leverage: number = 1) {
    this.initialBalance = initialBalance;
    this.currentBalance = initialBalance;
    this.leverage = leverage;
    this.maxEquity = initialBalance;
  }

  // ===================================
  // ORDER EXECUTION
  // ===================================

  executeMarketOrder(order: Order, currentCandle: CandlestickData): void {
    const entryPrice = currentCandle.close;
    const positionId = `POS-${Date.now()}`;

    const position: Position = {
      positionId,
      id: positionId,  // ✅ Alias for UI compatibility
      symbol: order.symbol,
      side: order.side,
      size: order.size,
      entryPrice,
      entryTime: currentCandle.time as number,
      stopLoss: order.stopLoss || null,
      takeProfit: order.takeProfit || null,
      initialRisk: order.initialRisk || null,
      currentPnL: 0,
      currentPnLPercent: 0,
      unrealizedPnL: 0,     // ✅ Unrealized P&L (capital L)
      unrealizedPnl: 0,     // ✅ Unrealized P&L (lowercase l) - alias
      pips: 0,
    };

    this.positions.set(positionId, position);
    console.log(`✅ Market order executed: ${order.side} ${order.size} @ ${entryPrice}`);
  }

  placeLimitOrder(order: Order): void {
    this.pendingOrders.set(order.orderId, order);
    console.log(`📝 Limit order placed: ${order.side} ${order.size} @ ${order.price}`);
  }

  // ===================================
  // POSITION MANAGEMENT
  // ===================================

  updatePositions(currentCandle: CandlestickData): void {
    const currentPrice = currentCandle.close;
    const currentTime = currentCandle.time as number;

    // Check pending limit orders
    this.checkPendingOrders(currentCandle);

    // Update open positions and check SL/TP
    this.positions.forEach((position) => {
      // Calculate current P&L
      const priceDiff = position.side === Side.BUY
        ? currentPrice - position.entryPrice
        : position.entryPrice - currentPrice;

      position.currentPnL = priceDiff * position.size;
      position.currentPnLPercent = (priceDiff / position.entryPrice) * 100;
      position.pips = priceDiff;
      
      // ✅ Set both variants of unrealized P&L
      position.unrealizedPnL = position.currentPnL;
      position.unrealizedPnl = position.currentPnL;

      // Check Stop Loss
      if (position.stopLoss !== null) {
        const slHit = position.side === Side.BUY
          ? currentPrice <= position.stopLoss
          : currentPrice >= position.stopLoss;

        if (slHit) {
          this.closePosition(position.positionId, position.stopLoss, currentTime, 'SL');
          return;
        }
      }

      // Check Take Profit
      if (position.takeProfit !== null) {
        const tpHit = position.side === Side.BUY
          ? currentPrice >= position.takeProfit
          : currentPrice <= position.takeProfit;

        if (tpHit) {
          this.closePosition(position.positionId, position.takeProfit, currentTime, 'TP');
          return;
        }
      }
    });

    // Update equity and drawdown
    this.updateEquityAndDrawdown();
  }

  closePosition(
    positionId: string,
    exitPrice: number,
    exitTime: number,
    reason: 'SL' | 'TP' | 'MARKET' = 'MARKET'
  ): void {
    const position = this.positions.get(positionId);
    if (!position) return;

    const priceDiff = position.side === Side.BUY
      ? exitPrice - position.entryPrice
      : position.entryPrice - exitPrice;

    const pnl = priceDiff * position.size;
    const pnlPercent = (priceDiff / position.entryPrice) * 100;
    const rMultiple = position.initialRisk 
      ? pnl / position.initialRisk 
      : 0;

    const trade: TradeResult = {
      positionId,
      symbol: position.symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice,
      entryTime: position.entryTime,
      exitTime,
      size: position.size,
      pnl,
      pnlPercent,
      rMultiple,
      reason,
    };

    this.closedTrades.push(trade);
    this.currentBalance += pnl;
    this.positions.delete(positionId);

    console.log(`🔒 Position closed: ${reason} | P&L: $${pnl.toFixed(2)}`);
  }

  closeAllPositions(currentPrice: number, currentTime: number): void {
    const positionIds = Array.from(this.positions.keys());
    positionIds.forEach((id) => {
      this.closePosition(id, currentPrice, currentTime, 'MARKET');
    });
  }

  // ===================================
  // PENDING ORDERS
  // ===================================

  private checkPendingOrders(currentCandle: CandlestickData): void {
    this.pendingOrders.forEach((order, orderId) => {
      const shouldFill = 
        (order.side === Side.BUY && currentCandle.low <= order.price) ||
        (order.side === Side.SELL && currentCandle.high >= order.price);

      if (shouldFill) {
        this.executeMarketOrder(order, currentCandle);
        this.pendingOrders.delete(orderId);
      }
    });
  }

  // ===================================
  // EQUITY & DRAWDOWN
  // ===================================

  private updateEquityAndDrawdown(): void {
    let totalPositionPnL = 0;
    this.positions.forEach((pos) => {
      totalPositionPnL += pos.currentPnL;
    });

    const currentEquity = this.currentBalance + totalPositionPnL;

    if (currentEquity > this.maxEquity) {
      this.maxEquity = currentEquity;
    }

    const drawdown = this.maxEquity - currentEquity;
    const drawdownPercent = (drawdown / this.maxEquity) * 100;

    if (drawdown > this.maxDrawdown) {
      this.maxDrawdown = drawdown;
    }

    if (drawdownPercent > this.maxDrawdownPercent) {
      this.maxDrawdownPercent = drawdownPercent;
    }
  }

  // ===================================
  // GETTERS
  // ===================================

  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getTrades(): TradeResult[] {
    return this.closedTrades;
  }

  getStats(): BacktestStatistics {
    const winningTrades = this.closedTrades.filter(t => t.pnl > 0);
    const losingTrades = this.closedTrades.filter(t => t.pnl < 0);

    const totalTrades = this.closedTrades.length;
    const wins = winningTrades.length;
    const losses = losingTrades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const totalPnl = this.currentBalance - this.initialBalance;
    const totalPnlPercent = (totalPnl / this.initialBalance) * 100;

    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;

    const bestTrade = totalTrades > 0 
      ? Math.max(...this.closedTrades.map(t => t.pnl))
      : 0;
    const worstTrade = totalTrades > 0 
      ? Math.min(...this.closedTrades.map(t => t.pnl))
      : 0;

    const totalR = this.closedTrades.reduce((sum, t) => sum + t.rMultiple, 0);
    const averageR = totalTrades > 0 ? totalR / totalTrades : 0;

    let currentEquity = this.currentBalance;
    this.positions.forEach((pos) => {
      currentEquity += pos.currentPnL;
    });

    return {
      totalTrades,
      winningTrades: wins,
      losingTrades: losses,
      winRate,
      totalPnl,
      totalPnlPercent,
      profitFactor,
      maxDrawdown: this.maxDrawdown,
      maxDrawdownPercent: this.maxDrawdownPercent,
      grossProfit,
      grossLoss,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      totalR,
      averageR,
      openPositions: this.positions.size,
      currentBalance: this.currentBalance,
      currentEquity,
    };
  }

  reset(): void {
    this.currentBalance = this.initialBalance;
    this.positions.clear();
    this.closedTrades = [];
    this.pendingOrders.clear();
    this.maxEquity = this.initialBalance;
    this.maxDrawdown = 0;
    this.maxDrawdownPercent = 0;
  }
}