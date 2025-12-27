// =====================================================
// FINOTAUR WHOP CONFIGURATION - v2.5.0
// =====================================================
// Place in: src/lib/whop-config.ts
// 
// 🔥 v2.5.0 CHANGES:
// - Fixed redirect URL to go to /pricing for risk setup
// - Added source=whop parameter for detection
// 
// =====================================================

// ============================================
// TYPES
// ============================================

export type PlanName = 'basic' | 'premium' | 'newsletter' | 'top_secret';
export type BillingInterval = 'monthly' | 'yearly';
export type PlanId = 
  | 'basic_monthly' 
  | 'basic_yearly' 
  | 'premium_monthly' 
  | 'premium_yearly'
  | 'newsletter_monthly'
  | 'top_secret_monthly'
  | 'top_secret_yearly';

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
  isTopSecret?: boolean;
  discordIncluded?: boolean;
}

// ============================================
// WHOP IDs
// ============================================

// Plan IDs - Used for CHECKOUT URLs
export const WHOP_PLAN_IDS = {
  basic_monthly: 'plan_2hIXaJbGP1tYN',
  basic_yearly: 'plan_x0jTFLe9qNv8i',
  premium_monthly: 'plan_v7QKxkvKIZooe',
  premium_yearly: 'plan_gBG436aeJxaHU',
  // Newsletter (War Zone)
  newsletter_monthly: 'plan_LCBG5yJpoNtW3',
  // 🔥 Top Secret
  top_secret_monthly: 'plan_9VxdBaa2Z5KQy',
  top_secret_yearly: 'plan_YoeD6wWBxss7Q',
} as const;

// Product IDs - Used for WEBHOOK identification
export const WHOP_PRODUCT_IDS = {
  basic_monthly: 'prod_ZaDN418HLst3r',
  basic_yearly: 'prod_bPwSoYGedsbyh',
  premium_monthly: 'prod_Kq2pmLT1JyGsU',
  premium_yearly: 'prod_vON7zlda6iuII',
  // Newsletter
  newsletter_monthly: 'prod_qlaV5Uu6LZlYn',
  // 🔥 Top Secret (same product for both plans)
  top_secret: 'prod_nl6YXbLp4t5pz',
} as const;

// Reverse lookup (for webhooks)
export const PRODUCT_ID_TO_PLAN: Record<string, { plan: PlanName; interval: BillingInterval; isNewsletter?: boolean; isTopSecret?: boolean }> = {
  'prod_ZaDN418HLst3r': { plan: 'basic', interval: 'monthly' },
  'prod_bPwSoYGedsbyh': { plan: 'basic', interval: 'yearly' },
  'prod_Kq2pmLT1JyGsU': { plan: 'premium', interval: 'monthly' },
  'prod_vON7zlda6iuII': { plan: 'premium', interval: 'yearly' },
  // Newsletter
  'prod_qlaV5Uu6LZlYn': { plan: 'newsletter', interval: 'monthly', isNewsletter: true },
  // 🔥 Top Secret
  'prod_nl6YXbLp4t5pz': { plan: 'top_secret', interval: 'monthly', isTopSecret: true },
};

// Plan ID to Name lookup (for webhook plan_id identification)
export const PLAN_ID_TO_NAME: Record<string, string> = {
  // Journal
  'plan_2hIXaJbGP1tYN': 'basic_monthly',
  'plan_x0jTFLe9qNv8i': 'basic_yearly',
  'plan_v7QKxkvKIZooe': 'premium_monthly',
  'plan_gBG436aeJxaHU': 'premium_yearly',
  // Newsletter
  'plan_LCBG5yJpoNtW3': 'newsletter_monthly',
  // 🔥 Top Secret
  'plan_9VxdBaa2Z5KQy': 'top_secret_monthly',
  'plan_YoeD6wWBxss7Q': 'top_secret_yearly',
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
      "Everything in Basic, plus:",
      "Unlimited trades",
      "AI-powered insights & coach",
      "Advanced AI analysis",
      "Pattern recognition",
      "Custom AI reports",
      "Behavioral risk alerts",
      "Backtesting system",
      "Priority support",
      "Early access to new features",
      "🔜 Coming Soon: Auto broker sync"
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
      "Everything in Basic, plus:",
      "Unlimited trades",
      "AI-powered insights & coach",
      "Advanced AI analysis",
      "Pattern recognition",
      "Custom AI reports",
      "Behavioral risk alerts",
      "Backtesting system",
      "Priority support",
      "Early access to new features",
      "🔜 Coming Soon: Auto broker sync"
    ],
  },
  // WAR ZONE NEWSLETTER
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
    discordIncluded: true,
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
  // 🔥 TOP SECRET
  top_secret_monthly: {
    id: 'top_secret_monthly',
    whopPlanId: WHOP_PLAN_IDS.top_secret_monthly,
    whopProductId: WHOP_PRODUCT_IDS.top_secret,
    name: 'top_secret',
    displayName: 'Top Secret',
    price: 35,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0, // Content product, no trade limits
    isTopSecret: true,
    discordIncluded: true,
    features: [
      'Exclusive proprietary content',
      'Private Discord community access',
      'Premium trading signals',
      'Advanced market analysis',
      'Real-time alerts',
    ],
  },
  top_secret_yearly: {
    id: 'top_secret_yearly',
    whopPlanId: WHOP_PLAN_IDS.top_secret_yearly,
    whopProductId: WHOP_PRODUCT_IDS.top_secret,
    name: 'top_secret',
    displayName: 'Top Secret (Annual)',
    price: 300,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 25,
    maxTrades: 0,
    isTopSecret: true,
    discordIncluded: true,
    badge: 'Save 29%',
    features: [
      'Exclusive proprietary content',
      'Private Discord community access',
      'Premium trading signals',
      'Advanced market analysis',
      'Real-time alerts',
      '29% savings vs monthly!',
    ],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function isNewsletterProduct(productId: string): boolean {
  const planInfo = PRODUCT_ID_TO_PLAN[productId];
  return planInfo?.isNewsletter === true;
}

export function isTopSecretProduct(productId: string): boolean {
  return productId === WHOP_PRODUCT_IDS.top_secret;
}

export function isJournalProduct(productId: string): boolean {
  return [
    WHOP_PRODUCT_IDS.basic_monthly,
    WHOP_PRODUCT_IDS.basic_yearly,
    WHOP_PRODUCT_IDS.premium_monthly,
    WHOP_PRODUCT_IDS.premium_yearly,
  ].includes(productId as any);
}

export function getNewsletterPlan(): PlanConfig {
  return PLANS.newsletter_monthly;
}

export function getTopSecretPlans(): { monthly: PlanConfig; yearly: PlanConfig } {
  return {
    monthly: PLANS.top_secret_monthly,
    yearly: PLANS.top_secret_yearly,
  };
}

export function getNewsletterCheckoutUrl(): string {
  return `https://whop.com/checkout/${WHOP_PLAN_IDS.newsletter_monthly}`;
}

export function getTopSecretCheckoutUrl(interval: 'monthly' | 'yearly' = 'monthly'): string {
  const planId = interval === 'yearly' ? WHOP_PLAN_IDS.top_secret_yearly : WHOP_PLAN_IDS.top_secret_monthly;
  return `https://whop.com/checkout/${planId}`;
}

/**
 * Determine billing interval from plan ID
 */
export function getIntervalFromPlanId(planId: string): 'monthly' | 'yearly' {
  const yearlyPlanIds = [
    WHOP_PLAN_IDS.basic_yearly,
    WHOP_PLAN_IDS.premium_yearly,
    WHOP_PLAN_IDS.top_secret_yearly,
  ];
  
  return yearlyPlanIds.includes(planId as any) ? 'yearly' : 'monthly';
}

/**
 * Get price from plan ID
 */
export function getPriceFromPlanId(planId: string): number {
  const planName = PLAN_ID_TO_NAME[planId];
  if (!planName) return 0;
  const plan = PLANS[planName as PlanId];
  return plan?.price ?? 0;
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
  
  // 🔥 v2.5.0: Success redirect URL - Now goes to PRICING page for risk setup
  const baseRedirect = redirectUrl || 'https://www.finotaur.com';
  if (plan.isNewsletter) {
    params.set('redirect_url', `${baseRedirect}/app/all-markets/warzone?payment=success&source=whop`);
  } else if (plan.isTopSecret) {
    params.set('redirect_url', `${baseRedirect}/app/top-secret?payment=success&source=whop`);
  } else {
    // 🔥 CHANGED: Redirect to pricing page so RiskSetupModal shows
    params.set('redirect_url', `${baseRedirect}/app/journal/pricing?payment=success&source=whop`);
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

export function buildTopSecretCheckoutUrl(options: Omit<CheckoutOptions, 'planId'> & { interval?: 'monthly' | 'yearly' }): string {
  const { interval = 'monthly', ...rest } = options;
  return buildWhopCheckoutUrl({
    ...rest,
    planId: interval === 'yearly' ? 'top_secret_yearly' : 'top_secret_monthly',
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
    topSecret: false,
  },
  basic: {
    maxTrades: 25,
    autoSync: true,
    aiInsights: false,
    advancedAnalytics: true,
    prioritySupport: false,
    newsletter: false,
    topSecret: false,
  },
  premium: {
    maxTrades: Infinity,
    autoSync: true,
    aiInsights: true,
    advancedAnalytics: true,
    prioritySupport: true,
    newsletter: false,
    topSecret: false,
  },
  newsletter: {
    maxTrades: 0,
    autoSync: false,
    aiInsights: false,
    advancedAnalytics: false,
    prioritySupport: false,
    newsletter: true,
    topSecret: false,
  },
  top_secret: {
    maxTrades: 0,
    autoSync: false,
    aiInsights: false,
    advancedAnalytics: false,
    prioritySupport: false,
    newsletter: false,
    topSecret: true,
  },
};

// ============================================
// LEGACY HELPER FUNCTIONS
// ============================================

export const getPlanById = (planId: PlanId): PlanConfig => PLANS[planId];

export const getPlansByName = (name: PlanName): PlanConfig[] => {
  return Object.values(PLANS).filter(plan => plan.name === name);
};

export const getMonthlyPlans = (): PlanConfig[] => {
  return Object.values(PLANS).filter(plan => plan.period === 'monthly' && !plan.isNewsletter && !plan.isTopSecret);
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
  return PLANS[planId]?.whopPlanId || '';
};

export const getWhopProductId = (name: PlanName, interval: BillingInterval): string => {
  const planId = getPlanId(name, interval);
  return PLANS[planId]?.whopProductId || '';
};