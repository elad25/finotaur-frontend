import { supabase } from '@/lib/supabase';
import { invalidateCache } from '@/lib/smartRefresh';
import { toast } from 'sonner';

/**
 * 📊 יצירת טרייד חדש + Invalidate Cache
 */
export async function createTrade(tradeData: any) {
  try {
    // 🔥 קבל את ה-user_id מה-session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // 🔥 הוסף את user_id ל-payload
    const payload = {
      ...tradeData,
      user_id: user.id
    };

    console.log('✅ Creating trade with user_id:', user.id);
    console.log('📦 Full payload:', payload);

    // 1. יצירת הטרייד
    const { data: trade, error } = await supabase
      .from('trades')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('❌ Insert error:', error);
      throw error;
    }

    console.log('✅ Trade created successfully:', trade);

    // 2. 🔥 Invalidate cache אם יש strategy_id
    if (trade.strategy_id) {
      console.log(`🗑️ Invalidating strategy_stats_view cache (strategy: ${trade.strategy_id})`);
      invalidateCache('strategy_stats_view');
    }

    // 3. 🔥 Invalidate webhook stats אם זה TradingView
    if (trade.broker === 'tradingview') {
      console.log('🗑️ Invalidating webhook_stats cache');
      invalidateCache('webhook_stats');
    }

    toast.success('Trade created successfully');
    return { success: true, trade };
    
  } catch (error: any) {
    console.error('❌ Failed to create trade:', error);
    toast.error(error?.message || 'Failed to create trade');
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * ✏️ עדכון טרייד + Invalidate Cache
 */
export async function updateTrade(
  tradeId: string,
  updates: any
) {
  try {
    // 🔥 קבל את ה-user_id מה-session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('✅ Updating trade:', tradeId);

    // 1. קבל את הטרייד הנוכחי (כדי לדעת אם שינינו strategy)
    const { data: oldTrade } = await supabase
      .from('trades')
      .select('strategy_id, broker')
      .eq('id', tradeId)
      .eq('user_id', user.id) // 🔥 וודא שזה של היוזר
      .single();

    // 2. עדכן
    const { data: trade, error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', tradeId)
      .eq('user_id', user.id) // 🔥 וודא שזה של היוזר
      .select()
      .single();

    if (error) {
      console.error('❌ Update error:', error);
      throw error;
    }

    console.log('✅ Trade updated successfully:', trade);

    // 3. 🔥 Invalidate אם strategy השתנתה או אם סגרנו טרייד
    const strategyChanged = oldTrade?.strategy_id !== trade.strategy_id;
    const tradeClosed = updates.exit_price !== undefined;

    if (strategyChanged || tradeClosed || trade.strategy_id) {
      console.log('🗑️ Invalidating strategy_stats_view cache');
      invalidateCache('strategy_stats_view');
    }

    // 4. 🔥 Invalidate webhook stats אם זה TradingView
    if (trade.broker === 'tradingview') {
      invalidateCache('webhook_stats');
    }

    toast.success('Trade updated successfully');
    return { success: true, trade };
    
  } catch (error: any) {
    console.error('❌ Failed to update trade:', error);
    toast.error(error?.message || 'Failed to update trade');
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * 🗑️ מחיקת טרייד + Invalidate Cache
 */
export async function deleteTrade(tradeId: string) {
  try {
    // 🔥 קבל את ה-user_id מה-session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // 1. קבל את הטרייד לפני המחיקה (כדי לדעת אם לinvalidate)
    const { data: trade } = await supabase
      .from('trades')
      .select('strategy_id, broker')
      .eq('id', tradeId)
      .eq('user_id', user.id) // 🔥 וודא שזה של היוזר
      .single();

    // 2. מחק
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId)
      .eq('user_id', user.id); // 🔥 וודא שזה של היוזר

    if (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }

    console.log('✅ Trade deleted successfully');

    // 3. 🔥 Invalidate cache
    if (trade?.strategy_id) {
      console.log('🗑️ Invalidating strategy_stats_view cache');
      invalidateCache('strategy_stats_view');
    }

    if (trade?.broker === 'tradingview') {
      invalidateCache('webhook_stats');
    }

    toast.success('Trade deleted successfully');
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Failed to delete trade:', error);
    toast.error(error?.message || 'Failed to delete trade');
    return { success: false, error: error?.message || 'Unknown error' };
  }
}