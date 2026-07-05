// src/hooks/usePlatformAccess.ts
// =====================================================
// 🔒 PLATFORM ACCESS CONTROL HOOK - v3.0.0
// =====================================================
// Page-level access + daily/monthly usage limits
// Determines correct upgrade target per feature
// v3.0.0 (2026-07): Investor tier — an active Top Secret ("Investor") subscription
// grants platform_investor: Sector & Macro Analyzer + Stock Analyzer 10/day.
// Finotaur exclusives stay locked: Options Intelligence, Flow Scanner, AI Scanner,
// AI Assistant, unlimited AI.
// =====================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export type PlatformPlan = 'free' | 'platform_investor' | 'platform_finotaur' | 'platform_enterprise';

/**
 * Canonical platform_plan in the DB / RPCs is the BARE form ('core' | 'finotaur' | 'enterprise').
 * The webhook historically wrote the prefixed form. Normalize either shape to the prefixed
 * enum this gate uses internally, so bare DB values (incl. admin-granted users) resolve correctly.
 */
function normalizePlatformPlan(raw: string | null | undefined): PlatformPlan {
  const v = (raw || 'free').toString().toLowerCase();
  // 'core' / 'platform_core': Core tier removed 2026-06 (zero subscribers) — treat as free
  if (v === 'platform_core' || v === 'core') return 'free';
  if (v === 'platform_investor' || v === 'investor') return 'platform_investor';
  if (v === 'platform_finotaur' || v === 'finotaur') return 'platform_finotaur';
  if (v === 'platform_enterprise' || v === 'enterprise') return 'platform_enterprise';
  return 'free';
}

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
  upgradeTarget?: 'investor' | 'finotaur' | 'enterprise';
  upgradeDisplayName?: string;   // "Investor" | "Finotaur" | "Copilot"
  upgradePrice?: string;         // "$50" | "$89" | "$200"
  message?: string;              // Full human-readable message
}

// ============================================
// ACCESS MATRIX - Which plan unlocks which page
// ============================================

const PAGE_ACCESS: Record<PlatformPlan, Record<FeaturePage, boolean>> = {
  free: {
    stock_analyzer: true,
    options_tab: false,         // ❌ Finotaur and above only
    sector_analyzer: false,
    flow_scanner: false,
    options_intelligence: false,
    ai_assistant: false,
    macro_analyzer: false,
    my_portfolio: false,
    ai_scanner: false,
  },
  // v3.0.0: Investor — research + limited AI. Finotaur exclusives stay locked.
  platform_investor: {
    stock_analyzer: true,         // limited 10/day
    sector_analyzer: true,        // limited 10/month
    macro_analyzer: true,
    options_tab: false,           // ❌ Finotaur exclusive
    flow_scanner: false,          // ❌ Finotaur exclusive (Dark Pool / institutional)
    options_intelligence: false,  // ❌ Finotaur exclusive
    ai_assistant: false,          // ❌ Finotaur exclusive
    ai_scanner: false,            // ❌ Finotaur exclusive (Top 5 / Catalyst Deck)
    my_portfolio: false,          // ❌ Enterprise only
  },
  platform_finotaur: {
    stock_analyzer: true,         // unlimited (v3.0.0 — was 7/day)
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
  // v3.0.0: Sector & Macro Analyzer unlock at Investor ($50)
  sector_analyzer: 'platform_investor',
  macro_analyzer: 'platform_investor',
  // Finotaur exclusives ($89)
  options_tab: 'platform_finotaur',
  flow_scanner: 'platform_finotaur',
  ai_assistant: 'platform_finotaur',
  options_intelligence: 'platform_finotaur',
  ai_scanner: 'platform_finotaur',
  my_portfolio: 'platform_enterprise',
};

// ============================================
// PLAN DISPLAY INFO
// ============================================

const PLAN_INFO: Record<string, { displayName: string; price: string }> = {
  // 'core' entry removed 2026-06 (Core tier eliminated, zero subscribers)
  investor: { displayName: 'Investor', price: '$50/mo' },
  finotaur: { displayName: 'Finotaur', price: '$89/mo' },
  enterprise: { displayName: 'Ultimate', price: '$200/mo' },
};

// ============================================
// PLAN HIERARCHY (for "next tier" logic)
// ============================================

const PLAN_HIERARCHY: PlatformPlan[] = [
  'free',
  'platform_investor',
  'platform_finotaur',
  'platform_enterprise',
];

type UpgradeTargetKey = 'investor' | 'finotaur' | 'enterprise';

function getUpgradeTarget(
  currentPlan: PlatformPlan,
  requiredPlan: PlatformPlan
): { target: UpgradeTargetKey; displayName: string; price: string } | null {
  // Upgrade ladder: free → investor → finotaur → enterprise
  const requiredMap: Record<PlatformPlan, UpgradeTargetKey | null> = {
    'free': null,
    'platform_investor': 'investor',
    'platform_finotaur': 'finotaur',
    'platform_enterprise': 'enterprise',
  };

  const target = requiredMap[requiredPlan];
  if (!target) return null;

  const info = PLAN_INFO[target];
  return { target, displayName: info.displayName, price: info.price };
}

function getNextTierForLimit(currentPlan: PlatformPlan): { target: UpgradeTargetKey; displayName: string; price: string } | null {
  // v3.0.0: when an Investor hits an AI limit, the fix is Finotaur (unlimited AI).
  // Free users hitting the Stock Analyzer cap are steered to Investor (10/day).
  const nextMap: Record<PlatformPlan, UpgradeTargetKey | null> = {
    'free': 'investor',
    'platform_investor': 'finotaur',
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
      // v3.0.0: fetch usage status + Top Secret ("Investor") subscription in parallel.
      // An active Top Secret sub elevates a free user to the Investor platform tier.
      const [usageRes, profileRes] = await Promise.all([
        supabase.rpc('get_usage_status', { p_user_id: user.id }),
        supabase
          .from('profiles')
          .select('top_secret_enabled, top_secret_status, newsletter_status')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      const { data, error } = usageRes;

      if (!error && data && data.length > 0) {
        const row = data[0];
        let resolvedPlan = normalizePlatformPlan(row.platform_plan);
        let stockLimit = row.stock_analysis_limit;
        let sectorLimit = row.sector_analysis_limit;

        if (resolvedPlan === 'free') {
          const p = profileRes.data;
          // WAR ZONE (newsletter) subscribers were merged into Top Secret 2026-06 —
          // both grant the Investor tier.
          const topSecretActive =
            (p?.top_secret_enabled === true &&
              (p?.top_secret_status === 'active' || p?.top_secret_status === 'trial')) ||
            p?.newsletter_status === 'active' ||
            p?.newsletter_status === 'trial' ||
            p?.newsletter_status === 'trialing';

          if (topSecretActive) {
            resolvedPlan = 'platform_investor';
            // Client-side fallback until get_usage_status returns investor limits natively
            stockLimit = Math.max(stockLimit, 10);
            sectorLimit = Math.max(sectorLimit, 10);
          }
        }

        setPlan(resolvedPlan);
        setUsage({
          stockAnalysisToday: row.stock_analysis_today,
          stockAnalysisLimit: stockLimit,
          sectorAnalysisMonth: row.sector_analysis_month,
          sectorAnalysisLimit: sectorLimit,
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

    // 3. Sector Analyzer monthly limit check — Investor tier is capped (10/month);
    // Finotaur and above get unlimited sector analysis.
    if (page === 'sector_analyzer' && plan === 'platform_investor') {
      if (usage.sectorAnalysisMonth >= usage.sectorAnalysisLimit) {
        const nextTier = getNextTierForLimit(plan);
        return {
          hasAccess: false,
          reason: 'monthly_limit',
          currentUsage: usage.sectorAnalysisMonth,
          limit: usage.sectorAnalysisLimit,
          upgradeTarget: nextTier?.target,
          upgradeDisplayName: nextTier?.displayName,
          upgradePrice: nextTier?.price,
          message: nextTier
            ? `You've used all ${usage.sectorAnalysisLimit} monthly sector analyses. Upgrade to ${nextTier.displayName} (${nextTier.price}) for unlimited.`
            : `You've used all ${usage.sectorAnalysisLimit} monthly sector analyses. Resets on the 1st.`,
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
    isCorePlan: false, // Core tier removed 2026-06; always false (no subscribers)
    isInvestorPlan: plan === 'platform_investor',
    isFinotaurPlan: plan === 'platform_finotaur',
    isEnterprisePlan: plan === 'platform_enterprise',
  };
}