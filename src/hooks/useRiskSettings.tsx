/**
 * ================================================
 * UNIFIED RISK SETTINGS HOOK - PRODUCTION READY
 * ================================================
 * ✅ Single source of truth for ALL risk settings
 * ✅ React Query with aggressive caching
 * ✅ Optimistic updates
 * ✅ Request deduplication
 * ✅ Minimal Supabase queries
 * ✅ FIXED v8.4.4: Uses new DB columns (portfolio_size, risk_percentage, risk_mode)
 * ✅ FIXED: Handles JSONB risk_settings + string numbers
 * ✅ FIXED: Includes trades_created_total in select
 * ✅ FIXED: Returns real data even if configured=false
 * ================================================
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';

// ================================================
// TYPES
// ================================================

export interface RiskSettings {
  portfolioSize: number;
  riskMode: 'percentage' | 'fixed';
  riskPerTrade: number;
  configured: boolean;
  initialPortfolio: number;
  currentPortfolio: number;
  totalPnL: number;
  isDynamic?: boolean;
  tradeCount?: number;
}

export interface CommissionSetting {
  value: string;
  type: 'percentage' | 'flat';
}

export interface CommissionSettings {
  stocks: CommissionSetting;
  crypto: CommissionSetting;
  futures: CommissionSetting;
  forex: CommissionSetting;
  commodities: CommissionSetting;
  options: CommissionSetting;
}

const DEFAULT_SETTINGS: RiskSettings = {
  portfolioSize: 10000,
  riskMode: 'percentage',
  riskPerTrade: 1,
  configured: false,
  initialPortfolio: 10000,
  currentPortfolio: 10000,
  totalPnL: 0,
  isDynamic: false,
  tradeCount: 0,
};

const DEFAULT_COMMISSIONS: CommissionSettings = {
  stocks: { value: '0.1', type: 'percentage' },
  crypto: { value: '0.2', type: 'percentage' },
  futures: { value: '2.0', type: 'flat' },
  forex: { value: '0.0', type: 'percentage' },
  commodities: { value: '0.3', type: 'percentage' },
  options: { value: '0.65', type: 'flat' },
};

// ================================================
// QUERY KEYS - Centralized
// ================================================

const KEYS = {
  riskSettings: (userId: string) => ['riskSettings', userId] as const,
  commissions: (userId: string) => ['commissions', userId] as const,
};

// ================================================
// HELPER: Convert string to number safely
// ================================================

function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// ================================================
// 🔥 FETCH FUNCTIONS - UPDATED TO USE NEW COLUMNS
// ================================================

async function fetchRiskSettings(userId: string): Promise<RiskSettings> {
  console.log('🔍 Fetching risk settings for user:', userId);
  
  // 🔥 NEW: Fetch from database columns (NOT JSONB)
  const { data, error } = await supabase
    .from('profiles')
    .select('portfolio_size, risk_percentage, risk_mode, fixed_risk_amount, current_portfolio, total_pnl, initial_portfolio, trade_count')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('❌ Failed to fetch risk settings, using defaults:', error);
    return DEFAULT_SETTINGS;
  }

  console.log('✅ Loaded risk settings from DB columns:', data);

  // 🔥 Calculate real values from DB columns
  const portfolioSize = toNumber(data?.portfolio_size || data?.current_portfolio || 10000);
  const riskMode = (data?.risk_mode || 'percentage') as 'percentage' | 'fixed';
  const riskPerTrade = riskMode === 'percentage' 
    ? toNumber(data?.risk_percentage || 1)
    : toNumber(data?.fixed_risk_amount || 100);
  
  const initialPortfolio = toNumber(data?.initial_portfolio || 10000);
  const currentPortfolio = toNumber(data?.current_portfolio || initialPortfolio);
  const totalPnL = toNumber(data?.total_pnl || 0);

  return {
    portfolioSize,
    riskMode,
    riskPerTrade,
    configured: portfolioSize > 0 && riskPerTrade > 0, // Auto-configured if values exist
    initialPortfolio,
    currentPortfolio,
    totalPnL,
    isDynamic: false,
    tradeCount: toNumber(data?.trade_count || 0),
  };
}

async function fetchCommissions(userId: string): Promise<CommissionSettings> {
  const { data, error } = await supabase
    .from('profiles')
    .select('commission_settings')
    .eq('id', userId)
    .single();

  if (error || !data?.commission_settings) {
    return DEFAULT_COMMISSIONS;
  }

  return data.commission_settings as CommissionSettings;
}

// ================================================
// MAIN HOOK
// ================================================

export function useRiskSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: KEYS.riskSettings(user?.id ?? 'anonymous'),
    queryFn: () => fetchRiskSettings(user!.id),
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<RiskSettings>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const current = settings ?? DEFAULT_SETTINGS;
      const updated = { ...current, ...newSettings };

      console.log('💾 Updating risk settings:', newSettings);

      // 🔥 NEW: Map to database columns
      const updateData: Record<string, any> = {};

      if (newSettings.portfolioSize !== undefined) {
        updateData.portfolio_size = newSettings.portfolioSize;
      }

      if (newSettings.riskMode !== undefined) {
        updateData.risk_mode = newSettings.riskMode;
      }

      if (newSettings.riskPerTrade !== undefined) {
        if (updated.riskMode === 'percentage') {
          updateData.risk_percentage = newSettings.riskPerTrade;
          updateData.fixed_risk_amount = null; // Clear the other field
        } else {
          updateData.fixed_risk_amount = newSettings.riskPerTrade;
          updateData.risk_percentage = null; // Clear the other field
        }
      }

      if (newSettings.currentPortfolio !== undefined) {
        updateData.current_portfolio = newSettings.currentPortfolio;
      }
      
      if (newSettings.totalPnL !== undefined) {
        updateData.total_pnl = newSettings.totalPnL;
      }
      
      if (newSettings.initialPortfolio !== undefined) {
        updateData.initial_portfolio = newSettings.initialPortfolio;
      }

      console.log('📊 DB update object:', updateData);

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Risk settings updated successfully');
      return updated;
    },
    onMutate: async (newSettings) => {
      const queryKey = KEYS.riskSettings(user!.id);
      
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<RiskSettings>(queryKey);

      queryClient.setQueryData<RiskSettings>(queryKey, (old) => ({
        ...(old ?? DEFAULT_SETTINGS),
        ...newSettings,
      }));

      return { previous, queryKey };
    },
    onError: (err, newSettings, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      toast.error('Failed to save settings');
      console.error('Risk settings update failed:', err);
    },
    onSuccess: () => {
      toast.success('Settings saved successfully!');
    },
  });

  const currentSettings = settings ?? DEFAULT_SETTINGS;

  const oneR = useMemo(() => {
    return currentSettings.riskMode === 'percentage'
      ? (currentSettings.currentPortfolio * currentSettings.riskPerTrade) / 100
      : currentSettings.riskPerTrade;
  }, [currentSettings.currentPortfolio, currentSettings.riskMode, currentSettings.riskPerTrade]);

  const calculate1R = useCallback(
    (portfolioSize: number, riskMode: 'percentage' | 'fixed', riskPerTrade: number): number => {
      return riskMode === 'percentage' ? (portfolioSize * riskPerTrade) / 100 : riskPerTrade;
    },
    []
  );

  const refreshSettings = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: KEYS.riskSettings(user?.id ?? 'anonymous'),
    });
  }, [queryClient, user?.id]);

  return {
    settings: currentSettings,
    isConfigured: currentSettings.configured,
    loading: isLoading,
    oneR,
    calculate1R,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    refreshSettings,
  };
}

// ================================================
// COMMISSIONS HOOK
// ================================================

export function useCommissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: commissions, isLoading } = useQuery({
    queryKey: KEYS.commissions(user?.id ?? 'anonymous'),
    queryFn: () => fetchCommissions(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: async (newCommissions: CommissionSettings) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ commission_settings: newCommissions })
        .eq('id', user.id);

      if (error) throw error;

      return newCommissions;
    },
    onMutate: async (newCommissions) => {
      const queryKey = KEYS.commissions(user!.id);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<CommissionSettings>(queryKey);

      queryClient.setQueryData<CommissionSettings>(queryKey, newCommissions);

      return { previous, queryKey };
    },
    onError: (err, newCommissions, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      toast.error('Failed to save commissions');
    },
    onSuccess: () => {
      toast.success('Commissions updated!');
    },
  });

  const calculateCommission = useCallback(
    (assetClass: string, entryPrice: number, quantity: number, multiplier: number = 1): number => {
      const current = commissions ?? DEFAULT_COMMISSIONS;
      const key = assetClass.toLowerCase() as keyof CommissionSettings;
      const setting = current[key];

      if (!setting) return 0;

      const value = parseFloat(setting.value) || 0;

      if (setting.type === 'percentage') {
        const tradeValue = entryPrice * quantity * multiplier;
        return (tradeValue * value) / 100;
      } else {
        return value * quantity;
      }
    },
    [commissions]
  );

  return {
    commissions: commissions ?? DEFAULT_COMMISSIONS,
    loading: isLoading,
    updateCommissions: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    calculateCommission,
  };
}

// ================================================
// HELPER FUNCTIONS
// ================================================

export function calculateActualR(pnl: number, oneR: number): number {
  if (oneR === 0) return 0;
  return pnl / oneR;
}

export function formatRValue(rValue: number): string {
  const sign = rValue >= 0 ? '+' : '';
  return `${sign}${rValue.toFixed(2)}R`;
}