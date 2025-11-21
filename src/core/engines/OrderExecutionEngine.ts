// ============================================================================
// ORDER EXECUTION ENGINE - Trade Management & SL/TP Detection
// ============================================================================

import type { Position, Candle, TradeDirection } from '../../types';

interface ExecutionResult {
  executed: boolean;
  price: number;
  pnl: number;
  pnlPercent: number;
  reason: 'stop_loss' | 'take_profit' | 'manual';
}

interface RiskRewardResult {
  ratio: number;
  risk: number;
  reward: number;
}

interface PnLResult {
  pnl: number;
  pnlPercent: number;
}

export class OrderExecutionEngine {
  /**
   * Check if stop loss was hit on this candle
   * Returns execution details if hit, null otherwise
   */
  public checkStopLoss(position: Position, candle: Candle): ExecutionResult | null {
    if (!position.stopLoss) return null;
    
    const isLong = position.type === 'long';
    
    // For LONG: SL is hit if candle low <= stopLoss
    // For SHORT: SL is hit if candle high >= stopLoss
    const slHit = isLong
      ? candle.low <= position.stopLoss
      : candle.high >= position.stopLoss;
    
    if (!slHit) return null;
    
    // Calculate P&L at stop loss price
    const pnl = this.calculateRealizedPnL(position, position.stopLoss);
    
    return {
      executed: true,
      price: position.stopLoss,
      pnl: pnl.pnl,
      pnlPercent: pnl.pnlPercent,
      reason: 'stop_loss',
    };
  }
  
  /**
   * Check if take profit was hit on this candle
   * Returns execution details if hit, null otherwise
   */
  public checkTakeProfit(position: Position, candle: Candle): ExecutionResult | null {
    if (!position.takeProfit) return null;
    
    const isLong = position.type === 'long';
    
    // For LONG: TP is hit if candle high >= takeProfit
    // For SHORT: TP is hit if candle low <= takeProfit
    const tpHit = isLong
      ? candle.high >= position.takeProfit
      : candle.low <= position.takeProfit;
    
    if (!tpHit) return null;
    
    // Calculate P&L at take profit price
    const pnl = this.calculateRealizedPnL(position, position.takeProfit);
    
    return {
      executed: true,
      price: position.takeProfit,
      pnl: pnl.pnl,
      pnlPercent: pnl.pnlPercent,
      reason: 'take_profit',
    };
  }
  
  /**
   * Calculate realized P&L when position is closed
   */
  public calculateRealizedPnL(position: Position, exitPrice: number): PnLResult {
    const isLong = position.type === 'long';
    
    // P&L = (Exit - Entry) * Size for LONG
    // P&L = (Entry - Exit) * Size for SHORT
    const priceDiff = isLong
      ? exitPrice - position.entryPrice
      : position.entryPrice - exitPrice;
    
    const pnl = priceDiff * position.size;
    const pnlPercent = (priceDiff / position.entryPrice) * 100;
    
    return { pnl, pnlPercent };
  }
  
  /**
   * Calculate unrealized P&L for open position
   */
  public calculateUnrealizedPnL(position: Position, currentPrice: number): PnLResult {
    return this.calculateRealizedPnL(position, currentPrice);
  }
  
  /**
   * Calculate Risk:Reward ratio
   */
  public calculateRiskReward(position: Position): RiskRewardResult {
    if (!position.stopLoss || !position.takeProfit) {
      return { ratio: 0, risk: 0, reward: 0 };
    }
    
    const isLong = position.type === 'long';
    
    // Risk = distance from entry to stop loss
    const risk = isLong
      ? position.entryPrice - position.stopLoss
      : position.stopLoss - position.entryPrice;
    
    // Reward = distance from entry to take profit
    const reward = isLong
      ? position.takeProfit - position.entryPrice
      : position.entryPrice - position.takeProfit;
    
    const ratio = risk > 0 ? reward / risk : 0;
    
    // Convert to dollar amounts
    const riskAmount = Math.abs(risk * position.size);
    const rewardAmount = Math.abs(reward * position.size);
    
    return {
      ratio,
      risk: riskAmount,
      reward: rewardAmount,
    };
  }
  
  /**
   * Validate if stop loss price is valid
   */
  public validateStopLoss(position: Position, stopLoss: number): boolean {
    const isLong = position.type === 'long';
    
    // For LONG: SL must be below entry
    // For SHORT: SL must be above entry
    return isLong
      ? stopLoss < position.entryPrice
      : stopLoss > position.entryPrice;
  }
  
  /**
   * Validate if take profit price is valid
   */
  public validateTakeProfit(position: Position, takeProfit: number): boolean {
    const isLong = position.type === 'long';
    
    // For LONG: TP must be above entry
    // For SHORT: TP must be below entry
    return isLong
      ? takeProfit > position.entryPrice
      : takeProfit < position.entryPrice;
  }
  
  /**
   * Check if position should be liquidated (for leveraged trading)
   */
  public checkLiquidation(
    position: Position,
    currentPrice: number,
    leverage: number = 1
  ): boolean {
    const isLong = position.type === 'long';
    
    // Calculate liquidation price
    // For LONG: Liq Price = Entry * (1 - 1/Leverage)
    // For SHORT: Liq Price = Entry * (1 + 1/Leverage)
    const liquidationPrice = isLong
      ? position.entryPrice * (1 - 1 / leverage)
      : position.entryPrice * (1 + 1 / leverage);
    
    // Check if liquidated
    return isLong
      ? currentPrice <= liquidationPrice
      : currentPrice >= liquidationPrice;
  }
  
  /**
   * Calculate position size based on risk percentage
   */
  public calculatePositionSize(
    balance: number,
    entryPrice: number,
    stopLoss: number,
    riskPercent: number // e.g., 1 for 1%
  ): number {
    const riskAmount = balance * (riskPercent / 100);
    const priceDiff = Math.abs(entryPrice - stopLoss);
    
    if (priceDiff === 0) return 0;
    
    return riskAmount / priceDiff;
  }
  
  /**
   * Simulate slippage (for realistic backtesting)
   */
  public applySlippage(
    price: number,
    slippagePercent: number,
    direction: 'buy' | 'sell'
  ): number {
    const slippage = price * (slippagePercent / 100);
    
    // Slippage works against you
    return direction === 'buy'
      ? price + slippage  // Pay more when buying
      : price - slippage; // Receive less when selling
  }
  
  /**
   * Calculate commission/fees
   */
  public calculateCommission(
    price: number,
    size: number,
    commissionRate: number // e.g., 0.1 for 0.1%
  ): number {
    const positionValue = price * size;
    return positionValue * (commissionRate / 100);
  }
  
  /**
   * Get execution price based on order type
   */
  public getExecutionPrice(
    candle: Candle,
    orderType: 'market' | 'limit',
    limitPrice?: number,
    direction?: 'buy' | 'sell'
  ): number | null {
    switch (orderType) {
      case 'market':
        // Market orders execute at open of next candle
        return candle.open;
        
      case 'limit':
        if (!limitPrice || !direction) return null;
        
        // Limit buy: executes if candle low <= limit price
        // Limit sell: executes if candle high >= limit price
        const executed = direction === 'buy'
          ? candle.low <= limitPrice
          : candle.high >= limitPrice;
        
        return executed ? limitPrice : null;
        
      default:
        return null;
    }
  }
  
  /**
   * Check if position hit trailing stop
   */
  public checkTrailingStop(
    position: Position,
    candle: Candle,
    trailingStopPercent: number,
    highestPrice: number // Track highest price for long, lowest for short
  ): ExecutionResult | null {
    const isLong = position.type === 'long';
    
    // Calculate trailing stop price
    const trailingStop = isLong
      ? highestPrice * (1 - trailingStopPercent / 100)
      : highestPrice * (1 + trailingStopPercent / 100);
    
    // Check if hit
    const hit = isLong
      ? candle.low <= trailingStop
      : candle.high >= trailingStop;
    
    if (!hit) return null;
    
    const pnl = this.calculateRealizedPnL(position, trailingStop);
    
    return {
      executed: true,
      price: trailingStop,
      pnl: pnl.pnl,
      pnlPercent: pnl.pnlPercent,
      reason: 'stop_loss', // Trailing stop is a type of stop loss
    };
  }
  
  /**
   * Validate position parameters
   */
  public validatePosition(params: {
    type: TradeDirection;
    entryPrice: number;
    size: number;
    balance: number;
    stopLoss?: number;
    takeProfit?: number;
  }): { valid: boolean; error?: string } {
    const { type, entryPrice, size, balance, stopLoss, takeProfit } = params;
    
    // Check if price is positive
    if (entryPrice <= 0) {
      return { valid: false, error: 'Entry price must be positive' };
    }
    
    // Check if size is positive
    if (size <= 0) {
      return { valid: false, error: 'Position size must be positive' };
    }
    
    // Check if have enough balance
    const positionValue = entryPrice * size;
    if (positionValue > balance) {
      return { valid: false, error: 'Insufficient balance' };
    }
    
    // Validate stop loss if provided
    if (stopLoss !== undefined) {
      const validSL = type === 'long'
        ? stopLoss < entryPrice
        : stopLoss > entryPrice;
      
      if (!validSL) {
        return {
          valid: false,
          error: type === 'long'
            ? 'Stop loss must be below entry price for long positions'
            : 'Stop loss must be above entry price for short positions'
        };
      }
    }
    
    // Validate take profit if provided
    if (takeProfit !== undefined) {
      const validTP = type === 'long'
        ? takeProfit > entryPrice
        : takeProfit < entryPrice;
      
      if (!validTP) {
        return {
          valid: false,
          error: type === 'long'
            ? 'Take profit must be above entry price for long positions'
            : 'Take profit must be below entry price for short positions'
        };
      }
    }
    
    return { valid: true };
  }
}