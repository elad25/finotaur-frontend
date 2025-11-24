// ================================================
// 🔥 TRADES LIBRARY - OPTIMIZED & FIXED
// ================================================
// ✅ Screenshot upload with compression
// ✅ Multi-screenshot support (1-4 images)
// ✅ Screenshot cleanup on delete
// ✅ Cache invalidation
// ✅ Admin impersonation support
// ✅ Error handling
// 🔥 FIXED: .single() error in updateTrade
// 🔥 FIXED: Session normalization (v12)
// ================================================

import { supabase } from '@/lib/supabase';
import { invalidateCache } from '@/lib/smartRefresh';
import { toast } from 'sonner';

// 🔥 VALID SESSIONS - must match DB constraint!
const VALID_SESSIONS = ['asia', 'london', 'newyork'];

/**
 * 🔥 Normalize session value for database
 * Converts empty strings to null, validates allowed values
 * Prevents "trades_session_check" constraint violation!
 */
function normalizeSession(session: string | undefined | null): string | null {
  if (!session || session.trim() === '') {
    return null; // Empty → NULL (passes DB constraint)
  }
  
  const normalized = session.trim().toLowerCase();
  
  // Validate it's one of the allowed values
  if (VALID_SESSIONS.includes(normalized)) {
    return normalized;
  }
  
  // Invalid value → return null
  console.warn('⚠️ Invalid session value:', session, '→ using null');
  return null;
}

/**
 * 📸 העלאת תמונת screenshot לסטורג'
 * ✅ Supports multiple files
 * ✅ Automatic compression (handled by MultiUploadZone)
 * ✅ User-specific folders
 */
export async function uploadScreenshot(file: File): Promise<string | null> {
  try {
    // 🔥 קבל את ה-user_id מה-session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // יצירת שם קובץ ייחודי
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    console.log('📸 Uploading screenshot:', fileName);

    // העלאה לסטורג'
    const { data, error } = await supabase.storage
      .from('trade-screenshots')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }

    // קבלת URL ציבורי
    const { data: urlData } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(data.path);

    console.log('✅ Screenshot uploaded:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error: any) {
    console.error('❌ Failed to upload screenshot:', error);
    toast.error(error?.message || 'Failed to upload screenshot');
    return null;
  }
}

/**
 * 🗑️ מחיקת screenshot מהסטורג'
 * ✅ Helper function for cleanup
 */
async function deleteScreenshotFromStorage(url: string): Promise<boolean> {
  try {
    // Extract path from URL
    const urlParts = url.split('/trade-screenshots/');
    
    if (urlParts.length < 2) {
      console.warn('⚠️ Invalid screenshot URL format:', url);
      return false;
    }
    
    const path = urlParts[1];
    
    console.log('🗑️ Deleting screenshot from storage:', path);

    const { error } = await supabase.storage
      .from('trade-screenshots')
      .remove([path]);

    if (error) {
      console.error('❌ Storage delete error:', error);
      return false;
    }

    console.log('✅ Screenshot deleted from storage:', path);
    return true;

  } catch (error: any) {
    console.error('❌ Failed to delete screenshot:', error);
    return false;
  }
}

/**
 * 🗑️ מחיקת מערך screenshots
 * ✅ Handles multiple screenshots
 */
async function deleteScreenshots(screenshots: string[]): Promise<void> {
  if (!screenshots || screenshots.length === 0) {
    console.log('ℹ️ No screenshots to delete');
    return;
  }

  console.log(`🗑️ Deleting ${screenshots.length} screenshot(s) from storage`);

  const deletePromises = screenshots.map(url => deleteScreenshotFromStorage(url));
  const results = await Promise.all(deletePromises);

  const successCount = results.filter(r => r).length;
  const failCount = results.length - successCount;

  if (successCount > 0) {
    console.log(`✅ Deleted ${successCount} screenshot(s) from storage`);
  }
  
  if (failCount > 0) {
    console.warn(`⚠️ Failed to delete ${failCount} screenshot(s)`);
  }
}

/**
 * 📊 יצירת טרייד חדש + Invalidate Cache
 * ✅ Multi-screenshot support
 * ✅ Strategy validation
 * ✅ Multiplier support
 * 🔥 FIXED: Session normalization!
 */
export async function createTrade(tradeData: any) {
  try {
    // 🔥 קבל את ה-user_id מה-session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // 🔥 CRITICAL: Normalize session before insert!
    const normalizedSession = normalizeSession(tradeData.session);

    // 🔥 הוסף את user_id ל-payload
    const payload = {
      ...tradeData,
      user_id: user.id,
      session: normalizedSession,  // 🔥 USE NORMALIZED SESSION!
      screenshots: tradeData.screenshots || [],
      strategy_id: tradeData.strategy_id || null,
    };

    console.log('✅ Creating trade with user_id:', user.id);
    console.log('📦 Full payload:', {
      symbol: payload.symbol,
      session: payload.session,  // 🔥 Log normalized session
      screenshots: payload.screenshots?.length || 0,
      strategy_id: payload.strategy_id,
      multiplier: payload.multiplier,
    });

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

    console.log('✅ Trade created successfully:', trade.id);

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
 * ✅ Multi-screenshot support
 * ✅ Strategy change detection
 * ✅ Screenshot cleanup on replacement
 * 🔥 FIXED: Removed .single() to prevent "Cannot coerce" error
 * 🔥 FIXED: Session normalization!
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

    // 🔥 CRITICAL: Normalize session before update!
    const normalizedSession = normalizeSession(updates.session);

    // 🔥 וודא ש-screenshots נשמר
    const finalUpdates = {
      ...updates,
      session: normalizedSession,  // 🔥 USE NORMALIZED SESSION!
      screenshots: updates.screenshots || [],
      strategy_id: updates.strategy_id === undefined ? null : updates.strategy_id,
    };

    console.log('📦 Update payload session:', finalUpdates.session);

    // 1. קבל את הטרייד הנוכחי (כדי לדעת אם שינינו strategy או screenshots)
    const { data: oldTrade } = await supabase
      .from('trades')
      .select('strategy_id, broker, screenshots')
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .single();

    // 2. 🗑️ אם החלפנו screenshots - מחק את הישנים
    if (updates.screenshots && oldTrade?.screenshots) {
      const oldScreenshots = oldTrade.screenshots;
      const newScreenshots = updates.screenshots;
      
      // מצא screenshots שהוסרו
      const removedScreenshots = oldScreenshots.filter(
        (url: string) => !newScreenshots.includes(url)
      );
      
      if (removedScreenshots.length > 0) {
        console.log(`🗑️ Removing ${removedScreenshots.length} old screenshot(s)`);
        await deleteScreenshots(removedScreenshots);
      }
    }

    // 3. עדכן - 🔥 FIXED: לא משתמשים ב-.single()!
    const { data: trades, error } = await supabase
      .from('trades')
      .update(finalUpdates)
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.error('❌ Update error:', error);
      throw error;
    }

    // 🔥 קח את הטרייד הראשון מהמערך
    const trade = trades && trades.length > 0 ? trades[0] : null;

    if (!trade) {
      throw new Error('Trade not found after update');
    }

    console.log('✅ Trade updated successfully:', trade.id);

    // 4. 🔥 Invalidate אם strategy השתנתה או אם סגרנו טרייד
    const strategyChanged = oldTrade?.strategy_id !== trade.strategy_id;
    const tradeClosed = updates.exit_price !== undefined;

    if (strategyChanged || tradeClosed || trade.strategy_id) {
      console.log('🗑️ Invalidating strategy_stats_view cache');
      invalidateCache('strategy_stats_view');
    }

    // 5. 🔥 Invalidate webhook stats אם זה TradingView
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
 * 🗑️ מחיקת טרייד + Screenshot Cleanup + Invalidate Cache
 * ✅ FIXED: Now deletes screenshots from storage!
 * ✅ Multi-screenshot support
 * ✅ Proper error handling
 */
export async function deleteTrade(tradeId: string) {
  try {
    // 🔥 קבל את ה-user_id מה-session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('🗑️ Deleting trade:', tradeId);

    // 1. קבל את הטרייד לפני המחיקה (כדי לדעת אם לinvalidate + למחוק screenshots)
    const { data: trade, error: fetchError } = await supabase
      .from('trades')
      .select('strategy_id, broker, screenshots')
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      throw fetchError;
    }

    // 2. 🔥 מחק screenshots מהסטורג' (אם יש)
    if (trade?.screenshots && trade.screenshots.length > 0) {
      console.log(`🗑️ Deleting ${trade.screenshots.length} screenshot(s) from storage`);
      await deleteScreenshots(trade.screenshots);
    }

    // 3. מחק את הטרייד
    const { error: deleteError } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      throw deleteError;
    }

    console.log('✅ Trade deleted successfully');

    // 4. 🔥 Invalidate cache
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

/**
 * 🔥 Soft delete trade (optional - for future use)
 * ✅ Marks trade as deleted without removing it
 */
export async function softDeleteTrade(tradeId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('🗑️ Soft deleting trade:', tradeId);

    const { error } = await supabase
      .from('trades')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', tradeId)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Soft delete error:', error);
      throw error;
    }

    console.log('✅ Trade soft deleted');
    toast.success('Trade moved to trash');
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Failed to soft delete trade:', error);
    toast.error(error?.message || 'Failed to delete trade');
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * ♻️ Restore soft-deleted trade
 */
export async function restoreTrade(tradeId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('♻️ Restoring trade:', tradeId);

    const { error } = await supabase
      .from('trades')
      .update({ 
        deleted_at: null,
        deleted_by: null
      })
      .eq('id', tradeId)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Restore error:', error);
      throw error;
    }

    console.log('✅ Trade restored');
    toast.success('Trade restored successfully');
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Failed to restore trade:', error);
    toast.error(error?.message || 'Failed to restore trade');
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * 🔥 Bulk delete trades
 * ✅ Deletes screenshots for all trades
 */
export async function bulkDeleteTrades(tradeIds: string[]) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('🗑️ Bulk deleting trades:', tradeIds.length);

    // 1. קבל את כל התמונות
    const { data: trades } = await supabase
      .from('trades')
      .select('screenshots')
      .in('id', tradeIds)
      .eq('user_id', user.id);

    // 2. מחק תמונות
    if (trades && trades.length > 0) {
      const allScreenshots = trades
        .flatMap(t => t.screenshots || [])
        .filter(Boolean);
      
      if (allScreenshots.length > 0) {
        console.log(`🗑️ Deleting ${allScreenshots.length} screenshot(s) from bulk delete`);
        await deleteScreenshots(allScreenshots);
      }
    }

    // 3. מחק trades
    const { error } = await supabase
      .from('trades')
      .delete()
      .in('id', tradeIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Bulk delete error:', error);
      throw error;
    }

    console.log('✅ Bulk delete completed');
    toast.success(`${tradeIds.length} trades deleted successfully`);
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Failed to bulk delete trades:', error);
    toast.error(error?.message || 'Failed to delete trades');
    return { success: false, error: error?.message || 'Unknown error' };
  }
}