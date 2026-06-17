// ================================================
// 🚀 STRATEGIES ROUTES - OPTIMIZED & FIXED
// ================================================
// ✅ FIXED: Uses deleted_at instead of is_deleted
// ✅ Soft delete support
// ✅ Admin impersonation support with supabaseAdmin
// ✅ Materialized view integration
// ================================================

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getEffectiveUserId } from '@/lib/journal';

// 🔥 Helper to get the right client based on impersonation
function getClient(isImpersonating: boolean = false) {
  // Check if we're in impersonation mode by looking at sessionStorage
  const impersonatedUserId = typeof window !== 'undefined' 
    ? sessionStorage.getItem('impersonatedUserId') 
    : null;
  
  if ((isImpersonating || impersonatedUserId) && supabaseAdmin) {
    console.log('🔓 Using ADMIN client for strategies (bypassing RLS)');
    return supabaseAdmin;
  }
  
  console.log('🔒 Using REGULAR client for strategies (with RLS)');
  return supabase;
}

/**
 * 🚀 OPTIMIZED: Get all strategies with stats from materialized view
 * ✅ FIXED: Now filters out deleted strategies (deleted_at IS NULL)
 * ✅ IMPERSONATION SUPPORT
 */
export async function getStrategiesWithStats(userId?: string, isImpersonating: boolean = false) {
  try {
    const effectiveUserId = userId || await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: [] };
    }

    console.log('🚀 Loading strategies with stats from view');

    const client = getClient(isImpersonating);

    const { data, error } = await client
      .from('strategy_stats_view')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('status', 'active')
      .is('deleted_at', null)  // ✅ FIXED: Filter deleted strategies
      .order('total_r', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('❌ View error:', error);
      // Fallback to basic fetch
      return await getStrategies(effectiveUserId, isImpersonating);
    }

    console.log(`✅ Loaded ${data?.length || 0} strategies with stats`);
    return { ok: true, data: data || [] };
  } catch (e: any) {
    console.error('❌ Error:', e);
    return await getStrategies(userId, isImpersonating);
  }
}

/**
 * 🚀 OPTIMIZED: Get all strategies (basic, for fallback)
 * ✅ FIXED: Now filters out deleted strategies (deleted_at IS NULL)
 * ✅ IMPERSONATION SUPPORT
 */
export async function getStrategies(userId?: string, isImpersonating: boolean = false) {
  try {
    const effectiveUserId = userId || await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: [] };
    }

    console.log('🔍 Loading basic strategies for user:', effectiveUserId);

    const client = getClient(isImpersonating);

    const { data, error } = await client
      .from('strategies')
      .select('*')
      .eq('user_id', effectiveUserId)
      .is('deleted_at', null)  // ✅ FIXED: Filter out deleted strategies
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error:', error);
      return { ok: false, message: error.message, data: [] };
    }

    console.log(`✅ Loaded ${data?.length || 0} active strategies`);
    return { ok: true, data: data || [] };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error", data: [] };
  }
}

/**
 * 🚀 OPTIMIZED: Create strategy
 */
export async function createStrategy(payload: any) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    if (!payload.name || payload.name.trim() === '') {
      return { ok: false, message: "Strategy name is required" };
    }

    console.log('➕ Creating new strategy:', payload.name);

    // 🔥 Always use regular supabase for mutations (they have user context)
    const { data, error } = await supabase
      .from('strategies')
      .insert({
        user_id: userId,
        name: payload.name.trim(),
        description: payload.description || null,
        category: payload.category || null,
        timeframe: payload.timeframe || null,
        setup_type: payload.setupType || null,
        default_stop_loss: payload.defaultStopLoss || null,
        default_take_profit: payload.defaultTakeProfit || null,
        confirmation_signals: payload.confirmationSignals || null,
        checklist: payload.checklist || null,
        position_sizing_rule: payload.positionSizingRule || null,
        expected_win_rate: payload.expectedWinRate || null,
        avg_rr_goal: payload.avgRRGoal || null,
        planned_1r_usd: payload.planned1rUsd ?? null,
        standard_quantity: payload.standardQuantity ?? null,
        psychological_notes: payload.psychologicalNotes || null,
        typical_session: payload.typicalSession || null,
        status: 'active',
        deleted_at: null  // ✅ Ensure it's not deleted
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Create error:', error);
      return { ok: false, message: error.message };
    }

    console.log('✅ Strategy created:', data.name);
    return { ok: true, data };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * 🚀 OPTIMIZED: Update strategy
 */
export async function updateStrategy(id: string, payload: any) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    if (!payload.name || payload.name.trim() === '') {
      return { ok: false, message: "Strategy name is required" };
    }

    console.log('✏️ Updating strategy:', id);

    // 🔥 Always use regular supabase for mutations
    const { data, error } = await supabase
      .from('strategies')
      .update({
        name: payload.name.trim(),
        description: payload.description,
        category: payload.category,
        timeframe: payload.timeframe,
        setup_type: payload.setupType,
        default_stop_loss: payload.defaultStopLoss,
        default_take_profit: payload.defaultTakeProfit,
        confirmation_signals: payload.confirmationSignals ?? null,
        checklist: payload.checklist ?? null,
        position_sizing_rule: payload.positionSizingRule ?? null,
        expected_win_rate: payload.expectedWinRate ?? null,
        avg_rr_goal: payload.avgRRGoal ?? null,
        planned_1r_usd: payload.planned1rUsd ?? null,
        standard_quantity: payload.standardQuantity ?? null,
        psychological_notes: payload.psychologicalNotes ?? null,
        typical_session: payload.typicalSession ?? null,
        status: payload.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)  // ✅ Only update non-deleted strategies
      .select()
      .single();

    if (error) {
      console.error('❌ Update error:', error);
      return { ok: false, message: error.message };
    }

    console.log('✅ Strategy updated:', data.name);
    return { ok: true, data };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * 🚀 OPTIMIZED: Soft delete strategy
 * ✅ Sets deleted_at timestamp instead of hard delete
 * ✅ Sets strategy_id to NULL in all related trades
 */
export async function deleteStrategy(id: string) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    console.log('🗑️ Soft deleting strategy:', id);

    // 🔥 Always use regular supabase for mutations
    // 1. Soft delete the strategy
    const { error: deleteError } = await supabase
      .from('strategies')
      .update({ 
        deleted_at: new Date().toISOString(),
        status: 'archived'  // Also mark as archived
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return { ok: false, message: deleteError.message };
    }

    // 2. Set strategy_id to NULL in all related trades
    const { error: tradesError } = await supabase
      .from('trades')
      .update({ strategy_id: null })
      .eq('strategy_id', id)
      .eq('user_id', userId);

    if (tradesError) {
      console.warn('⚠️ Warning: Failed to update trades:', tradesError);
      // Don't fail the whole operation
    }

    console.log('✅ Strategy soft deleted:', id);
    return { ok: true };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * 🚀 OPTIMIZED: Hard delete strategy (permanent)
 * ⚠️ Use with caution - this is irreversible!
 */
export async function permanentDeleteStrategy(id: string) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    console.log('🔥 PERMANENT delete strategy:', id);

    // 🔥 Always use regular supabase for mutations
    // 1. Set strategy_id to NULL in all related trades
    await supabase
      .from('trades')
      .update({ strategy_id: null })
      .eq('strategy_id', id)
      .eq('user_id', userId);

    // 2. Hard delete the strategy
    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Permanent delete error:', error);
      return { ok: false, message: error.message };
    }

    console.log('✅ Strategy permanently deleted:', id);
    return { ok: true };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * 🚀 OPTIMIZED: Restore soft-deleted strategy
 */
export async function restoreStrategy(id: string) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    console.log('♻️ Restoring strategy:', id);

    // 🔥 Always use regular supabase for mutations
    const { data, error } = await supabase
      .from('strategies')
      .update({ 
        deleted_at: null,
        status: 'active'
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Restore error:', error);
      return { ok: false, message: error.message };
    }

    console.log('✅ Strategy restored:', data.name);
    return { ok: true, data };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * 🚀 OPTIMIZED: Get single strategy by ID
 * ✅ FIXED: Now filters out deleted strategies (deleted_at IS NULL)
 * ✅ IMPERSONATION SUPPORT
 */
export async function getStrategyById(id: string, userId?: string, isImpersonating: boolean = false) {
  try {
    const effectiveUserId = userId || await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: null };
    }

    console.log('🔍 Loading strategy:', id);

    const client = getClient(isImpersonating);

    const { data, error } = await client
      .from('strategies')
      .select('*')
      .eq('id', id)
      .eq('user_id', effectiveUserId)
      .is('deleted_at', null)  // ✅ FIXED: Filter out deleted strategies
      .single();

    if (error) {
      console.error('❌ Error:', error);
      return { ok: false, message: error.message, data: null };
    }

    console.log('✅ Strategy loaded:', data.name);
    return { ok: true, data };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error", data: null };
  }
}

/**
 * 🚀 OPTIMIZED: Get all deleted strategies (for admin/restore)
 * ✅ IMPERSONATION SUPPORT
 */
export async function getDeletedStrategies(userId?: string, isImpersonating: boolean = false) {
  try {
    const effectiveUserId = userId || await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: [] };
    }

    console.log('🗑️ Loading deleted strategies');

    const client = getClient(isImpersonating);

    const { data, error } = await client
      .from('strategies')
      .select('*')
      .eq('user_id', effectiveUserId)
      .not('deleted_at', 'is', null)  // Only deleted strategies
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('❌ Error:', error);
      return { ok: false, message: error.message, data: [] };
    }

    console.log(`✅ Loaded ${data?.length || 0} deleted strategies`);
    return { ok: true, data: data || [] };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error", data: [] };
  }
}

/**
 * 🚀 OPTIMIZED: Get strategy stats using database function
 * ✅ IMPERSONATION SUPPORT
 */
export async function getStrategyStats(strategyId: string, userId?: string, isImpersonating: boolean = false) {
  try {
    const effectiveUserId = userId || await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: null };
    }

    console.log('📊 Getting stats from database for:', strategyId);

    const client = getClient(isImpersonating);

    const { data, error } = await client.rpc('get_strategy_stats', {
      p_user_id: effectiveUserId,
      p_strategy_id: strategyId
    });

    if (error) {
      console.error('❌ Stats error:', error);
      return { ok: false, message: error.message, data: null };
    }

    console.log('✅ Stats loaded');
    return { ok: true, data };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error", data: null };
  }
}

/**
 * 🚀 OPTIMIZED: Bulk operations
 */
export async function bulkDeleteStrategies(ids: string[]) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    console.log('🗑️ Bulk soft deleting strategies:', ids.length);

    // 🔥 Always use regular supabase for mutations
    // 1. Soft delete strategies
    const { error: deleteError } = await supabase
      .from('strategies')
      .update({ 
        deleted_at: new Date().toISOString(),
        status: 'archived'
      })
      .in('id', ids)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Bulk delete error:', deleteError);
      return { ok: false, message: deleteError.message };
    }

    // 2. Set strategy_id to NULL in all related trades
    const { error: tradesError } = await supabase
      .from('trades')
      .update({ strategy_id: null })
      .in('strategy_id', ids)
      .eq('user_id', userId);

    if (tradesError) {
      console.warn('⚠️ Warning: Failed to update trades:', tradesError);
    }

    console.log('✅ Bulk soft deleted:', ids.length, 'strategies');
    return { ok: true };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error" };
  }
}