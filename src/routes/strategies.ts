// src/routes/strategies.ts
import { supabase } from '@/lib/supabase';
import { getEffectiveUserId } from '@/lib/journal';

/**
 * 🚀 OPTIMIZED: Get all strategies with stats from materialized view
 */
export async function getStrategiesWithStats(userId?: string) {
  try {
    const effectiveUserId = userId || await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: [] };
    }

    console.log('🚀 Loading strategies with stats from view');

    const { data, error } = await supabase
      .from('strategy_stats_view')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('status', 'active')
      .order('total_r', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('❌ View error:', error);
      // Fallback to basic fetch
      return await getStrategies(effectiveUserId);
    }

    console.log(`✅ Loaded ${data?.length || 0} strategies with stats`);
    return { ok: true, data: data || [] };
  } catch (e: any) {
    console.error('❌ Error:', e);
    return await getStrategies(userId);
  }
}

/**
 * 🚀 OPTIMIZED: Get all strategies (basic, for fallback)
 */
export async function getStrategies(userId?: string) {
  try {
    const effectiveUserId = userId || await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: [] };
    }

    console.log('🔍 Loading basic strategies');

    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error:', error);
      return { ok: false, message: error.message, data: [] };
    }

    console.log(`✅ Loaded ${data?.length || 0} strategies`);
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
        status: 'active'
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

    const { data, error } = await supabase
      .from('strategies')
      .update({
        name: payload.name,
        description: payload.description,
        category: payload.category,
        timeframe: payload.timeframe,
        setup_type: payload.setupType,
        default_stop_loss: payload.defaultStopLoss,
        default_take_profit: payload.defaultTakeProfit,
        status: payload.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
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
 * 🚀 OPTIMIZED: Delete strategy
 */
export async function deleteStrategy(id: string) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Delete error:', error);
      return { ok: false, message: error.message };
    }

    console.log('✅ Strategy deleted:', id);
    return { ok: true };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * 🚀 OPTIMIZED: Get single strategy by ID
 */
export async function getStrategyById(id: string, userId?: string) {
  try {
    const effectiveUserId = userId || await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: null };
    }

    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', id)
      .eq('user_id', effectiveUserId)
      .single();

    if (error) {
      console.error('❌ Error:', error);
      return { ok: false, message: error.message, data: null };
    }

    return { ok: true, data };
  } catch (e: any) {
    console.error('❌ Exception:', e);
    return { ok: false, message: e?.message || "Network error", data: null };
  }
}

/**
 * 🚀 OPTIMIZED: Get strategy stats using database function
 */
export async function getStrategyStats(strategyId: string, userId?: string) {
  try {
    const effectiveUserId = userId || await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: null };
    }

    console.log('🚀 Getting stats from database for:', strategyId);

    const { data, error } = await supabase.rpc('get_strategy_stats', {
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