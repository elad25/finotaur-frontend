// src/hooks/useCredits.ts
// =====================================================
// FINOTAUR AI CREDITS SYSTEM - HOOK
// =====================================================
// Version: 1.0.0
// Date: 2026-01-03
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  CREDIT_COSTS, 
  ACTION_TYPES, 
  PLAN_CONFIGS,
  SOFT_CAP_MESSAGES,
  type CreditAction,
  type PlanType 
} from '@/constants/credits';

// ============================================
// TYPES
// ============================================

export interface CreditsStatus {
  creditsBalance: number;
  creditsPurchased: number;
  creditsRollover: number;
  creditsTotal: number;
  heavyToday: number;
  heavyLimit: number;
  softCapActive: boolean;
  plan: PlanType;
  monthlyAllocation: number;
  resetDate: Date | null;
}

export interface SpendResult {
  success: boolean;
  creditsSpent?: number;
  creditsRemaining?: number;
  wasSoftCap?: boolean;
  multiplier?: number;
  error?: string;
  requiresUpgrade?: boolean;
  canPurchase?: boolean;
  creditsNeeded?: number;
}

export interface UseCreditsReturn {
  // Status
  status: CreditsStatus | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  spendCredits: (action: CreditAction, metadata?: Record<string, unknown>) => Promise<SpendResult>;
  refreshStatus: () => Promise<void>;
  canAfford: (action: CreditAction) => boolean;
  getEffectiveCost: (action: CreditAction) => number;
  
  // Helpers
  isHeavyAction: (action: CreditAction) => boolean;
  getSoftCapWarning: () => string | null;
  getUpgradeMessage: () => string | null;
}

// ============================================
// DEFAULT STATUS
// ============================================

const DEFAULT_STATUS: CreditsStatus = {
  creditsBalance: 30,
  creditsPurchased: 0,
  creditsRollover: 0,
  creditsTotal: 30,
  heavyToday: 0,
  heavyLimit: 0,
  softCapActive: false,
  plan: 'free',
  monthlyAllocation: 30,
  resetDate: null,
};

// ============================================
// HOOK
// ============================================

export function useCredits(): UseCreditsReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<CreditsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent duplicate fetches
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const FETCH_COOLDOWN = 2000; // 2 seconds

  // ============================================
  // FETCH CREDITS STATUS
  // ============================================
  
  const fetchStatus = useCallback(async (force = false) => {
    if (!user?.id) {
      setStatus(DEFAULT_STATUS);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    const now = Date.now();
    if (!force && (fetchingRef.current || now - lastFetchRef.current < FETCH_COOLDOWN)) {
      return;
    }

    fetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_credits_status', { p_user_id: user.id });

      if (rpcError) {
        console.error('Error fetching credits:', rpcError);
        
        // Fallback: fetch from profiles directly
        const { data: profile } = await supabase
          .from('profiles')
          .select(`
            credits_balance,
            credits_purchased,
            credits_rollover,
            credits_heavy_today,
            credits_heavy_reset_date,
            credits_reset_at,
            platform_plan
          `)
          .eq('id', user.id)
          .single();

        if (profile) {
          const plan = (profile.platform_plan || 'free') as PlanType;
          const planConfig = PLAN_CONFIGS[plan];
          
          setStatus({
            creditsBalance: profile.credits_balance ?? 30,
            creditsPurchased: profile.credits_purchased ?? 0,
            creditsRollover: profile.credits_rollover ?? 0,
            creditsTotal: (profile.credits_balance ?? 30) + 
                         (profile.credits_purchased ?? 0) + 
                         (profile.credits_rollover ?? 0),
            heavyToday: profile.credits_heavy_today ?? 0,
            heavyLimit: planConfig.dailyHeavyLimit,
            softCapActive: (profile.credits_heavy_today ?? 0) >= planConfig.dailyHeavyLimit,
            plan,
            monthlyAllocation: planConfig.monthlyCredits,
            resetDate: profile.credits_reset_at ? new Date(profile.credits_reset_at) : null,
          });
        }
        return;
      }

      if (data && data.length > 0) {
        const row = data[0];
        setStatus({
          creditsBalance: row.credits_balance,
          creditsPurchased: row.credits_purchased,
          creditsRollover: row.credits_rollover,
          creditsTotal: row.credits_total,
          heavyToday: row.credits_heavy_today,
          heavyLimit: row.credits_heavy_limit,
          softCapActive: row.soft_cap_active,
          plan: row.plan as PlanType,
          monthlyAllocation: row.monthly_allocation,
          resetDate: row.reset_date ? new Date(row.reset_date) : null,
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error in fetchStatus:', err);
      setError('Failed to load credits');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id]);

  // ============================================
  // SPEND CREDITS
  // ============================================
  
  const spendCredits = useCallback(async (
    action: CreditAction,
    metadata: Record<string, unknown> = {}
  ): Promise<SpendResult> => {
    if (!user?.id) {
      return { success: false, error: 'Not logged in' };
    }

    const baseCost = CREDIT_COSTS[action];
    const actionType = ACTION_TYPES[action];

    // Light actions are always free - no API call needed
    if (actionType === 'light') {
      return {
        success: true,
        creditsSpent: 0,
        creditsRemaining: status?.creditsTotal ?? 0,
        wasSoftCap: false,
        multiplier: 1,
      };
    }

    try {
      const { data, error: rpcError } = await supabase
        .rpc('spend_credits', {
          p_user_id: user.id,
          p_action_type: actionType,
          p_action_name: action,
          p_base_cost: baseCost,
          p_metadata: metadata,
        });

      if (rpcError) {
        console.error('Error spending credits:', rpcError);
        return { success: false, error: rpcError.message };
      }

      const result = data as SpendResult;

      // Refresh status after spending
      if (result.success) {
        await fetchStatus(true);
      }

      return {
        success: result.success,
        creditsSpent: result.creditsSpent,
        creditsRemaining: result.creditsRemaining,
        wasSoftCap: result.wasSoftCap,
        multiplier: result.multiplier,
        error: result.error,
        requiresUpgrade: result.requiresUpgrade,
        canPurchase: result.canPurchase,
        creditsNeeded: result.creditsNeeded,
      };
    } catch (err) {
      console.error('Error in spendCredits:', err);
      return { success: false, error: 'Failed to process credits' };
    }
  }, [user?.id, status?.creditsTotal, fetchStatus]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  const canAfford = useCallback((action: CreditAction): boolean => {
    if (!status) return false;
    
    const actionType = ACTION_TYPES[action];
    if (actionType === 'light') return true;
    
    const baseCost = CREDIT_COSTS[action];
    const multiplier = (actionType === 'heavy' && status.softCapActive) ? 2 : 1;
    const effectiveCost = baseCost * multiplier;
    
    // Free users can't do heavy actions
    if (actionType === 'heavy' && status.plan === 'free') {
      return false;
    }
    
    return status.creditsTotal >= effectiveCost;
  }, [status]);

  const getEffectiveCost = useCallback((action: CreditAction): number => {
    const baseCost = CREDIT_COSTS[action];
    const actionType = ACTION_TYPES[action];
    
    if (actionType === 'light') return 0;
    if (!status) return baseCost;
    
    const multiplier = (actionType === 'heavy' && status.softCapActive) ? 2 : 1;
    return baseCost * multiplier;
  }, [status]);

  const isHeavyAction = useCallback((action: CreditAction): boolean => {
    return ACTION_TYPES[action] === 'heavy';
  }, []);

  const getSoftCapWarning = useCallback((): string | null => {
    if (!status) return null;
    
    if (status.softCapActive) {
      return SOFT_CAP_MESSAGES.exceeded;
    }
    
    // Warning when approaching limit (1 action away)
    if (status.heavyLimit > 0 && status.heavyToday >= status.heavyLimit - 1) {
      return SOFT_CAP_MESSAGES.approaching;
    }
    
    return null;
  }, [status]);

  const getUpgradeMessage = useCallback((): string | null => {
    if (!status) return null;
    
    if (status.plan === 'free') {
      return 'Upgrade to Core for 600 credits/month!';
    }
    
    if (status.plan === 'core' && status.softCapActive) {
      return SOFT_CAP_MESSAGES.upgrade;
    }
    
    return null;
  }, [status]);

  const refreshStatus = useCallback(async () => {
    await fetchStatus(true);
  }, [fetchStatus]);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Realtime subscription for credit changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`credits:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // Only refresh if credit-related fields changed
          const newData = payload.new as Record<string, unknown>;
          if (
            'credits_balance' in newData ||
            'credits_purchased' in newData ||
            'credits_rollover' in newData ||
            'credits_heavy_today' in newData
          ) {
            fetchStatus(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchStatus]);

  // ============================================
  // RETURN
  // ============================================
  
  return {
    status,
    loading,
    error,
    spendCredits,
    refreshStatus,
    canAfford,
    getEffectiveCost,
    isHeavyAction,
    getSoftCapWarning,
    getUpgradeMessage,
  };
}

// ============================================
// SIMPLE HOOK FOR DISPLAY ONLY
// ============================================

export function useCreditsDisplay() {
  const { status, loading } = useCredits();
  
  return {
    total: status?.creditsTotal ?? 0,
    monthly: status?.creditsBalance ?? 0,
    purchased: status?.creditsPurchased ?? 0,
    rollover: status?.creditsRollover ?? 0,
    plan: status?.plan ?? 'free',
    loading,
    softCapActive: status?.softCapActive ?? false,
    heavyRemaining: Math.max(0, (status?.heavyLimit ?? 0) - (status?.heavyToday ?? 0)),
  };
}

export default useCredits;