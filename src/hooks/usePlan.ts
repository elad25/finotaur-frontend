import { useUserProfile } from './useUserProfile';

export type PlanType = 'free' | 'pro' | 'finotaur' | 'elite';

interface UsePlanReturn {
  plan: PlanType;
  addons: string[];
  hasAccess: (requiredPlan?: PlanType, requiredAddon?: string) => boolean;
  updatePlan: (plan: PlanType) => void;
  toggleAddon: (addon: string) => void;
}

const PLAN_HIERARCHY: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  finotaur: 2,
  elite: 3,
};

/**
 * Maps profiles.platform_plan → PlanType (Phase B, 2026-05-09).
 * Mirrors the server-side mapPlatformPlanToTier() in userTier.js.
 *
 * Mapping:
 *   null / 'free'                          → 'free'
 *   'core' / 'platform_core'               → 'pro'
 *   'finotaur' / 'platform_finotaur'       → 'finotaur'
 *   'enterprise' / 'platform_enterprise'   → 'elite'
 *   unknown                                 → 'free' (fail-safe)
 *
 * Journal tier (profiles.account_type basic/premium) is intentionally
 * NOT consulted here — Journal is a separate pricing track ($19.99/$39.99)
 * and does not include AI Arena features.
 */
function mapPlatformPlanToPlanType(platform_plan: string | null | undefined): PlanType {
  if (!platform_plan || platform_plan === 'free') return 'free';
  if (platform_plan === 'core' || platform_plan === 'platform_core') return 'pro';
  if (platform_plan === 'finotaur' || platform_plan === 'platform_finotaur') return 'finotaur';
  if (platform_plan === 'enterprise' || platform_plan === 'platform_enterprise') return 'elite';
  return 'free';
}

/**
 * Real-backend hook: derives the user's plan from profiles.platform_plan
 * (and role for super_admin override). Replaces the previous localStorage
 * mock as of Sprint B Phase B (2026-05-09).
 *
 * Plan changes are driven by Whop webhook → profiles.platform_plan UPDATE.
 * `updatePlan` and `toggleAddon` are now no-ops kept for back-compat with
 * older callsites that destructured them; do not call them — they no
 * longer write anywhere.
 */
export const usePlan = (): UsePlanReturn => {
  const { data: profile } = useUserProfile();

  const plan: PlanType = profile?.role === 'super_admin'
    ? 'elite'
    : mapPlatformPlanToPlanType(profile?.platform_plan);

  const hasAccess = (requiredPlan?: PlanType, _requiredAddon?: string): boolean => {
    if (!requiredPlan) return true;
    return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[requiredPlan];
  };

  return {
    plan,
    addons: [],
    hasAccess,
    updatePlan: () => {},
    toggleAddon: () => {},
  };
};
