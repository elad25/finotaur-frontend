// ============================================================================
// SUPABASE CLIENT - Database & Storage
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Import + re-export the canonical singleton so this module no longer creates
// a second GoTrueClient. A second client at module scope competes for the same
// navigator.locks web lock used by supabase-js v2 session management, causing
// AuthProvider.getSession() to time out under multi-tab or cold-start load
// (OQ-93 / auth-getsession-timeout incident). All callers that previously
// received this module's own `supabase` now transparently get the singleton.
import { supabase } from '@/lib/supabase';
export { supabase };

// SECURITY: Only expose the service-role key in local development.
// In production the variable must not be set; if it is, we silently ignore it
// so it never ends up in the browser bundle.
const isDev = import.meta.env.DEV;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// Admin client (Service Role - bypasses RLS) — DEV only.
// Lazy: created only on first call to getSupabaseClient(true) so that the
// mere import of this module never spins up a second GoTrueClient on the
// navigator.locks contention path. In production this is always null.
let _supabaseAdminInstance: SupabaseClient | null = null;

function _getAdminClient(): SupabaseClient | null {
  if (!isDev || !supabaseServiceRoleKey) return null;
  if (!_supabaseAdminInstance) {
    _supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        // Distinct storageKey prevents any accidental collision with the
        // canonical client's 'finotaur-auth-token' web lock / localStorage key.
        storageKey: 'finotaur-admin-dev-token',
      },
      db: {
        schema: 'public',
      },
    });
    console.log('✅ Admin client initialized (DEV only, lazy)');
  }
  return _supabaseAdminInstance;
}

// supabaseAdmin is no longer exported from this module — no external callers
// import it from here (they all use @/lib/supabaseAdmin directly). It remains
// an internal implementation detail of getSupabaseClient().

/**
 * Get the appropriate Supabase client based on impersonation status.
 * Returns the canonical singleton for normal use; returns the lazy-created
 * admin client only in DEV when isImpersonating=true and the service-role key
 * is present.
 */
export function getSupabaseClient(isImpersonating: boolean = false) {
  if (isImpersonating) {
    const adminClient = _getAdminClient();
    if (adminClient) {
      console.log('🔓 Using ADMIN client (bypassing RLS)');
      return adminClient;
    }
  }

  console.log('🔒 Using REGULAR client (with RLS)');
  return supabase;
}

// ============================================================================
// LEGACY TRADE OPERATIONS (for backwards compatibility)
// ============================================================================

export interface Position {
  id?: string;
  symbol: string;
  type: string;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  size: number;
  status?: string;
  entryTime: number;
  exitTime?: number;
  exitReason?: string;
  realizedPnl?: number;
  realizedPnlPercent?: number;
  riskRewardRatio?: number;
  notes?: string;
  tags?: string[];
  strategyId?: string;
  sessionId?: string;
  screenshotUrl?: string;
}

/**
 * Supabase Client for trade journal operations
 */
export const supabaseClient = {
  /**
   * Save a trade to the journal
   */
  async saveTrade(position: Position): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('trades')
        .insert({
          user_id: userData.user.id,
          symbol: position.symbol,
          type: position.type,
          entry_price: position.entryPrice,
          exit_price: position.exitPrice,
          stop_loss: position.stopLoss,
          take_profit: position.takeProfit,
          size: position.size,
          realized_pnl: position.realizedPnl,
          realized_pnl_percent: position.realizedPnlPercent,
          risk_reward_ratio: position.riskRewardRatio,
          entry_time: new Date(position.entryTime * 1000).toISOString(),
          exit_time: position.exitTime ? new Date(position.exitTime * 1000).toISOString() : null,
          exit_reason: position.exitReason,
          notes: position.notes,
          tags: position.tags,
          strategy_id: position.strategyId,
          session_id: position.sessionId,
          screenshot_url: position.screenshotUrl,
        });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Trade saved to journal');
    } catch (error) {
      console.error('Error saving trade:', error);
      throw error;
    }
  },
  
  /**
   * Get all trades for current user
   */
  async getTrades(): Promise<Position[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userData.user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Convert database records to Position objects
      return data.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        type: trade.type,
        entryPrice: trade.entry_price,
        exitPrice: trade.exit_price,
        stopLoss: trade.stop_loss,
        takeProfit: trade.take_profit,
        size: trade.size,
        status: 'closed' as const,
        entryTime: new Date(trade.entry_time).getTime() / 1000,
        exitTime: trade.exit_time ? new Date(trade.exit_time).getTime() / 1000 : undefined,
        exitReason: trade.exit_reason,
        realizedPnl: trade.realized_pnl,
        realizedPnlPercent: trade.realized_pnl_percent,
        riskRewardRatio: trade.risk_reward_ratio,
        notes: trade.notes,
        tags: trade.tags,
        strategyId: trade.strategy_id,
        sessionId: trade.session_id,
        screenshotUrl: trade.screenshot_url,
      }));
    } catch (error) {
      console.error('Error getting trades:', error);
      return [];
    }
  },
  
  /**
   * Upload chart screenshot
   */
  async uploadScreenshot(file: Blob, tradeId: string): Promise<string | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }
      
      const fileName = `${userData.user.id}/${tradeId}_${Date.now()}.png`;
      
      const { data, error } = await supabase.storage
        .from('trade-screenshots')
        .upload(fileName, file, {
          contentType: 'image/png',
          cacheControl: '3600',
        });
      
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: publicData } = supabase.storage
        .from('trade-screenshots')
        .getPublicUrl(fileName);
      
      return publicData.publicUrl;
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      return null;
    }
  },
  
  /**
   * Delete a trade
   */
  async deleteTrade(tradeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId);
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Trade deleted');
    } catch (error) {
      console.error('Error deleting trade:', error);
      throw error;
    }
  },
  
  /**
   * Update trade notes/tags
   */
  async updateTrade(tradeId: string, updates: Partial<Position>): Promise<void> {
    try {
      const { error } = await supabase
        .from('trades')
        .update({
          notes: updates.notes,
          tags: updates.tags,
          strategy_id: updates.strategyId,
        })
        .eq('id', tradeId);
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Trade updated');
    } catch (error) {
      console.error('Error updating trade:', error);
      throw error;
    }
  }
};

export default supabaseClient;