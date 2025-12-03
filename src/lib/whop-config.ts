// =====================================================
// FINOTAUR WHOP CONFIGURATION - v2.3.0
// =====================================================
// Place in: src/lib/whop-config.ts
// 
// 🔥 v2.3.0 CHANGES:
// - Added Newsletter (War Zone) plan
// - Newsletter is separate from trading journal subscription
// - Updates newsletter_enabled field, not account_type
// - 7-day free trial support
// 
// ⚠️ IMPORTANT: Update NEWSLETTER_PRODUCT_ID with actual value!
// =====================================================

// ============================================
// TYPES
// ============================================

export type PlanName = 'basic' | 'premium' | 'newsletter';
export type BillingInterval = 'monthly' | 'yearly';
export type PlanId = 
  | 'basic_monthly' 
  | 'basic_yearly' 
  | 'premium_monthly' 
  | 'premium_yearly'
  | 'newsletter_monthly';

export interface PlanConfig {
  id: PlanId;
  whopPlanId: string;
  whopProductId: string;
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
  trialDays?: number;
  isNewsletter?: boolean;
}

// ============================================
// ⚠️ WHOP IDs - UPDATE NEWSLETTER_PRODUCT_ID!
// ============================================

// Plan IDs - Used for CHECKOUT URLs
export const WHOP_PLAN_IDS = {
  basic_monthly: 'plan_2hIXaJbGP1tYN',
  basic_yearly: 'plan_x0jTFLe9qNv8i',
  premium_monthly: 'plan_v7QKxkvKIZooe',
  premium_yearly: 'plan_gBG436aeJxaHU',
  // 🔥 Newsletter (War Zone)
  newsletter_monthly: 'plan_LCBG5yJpoNtW3',
} as const;

// Product IDs - Used for WEBHOOK identification
// ⚠️ UPDATE 'prod_XXXXXXXX' WITH ACTUAL NEWSLETTER PRODUCT ID!
export const WHOP_PRODUCT_IDS = {
  basic_monthly: 'prod_ZaDN418HLst3r',
  basic_yearly: 'prod_bPwSoYGedsbyh',
  premium_monthly: 'prod_Kq2pmLT1JyGsU',
  premium_yearly: 'prod_vON7zlda6iuII',
  // 🔥 Newsletter - UPDATE THIS WITH ACTUAL PRODUCT ID FROM WHOP DASHBOARD!
  newsletter_monthly: 'prod_qlaV5Uu6LZlYn',  // ⚠️ CHANGE THIS!
} as const;

// Reverse lookup (for webhooks)
export const PRODUCT_ID_TO_PLAN: Record<string, { plan: PlanName; interval: BillingInterval; isNewsletter?: boolean }> = {
  'prod_ZaDN418HLst3r': { plan: 'basic', interval: 'monthly' },
  'prod_bPwSoYGedsbyh': { plan: 'basic', interval: 'yearly' },
  'prod_Kq2pmLT1JyGsU': { plan: 'premium', interval: 'monthly' },
  'prod_vON7zlda6iuII': { plan: 'premium', interval: 'yearly' },
  // 🔥 Newsletter - UPDATE THE KEY WITH ACTUAL PRODUCT ID!
  'prod_qlaV5Uu6LZlYn': { plan: 'newsletter', interval: 'monthly', isNewsletter: true },  // ⚠️ CHANGE KEY!
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
  // 🔥 WAR ZONE NEWSLETTER
  newsletter_monthly: {
    id: 'newsletter_monthly',
    whopPlanId: WHOP_PLAN_IDS.newsletter_monthly,
    whopProductId: WHOP_PRODUCT_IDS.newsletter_monthly,
    name: 'newsletter',
    displayName: 'War Zone Intelligence',
    price: 20,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 7,
    isNewsletter: true,
    badge: '7-Day Free Trial',
    features: [
      'Daily institutional-grade PDF report (8-14 pages)',
      'Macro breakdown & market structure analysis',
      'Unusual Options Activity (UOA) tracking',
      'Technical outlook (24-72h)',
      'Earnings & corporate intel',
      'Private Discord community',
      'Finotaur Trading Room access',
      'Real-time alerts',
      'Chart pack blueprint',
    ],
  },
};

// ============================================
// NEWSLETTER HELPERS
// ============================================

export function isNewsletterProduct(productId: string): boolean {
  const planInfo = PRODUCT_ID_TO_PLAN[productId];
  return planInfo?.isNewsletter === true;
}

export function getNewsletterPlan(): PlanConfig {
  return PLANS.newsletter_monthly;
}

export function getNewsletterCheckoutUrl(): string {
  return `https://whop.com/checkout/${WHOP_PLAN_IDS.newsletter_monthly}`;
}

// ============================================
// CHECKOUT URL BUILDER
// ============================================

export interface CheckoutOptions {
  planId: PlanId;
  userEmail?: string;
  userId?: string;
  affiliateCode?: string;
  clickId?: string;
  redirectUrl?: string;
}

export function buildWhopCheckoutUrl(options: CheckoutOptions): string {
  const { planId, userEmail, userId, affiliateCode, clickId, redirectUrl } = options;
  
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan ID: ${planId}`);
  }
  
  const baseUrl = `https://whop.com/checkout/${plan.whopPlanId}`;
  const params = new URLSearchParams();
  
  if (userEmail) {
    params.set('email', userEmail);
  }
  
  if (userId) {
    params.set('metadata[finotaur_user_id]', userId);
  }
  
  if (affiliateCode) {
    params.set('d', affiliateCode);
  }
  
  if (clickId) {
    params.set('ref', clickId);
  }
  
  // Success redirect URL
  const baseRedirect = redirectUrl || 'https://www.finotaur.com';
  if (plan.isNewsletter) {
    params.set('redirect_url', `${baseRedirect}/app/all-markets/warzone?payment=success`);
  } else {
    params.set('redirect_url', `${baseRedirect}/app/journal/overview?payment=success`);
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function buildNewsletterCheckoutUrl(options: Omit<CheckoutOptions, 'planId'>): string {
  return buildWhopCheckoutUrl({
    ...options,
    planId: 'newsletter_monthly',
  });
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
    newsletter: false,
  },
  basic: {
    maxTrades: 25,
    autoSync: true,
    aiInsights: false,
    advancedAnalytics: true,
    prioritySupport: false,
    newsletter: false,
  },
  premium: {
    maxTrades: Infinity,
    autoSync: true,
    aiInsights: true,
    advancedAnalytics: true,
    prioritySupport: true,
    newsletter: false,
  },
  newsletter: {
    maxTrades: 0,
    autoSync: false,
    aiInsights: false,
    advancedAnalytics: false,
    prioritySupport: false,
    newsletter: true,
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
  return Object.values(PLANS).filter(plan => plan.period === 'monthly' && !plan.isNewsletter);
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

export const getPlanId = (name: PlanName, interval: BillingInterval): PlanId => {
  return `${name}_${interval}` as PlanId;
};

export const getWhopPlanId = (name: PlanName, interval: BillingInterval): string => {
  const planId = getPlanId(name, interval);
  return PLANS[planId].whopPlanId;
};

export const getWhopProductId = (name: PlanName, interval: BillingInterval): string => {
  const planId = getPlanId(name, interval);
  return PLANS[planId].whopProductId;
};