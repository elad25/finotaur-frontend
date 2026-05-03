// src/hooks/useTradovate.ts
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';

export type TradovateEnv = 'live' | 'demo';

export interface TradovateCredential {
  id: string;
  connection_label: string;
  environment: TradovateEnv;
  account_id: number | null;
  account_name: string | null;
  account_spec: string | null;
  status: 'connected' | 'disconnected' | 'error' | 'pending' | 'expired';
  token_expires_at: string | null;
  last_sync_at: string | null;
  sync_error_message: string | null;
  sync_error_count: number;
}

export interface PortfolioCopyRule {
  id: string;
  source_portfolio_id: string;
  target_portfolio_id: string;
  ratio: number;
  max_contracts: number | null;
  max_daily_loss_usd: number | null;
  is_active: boolean;
  copy_opens: boolean;
  copy_closes: boolean;
}

// ── Query keys
const tradovateKeys = {
  credentials: (userId: string) => ['tradovate_credentials', userId] as const,
  copyRules:   (userId: string) => ['tradovate_copy_rules',  userId] as const,
};

async function fetchCredentials(userId: string): Promise<TradovateCredential[]> {
  const { data, error } = await supabase
    .from('tradovate_credentials')
    .select('id,connection_label,environment,account_id,account_name,account_spec,status,token_expires_at,last_sync_at,sync_error_message,sync_error_count')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error?.code === '42P01') return [];
  if (error) throw error;
  return data ?? [];
}

async function fetchCopyRules(userId: string): Promise<PortfolioCopyRule[]> {
  const { data, error } = await supabase
    .from('portfolio_copy_rules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error?.code === '42P01') return [];
  if (error) throw error;
  return data ?? [];
}

export function useTradovate() {
  const { id: userId } = useEffectiveUser();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // ── React Query — credentials נשמרים בין דפים, לא מתאפסים ל-[]
  const { data: credentials = [] } = useQuery({
    queryKey: tradovateKeys.credentials(userId ?? ''),
    queryFn:  () => fetchCredentials(userId!),
    enabled:  !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime:    30 * 60 * 1000,
  });

  // ── React Query — copy rules
  const { data: copyRules = [] } = useQuery({
    queryKey: tradovateKeys.copyRules(userId ?? ''),
    queryFn:  () => fetchCopyRules(userId!),
    enabled:  !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime:    30 * 60 * 1000,
  });

  // ── Invalidate helpers
  const loadCredentials = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: tradovateKeys.credentials(userId) });
  }, [userId, queryClient]);

  const loadCopyRules = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: tradovateKeys.copyRules(userId) });
  }, [userId, queryClient]);

  // ── Connect: calls Edge Function (never touches keys client-side)
  const connect = useCallback(async (
    environment: TradovateEnv,
    username: string,
    password: string,
    connectionLabel?: string
  ) => {
    if (!userId) return { success: false, error: 'Not authenticated' };
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tradovate-auth', {
        body: { userId, environment, username, password, connectionLabel }
      });
      if (error) throw error;
      loadCredentials();
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['copy_trade_log', userId] });
      toast.success(`Tradovate ${environment} connected — syncing trades...`);
      return { success: true, accountId: data?.accountId };
    } catch (err: any) {
      toast.error(err?.message || 'Connection failed');
      return { success: false, error: err?.message };
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadCredentials, queryClient]);

  // ── Disconnect — deletes credential row entirely
  const disconnect = useCallback(async (environment: TradovateEnv, credentialId?: string) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('tradovate_credentials')
        .delete()
        .eq('user_id', userId);
      if (credentialId) {
        query = query.eq('id', credentialId);
      } else {
        query = query.eq('environment', environment);
      }
      await query;
      await queryClient.invalidateQueries({ queryKey: ['portfolios', userId] });
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      loadCredentials();
      toast.success('Connection removed');
    } catch (err: any) {
      toast.error('Failed to remove connection');
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadCredentials, queryClient]);

  // ── Reconnect: forces refresh for a specific credential by ID
  const reconnect = useCallback(async (credentialId: string) => {
    if (!userId) return { success: false, error: 'Not authenticated' };
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tradovate-auth', {
        body: { mode: 'reconnect', credentialId, userId }
      });
      if (error) throw error;
      loadCredentials();
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['copy_trade_log', userId] });
      toast.success('Reconnected successfully — syncing trades...');
      return { success: true };
    } catch (err: any) {
      toast.error(err?.message || 'Reconnect failed');
      return { success: false, error: err?.message };
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadCredentials, queryClient]);

  // ── Manual sync trigger
  const triggerSync = useCallback(async (environment: TradovateEnv) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      await supabase.functions.invoke('tradovate-sync', {
        body: { userId, environment }
      });
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      loadCredentials();
      toast.success('Sync triggered — new trades will appear shortly');
    } catch (err: any) {
      toast.error('Sync failed');
    } finally {
      setIsLoading(false);
    }
  }, [userId, queryClient, loadCredentials]);

  // ── Update connection label — syncs credentials + portfolios via account_id
  const updateLabel = useCallback(async (credentialId: string, newLabel: string) => {
    if (!userId) return { success: false };
    const trimmed = newLabel.trim();
    if (!trimmed) return { success: false };

    // 1. Update credentials + fetch account_id in one shot
    const { data: credData, error: credError } = await supabase
      .from('tradovate_credentials')
      .update({ connection_label: trimmed })
      .eq('id', credentialId)
      .eq('user_id', userId)
      .select('account_id')
      .single();

    if (credError) {
      toast.error('Failed to update label');
      return { success: false };
    }

    // 2. Sync to portfolios via tradovate_account_id
    if (credData?.account_id) {
      await supabase
        .from('portfolios')
        .update({ connection_label: trimmed })
        .eq('user_id', userId)
        .eq('tradovate_account_id', credData.account_id);
    }

    // 3. Force-remove stale cache so next render fetches fresh data
    queryClient.removeQueries({ queryKey: ['tradovate_credentials', userId] });
    queryClient.removeQueries({ queryKey: ['portfolios', userId] });

    toast.success('Connection renamed');
    return { success: true };
  }, [userId, queryClient]);

  // ── Add copy rule
  const addCopyRule = useCallback(async (
    sourcePortfolioId: string,
    targetPortfolioId: string,
    ratio: number,
    maxContracts?: number
  ) => {
    if (!userId) return;
    const { error } = await supabase.from('portfolio_copy_rules').insert({
      user_id:              userId,
      source_portfolio_id:  sourcePortfolioId,
      target_portfolio_id:  targetPortfolioId,
      ratio,
      max_contracts:        maxContracts ?? null,
      is_active:            true,
      copy_opens:           true,
      copy_closes:          true
    });
    if (!error) {
      loadCopyRules();
      toast.success('Copy rule created');
    } else {
      toast.error('Failed to create rule');
    }
  }, [userId, loadCopyRules]);

  // ── Toggle copy rule active/pause
  const toggleCopyRule = useCallback(async (ruleId: string, isActive: boolean) => {
    await supabase
      .from('portfolio_copy_rules')
      .update({ is_active: isActive })
      .eq('id', ruleId);
    loadCopyRules();
  }, [loadCopyRules]);

  // ── Delete copy rule
  const deleteCopyRule = useCallback(async (ruleId: string) => {
    await supabase.from('portfolio_copy_rules').delete().eq('id', ruleId);
    loadCopyRules();
    toast.success('Copy rule removed');
  }, [loadCopyRules]);

  // ── Derived state
  const liveCredential = credentials.find(c => c.environment === 'live');
  const demoCredential = credentials.find(c => c.environment === 'demo');
  const ACTIVE_STATUSES = ['connected', 'expired', 'error'] as const;
  const hasLiveConnection = liveCredential != null;
  const hasDemoConnection = demoCredential != null;
  const hasAnyConnection  = hasLiveConnection || hasDemoConnection;
  const hasLiveActive     = liveCredential?.status === 'connected';
  const hasDemoActive     = demoCredential?.status === 'connected';

  // SyncStatusBadge data
  const syncStatus = (() => {
    if (!hasAnyConnection) return { type: 'disconnected' as const, label: 'Not connected' };
    const active = liveCredential ?? demoCredential;
    if (active?.sync_error_count && active.sync_error_count > 0)
      return { type: 'error' as const, label: active.sync_error_message || 'Sync error' };
    if (!active?.last_sync_at)
      return { type: 'pending' as const, label: 'Waiting for first sync...' };
    const mins = Math.floor((Date.now() - new Date(active.last_sync_at).getTime()) / 60000);
    const label = mins < 1 ? 'Just synced' : mins < 60 ? `Synced ${mins}m ago` : `Synced ${Math.floor(mins/60)}h ago`;
    return { type: 'connected' as const, label };
  })();

  return {
    credentials, liveCredential, demoCredential, reconnect,
    hasLiveConnection, hasDemoConnection, hasAnyConnection,
    hasLiveActive, hasDemoActive,
    copyRules, syncStatus, isLoading,
    connect, disconnect, triggerSync, updateLabel,
    addCopyRule, toggleCopyRule, deleteCopyRule,
    refresh: () => { loadCredentials(); loadCopyRules(); }
  };
}