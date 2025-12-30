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
    price: 19.99,
    yearlyPrice: 149,
    yearlyMonthlyEquivalent: 12.42,
    description: 'Essential tools + automatic broker sync',
    trialDays: 14, // 🔥 14-day free trial
    maxTrades: 25,
    features: [
      '14-day free trial',
      'Broker sync (12,000+ brokers)',
      '25 trades/month',
      'Full performance analytics',
      'Strategy builder & tracking',
      'Calendar & trading sessions',
      'Advanced statistics & metrics',
      'Email support',
    ],
    badge: '14-Day Free Trial',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 39.99,
    yearlyPrice: 299,
    yearlyMonthlyEquivalent: 24.92,
    description: 'Unlimited everything + AI intelligence',
    trialDays: 0, // 🔥 NO trial - payment from day 0
    maxTrades: 'unlimited',
    features: [
      'Everything in Basic, plus:',
      'Unlimited trades',
      'AI-powered insights & coach',
      'Advanced AI analysis',
      'Pattern recognition',
      'Custom AI reports',
      'Behavioral risk alerts',
      'Backtesting system',
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
    monthly: 19.99,
    yearly: 149,
    yearlyMonthly: 12.42,
    trialDays: 14,
    maxTrades: 25,
  },
  premium: {
    monthly: 39.99,
    yearly: 299,
    yearlyMonthly: 24.92,
    trialDays: 0,
    maxTrades: Infinity,
  },
} as const;

export default PLANS;