// src/lib/admin/adminMaintenance.ts
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * 🔄 רענון כל המטריאלייזד ויוז
 */
export async function refreshMaterializedViews() {
  try {
    const { error } = await supabase.rpc('refresh_all_materialized_views');
    
    if (error) throw error;
    
    toast.success('✅ Views refreshed successfully!');
    return { success: true };
  } catch (error) {
    console.error('Failed to refresh views:', error);
    toast.error('❌ Failed to refresh views');
    return { success: false, error };
  }
}

/**
 * 🔄 איפוס ידני של מונה טרייאדים
 */
export async function manualResetTradeCounters() {
  try {
    const { data, error } = await supabase.rpc('reset_monthly_trade_counts');
    
    if (error) throw error;
    
    toast.success(`✅ Reset ${data || 0} users successfully!`);
    return { success: true, usersReset: data };
  } catch (error) {
    console.error('Failed to reset trade counters:', error);
    toast.error('❌ Failed to reset counters');
    return { success: false, error };
  }
}

/**
 * 📊 בדיקת בריאות המערכת
 */
export async function checkSystemHealth() {
  try {
    const { data, error } = await supabase.rpc('check_system_health');
    
    if (error) throw error;
    
    return { success: true, health: data };
  } catch (error) {
    console.error('Failed to check system health:', error);
    toast.error('❌ Failed to check system health');
    return { success: false, error };
  }
}

/**
 * 🗄️ גודל מסד הנתונים
 */
export async function getDatabaseSize() {
  try {
    const { data, error } = await supabase.rpc('get_database_size');
    
    if (error) throw error;
    
    return { success: true, size: data[0] };
  } catch (error) {
    console.error('Failed to get database size:', error);
    return { success: false, error };
  }
}

/**
 * 📦 גודל טבלאות
 */
export async function getTableSizes() {
  try {
    const { data, error } = await supabase.rpc('get_table_sizes');
    
    if (error) throw error;
    
    return { success: true, tables: data };
  } catch (error) {
    console.error('Failed to get table sizes:', error);
    return { success: false, error };
  }
}

/**
 * 🐌 שאילתות איטיות
 */
export async function getSlowQueries(limit: number = 10) {
  try {
    const { data, error } = await supabase.rpc('get_slow_queries', { limit_count: limit });
    
    if (error) throw error;
    
    return { success: true, queries: data };
  } catch (error) {
    console.error('Failed to get slow queries:', error);
    return { success: false, error };
  }
}

/**
 * 🧹 ניקוי ידני של נתונים ישנים
 */
export async function cleanupOldData() {
  try {
    const { data, error } = await supabase.rpc('manual_cleanup_old_data');
    
    if (error) throw error;
    
    toast.success(`✅ Cleanup complete! 
      Rate limits: ${data.rate_limits_deleted}
      Sessions: ${data.sessions_deactivated}
      Logs: ${data.logs_archived}`);
    
    return { success: true, stats: data };
  } catch (error) {
    console.error('Failed to cleanup old data:', error);
    toast.error('❌ Failed to cleanup data');
    return { success: false, error };
  }
}

/**
 * 📊 סטטיסטיקות Cron Jobs
 */
export async function getCronJobsStatus() {
  try {
    const { data, error } = await supabase
      .from('cron.job')
      .select('jobname, schedule, last_run, next_run')
      .in('jobname', [
        'reset-monthly-trade-counts',
        'check-expired-subscriptions',
        'refresh-webhook-stats',
        'refresh-strategy-stats',
        'cleanup-rate-limits',
        'cleanup-impersonation-sessions',
        'archive-old-audit-logs'
      ]);
    
    if (error) throw error;
    
    return { success: true, jobs: data };
  } catch (error) {
    console.error('Failed to get cron jobs status:', error);
    return { success: false, error };
  }
}
