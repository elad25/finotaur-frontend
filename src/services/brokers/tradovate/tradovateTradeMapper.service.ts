// src/services/brokers/tradovate/tradovateTradeMapper.service.ts
// 🎯 V3.0 - Updated to match EXISTING trades table schema
// ✅ Does NOT calculate pnl, outcome, R-values - trigger handles those!
// ✅ Side is UPPERCASE ('LONG'/'SHORT')
// ✅ stop_price is REQUIRED for R calculation by trigger

import {
  TradovateFill,
  TradovateContract,
  TradovateProduct,
  TradovatePosition
} from '@/types/brokers/tradovate/tradovate.types';

// ============================================================================
// TYPES - Matching EXISTING trades table
// ============================================================================

/**
 * Data structure for inserting into trades table
 * Note: pnl, outcome, R-values are calculated by DB trigger!
 */
export interface FinotaurTradeData {
  // === REQUIRED FIELDS ===
  user_id: string;
  symbol: string;                    // contract name (e.g., "MNQZ4")
  side: 'LONG' | 'SHORT';           // UPPERCASE - DB constraint!
  quantity: number;
  entry_price: number;
  stop_price: number | null;         // B2: NULL when no real stop captured from broker
  risk_estimated: boolean;           // B2: TRUE when stop_price is estimated/missing
  open_at: string;                   // ISO timestamp

  // === OPTIONAL/NULLABLE FIELDS ===
  exit_price: number | null;
  close_at: string | null;           // null = open trade
  take_profit_price: number | null;
  fees: number;
  
  // === BROKER IDENTIFICATION ===
  broker: 'tradovate';
  external_id: string;               // For deduplication
  import_source: 'tradovate';
  multiplier: number;                // product.valuePerPoint
  asset_class: 'futures';
  idempotency_key: string;           // B3: UNIQUE composite — prevents duplicate inserts on re-sync

  // === BROKER CONNECTION (from migration) ===
  broker_connection_id?: string;
  broker_account_id?: string;
  broker_name?: string;
  broker_trade_id?: string;
  synced_at?: string;
  sync_source?: string;
  raw_data?: Record<string, unknown>;
  
  // === OPTIONAL USER FIELDS ===
  notes?: string;
  setup?: string;
  tags?: string[];
}

export interface PairedTrade {
  entryFill: TradovateFill;
  exitFill: TradovateFill | null;
  contract: TradovateContract;
  product: TradovateProduct;
  direction: 'long' | 'short';       // Internal use - lowercase
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
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
   * 🎯 Main function: Pair Tradovate fills into trades
   * Groups and pairs fills by contract using FIFO method
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
      const externalId = this.generateFillExternalId(fill);
      
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
    return {
      entryFill,
      exitFill,
      contract: entryFill.contract,
      product: entryFill.product,
      direction,
      quantity: entryFill.qty,
      entryPrice: entryFill.price,
      exitPrice: exitFill?.price ?? null,
      isClosed: exitFill !== null
    };
  }

  /**
   * 🔄 Convert paired trade to Finotaur database format
   * ⚠️ Does NOT calculate pnl/R-values - trigger handles those!
   */
  public convertToFinotaurTrade(
    pairedTrade: PairedTrade,
    userId: string,
    brokerConnectionId?: string,
    brokerAccountId?: string
  ): FinotaurTradeData {
    const { entryFill, exitFill, contract, product, direction, quantity } = pairedTrade;
    
    // Generate unique external ID for deduplication
    const externalId = this.generateTradeExternalId(pairedTrade);
    
    // Parse timestamps
    const openAt = new Date(entryFill.timestamp).toISOString();
    const closeAt = exitFill ? new Date(exitFill.timestamp).toISOString() : null;
    
    // Get multiplier (valuePerPoint is the $ value per point movement)
    const multiplier = product.valuePerPoint;

    // B2: Tradovate fills do not include stop orders. We send NULL stop_price
    // and flag the trade as risk_estimated=true so the user can fill in the
    // real stop manually. Without a real stop, the trigger leaves R-multiples
    // NULL — which is correct (R is meaningless without a real stop).
    const stopPrice: number | null = null;
    const riskEstimated = true;

    // Convert direction to UPPERCASE for DB constraint
    const sideUppercase: 'LONG' | 'SHORT' = direction.toUpperCase() as 'LONG' | 'SHORT';

    const now = new Date().toISOString();

    // Build trade data - only fields we should send
    // pnl, outcome, R-values will be calculated by trigger!
    return {
      // Required fields
      user_id: userId,
      symbol: contract.name,
      side: sideUppercase,
      quantity,
      entry_price: entryFill.price,
      stop_price: stopPrice,
      risk_estimated: riskEstimated,
      open_at: openAt,
      
      // Optional/nullable
      exit_price: exitFill?.price ?? null,
      close_at: closeAt,
      take_profit_price: null,    // Not available from fills
      fees: 0,                    // Tradovate doesn't provide in fills
      
      // Broker identification
      broker: 'tradovate',
      external_id: externalId,
      import_source: 'tradovate',
      multiplier,
      asset_class: 'futures',
      idempotency_key: `tradovate::${brokerConnectionId ?? 'none'}::${externalId}`,

      // Broker connection references
      broker_connection_id: brokerConnectionId,
      broker_account_id: brokerAccountId,
      synced_at: now,
      sync_source: 'tradovate_api',

      // Raw data for debugging
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

    // B2: Open positions from Tradovate API do not expose stop orders.
    // Send NULL + risk_estimated=true so the user can supply the real stop.
    const stopPrice: number | null = null;
    const riskEstimated = true;

    // Convert direction to UPPERCASE for DB constraint
    const sideUppercase: 'LONG' | 'SHORT' = direction.toUpperCase() as 'LONG' | 'SHORT';

    const now = new Date().toISOString();

    return {
      // Required fields
      user_id: userId,
      symbol: contract.name,
      side: sideUppercase,
      quantity,
      entry_price: position.netPrice,
      stop_price: stopPrice,
      risk_estimated: riskEstimated,
      open_at: new Date(position.timestamp).toISOString(),
      
      // Open position - no exit
      exit_price: null,
      close_at: null,
      take_profit_price: null,
      fees: 0,
      
      // Broker identification
      broker: 'tradovate',
      external_id: `tradovate_pos_${position.id}`,
      import_source: 'tradovate',
      multiplier,
      asset_class: 'futures',
      idempotency_key: `tradovate::${brokerConnectionId ?? 'none'}::tradovate_pos_${position.id}`,

      // Broker connection references
      broker_connection_id: brokerConnectionId,
      broker_account_id: brokerAccountId,
      synced_at: now,
      sync_source: 'tradovate_api',

      // Raw data
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
  private generateFillExternalId(fill: TradovateFill): string {
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
    
    // Required fields
    if (!trade.user_id) errors.push('Missing user_id');
    if (!trade.symbol) errors.push('Missing symbol');
    if (!trade.side) errors.push('Missing side');
    if (!trade.open_at) errors.push('Missing open_at');
    if (!trade.external_id) errors.push('Missing external_id');
    
    // Validate side is UPPERCASE
    if (trade.side && !['LONG', 'SHORT'].includes(trade.side)) {
      errors.push(`Invalid side value: ${trade.side}. Must be 'LONG' or 'SHORT'`);
    }
    
    // Numeric validations
    if (trade.quantity <= 0) errors.push('Invalid quantity (must be > 0)');
    if (trade.entry_price <= 0) errors.push('Invalid entry_price (must be > 0)');
    if (trade.multiplier <= 0) errors.push('Invalid multiplier (must be > 0)');

    // B2: stop_price may be NULL when risk_estimated=true (broker did not
    // expose a real stop). Validate the value only when one is present.
    if (trade.stop_price !== null && trade.stop_price !== undefined) {
      if (trade.stop_price <= 0) errors.push('Invalid stop_price (must be > 0 when set)');
      if (trade.side === 'LONG' && trade.stop_price >= trade.entry_price) {
        errors.push('For LONG, stop_price must be below entry_price');
      }
      if (trade.side === 'SHORT' && trade.stop_price <= trade.entry_price) {
        errors.push('For SHORT, stop_price must be above entry_price');
      }
    }
    
    // Broker validation
    if (trade.broker !== 'tradovate') {
      errors.push(`Invalid broker: ${trade.broker}`);
    }
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
   * 🔧 Utility: Get default multiplier for common symbols
   * Note: This is a fallback - prefer using product.valuePerPoint from API
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