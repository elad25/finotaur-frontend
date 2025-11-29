// =====================================================
// FINOTAUR WHOP CONFIGURATION - v2.2.0
// =====================================================
// Place in: src/lib/whop-config.ts
// 
// 🔥 v2.2.0 CHANGES:
// - Added userId to CheckoutOptions for user identification
// - Added metadata[finotaur_user_id] to checkout URL
// - This ensures we can identify the user even if they use
//   a different email in WHOP checkout
// =====================================================

// ============================================
// TYPES
// ============================================

export type PlanName = 'basic' | 'premium';
export type BillingInterval = 'monthly' | 'yearly';
export type PlanId = 'basic_monthly' | 'basic_yearly' | 'premium_monthly' | 'premium_yearly';

export interface PlanConfig {
  id: PlanId;
  whopPlanId: string;      // Plan ID for checkout URLs
  whopProductId: string;   // Product ID for webhooks
  name: PlanName;
  displayName: string;
  price: number;
  period: BillingInterval;
  periodLabel: string;
  monthlyEquivalent?: number;
  features: string[];
  popular?: boolean;
  badge?: string;
  maxTrades: number;
}

// ============================================
// ⚠️ CORRECTED WHOP IDs - BASED ON DASHBOARD ORDER
// ============================================
// Dashboard shows (top to bottom):
// 1. Finotaur Premium – Yearly  $299/year   → plan_gBG436aeJxaHU
// 2. Finotaur Premium           $39.99/month → plan_v7QKxkvKIZooe
// 3. Finotaur Basic – Yearly    $149/year   → plan_x0jTFLe9qNv8i
// 4. Finotaur Basic             $19.99/month → plan_2hIXaJbGP1tYN
// ============================================

// 🔥 Plan IDs - Used for CHECKOUT URLs (CORRECTED!)
export const WHOP_PLAN_IDS = {
  basic_monthly: 'plan_2hIXaJbGP1tYN',      // Finotaur Basic - $19.99/month
  basic_yearly: 'plan_x0jTFLe9qNv8i',       // Finotaur Basic Yearly - $149/year
  premium_monthly: 'plan_v7QKxkvKIZooe',    // Finotaur Premium - $39.99/month
  premium_yearly: 'plan_gBG436aeJxaHU',     // Finotaur Premium Yearly - $299/year
} as const;

// Product IDs - Used for WEBHOOK identification
export const WHOP_PRODUCT_IDS = {
  basic_monthly: 'prod_ZaDN418HLst3r',
  basic_yearly: 'prod_bPwSoYGedsbyh',
  premium_monthly: 'prod_Kq2pmLT1JyGsU',
  premium_yearly: 'prod_vON7zlda6iuII',
} as const;

// Reverse lookup (for webhooks)
export const PRODUCT_ID_TO_PLAN: Record<string, { plan: PlanName; interval: BillingInterval }> = {
  'prod_ZaDN418HLst3r': { plan: 'basic', interval: 'monthly' },
  'prod_bPwSoYGedsbyh': { plan: 'basic', interval: 'yearly' },
  'prod_Kq2pmLT1JyGsU': { plan: 'premium', interval: 'monthly' },
  'prod_vON7zlda6iuII': { plan: 'premium', interval: 'yearly' },
};

// ============================================
// PLAN CONFIGURATIONS
// ============================================

export const PLANS: Record<PlanId, PlanConfig> = {
  basic_monthly: {
    id: 'basic_monthly',
    whopPlanId: WHOP_PLAN_IDS.basic_monthly,
    whopProductId: WHOP_PRODUCT_IDS.basic_monthly,
    name: 'basic',
    displayName: 'Basic',
    price: 19.99,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 25,
    features: [
      'Everything in Free, plus:',
      'Broker sync (12,000+ brokers)',
      '25 trades/month (manual + auto-sync)',
      'Full performance analytics',
      'Strategy builder & tracking',
      'Calendar & trading sessions',
      'Advanced statistics & metrics',
      'Equity curve & charts',
      'Trade screenshots & notes',
      'Email support',
    ],
  },
  basic_yearly: {
    id: 'basic_yearly',
    whopPlanId: WHOP_PLAN_IDS.basic_yearly,
    whopProductId: WHOP_PRODUCT_IDS.basic_yearly,
    name: 'basic',
    displayName: 'Basic',
    price: 149,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 12.42,
    maxTrades: 25,
    badge: 'Save 38%',
    features: [
      'Everything in Free, plus:',
      'Broker sync (12,000+ brokers)',
      '25 trades/month (manual + auto-sync)',
      'Full performance analytics',
      'Strategy builder & tracking',
      'Calendar & trading sessions',
      'Advanced statistics & metrics',
      'Equity curve & charts',
      'Trade screenshots & notes',
      'Email support',
      '2 months FREE!',
    ],
  },
  premium_monthly: {
    id: 'premium_monthly',
    whopPlanId: WHOP_PLAN_IDS.premium_monthly,
    whopProductId: WHOP_PRODUCT_IDS.premium_monthly,
    name: 'premium',
    displayName: 'Premium',
    price: 39.99,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 999999,
    popular: true,
    badge: 'Most Popular',
    features: [
      'Everything in Basic, plus:',
      'Unlimited trades (manual + auto-sync)',
      'No data limits — sync freely',
      'AI-powered insights & coach',
      'Advanced AI analysis',
      'Pattern recognition',
      'Custom AI reports',
      'Behavioral risk alerts',
      'Priority support',
      'Early access to new features',
    ],
  },
  premium_yearly: {
    id: 'premium_yearly',
    whopPlanId: WHOP_PLAN_IDS.premium_yearly,
    whopProductId: WHOP_PRODUCT_IDS.premium_yearly,
    name: 'premium',
    displayName: 'Premium',
    price: 299,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 24.92,
    maxTrades: 999999,
    popular: true,
    badge: 'Best Value',
    features: [
      'Everything in Basic, plus:',
      'Unlimited trades (manual + auto-sync)',
      'No data limits — sync freely',
      'AI-powered insights & coach',
      'Advanced AI analysis',
      'Pattern recognition',
      'Custom AI reports',
      'Behavioral risk alerts',
      'Priority support',
      'Early access to new features',
      '2 months FREE!',
    ],
  },
};

// ============================================
// CHECKOUT URL BUILDER
// ============================================

export interface CheckoutOptions {
  planId: PlanId;
  userEmail?: string;
  userId?: string;           // 🔥 NEW: Finotaur user ID for identification
  affiliateCode?: string;
  clickId?: string;
  redirectUrl?: string;
}

/**
 * Build Whop checkout URL with all necessary parameters
 * 
 * 🔥 v2.2.0: Now includes userId as metadata to ensure we can
 * identify the user even if they use a different email in WHOP
 */
export function buildWhopCheckoutUrl(options: CheckoutOptions): string {
  const { planId, userEmail, userId, affiliateCode, clickId, redirectUrl } = options;
  
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan ID: ${planId}`);
  }
  
  // Use Plan ID for checkout
  const baseUrl = `https://whop.com/checkout/${plan.whopPlanId}`;
  
  // Build query parameters
  const params = new URLSearchParams();
  
  // Pre-fill email if provided
  if (userEmail) {
    params.set('email', userEmail);
  }
  
  // 🔥 NEW: Add Finotaur user ID as metadata
  // This ensures we can identify the user even if they change their email in WHOP
  if (userId) {
    params.set('metadata[finotaur_user_id]', userId);
  }
  
  // Add affiliate tracking
  if (affiliateCode) {
    params.set('d', affiliateCode);
  }
  
  if (clickId) {
    params.set('ref', clickId);
  }
  
  // Success redirect URL
  const baseRedirect = redirectUrl || 'https://www.finotaur.com';
  params.set('redirect_url', `${baseRedirect}/app/journal/overview?payment=success`);
  
  // Build final URL
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

// ============================================
// AFFILIATE SETTINGS
// ============================================

export const AFFILIATE_CONFIG = {
  cookieDurationDays: 30,
  storageKeys: {
    code: 'finotaur_affiliate_code',
    clickId: 'finotaur_affiliate_click_id',
    expires: 'finotaur_affiliate_expires',
  },
  urlParams: ['ref', 'affiliate', 'a', 'via'],
  discountPercent: 10,
};

// ============================================
// FEATURE ACCESS BY PLAN
// ============================================

export const PLAN_FEATURES = {
  free: {
    maxTrades: 10,
    autoSync: false,
    aiInsights: false,
    advancedAnalytics: false,
    prioritySupport: false,
  },
  basic: {
    maxTrades: 25,
    autoSync: true,
    aiInsights: false,
    advancedAnalytics: true,
    prioritySupport: false,
  },
  premium: {
    maxTrades: Infinity,
    autoSync: true,
    aiInsights: true,
    advancedAnalytics: true,
    prioritySupport: true,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const getPlanById = (planId: PlanId): PlanConfig => PLANS[planId];

export const getPlansByName = (name: PlanName): PlanConfig[] => {
  return Object.values(PLANS).filter(plan => plan.name === name);
};

export const getMonthlyPlans = (): PlanConfig[] => {
  return Object.values(PLANS).filter(plan => plan.period === 'monthly');
};

export const getYearlyPlans = (): PlanConfig[] => {
  return Object.values(PLANS).filter(plan => plan.period === 'yearly');
};

export const formatPrice = (price: number, period: string): string => {
  return `$${price.toFixed(2)}${period}`;
};

export const calculateYearlySavings = (monthlyPrice: number, yearlyPrice: number): number => {
  return (monthlyPrice * 12) - yearlyPrice;
};

/**
 * Get plan ID from plan name and billing interval
 */
export const getPlanId = (name: PlanName, interval: BillingInterval): PlanId => {
  return `${name}_${interval}` as PlanId;
};

/**
 * Get Whop Plan ID for checkout
 */
export const getWhopPlanId = (name: PlanName, interval: BillingInterval): string => {
  const planId = getPlanId(name, interval);
  return PLANS[planId].whopPlanId;
};

/**
 * Get Whop Product ID (for webhooks)
 */
export const getWhopProductId = (name: PlanName, interval: BillingInterval): string => {
  const planId = getPlanId(name, interval);
  return PLANS[planId].whopProductId;
};