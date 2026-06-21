// =====================================================
// FINOTAUR PLANS CONFIGURATION - v2.0.0
// =====================================================
// Place in: src/constants/plans.ts or src/config/plans.ts
// 
// 🔥 v2.0.0 CHANGES:
// - REMOVED 'free' tier completely
// - Renamed 'pro' → 'basic', 'elite' → 'premium'
// - Added trialDays support (14 days for Basic, 0 for Premium)
// - Updated pricing to match new structure
// =====================================================

export interface Plan {
  id: 'basic' | 'premium';
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
// PLANS - Only Basic & Premium (NO FREE)
// ============================================

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 24.99,
    yearlyPrice: 229,
    yearlyMonthlyEquivalent: 19.08,
    description: 'Every tool serious traders need',
    trialDays: 14, // 🔥 14-day free trial
    maxTrades: 25,
    features: [
      '14-day free trial',
      'Automatic broker sync — leading brokers supported',
      '25 trades / month',
      '1 broker connection',
      'Full FINOTAUR Academy (300+ lessons)',
      'Full performance analytics & equity curve',
      'Strategy builder & playbooks',
      'Trading sessions & tagging',
      'Advanced statistics & metrics',
      'Risk/Reward calculator',
      'Trade screenshots & notes',
      'Email support',
    ],
    badge: '14-Day Free Trial',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 44.99,
    yearlyPrice: 409,
    yearlyMonthlyEquivalent: 34.08,
    description: 'Unlimited trades + your AI trading coach',
    trialDays: 0, // 🔥 NO trial - payment from day 0
    maxTrades: 'unlimited',
    features: [
      'Everything in Basic, plus:',
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

/**
 * Get the Basic plan
 */
export function getBasicPlan(): Plan {
  return PLANS.find(plan => plan.id === 'basic')!;
}

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
// ============================================

export type PlanId = 'basic' | 'premium';

// ============================================
// PRICING CONSTANTS
// ============================================

export const PRICING = {
  basic: {
    monthly: 24.99,
    yearly: 229,
    yearlyMonthly: 19.08,
    trialDays: 14,
    maxTrades: 25,
  },
  premium: {
    monthly: 44.99,
    yearly: 409,
    yearlyMonthly: 34.08,
    trialDays: 0,
    maxTrades: Infinity,
  },
} as const;

export default PLANS;