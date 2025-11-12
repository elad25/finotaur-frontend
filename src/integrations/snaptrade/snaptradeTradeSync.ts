// src/integrations/snaptrade/snaptradeTradeSync.ts
// 🔄 Automatic Trade Sync from SnapTrade to Finotaur Journal
// מסנכרן עסקאות מהברוקר ליומן אוטומטית

import { supabase } from '@/integrations/supabase/client';
import { snaptradeService } from './snaptradeService';
import type { Activity, SnapTradeCredentials } from './snaptradeTypes';

// ============================================================================
// TYPES
// ============================================================================

interface SyncResult {
  success: boolean;
  tradesImported: number;
  errors: string[];
}

interface FinotaurTrade {
  user_id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  entry_date: string;
  exit_date?: string;
  commission: number;
  notes?: string;
  strategy_id?: string;
  status: 'OPEN' | 'CLOSED';
  
  // ✅ SnapTrade integration fields (match database schema)
  snaptrade_activity_id?: string;     // For deduplication
  snaptrade_account_id?: string;      // Track source account
  import_source?: string;             // 'snaptrade', 'manual', 'csv', 'api'
  imported_at?: string;               // ISO timestamp
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Sync trades from SnapTrade to Finotaur journal
 * 
 * @param userId - Finotaur user ID
 * @param startDate - Optional: sync from this date (ISO format)
 * @param endDate - Optional: sync until this date (ISO format)
 */
export async function syncTradesFromSnapTrade(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<SyncResult> {
  console.log('🔄 Starting trade sync from SnapTrade...');
  
  const result: SyncResult = {
    success: false,
    tradesImported: 0,
    errors: [],
  };

  try {
    // Step 1: Get SnapTrade credentials
    const snaptradeUserId = `finotaur_${userId}`;
    const credentials: SnapTradeCredentials = {
      userId: snaptradeUserId,
      userSecret: '', // Not needed for Pay-as-you-go
    };

    // Step 2: Check if user has active connections
    const connections = await snaptradeService.listConnections(credentials);
    const activeConnections = connections.filter(conn => conn.status === 'CONNECTED');

    if (activeConnections.length === 0) {
      result.errors.push('No active broker connections found');
      return result;
    }

    console.log(`✅ Found ${activeConnections.length} active connection(s)`);

    // Step 3: Get activities (trades) from SnapTrade
    const activities = await snaptradeService.getActivities(credentials, {
      startDate,
      endDate,
      type: 'BUY,SELL', // Only get buy/sell activities
    });

    console.log(`📥 Retrieved ${activities.length} activities from SnapTrade`);

    // Step 4: Check which trades already exist in Finotaur
    const { data: existingTrades } = await supabase
      .from('trades')
      .select('snaptrade_activity_id')
      .eq('user_id', userId)
      .not('snaptrade_activity_id', 'is', null);

    const existingIds = new Set(
      existingTrades?.map(t => t.snaptrade_activity_id) || []
    );

    // Step 5: Convert SnapTrade activities to Finotaur trades
    const newTrades: FinotaurTrade[] = [];

    for (const activity of activities) {
      // Skip if already imported
      if (existingIds.has(activity.id)) {
        console.log(`⏭️  Skipping already imported trade: ${activity.id}`);
        continue;
      }

      // Convert to Finotaur format
      const trade = convertActivityToTrade(activity, userId);
      if (trade) {
        newTrades.push(trade);
      }
    }

    console.log(`📦 Converted ${newTrades.length} new trades`);

    // Step 6: Insert trades into Finotaur database
    if (newTrades.length > 0) {
      const { data, error } = await supabase
        .from('trades')
        .insert(newTrades)
        .select();

      if (error) {
        console.error('❌ Failed to insert trades:', error);
        result.errors.push(`Database error: ${error.message}`);
        return result;
      }

      result.tradesImported = data?.length || 0;
      console.log(`✅ Successfully imported ${result.tradesImported} trades`);
    }

    result.success = true;
    return result;

  } catch (error: any) {
    console.error('❌ Trade sync failed:', error);
    result.errors.push(error.message || 'Unknown error');
    return result;
  }
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert SnapTrade Activity to Finotaur Trade
 */
function convertActivityToTrade(
  activity: Activity,
  userId: string
): FinotaurTrade | null {
  try {
    // Only process BUY and SELL activities
    if (activity.type !== 'BUY' && activity.type !== 'SELL') {
      return null;
    }

    // Extract symbol
    const symbol = activity.symbol?.symbol || 'UNKNOWN';

    // Determine action
    const action = activity.type === 'BUY' ? 'BUY' : 'SELL';

    // Get quantity
    const quantity = Math.abs(activity.quantity || 0);

    // Get price
    const price = activity.price || 0;

    // Get commission
    const commission = activity.fee || 0;

    // Get date
    const tradeDate = activity.trade_date || activity.created_date || new Date().toISOString();

    // Create Finotaur trade
    const trade: FinotaurTrade = {
      user_id: userId,
      symbol: symbol,
      action: action,
      quantity: quantity,
      entry_price: price,
      entry_date: tradeDate,
      commission: commission,
      status: 'CLOSED', // Assume closed for now
      notes: `Imported from ${activity.account} via SnapTrade`,
      // Store SnapTrade activity ID for deduplication
      snaptrade_activity_id: activity.id,
    };

    return trade;

  } catch (error) {
    console.error('Failed to convert activity:', activity, error);
    return null;
  }
}

// ============================================================================
// AUTOMATIC SYNC SCHEDULER
// ============================================================================

/**
 * Set up automatic daily sync
 * Call this when user connects their broker
 */
export function setupAutomaticSync(userId: string) {
  console.log('⏰ Setting up automatic daily trade sync...');

  // Sync immediately
  syncTradesFromSnapTrade(userId);

  // Then sync every 24 hours
  const syncInterval = setInterval(() => {
    syncTradesFromSnapTrade(userId);
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Store interval ID so we can cancel it later
  return syncInterval;
}

// ============================================================================
// MANUAL SYNC TRIGGER
// ============================================================================

/**
 * Manual sync button handler
 * Use this in your UI
 */
export async function handleManualSync(userId: string): Promise<SyncResult> {
  console.log('🔄 Manual sync triggered by user');
  
  // Sync last 30 days
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  return syncTradesFromSnapTrade(userId, startDate, endDate);
}

// ============================================================================
// EXPORT
// ============================================================================

export const snaptradeTradeSync = {
  syncTrades: syncTradesFromSnapTrade,
  setupAutoSync: setupAutomaticSync,
  manualSync: handleManualSync,
};