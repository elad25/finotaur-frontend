// =====================================================
// FINOTAUR PLANS CONFIGURATION - v3.0.0
// =====================================================
// Place in: src/constants/plans.ts or src/config/plans.ts
//
// 🔥 v3.0.0 CHANGES (2026-06):
// - REMOVED 'basic' tier (zero active subscribers — confirmed)
// - Journal tiers are now: Free (15 lifetime trades, no plan object) and Premium ($44.99/mo)
// =====================================================

export interface Plan {
  id: 'premium';
  name: string;
  price: number;
  yearlyPrice?: number;
  yearlyMonthlyEquivalent?: number;
  description: string;
  features: string[];
  badge?: string;
  trialDays?: number;
  maxTrades: number | 'unlimited';
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
}

// ============================================
// PLANS - Premium only (Basic removed 2026-06)
// Free tier (15 lifetime trades) exists in DB but has no purchasable plan object.
// ============================================

export const PLANS: Plan[] = [
  {
    id: 'premium',
    name: 'Premium',
    price: 44.99,
    yearlyPrice: 409,
    yearlyMonthlyEquivalent: 34.08,
    description: 'Unlimited trades + your AI trading coach',
    trialDays: 0, // No trial - payment from day 0
    maxTrades: 'unlimited',
    features: [
      'Broker sync — leading brokers supported',
      'Unlimited trades — never hit a cap',
      'Connect multiple brokers',
      'Your FINOTAUR Score — one number that grades your real edge',
      'Daily AI briefing — ranked insights on what to fix first',
      'Pattern of the Week — your biggest recurring edge or leak, surfaced automatically',
      'Leak Finder — AI names the exact mistake costing you money',
      'Behavioral & risk alerts before you tilt',
      'Custom AI reports & backtesting',
      'Priority support',
      'Early access to new features',
    ],
    badge: 'Most Popular',
  },
];

// ============================================
// ADDONS
// ============================================

export const ADDONS: Addon[] = [
  {
    id: 'journal',
    name: 'Trading Journal',
    price: 15,
    description: 'Complete trade logging with AI analysis and performance tracking',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a plan by ID
 */
export function getPlanById(id: string): Plan | undefined {
  return PLANS.find(plan => plan.id === id);
}

// getBasicPlan() removed 2026-06 — Basic tier no longer exists.

/**
 * Get the Premium plan
 */
export function getPremiumPlan(): Plan {
  return PLANS.find(plan => plan.id === 'premium')!;
}

/**
 * Check if a plan has a trial period
 */
export function planHasTrial(planId: string): boolean {
  const plan = getPlanById(planId);
  return plan ? (plan.trialDays ?? 0) > 0 : false;
}

/**
 * Get trial days for a plan
 */
export function getPlanTrialDays(planId: string): number {
  const plan = getPlanById(planId);
  return plan?.trialDays ?? 0;
}

/**
 * Calculate yearly savings percentage
 */
export function getYearlySavings(planId: string): number {
  const plan = getPlanById(planId);
  if (!plan || !plan.yearlyMonthlyEquivalent) return 0;
  return Math.round(((plan.price - plan.yearlyMonthlyEquivalent) / plan.price) * 100);
}

// ============================================
// PLAN IDs TYPE (for type safety)
// Basic removed 2026-06 (zero subscribers).
// ============================================

export type PlanId = 'premium';

// ============================================
// PRICING CONSTANTS
// Basic removed 2026-06 (zero subscribers).
// ============================================

export const PRICING = {
  premium: {
    monthly: 44.99,
    yearly: 409,
    yearlyMonthly: 34.08,
    trialDays: 0,
    maxTrades: Infinity,
  },
} as const;

export default PLANS;
