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

// Extracts the real reason + code from an edge-function error.
// supabase.functions.invoke wraps non-2xx responses in FunctionsHttpError whose
// `.message` is the generic "Edge Function returned a non-2xx status code".
// The actual server-side reason lives in `error.context` (a Response object) —
// we read its JSON body and pull out the structured `error` + `code` fields.
async function extractEdgeError(
  err: any,
  fallback: string,
): Promise<{ message: string; code?: string }> {
  // Best-effort — never throw from here, just return the best message we have.
  try {
    const ctx = err?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.clone().json();
      const message = typeof body?.error === 'string' && body.error.trim()
        ? body.error
        : (err?.message || fallback);
      const code = typeof body?.code === 'string' ? body.code : undefined;
      return { message, code };
    }
    if (ctx && typeof ctx.text === 'function') {
      const text = (await ctx.clone().text()).trim();
      if (text) return { message: text.slice(0, 500) };
    }
  } catch {
    /* fall through to message */
  }
  return { message: err?.message || fallback };
}

// Apex / prop-firm-aware hint. Most prop firm accounts (Apex Eval/Trial/PA,
// Topstep, MyFundedFutures, etc.) run on Tradovate's LIVE API even when they
// are "simulated money" — the prop firm pays for live-API access. Tradovate
// Demo (demo.tradovateapi.com) is a separate environment where our app CID
// is NOT registered. Selecting "Demo" in the popup for a prop-firm account
// triggers "The app is not registered". Surface this clearly.
function maybeAddBrokerHint(
  rawError: string,
  username: string,
  environment: TradovateEnv,
  code?: string,
): string {
  const u = username.trim();
  const isApex = /^APEX[_-]?\d+/i.test(u);
  const isPropFirm = isApex || /^(TST|MFF|TOPSTEP|EARN|UPROFIT|LH)[_-]?\d+/i.test(u);

  // Categorized "app not registered" → almost always env mismatch
  if (code === 'app_env_mismatch') {
    if (environment === 'demo' && isPropFirm) {
      return `${rawError}\n\n🎯 חשבונות Apex / prop firm רצים על Tradovate Live — לא על Demo. נסה שוב עם טוגל "Live" (אותם credentials). הכסף עדיין מדומה (זה Eval), זה רק שינוי שרת.`;
    }
    if (environment === 'demo') {
      return `${rawError}\n\n💡 ייתכן שהחשבון רצ על Tradovate Live (לא Demo). נסה שוב עם טוגל "Live".`;
    }
    return `${rawError}\n\n💡 ה-Finotaur app לא רשום ב-Tradovate ל-${environment}. צור קשר עם התמיכה.`;
  }

  // Invalid credentials on an Apex username — could be wrong env OR wrong route
  const looksLikeInvalidCreds =
    code === 'invalid_credentials' ||
    /invalid|unauthorized|denied|wrong|incorrect|not\s+found|no\s+access/i.test(rawError) ||
    /401|403|errorText/i.test(rawError);
  if (isApex && looksLikeInvalidCreds) {
    return `${rawError}\n\nApex tip: (1) וודא שבחרת ב-Apex את ערוץ "Tradovate" (לא Rithmic / NT Connect). (2) Apex Eval רץ על LIVE — נסה לבחור Live ב-Finotaur popup.`;
  }
  return rawError;
}

// NinjaTrader Web accounts authenticate through the same Tradovate cloud
// infrastructure (post-2022 acquisition), so this hook treats both broker
// values as the same surface: same auth flow, same sync, same credentials
// view. Brand-level distinction lives in `broker_connections.broker`.
const TRADOVATE_AUTH_BROKERS = ['tradovate', 'ninja_trader'] as const;
export type TradovateAuthBroker = (typeof TRADOVATE_AUTH_BROKERS)[number];

async function fetchCredentials(userId: string): Promise<TradovateCredential[]> {
  // Post-F1.A: Tradovate lives in broker_connections (was tradovate_credentials).
  // Field renames: connection_label→connection_name, sync_error_message→last_error,
  // sync_error_count→error_count, account_spec→connection_data.account_spec.
  // account_id is now TEXT (was BIGINT) — coerce back for caller compatibility.
  // The legacy TradovateCredential shape is preserved so existing callers don't change.
  const { data, error } = await supabase
    .from('broker_connections')
    .select('id,connection_name,environment,account_id,account_name,connection_data,status,token_expires_at,last_sync_at,last_error,error_count')
    .eq('user_id', userId)
    .in('broker', TRADOVATE_AUTH_BROKERS as unknown as string[])
    .order('created_at', { ascending: true });
  if (error?.code === '42P01') return [];
  if (error) throw error;
  type Row = {
    id: string;
    connection_name: string | null;
    environment: string | null;
    account_id: string | null;
    account_name: string | null;
    connection_data: { account_spec?: string } | null;
    status: string | null;
    token_expires_at: string | null;
    last_sync_at: string | null;
    last_error: string | null;
    error_count: number | null;
  };
  return (data ?? []).map((r: Row): TradovateCredential => ({
    id: r.id,
    connection_label: r.connection_name ?? '',
    environment: (r.environment ?? 'demo') as TradovateEnv,
    account_id: r.account_id != null ? Number(r.account_id) : null,
    account_name: r.account_name,
    account_spec: r.connection_data?.account_spec ?? null,
    status: (r.status ?? 'disconnected') as TradovateCredential['status'],
    token_expires_at: r.token_expires_at,
    last_sync_at: r.last_sync_at,
    sync_error_message: r.last_error,
    sync_error_count: r.error_count ?? 0,
  }));
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
  // `broker` distinguishes whether the user picked the Tradovate tile or
  // the NinjaTrader tile in the popup. Both use the same Tradovate API
  // under the hood, but the broker_connections row is branded accordingly
  // so the dashboard / Trade Copier render the correct logo.
  const connect = useCallback(async (
    environment: TradovateEnv,
    username: string,
    password: string,
    connectionLabel?: string,
    broker: TradovateAuthBroker = 'tradovate'
  ) => {
    if (!userId) return { success: false, error: 'Not authenticated' };
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tradovate-auth', {
        body: { userId, environment, username, password, connectionLabel, broker }
      });
      if (error) {
        // Read the real reason from the response body (FunctionsHttpError wraps
        // it). Without this the toast just says "Edge Function returned a
        // non-2xx status code" and the user has no idea why login failed.
        const { message, code } = await extractEdgeError(error, 'Connection failed');
        throw new Error(maybeAddBrokerHint(message, username, environment, code));
      }
      loadCredentials();
      // 2026-05-18: invalidate the new broker_connections cache too. tradovate-auth
      // INSERTs into broker_connections, but useBrokerConnections reads from a
      // separate query key. Without this the popover stays empty until manual refresh.
      await queryClient.invalidateQueries({ queryKey: ['broker_connections', userId] });
      // Portfolios cache must refresh too — fetchPortfolios falls back to
      // tradovate_credentials when the portfolios table is empty, so the new
      // account only appears in AccountFilterDropdown after invalidation.
      await queryClient.invalidateQueries({ queryKey: ['portfolios', userId] });
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['copy_trade_log', userId] });
      const brandLabel = broker === 'ninja_trader' ? 'NinjaTrader' : 'Tradovate';
      toast.success(`${brandLabel} ${environment} connected — syncing trades...`);
      return { success: true, accountId: data?.accountId };
    } catch (err: any) {
      const msg = err?.message || 'Connection failed';
      toast.error(msg, { duration: 10000 });
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadCredentials, queryClient]);

  // ── Disconnect — deletes broker_connections row entirely (Tradovate scope)
  // Post-F1.A: scoped to broker='tradovate' so we don't accidentally delete IBKR rows
  // when they ship. For soft-disconnect (UI "Disconnect" button → keep row, flip is_active=false),
  // use useBrokerConnections.disconnect instead.
  const disconnect = useCallback(async (environment: TradovateEnv, credentialId?: string) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('broker_connections')
        .delete()
        .eq('user_id', userId)
        .in('broker', TRADOVATE_AUTH_BROKERS as unknown as string[]);
      if (credentialId) {
        query = query.eq('id', credentialId);
      } else {
        query = query.eq('environment', environment);
      }
      await query;
      await queryClient.invalidateQueries({ queryKey: ['broker_connections', userId] });
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

  // ── Update connection label — syncs broker_connections + portfolios via account_id
  // Post-F1.A: writes connection_name (was connection_label). account_id is TEXT in
  // broker_connections; portfolios.tradovate_account_id is BIGINT — coerce.
  const updateLabel = useCallback(async (credentialId: string, newLabel: string) => {
    if (!userId) return { success: false };
    const trimmed = newLabel.trim();
    if (!trimmed) return { success: false };

    // 1. Update broker_connections row + fetch account_id in one shot
    const { data: credData, error: credError } = await supabase
      .from('broker_connections')
      .update({ connection_name: trimmed })
      .eq('id', credentialId)
      .eq('user_id', userId)
      .in('broker', TRADOVATE_AUTH_BROKERS as unknown as string[])
      .select('account_id')
      .single();

    if (credError) {
      toast.error('Failed to update label');
      return { success: false };
    }

    // 2. Sync to portfolios via tradovate_account_id (BIGINT) — coerce TEXT→number
    if (credData?.account_id) {
      const accountIdNum = Number(credData.account_id);
      if (Number.isFinite(accountIdNum)) {
        await supabase
          .from('portfolios')
          .update({ connection_label: trimmed })
          .eq('user_id', userId)
          .eq('tradovate_account_id', accountIdNum);
      }
    }

    // 3. Force-remove stale cache so next render fetches fresh data
    queryClient.removeQueries({ queryKey: ['tradovate_credentials', userId] });
    queryClient.removeQueries({ queryKey: ['broker_connections', userId] });
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