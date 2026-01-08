// =====================================================
// FINOTAUR WHOP CONFIGURATION - v4.2.2
// =====================================================
// 🔥 v4.2.2 CHANGES:
// - War Zone: UPDATED pricing - $39/mo regular, $19.50/mo intro (was $20/$10)
// - War Zone: ADDED yearly plan - $329/year (saves $139)
// - Top Secret: FIXED pricing - $70/mo regular, $35/mo intro (was $35/$17.50)
// - Top Secret Yearly: $500/year (saves $340)
// 
// 🔥 v4.2.0 CHANGES:
// - Newsletter: 7-day trial + 50% OFF first 2 months
// - Top Secret: 14-day trial + 50% OFF first 2 months
// - Updated badges and messaging
// =====================================================

// ============================================
// TYPES
// ============================================

// 🔥 v4.0: Subscription categories
export type SubscriptionCategory = 'journal' | 'platform';

// Journal plans (existing)
export type JournalPlanName = 'basic' | 'premium';

// Platform plans (NEW)
export type PlatformPlanName = 'platform_free' | 'platform_core' | 'platform_pro' | 'platform_enterprise';

// All plan names
export type PlanName = JournalPlanName | PlatformPlanName | 'newsletter' | 'top_secret';

export type BillingInterval = 'monthly' | 'yearly';

export type PlanId = 
  // Journal plans
  | 'basic_monthly' 
  | 'basic_yearly' 
  | 'premium_monthly'
  | 'premium_yearly'
  // Platform plans
  | 'platform_core_monthly'
  | 'platform_core_yearly'
  | 'platform_pro_monthly'
  | 'platform_pro_yearly'
  | 'platform_enterprise'
  // Other products
  | 'newsletter_monthly'
  | 'newsletter_yearly'  // 🔥 v4.2.2: Added War Zone Yearly
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
  trialOnceOnly?: boolean;
  isNewsletter?: boolean;
  isTopSecret?: boolean;
  discordIncluded?: boolean;
  category: SubscriptionCategory;
  isPlatform?: boolean;
  comingSoon?: boolean;
  contactSales?: boolean;
  includesJournal?: 'basic' | 'premium';
  includesNewsletterChoice?: boolean;
  // 🔥 v4.2.0: Discount info
  hasIntroDiscount?: boolean;
  introDiscountMonths?: number;
  introDiscountPercent?: number;
  introPrice?: number;
}

// ============================================
// 🔥 WHOP IDs - REAL PRODUCT IDs
// ============================================

export const WHOP_PLAN_IDS = {
  // Journal - Basic with 14-day trial
  basic_monthly: 'plan_2hIXaJbGP1tYN',
  basic_yearly: 'plan_x0jTFLe9qNv8i',
  
  // Journal - Premium (no trial)
  premium_monthly: 'plan_v7QKxkvKIZooe',
  premium_yearly: 'plan_gBG436aeJxaHU',
  
  // 🔥 Platform - Core ($39/month, 7-day trial)
  platform_core_monthly: 'prod_HDYzeNp6WOJwh',
  platform_core_yearly: 'prod_YAdXQrHtt72Gd',
  
  // 🔥 Platform - Pro ($69/month, 14-day ONE-TIME trial)
  platform_pro_monthly: 'prod_lhe19l7l48lKW',
  platform_pro_yearly: 'prod_3AyUOETP3CoK6',
  
  // 🔥 Platform - Enterprise (custom)
  platform_enterprise: 'plan_PLATFORM_ENTERPRISE',
  
  // Newsletter (War Zone)
  newsletter_monthly: 'plan_LCBG5yJpoNtW3',
  newsletter_yearly: 'prod_8b3VWkZdena4B',  // 🔥 v4.2.2: War Zone Yearly
  
  // Top Secret
  top_secret_monthly: 'plan_mAOfrSszpymjL',  // 🔥 v4.2.2: Updated to $70 plan
  top_secret_yearly: 'plan_YoeD6wWBxss7Q',
} as const;

// 🔥 Product IDs - Used for WEBHOOK identification
export const WHOP_PRODUCT_IDS = {
  // Journal
  basic_monthly: 'prod_ZaDN418HLst3r',
  basic_yearly: 'prod_bPwSoYGedsbyh',
  premium_monthly: 'prod_Kq2pmLT1JyGsU',
  premium_yearly: 'prod_vON7zlda6iuII',
  
  // 🔥 Platform - REAL IDs!
  platform_core_monthly: 'prod_HDYzeNp6WOJwh',
  platform_core_yearly: 'prod_YAdXQrHtt72Gd',
  platform_pro_monthly: 'prod_lhe19l7l48lKW',
  platform_pro_yearly: 'prod_3AyUOETP3CoK6',
  platform_enterprise: 'prod_PLATFORM_ENTERPRISE',
  
  // Other
  newsletter_monthly: 'prod_qlaV5Uu6LZlYn',
  newsletter_yearly: 'prod_8b3VWkZdena4B',  // 🔥 v4.2.2: War Zone Yearly
  top_secret: 'prod_nl6YXbLp4t5pz',
} as const;

// 🔥 Platform Product IDs Set - for quick lookup
export const PLATFORM_PRODUCT_IDS = new Set([
  'prod_HDYzeNp6WOJwh',  // Core Monthly
  'prod_YAdXQrHtt72Gd',  // Core Yearly
  'prod_lhe19l7l48lKW',  // Pro Monthly
  'prod_3AyUOETP3CoK6',  // Pro Yearly
  'prod_PLATFORM_ENTERPRISE',
]);

// Reverse lookup (for webhooks)
export const PRODUCT_ID_TO_PLAN: Record<string, { 
  plan: PlanName; 
  interval: BillingInterval; 
  category: SubscriptionCategory;
  isNewsletter?: boolean; 
  isTopSecret?: boolean;
  isPlatform?: boolean;
}> = {
  // Journal
  'prod_ZaDN418HLst3r': { plan: 'basic', interval: 'monthly', category: 'journal' },
  'prod_bPwSoYGedsbyh': { plan: 'basic', interval: 'yearly', category: 'journal' },
  'prod_Kq2pmLT1JyGsU': { plan: 'premium', interval: 'monthly', category: 'journal' },
  'prod_vON7zlda6iuII': { plan: 'premium', interval: 'yearly', category: 'journal' },
  
  // 🔥 Platform - REAL IDs!
  'prod_HDYzeNp6WOJwh': { plan: 'platform_core', interval: 'monthly', category: 'platform', isPlatform: true },
  'prod_YAdXQrHtt72Gd': { plan: 'platform_core', interval: 'yearly', category: 'platform', isPlatform: true },
  'prod_lhe19l7l48lKW': { plan: 'platform_pro', interval: 'monthly', category: 'platform', isPlatform: true },
  'prod_3AyUOETP3CoK6': { plan: 'platform_pro', interval: 'yearly', category: 'platform', isPlatform: true },
  'prod_PLATFORM_ENTERPRISE': { plan: 'platform_enterprise', interval: 'monthly', category: 'platform', isPlatform: true },
  
  // Other
  'prod_qlaV5Uu6LZlYn': { plan: 'newsletter', interval: 'monthly', category: 'journal', isNewsletter: true },
  'prod_8b3VWkZdena4B': { plan: 'newsletter', interval: 'yearly', category: 'journal', isNewsletter: true },  // 🔥 v4.2.2
  'prod_nl6YXbLp4t5pz': { plan: 'top_secret', interval: 'monthly', category: 'journal', isTopSecret: true },
};

// Plan ID to Name lookup
export const PLAN_ID_TO_NAME: Record<string, string> = {
  // Journal
  'plan_2hIXaJbGP1tYN': 'basic_monthly',
  'plan_x0jTFLe9qNv8i': 'basic_yearly',
  'plan_v7QKxkvKIZooe': 'premium_monthly',
  'plan_gBG436aeJxaHU': 'premium_yearly',
  
  // Platform
  'prod_HDYzeNp6WOJwh': 'platform_core_monthly',
  'prod_YAdXQrHtt72Gd': 'platform_core_yearly',
  'prod_lhe19l7l48lKW': 'platform_pro_monthly',
  'prod_3AyUOETP3CoK6': 'platform_pro_yearly',
  'plan_PLATFORM_ENTERPRISE': 'platform_enterprise',
  
  // Other
  'plan_LCBG5yJpoNtW3': 'newsletter_monthly',
  'prod_8b3VWkZdena4B': 'newsletter_yearly',  // 🔥 v4.2.2
  'plan_mAOfrSszpymjL': 'top_secret_monthly',  // 🔥 v4.2.2: Updated to $70 plan
  'plan_YoeD6wWBxss7Q': 'top_secret_yearly',
};

// ============================================
// PLAN CONFIGURATIONS
// ============================================

export const PLANS: Record<PlanId, PlanConfig> = {
  // ═══════════════════════════════════════════
  // JOURNAL - BASIC (WITH 14-DAY FREE TRIAL)
  // ═══════════════════════════════════════════
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
    trialDays: 14,
    badge: '14-Day Free Trial',
    category: 'journal',
    features: [
      '14-day free trial',
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
    trialDays: 14,
    badge: '14-Day Free Trial + Save 38%',
    category: 'journal',
    features: [
      '14-day free trial',
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

  // ═══════════════════════════════════════════
  // JOURNAL - PREMIUM (NO TRIAL)
  // ═══════════════════════════════════════════
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
    category: 'journal',
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
    category: 'journal',
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
  },

  // ═══════════════════════════════════════════
  // 🔥 PLATFORM - CORE ($39/month, 7-day trial)
  // ═══════════════════════════════════════════
  platform_core_monthly: {
    id: 'platform_core_monthly',
    whopPlanId: WHOP_PLAN_IDS.platform_core_monthly,
    whopProductId: WHOP_PRODUCT_IDS.platform_core_monthly,
    name: 'platform_core',
    displayName: 'Core',
    price: 39,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 7,
    trialOnceOnly: false,  // Can use trial multiple times
    badge: '7-Day Free Trial',
    category: 'platform',
    isPlatform: true,
    features: [
      '7-day free trial',
      'Full market dashboard',
      'Real-time market data',
      'Advanced charts & indicators',
      'Unlimited watchlists',
      '50 price alerts',
      'Basic screeners',
      'Daily market briefing',
      'Priority email support',
    ],
  },
  platform_core_yearly: {
    id: 'platform_core_yearly',
    whopPlanId: WHOP_PLAN_IDS.platform_core_yearly,
    whopProductId: WHOP_PRODUCT_IDS.platform_core_yearly,
    name: 'platform_core',
    displayName: 'Core',
    price: 349,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 29.08,
    maxTrades: 0,
    trialDays: 0,  // NO trial for yearly!
    badge: 'Save 25%',
    category: 'platform',
    isPlatform: true,
    features: [
      'Full market dashboard',
      'Real-time market data',
      'Advanced charts & indicators',
      'Unlimited watchlists',
      '50 price alerts',
      'Basic screeners',
      'Daily market briefing',
      'Priority email support',
      '3 months FREE!',
    ],
  },

  // ═══════════════════════════════════════════
  // 🔥 PLATFORM - PRO ($69/month, 14-day ONE-TIME trial)
  // Includes: Journal Premium + Newsletter choice
  // ═══════════════════════════════════════════
  platform_pro_monthly: {
    id: 'platform_pro_monthly',
    whopPlanId: WHOP_PLAN_IDS.platform_pro_monthly,
    whopProductId: WHOP_PRODUCT_IDS.platform_pro_monthly,
    name: 'platform_pro',
    displayName: 'Pro',
    price: 69,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 14,
    trialOnceOnly: true,  // 🔥 ONE-TIME ONLY!
    popular: true,
    badge: '14-Day Free Trial',
    category: 'platform',
    isPlatform: true,
    includesJournal: 'premium',
    includesNewsletterChoice: true,
    features: [
      '14-day free trial (one-time only)',
      'Everything in Core, plus:',
      '🎁 Journal Premium INCLUDED ($40/mo value)',
      '🎁 Choose 1 Newsletter included',
      'AI-powered market insights',
      'Advanced screeners',
      'Custom reports & exports',
      'Unlimited price alerts',
      'API access (5,000 calls/day)',
      'Historical data (10 years)',
      'Options flow analysis',
      'Institutional-grade analytics',
      'Priority support (24h response)',
      'Early access to new features',
    ],
  },
  platform_pro_yearly: {
    id: 'platform_pro_yearly',
    whopPlanId: WHOP_PLAN_IDS.platform_pro_yearly,
    whopProductId: WHOP_PRODUCT_IDS.platform_pro_yearly,
    name: 'platform_pro',
    displayName: 'Pro',
    price: 619,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 51.58,
    maxTrades: 0,
    trialDays: 0,  // NO trial for yearly!
    trialOnceOnly: true,
    popular: true,
    badge: 'Best Value - Save 25%',
    category: 'platform',
    isPlatform: true,
    includesJournal: 'premium',
    includesNewsletterChoice: true,
    features: [
      'Everything in Core, plus:',
      '🎁 Journal Premium INCLUDED ($40/mo value)',
      '🎁 Choose 1 Newsletter included',
      'AI-powered market insights',
      'Advanced screeners',
      'Custom reports & exports',
      'Unlimited price alerts',
      'API access (5,000 calls/day)',
      'Historical data (10 years)',
      'Options flow analysis',
      'Institutional-grade analytics',
      'Priority support (24h response)',
      'Early access to new features',
      '3 months FREE!',
    ],
  },

  // ═══════════════════════════════════════════
  // 🔥 PLATFORM - ENTERPRISE (Coming Soon)
  // ═══════════════════════════════════════════
  platform_enterprise: {
    id: 'platform_enterprise',
    whopPlanId: WHOP_PLAN_IDS.platform_enterprise,
    whopProductId: WHOP_PRODUCT_IDS.platform_enterprise,
    name: 'platform_enterprise',
    displayName: 'Enterprise',
    price: 0,
    period: 'monthly',
    periodLabel: 'Custom pricing',
    maxTrades: 0,
    badge: 'Contact Sales',
    category: 'platform',
    isPlatform: true,
    comingSoon: true,
    contactSales: true,
    includesJournal: 'premium',
    features: [
      'Everything in Pro, plus:',
      'Dedicated account manager',
      'Custom integrations',
      'White-label options',
      'Unlimited API access',
      'Custom SLA',
      'On-premise deployment option',
      'Team management',
      'SSO / SAML authentication',
      'Custom training & onboarding',
      'Direct Slack/Discord support',
    ],
  },

  // ═══════════════════════════════════════════
  // 🔥 v4.2.2: NEWSLETTER (WAR ZONE) - 7-day trial + 50% OFF first 2 months
  // UPDATED: $39/month regular, $19.50/month intro
  // ═══════════════════════════════════════════
  newsletter_monthly: {
    id: 'newsletter_monthly',
    whopPlanId: WHOP_PLAN_IDS.newsletter_monthly,
    whopProductId: WHOP_PRODUCT_IDS.newsletter_monthly,
    name: 'newsletter',
    displayName: 'War Zone Intelligence',
    price: 39,  // 🔥 UPDATED: Was 20, now 39
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 7,
    isNewsletter: true,
    discordIncluded: true,
    badge: '🔥 7-Day Trial + 50% OFF First 2 Months',
    category: 'journal',
    // 🔥 v4.2.2: Discount info - UPDATED
    hasIntroDiscount: true,
    introDiscountMonths: 2,
    introDiscountPercent: 50,
    introPrice: 19.50,  // 🔥 UPDATED: Was 10, now 19.50
    features: [
      '🎁 7 days FREE trial',
      '🔥 Then $19.50/month for 2 months (50% OFF)',
      '💰 Regular price: $39/month after',
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

  // 🔥 v4.2.2: WAR ZONE YEARLY - NEW!
  newsletter_yearly: {
    id: 'newsletter_yearly',
    whopPlanId: WHOP_PLAN_IDS.newsletter_yearly,
    whopProductId: WHOP_PRODUCT_IDS.newsletter_yearly,
    name: 'newsletter',
    displayName: 'War Zone Intelligence (Annual)',
    price: 329,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 27.42,  // $329/12 = ~$27.42/month
    maxTrades: 0,
    trialDays: 7,
    isNewsletter: true,
    discordIncluded: true,
    badge: '🔥 7-Day Trial + Save $139/year',  // ($39*12) - $329 = $139 savings
    category: 'journal',
    features: [
      '🎁 7 days FREE trial',
      '💰 Save $139/year vs monthly',
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

  // ═══════════════════════════════════════════
  // 🔥 v4.2.1: TOP SECRET - 14-day trial + 50% OFF first 2 months
  // FIXED: $70/month regular, $35/month intro
  // ═══════════════════════════════════════════
  top_secret_monthly: {
    id: 'top_secret_monthly',
    whopPlanId: WHOP_PLAN_IDS.top_secret_monthly,
    whopProductId: WHOP_PRODUCT_IDS.top_secret,
    name: 'top_secret',
    displayName: 'Top Secret',
    price: 70,  // 🔥 FIXED: Was 35, now 70
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 14,
    isTopSecret: true,
    discordIncluded: true,
    badge: '🔥 14-Day Trial + 50% OFF First 2 Months',
    category: 'journal',
    // 🔥 v4.2.1: Discount info - FIXED
    hasIntroDiscount: true,
    introDiscountMonths: 2,
    introDiscountPercent: 50,
    introPrice: 35,  // 🔥 FIXED: Was 17.50, now 35
    features: [
      '🎁 14 days FREE trial',
      '🔥 Then $35/month for 2 months (50% OFF)',
      '💰 Regular price: $70/month after',
      'Monthly ISM Manufacturing Report',
      '2x Company Deep Dive Reports',
      '2x Crypto Market Reports',
      'PDF Downloads & Archive Access',
      'Discord Community Access',
      'Email Delivery',
    ],
  },
  top_secret_yearly: {
    id: 'top_secret_yearly',
    whopPlanId: WHOP_PLAN_IDS.top_secret_yearly,
    whopProductId: WHOP_PRODUCT_IDS.top_secret,
    name: 'top_secret',
    displayName: 'Top Secret (Annual)',
    price: 500,  // 🔥 UPDATED: Was 600, now 500
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 41.67,  // 🔥 UPDATED: $500/12 = ~$41.67/month
    maxTrades: 0,
    trialDays: 14,
    isTopSecret: true,
    discordIncluded: true,
    badge: '🔥 14-Day Trial + Save $340/year',  // 🔥 UPDATED: ($70*12) - $500 = $340
    category: 'journal',
    features: [
      '🎁 14 days FREE trial',
      '💰 Save $340/year vs monthly',  // 🔥 UPDATED
      'Monthly ISM Manufacturing Report',
      '2x Company Deep Dive Reports',
      '2x Crypto Market Reports',
      'PDF Downloads & Archive Access',
      'Discord Community Access',
      'Email Delivery',
    ],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function isJournalProduct(productId: string): boolean {
  return [
    WHOP_PRODUCT_IDS.basic_monthly,
    WHOP_PRODUCT_IDS.basic_yearly,
    WHOP_PRODUCT_IDS.premium_monthly,
    WHOP_PRODUCT_IDS.premium_yearly,
  ].includes(productId as any);
}

export function isNewsletterProduct(productId: string): boolean {
  return productId === WHOP_PRODUCT_IDS.newsletter_monthly;
}

export function isTopSecretProduct(productId: string): boolean {
  return productId === WHOP_PRODUCT_IDS.top_secret;
}

/**
 * 🔥 Check if product is a Platform subscription
 */
export function isPlatformProduct(productId: string): boolean {
  return PLATFORM_PRODUCT_IDS.has(productId);
}

/**
 * Check if plan is a Platform plan
 */
export function isPlatformPlan(planName: PlanName): boolean {
  return planName.startsWith('platform_');
}

/**
 * Check if plan is Core
 */
export function isCorePlan(planName: PlanName): boolean {
  return planName === 'platform_core';
}

/**
 * Check if plan is Pro
 */
export function isProPlan(planName: PlanName): boolean {
  return planName === 'platform_pro';
}

/**
 * Check if plan is Enterprise
 */
export function isEnterprisePlan(planName: PlanName): boolean {
  return planName === 'platform_enterprise';
}

/**
 * Get subscription category from product ID
 */
export function getSubscriptionCategory(productId: string): SubscriptionCategory {
  return isPlatformProduct(productId) ? 'platform' : 'journal';
}

/**
 * Get Platform plans only
 */
export function getPlatformPlans(): PlanConfig[] {
  return Object.values(PLANS).filter(plan => plan.isPlatform);
}

/**
 * Get Journal plans only
 */
export function getJournalPlans(): PlanConfig[] {
  return Object.values(PLANS).filter(plan => 
    plan.category === 'journal' && 
    !plan.isNewsletter && 
    !plan.isTopSecret
  );
}

export function hasTrial(planId: PlanId): boolean {
  const plan = PLANS[planId];
  return plan?.trialDays !== undefined && plan.trialDays > 0;
}

export function getTrialDays(planId: PlanId): number {
  return PLANS[planId]?.trialDays ?? 0;
}

export function isTrialOnceOnly(planId: PlanId): boolean {
  return PLANS[planId]?.trialOnceOnly ?? false;
}

// 🔥 v4.2.0: New helper functions
export function hasIntroDiscount(planId: PlanId): boolean {
  return PLANS[planId]?.hasIntroDiscount ?? false;
}

export function getIntroPrice(planId: PlanId): number | undefined {
  return PLANS[planId]?.introPrice;
}

export function getIntroDiscountMonths(planId: PlanId): number {
  return PLANS[planId]?.introDiscountMonths ?? 0;
}

export function isBasicPlan(planName: PlanName): boolean {
  return planName === 'basic';
}

export function isPremiumPlan(planName: PlanName): boolean {
  return planName === 'premium';
}

export function getIntervalFromPlanId(planId: string): 'monthly' | 'yearly' {
  const yearlyPlanIds = [
    WHOP_PLAN_IDS.basic_yearly,
    WHOP_PLAN_IDS.premium_yearly,
    WHOP_PLAN_IDS.platform_core_yearly,
    WHOP_PLAN_IDS.platform_pro_yearly,
    WHOP_PLAN_IDS.newsletter_yearly,  // 🔥 v4.2.2: Added
    WHOP_PLAN_IDS.top_secret_yearly,
  ];
  
  return yearlyPlanIds.includes(planId as any) ? 'yearly' : 'monthly';
}

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
  newsletterChoice?: string;  // 🔥 For PRO users to select newsletter
}

export function buildWhopCheckoutUrl(options: CheckoutOptions): string {
  const { planId, userEmail, userId, affiliateCode, clickId, redirectUrl, newsletterChoice } = options;
  
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan ID: ${planId}`);
  }
  
  // Don't allow checkout for coming soon plans
  if (plan.comingSoon) {
    throw new Error(`${plan.displayName} is coming soon`);
  }
  
  const baseUrl = `https://whop.com/checkout/${plan.whopPlanId}`;
  const params = new URLSearchParams();
  
  if (userEmail) {
    params.set('email', userEmail);
  }
  
  if (userId) {
    params.set('metadata[finotaur_user_id]', userId);
    params.set('metadata[subscription_category]', plan.category);
    
    // 🔥 For Platform PRO, include newsletter choice
    if (plan.includesNewsletterChoice && newsletterChoice) {
      params.set('metadata[newsletter_choice]', newsletterChoice);
    }
  }
  
  // 🔥 v4.2.2: Auto-apply intro discount coupon for eligible plans
  if (plan.hasIntroDiscount) {
    params.set('d', 'FINOTAUR50');  // Coupon code for 50% off first 2 payments
  }
  // NOTE: Affiliate codes removed - intro discount takes priority
  
  if (clickId) {
    params.set('ref', clickId);
  }
  
  // Success redirect URL based on category
  const baseRedirect = redirectUrl || 'https://www.finotaur.com';
  if (plan.isNewsletter) {
    params.set('redirect_url', `${baseRedirect}/app/all-markets/warzone?payment=success&source=whop`);
  } else if (plan.isTopSecret) {
    params.set('redirect_url', `${baseRedirect}/app/top-secret?payment=success&source=whop`);
  } else if (plan.isPlatform) {
    // 🔥 Platform redirect to pricing page with success param
    params.set('redirect_url', `${baseRedirect}/platform-pricing?payment=success&source=whop&plan=${plan.name}`);
  } else {
    params.set('redirect_url', `${baseRedirect}/app/journal/pricing?payment=success&source=whop`);
  }
  
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
  // Journal
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
  
  // Platform features
  platform_free: {
    dashboardAccess: true,
    marketData: true,
    advancedCharts: false,
    customWatchlists: false,
    priceAlerts: 3,
    aiInsights: false,
    advancedScreeners: false,
    apiAccess: false,
    prioritySupport: false,
    customReports: false,
  },
  platform_core: {
    dashboardAccess: true,
    marketData: true,
    advancedCharts: true,
    customWatchlists: true,
    priceAlerts: 50,
    aiInsights: false,
    advancedScreeners: false,
    apiAccess: false,
    prioritySupport: true,
    customReports: false,
  },
  platform_pro: {
    dashboardAccess: true,
    marketData: true,
    advancedCharts: true,
    customWatchlists: true,
    priceAlerts: Infinity,
    aiInsights: true,
    advancedScreeners: true,
    apiAccess: true,
    prioritySupport: true,
    customReports: true,
  },
  platform_enterprise: {
    dashboardAccess: true,
    marketData: true,
    advancedCharts: true,
    customWatchlists: true,
    priceAlerts: Infinity,
    aiInsights: true,
    advancedScreeners: true,
    apiAccess: true,
    prioritySupport: true,
    customReports: true,
    dedicatedSupport: true,
    customIntegrations: true,
    sla: true,
    whiteLabel: true,
  },
  
  // Other
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
// PLATFORM LIMITS
// ============================================

export const PLATFORM_LIMITS = {
  platform_free: {
    apiCallsPerDay: 0,
    watchlistItems: 5,
    savedScreeners: 1,
    alertsActive: 3,
    exportsPerMonth: 0,
  },
  platform_core: {
    apiCallsPerDay: 0,
    watchlistItems: 100,
    savedScreeners: 10,
    alertsActive: 50,
    exportsPerMonth: 10,
  },
  platform_pro: {
    apiCallsPerDay: 5000,
    watchlistItems: 500,
    savedScreeners: 50,
    alertsActive: 999999,
    exportsPerMonth: 100,
  },
  platform_enterprise: {
    apiCallsPerDay: 999999,
    watchlistItems: 999999,
    savedScreeners: 999999,
    alertsActive: 999999,
    exportsPerMonth: 999999,
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
  return Object.values(PLANS).filter(plan => 
    plan.period === 'monthly' && !plan.isNewsletter && !plan.isTopSecret
  );
};

export const getYearlyPlans = (): PlanConfig[] => {
  return Object.values(PLANS).filter(plan => plan.period === 'yearly');
};

export const formatPrice = (price: number, period: string): string => {
  if (price === 0) return 'Free';
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