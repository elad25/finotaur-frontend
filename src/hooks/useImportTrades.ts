// ================================================
// FINOTAUR USE IMPORT TRADES HOOK
// Hook for importing trades to Supabase
// Handles batch inserts, duplicate detection, validation
// ================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

// ✅ FIXED: Correct import path
import type { FinotaurTrade } from '@/utils/importUtils';
import { buildCSVIdempotencyKey } from '@/lib/trades/idempotencyKey';
import { getAssetMultiplier } from '@/utils/tradeCalculations';

// ================================================
// TYPES
// ================================================

export interface ImportTradesResult {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: string[];
}

export interface UseImportTradesReturn {
  importTrades: (trades: FinotaurTrade[]) => Promise<ImportTradesResult>;
  isImporting: boolean;
  progress: number;
  error: string | null;
}

// ================================================
// CONSTANTS
// ================================================

const BATCH_SIZE = 50; // Insert 50 trades at a time to avoid timeout

// ================================================
// HOOK
// ================================================

export function useImportTrades(): UseImportTradesReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  const importTrades = useCallback(async (trades: FinotaurTrade[]): Promise<ImportTradesResult> => {
    setIsImporting(true);
    setProgress(0);
    setError(null);
    
    const result: ImportTradesResult = {
      success: false,
      imported: 0,
      duplicates: 0,
      errors: [],
    };

    try {
      if (!trades || trades.length === 0) {
        throw new Error('No trades to import');
      }

      // Get user ID from first trade
      const userId = trades[0].user_id;
      
      // ================================================
      // STEP 1: Check for duplicates
      // ================================================
      
      // Get existing trade signatures to detect duplicates
      const { data: existingTrades, error: fetchError } = await supabase
        .from('trades')
        .select('symbol, open_at, entry_price, quantity')
        .eq('user_id', userId)
        .is('deleted_at', null);
      
      if (fetchError) {
        throw new Error(`Failed to check for duplicates: ${fetchError.message}`);
      }

      // Create a Set of existing trade signatures
      const existingSignatures = new Set(
        (existingTrades || []).map(t => 
          `${t.symbol}_${t.open_at}_${t.entry_price}_${t.quantity}`
        )
      );

      // Filter out duplicates
      const newTrades = trades.filter(trade => {
        const signature = `${trade.symbol}_${trade.open_at}_${trade.entry_price}_${trade.quantity}`;
        if (existingSignatures.has(signature)) {
          result.duplicates++;
          return false;
        }
        return true;
      });

      if (newTrades.length === 0) {
        result.success = true;
        return result;
      }

      // ================================================
      // STEP 2: Prepare trades for insertion
      // ================================================
      
      const tradesToInsert = await Promise.all(newTrades.map(async (trade) => ({
        user_id: trade.user_id,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price || null,
        open_at: trade.open_at,
        close_at: trade.close_at || null,
        pnl: trade.pnl || null,
        fees: trade.commission ?? null, // DB column is fees; FinotaurTrade carries it as commission
        notes: trade.notes || null,
        strategy_id: trade.strategy_id || null,
        setup: trade.setup || null,
        session: trade.session || null,
        asset_class: trade.asset_type || 'STOCK', // DB column is asset_class (no asset_type)
        stop_price: trade.stop_loss ?? 0,         // DB column is stop_price (numeric NOT NULL)
        take_profit_price: trade.take_profit || null, // DB column is take_profit_price
        risk_usd: trade.risk_amount || null,      // DB column is risk_usd (no risk_amount)
        rr: trade.rr || null,
        tags: trade.tags || [],
        mistake: Array.isArray(trade.mistakes) ? (trade.mistakes.join(', ') || null) : (trade.mistakes || null), // DB column is mistake (singular text)
        quality_tag: trade.grade || null,         // DB column is quality_tag (no grade)
        import_source: trade.imported_from || 'csv', // DB column is import_source (not imported_from)
        external_id: trade.external_id || null,
        idempotency_key: await buildCSVIdempotencyKey(
          trade.user_id,
          trade.imported_from || 'csv',
          {
            symbol: trade.symbol,
            quantity: trade.quantity,
            entry_price: trade.entry_price,
            open_at: trade.open_at,
            exit_price: trade.exit_price,
            close_at: trade.close_at,
          },
        ),
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })));

      // ================================================
      // STEP 3: Batch insert trades
      // ================================================
      
      const totalBatches = Math.ceil(tradesToInsert.length / BATCH_SIZE);
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, tradesToInsert.length);
        const batch = tradesToInsert.slice(start, end);
        
        const { error: insertError } = await supabase
          .from('trades')
          .insert(batch);
        
        if (insertError) {
          result.errors.push(`Batch ${i + 1} failed: ${insertError.message}`);
          // Continue with next batch instead of stopping
          continue;
        }
        
        result.imported += batch.length;
        setProgress(Math.round(((i + 1) / totalBatches) * 100));
      }

      // ================================================
      // STEP 4: Invalidate queries to refresh UI
      // ================================================
      
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      
      result.success = result.imported > 0;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      result.errors.push(errorMessage);
      setError(errorMessage);
    } finally {
      setIsImporting(false);
      setProgress(100);
    }

    return result;
  }, [queryClient]);

  return {
    importTrades,
    isImporting,
    progress,
    error,
  };
}

// ================================================
// UTILITY: Validate trade before import
// ================================================

export function validateTrade(trade: Partial<FinotaurTrade>): string[] {
  const errors: string[] = [];
  
  if (!trade.user_id) {
    errors.push('Missing user ID');
  }
  
  if (!trade.symbol || trade.symbol.trim() === '') {
    errors.push('Missing or empty symbol');
  }
  
  if (!trade.side || !['LONG', 'SHORT'].includes(trade.side)) {
    errors.push('Invalid side (must be LONG or SHORT)');
  }
  
  if (!trade.quantity || trade.quantity <= 0) {
    errors.push('Invalid quantity (must be positive)');
  }
  
  if (trade.entry_price == null || trade.entry_price < 0) {
    errors.push('Invalid entry price');
  }
  
  if (!trade.open_at) {
    errors.push('Missing open date');
  } else {
    const openDate = new Date(trade.open_at);
    if (isNaN(openDate.getTime())) {
      errors.push('Invalid open date format');
    }
  }
  
  if (trade.close_at) {
    const closeDate = new Date(trade.close_at);
    if (isNaN(closeDate.getTime())) {
      errors.push('Invalid close date format');
    }
    
    const openDate = new Date(trade.open_at || '');
    if (closeDate < openDate) {
      errors.push('Close date cannot be before open date');
    }
  }
  
  if (trade.exit_price != null && trade.exit_price < 0) {
    errors.push('Invalid exit price (cannot be negative)');
  }
  
  return errors;
}

// ================================================
// UTILITY: Calculate derived fields
// ================================================

export function enrichTrade(trade: FinotaurTrade): FinotaurTrade {
  const enriched = { ...trade };
  
  // Calculate PnL if not provided
  if (enriched.pnl == null && enriched.exit_price != null && enriched.entry_price != null) {
    const priceDiff = enriched.side === 'LONG'
      ? enriched.exit_price - enriched.entry_price
      : enriched.entry_price - enriched.exit_price;

    // Apply contract multiplier (mirrors canonical calculatePnL in tradeCalculations.ts)
    const multiplier = getAssetMultiplier(enriched.symbol);
    enriched.pnl = priceDiff * enriched.quantity * multiplier;

    if (enriched.commission) {
      enriched.pnl -= enriched.commission;
    }
  }
  
  // Calculate RR if stop loss and take profit are available
  if (enriched.rr == null && enriched.stop_loss != null && enriched.take_profit != null && enriched.entry_price != null) {
    const risk = Math.abs(enriched.entry_price - enriched.stop_loss);
    const reward = Math.abs(enriched.take_profit - enriched.entry_price);
    
    if (risk > 0) {
      enriched.rr = reward / risk;
    }
  }
  
  // Calculate risk amount if stop loss is available
  if (enriched.risk_amount == null && enriched.stop_loss != null && enriched.entry_price != null) {
    const riskPerUnit = Math.abs(enriched.entry_price - enriched.stop_loss);
    enriched.risk_amount = riskPerUnit * enriched.quantity * getAssetMultiplier(enriched.symbol);
  }
  
  return enriched;
}

export default useImportTrades;