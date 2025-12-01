// src/integrations/snaptrade/snaptradeTradeSync.ts
// 🔄 Automatic Trade Sync from SnapTrade to Finotaur Journal
// ✅ FIXED: Matches Finotaur trades table schema exactly
// מסנכרן עסקאות מהברוקר ליומן אוטומטית

import { supabase } from '@/integrations/supabase/client';
import { snaptradeService } from './snaptradeService';
import { snaptradeSupabaseService } from './snaptradeSupabase';
import type { Activity, SnapTradeCredentials } from './snaptradeTypes';

// ============================================================================
// TYPES - Matching Finotaur trades table schema
// ============================================================================

interface SyncResult {
  success: boolean;
  tradesImported: number;
  tradesSkipped: number;
  errors: string[];
}

/**
 * ✅ FIXED: Matches Finotaur trades table schema EXACTLY
 * Based on the database documentation provided
 */
interface FinotaurTrade {
  // Required fields
  user_id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';      // NOT 'action' - Finotaur uses 'side'
  quantity: number;
  entry_price: number;
  
  // Optional trade fields
  exit_price?: number | null;
  stop_price?: number | null;
  take_profit_price?: number | null;
  fees?: number | null;        // NOT 'commission'
  asset_class?: string | null;
  
  // Timing fields
  open_at?: string;            // NOT 'entry_date'
  close_at?: string | null;    // NOT 'exit_date'
  
  // Metadata
  notes?: string | null;
  setup?: string | null;
  tags?: string[];
  
  // SnapTrade integration fields (from database schema)
  broker?: string;
  import_source?: 'snaptrade' | 'manual' | 'csv' | 'api';
  snaptrade_activity_id?: string;     // UNIQUE - for deduplication
  snaptrade_account_id?: string;
  
  // Note: These fields are COMPUTED by triggers, don't set them:
  // - pnl, outcome, multiplier, risk_pts, reward_pts, risk_usd, reward_usd, rr
  // - actual_r, user_risk_r, user_reward_r, actual_user_r
  // - session, close_at (auto-set when exit_price is set)
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Sync trades from SnapTrade to Finotaur journal
 * ✅ FIXED: Uses correct credentials and field mapping
 * 
 * @param userId - Finotaur user ID (auth.uid())
 * @param startDate - Optional: sync from this date (ISO format)
 * @param endDate - Optional: sync until this date (ISO format)
 */
export async function syncTradesFromSnapTrade(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<SyncResult> {
  console.log('🔄 Starting trade sync from SnapTrade...');
  console.log('   User ID:', userId);
  console.log('   Date range:', startDate || 'all', '-', endDate || 'now');
  
  const result: SyncResult = {
    success: false,
    tradesImported: 0,
    tradesSkipped: 0,
    errors: [],
  };

  try {
    // ✅ Step 1: Get REAL SnapTrade credentials from database
    console.log('📝 Getting SnapTrade credentials...');
    const credentials = await snaptradeSupabaseService.getCredentials(userId);
    
    if (!credentials || !credentials.userSecret) {
      result.errors.push('No SnapTrade credentials found. Please connect a broker first.');
      console.error('❌ No credentials found for user');
      return result;
    }
    
    console.log('✅ Credentials found:', {
      userId: credentials.userId,
      hasSecret: !!credentials.userSecret
    });

    // ✅ Step 2: Check if user has active connections
    let connections;
    try {
      connections = await snaptradeService.listConnections(credentials);
    } catch (err: any) {
      result.errors.push(`Failed to get connections: ${err.message}`);
      return result;
    }
    
    const activeConnections = connections.filter(conn => conn.status === 'CONNECTED');

    if (activeConnections.length === 0) {
      result.errors.push('No active broker connections found. Please connect a broker first.');
      console.log('⚠️ No active connections');
      return result;
    }

    console.log(`✅ Found ${activeConnections.length} active connection(s)`);

    // ✅ Step 3: Get activities (trades) from SnapTrade
    let activities: Activity[];
    try {
      activities = await snaptradeService.getActivities(credentials, {
        startDate,
        endDate,
        type: 'BUY,SELL', // Only get buy/sell activities
      });
    } catch (err: any) {
      result.errors.push(`Failed to get activities: ${err.message}`);
      return result;
    }

    console.log(`📥 Retrieved ${activities.length} activities from SnapTrade`);

    if (activities.length === 0) {
      result.success = true;
      console.log('ℹ️ No new activities to import');
      return result;
    }

    // ✅ Step 4: Check which trades already exist in Finotaur (deduplication)
    const { data: existingTrades, error: queryError } = await supabase
      .from('trades')
      .select('snaptrade_activity_id')
      .eq('user_id', userId)
      .not('snaptrade_activity_id', 'is', null);

    if (queryError) {
      console.error('Error checking existing trades:', queryError);
      // Continue anyway, we'll rely on unique constraint
    }

    const existingIds = new Set(
      existingTrades?.map(t => t.snaptrade_activity_id) || []
    );
    
    console.log(`📊 Found ${existingIds.size} existing imported trades`);

    // ✅ Step 5: Convert SnapTrade activities to Finotaur trades
    const newTrades: FinotaurTrade[] = [];

    for (const activity of activities) {
      // Skip if already imported (deduplication)
      if (activity.id && existingIds.has(activity.id)) {
        console.log(`⏭️  Skipping already imported: ${activity.id}`);
        result.tradesSkipped++;
        continue;
      }

      // Convert to Finotaur format
      const trade = convertActivityToFinotaurTrade(activity, userId);
      if (trade) {
        newTrades.push(trade);
      } else {
        result.tradesSkipped++;
      }
    }

    console.log(`📦 Converted ${newTrades.length} new trades (skipped ${result.tradesSkipped})`);

    // ✅ Step 6: Insert trades into Finotaur database
    if (newTrades.length > 0) {
      // Insert in batches to avoid timeout
      const BATCH_SIZE = 50;
      let totalInserted = 0;
      
      for (let i = 0; i < newTrades.length; i += BATCH_SIZE) {
        const batch = newTrades.slice(i, i + BATCH_SIZE);
        
        const { data, error } = await supabase
          .from('trades')
          .insert(batch)
          .select('id');

        if (error) {
          console.error('❌ Failed to insert batch:', error);
          
          // If it's a duplicate key error, continue with other trades
          if (error.code === '23505') { // unique_violation
            console.log('⚠️ Some trades were duplicates, continuing...');
            continue;
          }
          
          result.errors.push(`Database error: ${error.message}`);
          // Don't return, try to insert remaining batches
        } else {
          totalInserted += data?.length || 0;
        }
      }

      result.tradesImported = totalInserted;
      console.log(`✅ Successfully imported ${result.tradesImported} trades`);
    }

    result.success = true;
    return result;

  } catch (error: any) {
    console.error('❌ Trade sync failed:', error);
    result.errors.push(error.message || 'Unknown error during sync');
    return result;
  }
}

// ============================================================================
// CONVERSION HELPER
// ============================================================================

/**
 * Convert SnapTrade Activity to Finotaur Trade
 * ✅ FIXED: Maps to correct Finotaur schema fields
 */
function convertActivityToFinotaurTrade(
  activity: Activity,
  userId: string
): FinotaurTrade | null {
  try {
    // Only process BUY and SELL activities
    if (activity.type !== 'BUY' && activity.type !== 'SELL') {
      console.log(`⏭️  Skipping non-trade activity: ${activity.type}`);
      return null;
    }

    // Extract symbol
    const symbol = activity.symbol?.symbol || activity.symbol?.raw_symbol || 'UNKNOWN';
    
    if (symbol === 'UNKNOWN') {
      console.warn('⚠️ Activity has no symbol:', activity.id);
    }

    // ✅ FIXED: Determine SIDE (not action)
    // BUY = LONG, SELL = SHORT (assuming opening positions)
    // Note: This is simplified - in reality you'd need to match trades
    const side: 'LONG' | 'SHORT' = activity.type === 'BUY' ? 'LONG' : 'SHORT';

    // Get quantity (always positive)
    const quantity = Math.abs(activity.quantity || 0);
    
    if (quantity === 0) {
      console.warn('⚠️ Activity has zero quantity:', activity.id);
      return null;
    }

    // Get price
    const price = activity.price || 0;
    
    if (price === 0) {
      console.warn('⚠️ Activity has zero price:', activity.id);
    }

    // Get fees (renamed from commission)
    const fees = activity.fee || 0;

    // ✅ FIXED: Get date as open_at (not entry_date)
    const tradeDate = activity.trade_date || activity.settlement_date || activity.created_date || new Date().toISOString();

    // Determine asset class based on security type
    let assetClass: string | null = null;
    if (activity.symbol?.type) {
      const typeMap: Record<string, string> = {
        'cs': 'stock',
        'et': 'etf',
        'ps': 'stock',
        'mf': 'etf',
        'bond': 'bond',
        'option': 'options',
        'future': 'futures',
        'forex': 'forex',
        'crypto': 'crypto',
      };
      assetClass = typeMap[activity.symbol.type] || 'stock';
    }

    // ✅ Create Finotaur trade with CORRECT field names
    const trade: FinotaurTrade = {
      user_id: userId,
      symbol: symbol.toUpperCase(),
      side: side,                    // ✅ 'side' not 'action'
      quantity: quantity,
      entry_price: price,
      fees: fees,                    // ✅ 'fees' not 'commission'
      open_at: tradeDate,            // ✅ 'open_at' not 'entry_date'
      asset_class: assetClass,
      
      // Import tracking
      broker: 'snaptrade',
      import_source: 'snaptrade',
      snaptrade_activity_id: activity.id,
      snaptrade_account_id: activity.account,
      
      // Notes with source info
      notes: `Imported via SnapTrade from ${activity.account || 'broker'}`,
      
      // Tags for filtering
      tags: ['snaptrade', 'imported'],
    };

    console.log(`✅ Converted: ${symbol} ${side} ${quantity} @ ${price}`);
    return trade;

  } catch (error) {
    console.error('❌ Failed to convert activity:', activity.id, error);
    return null;
  }
}

// ============================================================================
// TRADE MATCHING (Advanced - for closing positions)
// ============================================================================

/**
 * Match BUY and SELL activities to create complete trades
 * This is more advanced and handles position closing
 */
export async function syncAndMatchTrades(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<SyncResult> {
  console.log('🔄 Starting advanced trade matching sync...');
  
  // For now, use the simple sync
  // TODO: Implement FIFO matching for proper trade closing
  return syncTradesFromSnapTrade(userId, startDate, endDate);
}

// ============================================================================
// AUTOMATIC SYNC SCHEDULER
// ============================================================================

// Store interval IDs per user
const syncIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Set up automatic daily sync
 * Call this when user connects their broker
 */
export function setupAutomaticSync(userId: string): void {
  console.log('⏰ Setting up automatic daily trade sync for:', userId);

  // Clear existing interval if any
  if (syncIntervals.has(userId)) {
    clearInterval(syncIntervals.get(userId)!);
  }

  // Sync immediately
  syncTradesFromSnapTrade(userId).catch(console.error);

  // Then sync every 24 hours
  const interval = setInterval(() => {
    console.log('🔄 Running scheduled trade sync for:', userId);
    syncTradesFromSnapTrade(userId).catch(console.error);
  }, 24 * 60 * 60 * 1000); // 24 hours

  syncIntervals.set(userId, interval);
}

/**
 * Stop automatic sync for a user
 */
export function stopAutomaticSync(userId: string): void {
  if (syncIntervals.has(userId)) {
    clearInterval(syncIntervals.get(userId)!);
    syncIntervals.delete(userId);
    console.log('⏹️ Stopped automatic sync for:', userId);
  }
}

// ============================================================================
// MANUAL SYNC TRIGGER
// ============================================================================

/**
 * Manual sync button handler
 * Use this in your UI for the "Sync Now" button
 */
export async function handleManualSync(
  userId: string,
  daysBack: number = 30
): Promise<SyncResult> {
  console.log(`🔄 Manual sync triggered - last ${daysBack} days`);
  
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  return syncTradesFromSnapTrade(userId, startDate, endDate);
}

/**
 * Full historical sync
 * Use this for initial import or "Sync All" button
 */
export async function handleFullSync(userId: string): Promise<SyncResult> {
  console.log('🔄 Full historical sync triggered');
  
  // Sync all available history (no date filter)
  return syncTradesFromSnapTrade(userId);
}

// ============================================================================
// EXPORT
// ============================================================================

export const snaptradeTradeSync = {
  // Main sync functions
  syncTrades: syncTradesFromSnapTrade,
  syncAndMatch: syncAndMatchTrades,
  
  // Manual triggers
  manualSync: handleManualSync,
  fullSync: handleFullSync,
  
  // Automatic sync management
  setupAutoSync: setupAutomaticSync,
  stopAutoSync: stopAutomaticSync,
};

export default snaptradeTradeSync;