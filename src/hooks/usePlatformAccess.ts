// src/hooks/usePlatformAccess.ts
// =====================================================
// 🔒 PLATFORM ACCESS CONTROL HOOK - v2.0.0
// =====================================================
// Page-level access + daily/monthly usage limits
// Determines correct upgrade target per feature
// =====================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export type PlatformPlan = 'free' | 'platform_core' | 'platform_finotaur' | 'platform_enterprise';

export type FeaturePage =
  | 'stock_analyzer'
  | 'sector_analyzer'
  | 'flow_scanner'
  | 'options_intelligence'
  | 'ai_assistant'
  | 'macro_analyzer'
  | 'my_portfolio'
  | 'ai_scanner'
  | 'options_tab';

interface UsageStatus {
  stockAnalysisToday: number;
  stockAnalysisLimit: number;
  sectorAnalysisMonth: number;
  sectorAnalysisLimit: number;
}

export interface AccessResult {
  hasAccess: boolean;
  reason?: 'plan_too_low' | 'daily_limit' | 'monthly_limit';
  currentUsage?: number;
  limit?: number;
  upgradeTarget?: 'core' | 'finotaur' | 'enterprise';
  upgradeDisplayName?: string;   // "Core" | "Finotaur" | "Enterprise"
  upgradePrice?: string;         // "$59" | "$109" | "$500"
  message?: string;              // Full human-readable message
}

// ============================================
// ACCESS MATRIX - Which plan unlocks which page
// ============================================

const PAGE_ACCESS: Record<PlatformPlan, Record<FeaturePage, boolean>> = {
  free: {
    stock_analyzer: true,
    options_tab: false,         // ❌ Core and above only
    sector_analyzer: false,
    flow_scanner: false,
    options_intelligence: false,
    ai_assistant: false,
    macro_analyzer: false,
    my_portfolio: false,
    ai_scanner: false,
  },
  platform_core: {
    stock_analyzer: true,         // limited 5/day
    sector_analyzer: true,        // limited 3/month
    flow_scanner: true,           // ✅ unlocked at Core
    options_intelligence: false,
    ai_assistant: true,           // ✅ unlocked at Core
    macro_analyzer: false,
    my_portfolio: false,
    ai_scanner: false,
    options_tab: true,            // ✅ unlocked at Core
  },
  platform_finotaur: {
    stock_analyzer: true,         // limited 7/day
    sector_analyzer: true,        // unlimited
    flow_scanner: true,
    options_intelligence: true,
    ai_assistant: true,
    macro_analyzer: true,
    my_portfolio: false,          // ❌ Enterprise only
    ai_scanner: true,
    options_tab: true,
  },
  platform_enterprise: {
    stock_analyzer: true,         // unlimited
    sector_analyzer: true,
    flow_scanner: true,
    options_intelligence: true,
    ai_assistant: true,
    macro_analyzer: true,
    my_portfolio: true,           // ✅ Enterprise exclusive
    ai_scanner: true,
    options_tab: true,
  },
};

// ============================================
// MINIMUM PLAN REQUIRED PER FEATURE
// Used to determine the correct upgrade target
// ============================================

const MINIMUM_PLAN_FOR_FEATURE: Record<FeaturePage, PlatformPlan> = {
  stock_analyzer: 'free',
  options_tab: 'platform_core',
  sector_analyzer: 'platform_core',
  flow_scanner: 'platform_core',
  ai_assistant: 'platform_core',
  options_intelligence: 'platform_finotaur',
  macro_analyzer: 'platform_finotaur',
  ai_scanner: 'platform_finotaur',
  my_portfolio: 'platform_enterprise',
};

// ============================================
// PLAN DISPLAY INFO
// ============================================

const PLAN_INFO: Record<string, { displayName: string; price: string }> = {
  core: { displayName: 'Core', price: '$59/mo' },
  finotaur: { displayName: 'Finotaur', price: '$109/mo' },
  enterprise: { displayName: 'Enterprise', price: '$500/mo' },
};

// ============================================
// PLAN HIERARCHY (for "next tier" logic)
// ============================================

const PLAN_HIERARCHY: PlatformPlan[] = [
  'free',
  'platform_core',
  'platform_finotaur',
  'platform_enterprise',
];

function getUpgradeTarget(
  currentPlan: PlatformPlan,
  requiredPlan: PlatformPlan
): { target: 'core' | 'finotaur' | 'enterprise'; displayName: string; price: string } | null {
  const requiredMap: Record<PlatformPlan, 'core' | 'finotaur' | 'enterprise' | null> = {
    'free': null,
    'platform_core': 'core',
    'platform_finotaur': 'finotaur',
    'platform_enterprise': 'enterprise',
  };

  const target = requiredMap[requiredPlan];
  if (!target) return null;

  const info = PLAN_INFO[target];
  return { target, displayName: info.displayName, price: info.price };
}

function getNextTierForLimit(currentPlan: PlatformPlan): { target: 'core' | 'finotaur' | 'enterprise'; displayName: string; price: string } | null {
  const nextMap: Record<PlatformPlan, 'core' | 'finotaur' | 'enterprise' | null> = {
    'free': 'core',
    'platform_core': 'finotaur',
    'platform_finotaur': 'enterprise',
    'platform_enterprise': null,
  };

  const target = nextMap[currentPlan];
  if (!target) return null;

  const info = PLAN_INFO[target];
  return { target, displayName: info.displayName, price: info.price };
}

// ============================================
// FEATURE DISPLAY NAMES
// ============================================

const FEATURE_DISPLAY_NAMES: Record<FeaturePage, string> = {
  stock_analyzer: 'Stock Analyzer',
  sector_analyzer: 'Sector Analyzer',
  flow_scanner: 'Flow Scanner',
  options_intelligence: 'Options Intelligence',
  ai_assistant: 'AI Assistant',
  macro_analyzer: 'Macro Analyzer',
  my_portfolio: 'My Portfolio',
  ai_scanner: 'AI Scanner',
  options_tab: 'Options Analysis',
};

// ============================================
// HOOK
// ============================================

export function usePlatformAccess() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlatformPlan>('free');
  const [usage, setUsage] = useState<UsageStatus>({
    stockAnalysisToday: 0,
    stockAnalysisLimit: 3,
    sectorAnalysisMonth: 0,
    sectorAnalysisLimit: 0,
  });
  const [loading, setLoading] = useState(true);

  // ── Fetch plan + usage ──
  const fetchAccessStatus = useCallback(async () => {
    if (!user?.id) {
      setPlan('free');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_usage_status', {
        p_user_id: user.id,
      });

      if (!error && data && data.length > 0) {
        const row = data[0];
        setPlan((row.platform_plan || 'free') as PlatformPlan);
        setUsage({
          stockAnalysisToday: row.stock_analysis_today,
          stockAnalysisLimit: row.stock_analysis_limit,
          sectorAnalysisMonth: row.sector_analysis_month,
          sectorAnalysisLimit: row.sector_analysis_limit,
        });
      }
    } catch (err) {
      console.error('Failed to fetch access status:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAccessStatus();
  }, [fetchAccessStatus]);

  // Auto-refetch when tab becomes visible (handles admin grants without re-login)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        fetchAccessStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchAccessStatus, user?.id]);

  // ── Check page access ──
  const canAccessPage = useCallback((page: FeaturePage): AccessResult => {
    const accessMap = PAGE_ACCESS[plan] || PAGE_ACCESS.free;
    const featureDisplayName = FEATURE_DISPLAY_NAMES[page];

    // 1. Page-level access check
    if (!accessMap[page]) {
      const requiredPlan = MINIMUM_PLAN_FOR_FEATURE[page];
      const upgrade = getUpgradeTarget(plan, requiredPlan);

      return {
        hasAccess: false,
        reason: 'plan_too_low',
        upgradeTarget: upgrade?.target,
        upgradeDisplayName: upgrade?.displayName,
        upgradePrice: upgrade?.price,
        message: upgrade
          ? `To unlock ${featureDisplayName}, upgrade to the ${upgrade.displayName} plan (${upgrade.price})`
          : `${featureDisplayName} is not available on your current plan.`,
      };
    }

    // 2. Stock Analyzer daily limit check
    if (page === 'stock_analyzer' && plan !== 'platform_enterprise') {
      if (usage.stockAnalysisToday >= usage.stockAnalysisLimit) {
        const nextTier = getNextTierForLimit(plan);
        return {
          hasAccess: false,
          reason: 'daily_limit',
          currentUsage: usage.stockAnalysisToday,
          limit: usage.stockAnalysisLimit,
          upgradeTarget: nextTier?.target,
          upgradeDisplayName: nextTier?.displayName,
          upgradePrice: nextTier?.price,
          message: nextTier
            ? `You've used all ${usage.stockAnalysisLimit} daily analyses. Upgrade to ${nextTier.displayName} (${nextTier.price}) for more.`
            : `You've used all ${usage.stockAnalysisLimit} daily analyses. Resets tomorrow at midnight.`,
        };
      }
    }

    // 3. Sector Analyzer monthly limit check (Core only)
    if (page === 'sector_analyzer' && plan === 'platform_core') {
      if (usage.sectorAnalysisMonth >= usage.sectorAnalysisLimit) {
        return {
          hasAccess: false,
          reason: 'monthly_limit',
          currentUsage: usage.sectorAnalysisMonth,
          limit: usage.sectorAnalysisLimit,
          upgradeTarget: 'finotaur',
          upgradeDisplayName: 'Finotaur',
          upgradePrice: '$109/mo',
          message: `You've used all ${usage.sectorAnalysisLimit} sector analyses this month. Upgrade to Finotaur ($109/mo) for unlimited access.`,
        };
      }
    }

    return { hasAccess: true };
  }, [plan, usage]);

  // ── Record stock usage ──
  const recordStockAnalysis = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    const currentCount = usage.stockAnalysisToday;
    const limit = usage.stockAnalysisLimit;
    if (currentCount >= limit) return false;

    const { data, error } = await supabase.rpc('increment_daily_usage', {
      p_user_id: user.id,
      p_feature: 'stock_analysis',
    });

    if (!error && data && data.length > 0) {
      const result = data[0];
      setUsage(prev => ({ ...prev, stockAnalysisToday: result.current_count }));
      return true;
    }
    return false;
  }, [user?.id, usage.stockAnalysisToday, usage.stockAnalysisLimit]);

  // ── Record sector usage ──
  const recordSectorAnalysis = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    const { data, error } = await supabase.rpc('increment_monthly_usage', {
      p_user_id: user.id,
      p_feature: 'sector_analysis',
    });

    if (!error && data && data.length > 0) {
      const result = data[0];
      setUsage(prev => ({ ...prev, sectorAnalysisMonth: result.current_count }));
      return result.allowed;
    }
    return false;
  }, [user?.id]);

  // ── Remaining counts ──
  const remaining = useMemo(() => ({
    stockAnalysis: Math.max(0, usage.stockAnalysisLimit - usage.stockAnalysisToday),
    sectorAnalysis: Math.max(0, usage.sectorAnalysisLimit - usage.sectorAnalysisMonth),
  }), [usage]);

  return {
    plan,
    usage,
    remaining,
    loading,
    canAccessPage,
    recordStockAnalysis,
    recordSectorAnalysis,
    refetch: fetchAccessStatus,
    isFreePlan: plan === 'free',
    isCorePlan: plan === 'platform_core',
    isFinotaurPlan: plan === 'platform_finotaur',
    isEnterprisePlan: plan === 'platform_enterprise',
  };
}