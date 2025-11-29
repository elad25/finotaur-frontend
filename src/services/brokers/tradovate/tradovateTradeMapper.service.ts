// src/services/brokers/tradovate/tradovateTradeMapper.service.ts
// 🎯 Service for pairing Tradovate fills and converting to Finotaur trade format
// ✅ V2.0 - Fixed: side values are now UPPERCASE ('LONG'/'SHORT') to match DB constraint

import {
  TradovateFill,
  TradovateContract,
  TradovateProduct,
  TradovatePosition
} from '@/types/brokers/tradovate/tradovate.types';

// ============================================================================
// TYPES
// ============================================================================

export interface FinotaurTradeData {
  user_id: string;
  symbol: string;
  asset_class: 'futures';
  side: 'LONG' | 'SHORT';  // ✅ FIXED: UPPERCASE to match DB constraint
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  stop_price: number;
  fees: number;
  fees_mode: 'auto';
  open_at: string;           // ISO timestamp
  close_at: string | null;   // ISO timestamp
  pnl: number | null;
  broker: 'tradovate';
  external_id: string;       // Unique ID for deduplication
  multiplier: number;
  import_source: 'tradovate';
  imported_at: string;
  // Calculated fields
  risk_pts?: number;
  reward_pts?: number;
  risk_usd?: number;
  reward_usd?: number;
  actual_r?: number;
  // Optional broker metadata
  broker_connection_id?: string;
  broker_account_id?: string;
  broker_trade_id?: string;
  contract_name?: string;
  synced_at?: string;
  sync_source?: string;
  raw_data?: Record<string, unknown>;
}

export interface PairedTrade {
  entryFill: TradovateFill;
  exitFill: TradovateFill | null;
  contract: TradovateContract;
  product: TradovateProduct;
  direction: 'long' | 'short';  // Internal use - lowercase
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  isClosed: boolean;
}

interface FillWithDetails extends TradovateFill {
  contract: TradovateContract;
  product: TradovateProduct;
}

// ============================================================================
// TRADE MAPPER SERVICE
// ============================================================================

class TradovateTradeMapperService {
  
  /**
   * 🎯 Main function: Convert Tradovate fills to Finotaur trades
   * Groups and pairs fills by contract, calculates P&L with correct multiplier
   */
  public pairFillsToTrades(
    fills: FillWithDetails[],
    existingExternalIds: Set<string> = new Set()
  ): PairedTrade[] {
    const pairedTrades: PairedTrade[] = [];
    
    // Group fills by contractId
    const fillsByContract = this.groupFillsByContract(fills);
    
    for (const [contractId, contractFills] of fillsByContract) {
      // Sort by timestamp
      const sortedFills = contractFills.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Pair fills using FIFO method
      const pairs = this.pairFillsFIFO(sortedFills, existingExternalIds);
      pairedTrades.push(...pairs);
    }
    
    return pairedTrades;
  }

  /**
   * Group fills by contract ID
   */
  private groupFillsByContract(fills: FillWithDetails[]): Map<number, FillWithDetails[]> {
    const groups = new Map<number, FillWithDetails[]>();
    
    for (const fill of fills) {
      const contractId = fill.contractId;
      if (!groups.has(contractId)) {
        groups.set(contractId, []);
      }
      groups.get(contractId)!.push(fill);
    }
    
    return groups;
  }

  /**
   * 🔄 Pair fills using FIFO (First In, First Out) method
   * Entry: Buy for Long, Sell for Short
   * Exit: Sell for Long, Buy for Short
   */
  private pairFillsFIFO(
    fills: FillWithDetails[],
    existingExternalIds: Set<string>
  ): PairedTrade[] {
    const pairs: PairedTrade[] = [];
    
    // Track open positions
    const openLongs: FillWithDetails[] = [];
    const openShorts: FillWithDetails[] = [];
    
    for (const fill of fills) {
      const externalId = this.generateExternalId(fill);
      
      // Skip if already imported
      if (existingExternalIds.has(externalId)) {
        console.log(`⏭️ Skipping already imported fill: ${externalId}`);
        continue;
      }
      
      if (fill.action === 'Buy') {
        // Check if this closes a short position
        if (openShorts.length > 0) {
          const entryFill = openShorts.shift()!;
          const pair = this.createPairedTrade(entryFill, fill, 'short');
          pairs.push(pair);
        } else {
          // Opens a new long position
          openLongs.push(fill);
        }
      } else {
        // Sell
        // Check if this closes a long position
        if (openLongs.length > 0) {
          const entryFill = openLongs.shift()!;
          const pair = this.createPairedTrade(entryFill, fill, 'long');
          pairs.push(pair);
        } else {
          // Opens a new short position
          openShorts.push(fill);
        }
      }
    }
    
    // Handle remaining open positions (not closed yet)
    for (const fill of openLongs) {
      pairs.push(this.createPairedTrade(fill, null, 'long'));
    }
    for (const fill of openShorts) {
      pairs.push(this.createPairedTrade(fill, null, 'short'));
    }
    
    return pairs;
  }

  /**
   * Create a paired trade object
   */
  private createPairedTrade(
    entryFill: FillWithDetails,
    exitFill: FillWithDetails | null,
    direction: 'long' | 'short'
  ): PairedTrade {
    const multiplier = entryFill.product.valuePerPoint;
    const quantity = entryFill.qty;
    
    let pnl: number | null = null;
    
    if (exitFill) {
      const priceDiff = direction === 'long'
        ? exitFill.price - entryFill.price
        : entryFill.price - exitFill.price;
      
      // 🎯 CRITICAL: Correct P&L calculation with multiplier
      pnl = priceDiff * quantity * multiplier;
    }
    
    return {
      entryFill,
      exitFill,
      contract: entryFill.contract,
      product: entryFill.product,
      direction,
      quantity,
      entryPrice: entryFill.price,
      exitPrice: exitFill?.price ?? null,
      pnl,
      isClosed: exitFill !== null
    };
  }

  /**
   * 🔄 Convert paired trade to Finotaur database format
   * ✅ FIXED: side is now UPPERCASE ('LONG'/'SHORT') to match DB constraint
   */
  public convertToFinotaurTrade(
    pairedTrade: PairedTrade,
    userId: string,
    brokerConnectionId?: string,
    brokerAccountId?: string
  ): FinotaurTradeData {
    const { entryFill, exitFill, contract, product, direction, quantity, pnl } = pairedTrade;
    
    // Generate unique external ID for deduplication
    const externalId = this.generateTradeExternalId(pairedTrade);
    
    // Parse timestamps
    const openAt = new Date(entryFill.timestamp).toISOString();
    const closeAt = exitFill ? new Date(exitFill.timestamp).toISOString() : null;
    
    // Get multiplier (valuePerPoint is the $ value per point movement)
    const multiplier = product.valuePerPoint;
    
    // Estimate stop price (if not available, use 2% from entry)
    // This is a placeholder - ideally should come from order data
    const stopDistance = entryFill.price * 0.02;
    const stopPrice = direction === 'long'
      ? entryFill.price - stopDistance
      : entryFill.price + stopDistance;
    
    // Calculate risk metrics
    const riskPts = Math.abs(entryFill.price - stopPrice);
    const riskUsd = riskPts * quantity * multiplier;
    
    let rewardPts: number | undefined;
    let rewardUsd: number | undefined;
    let actualR: number | undefined;
    
    if (exitFill && pnl !== null) {
      rewardPts = Math.abs(exitFill.price - entryFill.price);
      rewardUsd = Math.abs(pnl);
      actualR = riskUsd > 0 ? pnl / riskUsd : undefined;
    }
    
    // ✅ CRITICAL FIX: Convert direction to UPPERCASE for DB constraint
    // DB expects: CHECK (side IN ('LONG', 'SHORT'))
    const sideUppercase: 'LONG' | 'SHORT' = direction.toUpperCase() as 'LONG' | 'SHORT';
    
    const now = new Date().toISOString();
    
    return {
      user_id: userId,
      symbol: contract.name,
      asset_class: 'futures',
      side: sideUppercase,  // ✅ UPPERCASE!
      quantity,
      entry_price: entryFill.price,
      exit_price: exitFill?.price ?? null,
      stop_price: stopPrice,
      fees: 0, // Tradovate doesn't provide fee info in fills
      fees_mode: 'auto',
      open_at: openAt,
      close_at: closeAt,
      pnl,
      broker: 'tradovate',
      external_id: externalId,
      multiplier,
      import_source: 'tradovate',
      imported_at: now,
      risk_pts: riskPts,
      reward_pts: rewardPts,
      risk_usd: riskUsd,
      reward_usd: rewardUsd,
      actual_r: actualR,
      // Broker metadata
      broker_connection_id: brokerConnectionId,
      broker_account_id: brokerAccountId,
      broker_trade_id: `${entryFill.id}_${exitFill?.id ?? 'open'}`,
      contract_name: contract.name,
      synced_at: now,
      sync_source: 'tradovate_api',
      raw_data: {
        entryFill: {
          id: entryFill.id,
          action: entryFill.action,
          qty: entryFill.qty,
          price: entryFill.price,
          timestamp: entryFill.timestamp,
          orderId: entryFill.orderId
        },
        exitFill: exitFill ? {
          id: exitFill.id,
          action: exitFill.action,
          qty: exitFill.qty,
          price: exitFill.price,
          timestamp: exitFill.timestamp,
          orderId: exitFill.orderId
        } : null,
        contract: {
          id: contract.id,
          name: contract.name,
          productId: contract.productId
        },
        product: {
          id: product.id,
          name: product.name,
          valuePerPoint: product.valuePerPoint,
          tickSize: product.tickSize
        }
      }
    };
  }

  /**
   * 🔄 Convert open position to Finotaur format
   * ✅ FIXED: side is now UPPERCASE ('LONG'/'SHORT') to match DB constraint
   */
  public convertPositionToFinotaurTrade(
    position: TradovatePosition,
    contract: TradovateContract,
    product: TradovateProduct,
    userId: string,
    brokerConnectionId?: string,
    brokerAccountId?: string
  ): FinotaurTradeData {
    const direction: 'long' | 'short' = position.netPos > 0 ? 'long' : 'short';
    const quantity = Math.abs(position.netPos);
    const multiplier = product.valuePerPoint;
    
    // Estimate stop (2% from entry)
    const stopDistance = position.netPrice * 0.02;
    const stopPrice = direction === 'long'
      ? position.netPrice - stopDistance
      : position.netPrice + stopDistance;
    
    const riskPts = Math.abs(position.netPrice - stopPrice);
    const riskUsd = riskPts * quantity * multiplier;
    
    // ✅ CRITICAL FIX: Convert direction to UPPERCASE for DB constraint
    const sideUppercase: 'LONG' | 'SHORT' = direction.toUpperCase() as 'LONG' | 'SHORT';
    
    const now = new Date().toISOString();
    
    return {
      user_id: userId,
      symbol: contract.name,
      asset_class: 'futures',
      side: sideUppercase,  // ✅ UPPERCASE!
      quantity,
      entry_price: position.netPrice,
      exit_price: null,
      stop_price: stopPrice,
      fees: 0,
      fees_mode: 'auto',
      open_at: new Date(position.timestamp).toISOString(),
      close_at: null,
      pnl: null,
      broker: 'tradovate',
      external_id: `tradovate_pos_${position.id}`,
      multiplier,
      import_source: 'tradovate',
      imported_at: now,
      risk_pts: riskPts,
      risk_usd: riskUsd,
      // Broker metadata
      broker_connection_id: brokerConnectionId,
      broker_account_id: brokerAccountId,
      broker_trade_id: `pos_${position.id}`,
      contract_name: contract.name,
      synced_at: now,
      sync_source: 'tradovate_api',
      raw_data: {
        position: {
          id: position.id,
          accountId: position.accountId,
          contractId: position.contractId,
          netPos: position.netPos,
          netPrice: position.netPrice,
          timestamp: position.timestamp
        },
        contract: {
          id: contract.id,
          name: contract.name,
          productId: contract.productId
        },
        product: {
          id: product.id,
          name: product.name,
          valuePerPoint: product.valuePerPoint,
          tickSize: product.tickSize
        }
      }
    };
  }

  /**
   * Generate unique external ID for a fill
   */
  private generateExternalId(fill: TradovateFill): string {
    return `tradovate_fill_${fill.id}`;
  }

  /**
   * Generate unique external ID for a paired trade
   */
  private generateTradeExternalId(pairedTrade: PairedTrade): string {
    const entryId = pairedTrade.entryFill.id;
    const exitId = pairedTrade.exitFill?.id ?? 'open';
    return `tradovate_${entryId}_${exitId}`;
  }

  /**
   * 🔍 Validate trade data before insert
   */
  public validateTradeData(trade: FinotaurTradeData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!trade.user_id) errors.push('Missing user_id');
    if (!trade.symbol) errors.push('Missing symbol');
    if (!trade.side) errors.push('Missing side');
    
    // ✅ Validate side is UPPERCASE
    if (trade.side && !['LONG', 'SHORT'].includes(trade.side)) {
      errors.push(`Invalid side value: ${trade.side}. Must be 'LONG' or 'SHORT'`);
    }
    
    if (trade.quantity <= 0) errors.push('Invalid quantity');
    if (trade.entry_price <= 0) errors.push('Invalid entry_price');
    if (trade.stop_price <= 0) errors.push('Invalid stop_price');
    if (!trade.open_at) errors.push('Missing open_at');
    if (!trade.external_id) errors.push('Missing external_id');
    if (trade.multiplier <= 0) errors.push('Invalid multiplier');
    
    // Validate broker is in allowed list
    if (trade.broker !== 'tradovate') {
      errors.push(`Invalid broker: ${trade.broker}`);
    }
    
    // Validate import_source is in allowed list
    if (trade.import_source !== 'tradovate') {
      errors.push(`Invalid import_source: ${trade.import_source}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 🔧 Utility: Extract base symbol from contract name
   * Example: "ESZ4" -> "ES", "MNQH5" -> "MNQ"
   */
  public extractBaseSymbol(contractName: string): string {
    // Common futures contract pattern: SYMBOL + MONTH_CODE + YEAR
    // Month codes: F, G, H, J, K, M, N, Q, U, V, X, Z
    const monthCodes = 'FGHJKMNQUVXZ';
    
    for (let i = contractName.length - 1; i >= 0; i--) {
      const char = contractName[i];
      // If we hit a month code followed by a digit, we found the contract suffix
      if (monthCodes.includes(char) && i < contractName.length - 1) {
        const nextChar = contractName[i + 1];
        if (/\d/.test(nextChar)) {
          return contractName.substring(0, i);
        }
      }
    }
    
    // Fallback: return first 2-3 characters
    return contractName.substring(0, Math.min(3, contractName.length));
  }

  /**
   * 🔧 Utility: Get point value for a symbol
   * Returns the multiplier for P&L calculation
   */
  public getDefaultMultiplier(symbol: string): number {
    const baseSymbol = this.extractBaseSymbol(symbol);
    
    const multipliers: Record<string, number> = {
      // E-mini futures
      'ES': 50,
      'NQ': 20,
      'RTY': 50,
      'YM': 5,
      // Micro futures
      'MES': 5,
      'MNQ': 2,
      'M2K': 5,
      'MYM': 0.5,
      // Commodities
      'CL': 1000,
      'GC': 100,
      'SI': 5000,
      'NG': 10000,
      // Currencies
      '6E': 125000,
      '6J': 12500000,
      '6B': 62500,
      // Treasuries
      'ZB': 1000,
      'ZN': 1000,
      'ZF': 1000
    };
    
    return multipliers[baseSymbol] || 1;
  }
}

export const tradovateTradeMapperService = new TradovateTradeMapperService();