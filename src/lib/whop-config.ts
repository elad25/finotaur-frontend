// =====================================================
// FINOTAUR WHOP CONFIGURATION - v8.0.0
// =====================================================
// 🔥 v8.0.0 CHANGES (2026-06):
// - REMOVED: Journal Basic tier (was $24.99/mo — zero active subscribers)
// - REMOVED: Platform Core tier (was $59/mo — zero active subscribers)
// - MERGED: WAR ZONE + TOP SECRET → single "Top Secret" product at $50/mo / $499/yr
//   WAR ZONE plan IDs (newsletter_monthly/yearly) KEPT for existing-subscriber resolution
// - Platform tiers remaining: Finotaur ($89/mo), Copilot ($200/mo) + Free
// =====================================================

// ============================================
// TYPES
// ============================================

// 🔥 v4.0: Subscription categories
export type SubscriptionCategory = 'journal' | 'platform';

// Journal plans — Basic removed 2026-06 (zero subscribers)
export type JournalPlanName = 'premium';

// Platform plans — Core removed 2026-06 (zero subscribers)
export type PlatformPlanName = 'platform_free' | 'platform_finotaur' | 'platform_enterprise';

// All plan names
export type PlanName = JournalPlanName | PlatformPlanName | 'newsletter' | 'top_secret';

export type BillingInterval = 'monthly' | 'yearly';

export type PlanId =
  // Journal plans — Basic removed 2026-06 (zero subscribers)
  | 'premium_monthly'
  | 'premium_yearly'
  // Platform plans — Core removed 2026-06 (zero subscribers)
  | 'platform_finotaur_monthly'
  | 'platform_finotaur_yearly'
  | 'platform_enterprise_monthly'
  | 'platform_enterprise_yearly'
  // Standalone products
  // LEGACY: newsletter_monthly/yearly kept for existing WAR ZONE subscriber resolution, not purchasable
  | 'newsletter_monthly'
  | 'newsletter_yearly'
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
  includesJournal?: 'premium';  // 'basic' removed 2026-06
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
  // Journal - Premium (no trial). New plans 2026-06-17.
  premium_monthly: 'plan_N33S1p5Y3dHrK', // $44.99/mo (was plan_v7QKxkvKIZooe)
  premium_yearly: 'plan_WrjUcvrRhwWPL',  // $409/yr (was plan_gBG436aeJxaHU)

  // Platform - Finotaur ($89/month, 14-day trial). Repriced 2026-07: new Whop plans, new IDs.
  platform_finotaur_monthly: 'plan_AgWVNrqc0eSMK',
  platform_finotaur_yearly: 'plan_0uYhhF6fX5IKh',

  // Platform - Copilot ($200/month, no trial)
  platform_enterprise_monthly: 'plan_LG6ODA91iOCzQ', // $200/mo (was plan_nHveClWPmjJNT @ $499)
  platform_enterprise_yearly: 'plan_dfy2uADNyEExg',

  // LEGACY: WAR ZONE merged into TOP SECRET 2026-06 — kept for existing-subscriber resolution, not purchasable.
  newsletter_monthly: 'plan_U6lF2eO5y9469',
  newsletter_yearly: 'plan_bp2QTGuwfpj0A',

  // Top Secret (merged WAR ZONE + TOP SECRET product) — LIVE Whop plans @ $50/mo, $499/yr
  top_secret_monthly: 'plan_icd76C8REp0LQ',
  top_secret_yearly: 'plan_7Lf31ygMAMmK8',
} as const;

// Product IDs - Used for WEBHOOK identification
export const WHOP_PRODUCT_IDS = {
  // Journal - Premium
  premium_monthly: 'prod_Kq2pmLT1JyGsU',
  premium_yearly: 'prod_vON7zlda6iuII',

  // Platform - Finotaur
  platform_finotaur_monthly: 'prod_LtP5GbpPfp9bn',
  platform_finotaur_yearly: 'prod_CbWpZrn5P7wc9',

  // Platform - Copilot
  platform_enterprise_monthly: 'prod_CIKv0J5Rq6aFk',
  platform_enterprise_yearly: 'prod_9e5E84XpsrhWE',

  // LEGACY: WAR ZONE merged into TOP SECRET 2026-06 — kept for existing-subscriber resolution, not purchasable.
  newsletter_monthly: 'prod_qlaV5Uu6LZlYn',
  newsletter_yearly: 'prod_8b3VWkZdena4B',

  // Top Secret (merged WAR ZONE + TOP SECRET)
  top_secret: 'prod_nl6YXbLp4t5pz',
  top_secret_yearly: 'prod_aGd9mbl2XUIFO',
} as const;

// Platform Product IDs Set - for quick lookup (Core removed 2026-06)
export const PLATFORM_PRODUCT_IDS = new Set([
  'prod_LtP5GbpPfp9bn',  // Finotaur Monthly
  'prod_CbWpZrn5P7wc9',  // Finotaur Yearly
  'prod_CIKv0J5Rq6aFk',  // Copilot Monthly
  'prod_9e5E84XpsrhWE',  // Copilot Yearly
]);

// Reverse lookup (for webhooks) — Basic and Core removed 2026-06 (zero subscribers)
export const PRODUCT_ID_TO_PLAN: Record<string, {
  plan: PlanName;
  interval: BillingInterval;
  category: SubscriptionCategory;
  isNewsletter?: boolean;
  isTopSecret?: boolean;
  isPlatform?: boolean;
}> = {
  // Journal - Premium
  'prod_Kq2pmLT1JyGsU': { plan: 'premium', interval: 'monthly', category: 'journal' },
  'prod_vON7zlda6iuII': { plan: 'premium', interval: 'yearly', category: 'journal' },

  // Platform - Finotaur
  'prod_LtP5GbpPfp9bn': { plan: 'platform_finotaur', interval: 'monthly', category: 'platform', isPlatform: true },
  'prod_CbWpZrn5P7wc9': { plan: 'platform_finotaur', interval: 'yearly', category: 'platform', isPlatform: true },

  // Platform - Copilot
  'prod_CIKv0J5Rq6aFk': { plan: 'platform_enterprise', interval: 'monthly', category: 'platform', isPlatform: true },
  'prod_9e5E84XpsrhWE': { plan: 'platform_enterprise', interval: 'yearly', category: 'platform', isPlatform: true },

  // LEGACY: WAR ZONE merged into TOP SECRET 2026-06 — kept for existing-subscriber resolution, not purchasable.
  'prod_qlaV5Uu6LZlYn': { plan: 'newsletter', interval: 'monthly', category: 'journal', isNewsletter: true },
  'prod_8b3VWkZdena4B': { plan: 'newsletter', interval: 'yearly', category: 'journal', isNewsletter: true },

  // Top Secret (merged WAR ZONE + TOP SECRET)
  'prod_nl6YXbLp4t5pz': { plan: 'top_secret', interval: 'monthly', category: 'journal', isTopSecret: true },
  'prod_aGd9mbl2XUIFO': { plan: 'top_secret', interval: 'yearly', category: 'journal', isTopSecret: true },
};

// Plan ID to Name lookup — Basic and Core removed 2026-06 (zero subscribers)
export const PLAN_ID_TO_NAME: Record<string, string> = {
  // Journal - Premium
  'plan_N33S1p5Y3dHrK': 'premium_monthly', // current $44.99/mo (2026-06-17)
  'plan_v7QKxkvKIZooe': 'premium_monthly', // legacy — kept for in-flight refs
  'plan_WrjUcvrRhwWPL': 'premium_yearly',  // current $409/yr (2026-06-17)
  'plan_gBG436aeJxaHU': 'premium_yearly',  // legacy — kept for in-flight refs

  // Platform - Finotaur
  'plan_AgWVNrqc0eSMK': 'platform_finotaur_monthly', // $89/mo plan (2026-07)
  'plan_0uYhhF6fX5IKh': 'platform_finotaur_yearly',  // $890/yr plan (2026-07)
  'plan_ICooR8aqtdXad': 'platform_finotaur_monthly', // legacy $109/mo — active members remain until migrated
  'plan_M2zS1EoNXJF10': 'platform_finotaur_yearly',  // legacy $1,090/yr — active members remain until migrated

  // Platform - Copilot
  'plan_LG6ODA91iOCzQ': 'platform_enterprise_monthly', // current $200/mo (2026-06-17)
  'plan_nHveClWPmjJNT': 'platform_enterprise_monthly', // legacy $499/mo — kept for in-flight refs
  'plan_dfy2uADNyEExg': 'platform_enterprise_yearly',
  'prod_9e5E84XpsrhWE': 'platform_enterprise_yearly',

  // LEGACY: WAR ZONE merged into TOP SECRET 2026-06 — kept for existing-subscriber resolution, not purchasable.
  'plan_U6lF2eO5y9469': 'newsletter_monthly',
  'plan_bp2QTGuwfpj0A': 'newsletter_yearly',

  // Top Secret (Intelligence Envelope) — LIVE Whop plans @ $50/mo, $499/yr
  'plan_icd76C8REp0LQ': 'top_secret_monthly',
  'plan_7Lf31ygMAMmK8': 'top_secret_yearly',
};

// ============================================
// PLAN CONFIGURATIONS
// ============================================

// Basic removed 2026-06 (zero active subscribers). Free journal tier (15 lifetime trades) and Premium remain.
export const PLANS: Record<PlanId, PlanConfig> = {
  // ═══════════════════════════════════════════
  // JOURNAL - PREMIUM (NO TRIAL)
  // ═══════════════════════════════════════════
  premium_monthly: {
    id: 'premium_monthly',
    whopPlanId: WHOP_PLAN_IDS.premium_monthly,
    whopProductId: WHOP_PRODUCT_IDS.premium_monthly,
    name: 'premium',
    displayName: 'Premium',
    price: 44.99,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 999999,
    popular: true,
    badge: 'Most Popular',
    category: 'journal',
    features: [
      'Broker sync — leading brokers supported',
      'Unlimited trades',
      'Full performance analytics',
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
    price: 409,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 34.08,
    maxTrades: 999999,
    popular: true,
    badge: 'Best Value',
    category: 'journal',
    features: [
      'Broker sync — leading brokers supported',
      'Unlimited trades',
      'Full performance analytics',
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

  // Core removed 2026-06 (zero active subscribers). Platform tiers: Finotaur ($89/mo), Copilot ($200/mo).

  // ═══════════════════════════════════════════
  // PLATFORM - FINOTAUR ($89/month, 14-day trial)
  // ═══════════════════════════════════════════
  platform_finotaur_monthly: {
    id: 'platform_finotaur_monthly',
    whopPlanId: WHOP_PLAN_IDS.platform_finotaur_monthly,
    whopProductId: WHOP_PRODUCT_IDS.platform_finotaur_monthly,
    name: 'platform_finotaur',
    displayName: 'Finotaur',
    price: 89,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 14,
    trialOnceOnly: false,
    popular: true,
    badge: '14-Day Free Trial',
    category: 'platform',
    isPlatform: true,
    includesJournal: 'premium',
    features: [
      '14-day free trial',
      'Full AI market platform',
      '🎁 Journal Premium INCLUDED ($44.99/mo value)',
      '🎁 Top Secret Reports INCLUDED',
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
  platform_finotaur_yearly: {
    id: 'platform_finotaur_yearly',
    whopPlanId: WHOP_PLAN_IDS.platform_finotaur_yearly,
    whopProductId: WHOP_PRODUCT_IDS.platform_finotaur_yearly,
    name: 'platform_finotaur',
    displayName: 'Finotaur',
    price: 890,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 74.17,
    maxTrades: 0,
    trialDays: 0,
    trialOnceOnly: false,
    popular: true,
    badge: 'Best Value - Save 17%',
    category: 'platform',
    isPlatform: true,
    includesJournal: 'premium',
    features: [
      'Full AI market platform',
      '🎁 Journal Premium INCLUDED ($44.99/mo value)',
      '🎁 Top Secret Reports INCLUDED',
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
      '1 month FREE!',
    ],
  },

  // ═══════════════════════════════════════════
  // 🔥 PLATFORM - COPILOT (AI Portfolio Manager)
  // ═══════════════════════════════════════════
  platform_enterprise_monthly: {
    id: 'platform_enterprise_monthly',
    whopPlanId: WHOP_PLAN_IDS.platform_enterprise_monthly,
    whopProductId: WHOP_PRODUCT_IDS.platform_enterprise_monthly,
    name: 'platform_enterprise',
    displayName: 'Copilot',
    price: 200,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 0,
    badge: 'AI Portfolio Manager',
    category: 'platform',
    isPlatform: true,
    comingSoon: false,
    contactSales: false,
    includesJournal: 'premium',
    features: [
      'Everything in Finotaur, plus:',
      'AI Portfolio Manager that invests & trades alongside you',
      'Stop flying blind — 24/7 AI oversight of every position you hold',
      'My Portfolio — live tracking & mark-to-market of your real book',
      'Proactive AI risk detection & alerts on your holdings',
      'Daily AI portfolio brief with actionable guidance',
      'Priority support',
    ],
  },

  platform_enterprise_yearly: {
    id: 'platform_enterprise_yearly',
    whopPlanId: WHOP_PLAN_IDS.platform_enterprise_yearly,
    whopProductId: WHOP_PRODUCT_IDS.platform_enterprise_yearly,
    name: 'platform_enterprise',
    displayName: 'Copilot',
    price: 2000,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 166.67,
    maxTrades: 0,
    trialDays: 0,
    badge: 'AI Portfolio Manager',
    category: 'platform',
    isPlatform: true,
    comingSoon: false,
    contactSales: false,
    includesJournal: 'premium',
    features: [
      'Everything in Finotaur, plus:',
      'AI Portfolio Manager that invests & trades alongside you',
      'Stop flying blind — 24/7 AI oversight of every position you hold',
      'My Portfolio — live tracking & mark-to-market of your real book',
      'Proactive AI risk detection & alerts on your holdings',
      'Daily AI portfolio brief with actionable guidance',
      'Priority support',
    ],
  },

  // LEGACY: WAR ZONE merged into TOP SECRET 2026-06 — kept for existing-subscriber resolution, not purchasable.
  // These plan IDs (newsletter_monthly / newsletter_yearly) resolve for Whop webhooks and billing management.
  // Do NOT show these in any purchase flow or pricing UI.
  newsletter_monthly: {
    id: 'newsletter_monthly',
    whopPlanId: WHOP_PLAN_IDS.newsletter_monthly,  // plan_U6lF2eO5y9469
    whopProductId: WHOP_PRODUCT_IDS.newsletter_monthly,  // prod_qlaV5Uu6LZlYn
    name: 'newsletter',
    displayName: 'Top Secret',  // Shown as Top Secret to existing WAR ZONE subscribers
    price: 69.99,  // Legacy price — existing subscribers pay this until they migrate
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 0,
    isNewsletter: true,
    discordIncluded: true,
    badge: 'Legacy',
    category: 'journal',
    features: [
      'Daily institutional-grade market report (8-14 pages)',
      'Macro breakdown & market structure analysis',
      'Unusual Options Activity (UOA) tracking',
      'Technical outlook (24-72h)',
      'Earnings & corporate intel',
      'Monthly ISM Manufacturing Report',
      '2x Company Deep Dive Reports',
      '2x Crypto Market Reports',
      'PDF Downloads & Archive Access',
      'Private Discord community',
      'Real-time alerts',
    ],
  },

  newsletter_yearly: {
    id: 'newsletter_yearly',
    whopPlanId: WHOP_PLAN_IDS.newsletter_yearly,  // plan_bp2QTGuwfpj0A
    whopProductId: WHOP_PRODUCT_IDS.newsletter_yearly,  // prod_8b3VWkZdena4B
    name: 'newsletter',
    displayName: 'Top Secret',  // Shown as Top Secret to existing WAR ZONE subscribers
    price: 699,  // Legacy price — existing subscribers pay this until they migrate
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 58.25,
    maxTrades: 0,
    trialDays: 0,
    isNewsletter: true,
    discordIncluded: true,
    badge: 'Legacy',
    category: 'journal',
    features: [
      'Daily institutional-grade market report (8-14 pages)',
      'Macro breakdown & market structure analysis',
      'Unusual Options Activity (UOA) tracking',
      'Technical outlook (24-72h)',
      'Earnings & corporate intel',
      'Monthly ISM Manufacturing Report',
      '2x Company Deep Dive Reports',
      '2x Crypto Market Reports',
      'PDF Downloads & Archive Access',
      'Private Discord community',
      'Real-time alerts',
    ],
  },

  // ═══════════════════════════════════════════
  // TOP SECRET — Intelligence Envelope, 14-day free trial (no intro discount)
  // $50/mo | $499/yr ($41.58/mo)
  // Includes daily report + monthly deep-dives (WAR ZONE merged in)
  // ═══════════════════════════════════════════
  top_secret_monthly: {
    id: 'top_secret_monthly',
    whopPlanId: WHOP_PLAN_IDS.top_secret_monthly,  // plan_icd76C8REp0LQ — $50/month, 14-day free trial
    whopProductId: WHOP_PRODUCT_IDS.top_secret,
    name: 'top_secret',
    displayName: 'Top Secret',
    price: 50,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 14,
    isTopSecret: true,
    discordIncluded: true,
    badge: '🔥 14-Day Free Trial',
    category: 'journal',
    features: [
      '🎁 14 days FREE trial',
      '💰 Then $50/month — cancel anytime',
      'Daily institutional-grade market report (8-14 pages)',
      'Macro breakdown & market structure analysis',
      'Unusual Options Activity (UOA) tracking',
      'Technical outlook (24-72h)',
      'Earnings & corporate intel',
      'Monthly ISM Manufacturing Report',
      '2x Company Deep Dive Reports',
      '2x Crypto Market Reports',
      'PDF Downloads & Archive Access',
      'Private Discord community',
      'Real-time alerts',
    ],
  },

  top_secret_yearly: {
    id: 'top_secret_yearly',
    whopPlanId: WHOP_PLAN_IDS.top_secret_yearly,  // plan_7Lf31ygMAMmK8 — $499/year
    whopProductId: WHOP_PRODUCT_IDS.top_secret,
    name: 'top_secret',
    displayName: 'Top Secret',
    price: 499,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 41.58,  // $499/12 ≈ $41.58/mo — save ~$99/yr vs monthly
    maxTrades: 0,
    trialDays: 14,
    isTopSecret: true,
    discordIncluded: true,
    badge: '🔥 Save $101/year vs monthly',
    category: 'journal',
    features: [
      '🎁 14 days FREE trial',
      '💰 $41.58/month — save $101/year vs monthly',
      'Daily institutional-grade market report (8-14 pages)',
      'Macro breakdown & market structure analysis',
      'Unusual Options Activity (UOA) tracking',
      'Technical outlook (24-72h)',
      'Earnings & corporate intel',
      'Monthly ISM Manufacturing Report',
      '2x Company Deep Dive Reports',
      '2x Crypto Market Reports',
      'PDF Downloads & Archive Access',
      'Private Discord community',
      'Real-time alerts',
    ],
  },


  
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function isJournalProduct(productId: string): boolean {
  return [
    WHOP_PRODUCT_IDS.premium_monthly,
    WHOP_PRODUCT_IDS.premium_yearly,
  ].includes(productId as any);
}

// 🔥 v4.3.0: Updated to include BOTH newsletter products
export function isNewsletterProduct(productId: string): boolean {
  return productId === WHOP_PRODUCT_IDS.newsletter_monthly || 
         productId === WHOP_PRODUCT_IDS.newsletter_yearly;
}

export function isTopSecretProduct(productId: string): boolean {
  return productId === WHOP_PRODUCT_IDS.top_secret;
}

export function isPlatformProduct(productId: string): boolean {
  return PLATFORM_PRODUCT_IDS.has(productId);
}

export function isPlatformPlan(planName: PlanName): boolean {
  return planName.startsWith('platform_');
}

// Core plan removed 2026-06 (zero subscribers). Kept returning false so existing call-sites don't break.
// TODO: remove callers of isCorePlan() across the codebase (see pricing-overhaul chunk notes).
export function isCorePlan(planName: PlanName): boolean {
  return false;
}

export function isFinotaurPlan(planName: PlanName): boolean {
  return planName === 'platform_finotaur';
}

// Legacy alias for backward compatibility
export function isProPlan(planName: PlanName): boolean {
  return planName === 'platform_finotaur';
}

export function isEnterprisePlan(planName: PlanName): boolean {
  return planName === 'platform_enterprise';
}

export function getSubscriptionCategory(productId: string): SubscriptionCategory {
  return isPlatformProduct(productId) ? 'platform' : 'journal';
}

export function getPlatformPlans(): PlanConfig[] {
  return Object.values(PLANS).filter(plan => plan.isPlatform);
}

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

export function hasIntroDiscount(planId: PlanId): boolean {
  return PLANS[planId]?.hasIntroDiscount ?? false;
}

export function getIntroPrice(planId: PlanId): number | undefined {
  return PLANS[planId]?.introPrice;
}

export function getIntroDiscountMonths(planId: PlanId): number {
  return PLANS[planId]?.introDiscountMonths ?? 0;
}

// Basic plan removed 2026-06 (zero subscribers). Kept returning false so existing call-sites don't break.
// TODO: remove callers of isBasicPlan() across the codebase (see pricing-overhaul chunk notes).
export function isBasicPlan(planName: PlanName): boolean {
  return false;
}

export function isPremiumPlan(planName: PlanName): boolean {
  return planName === 'premium';
}

export function getIntervalFromPlanId(planId: string): 'monthly' | 'yearly' {
  const yearlyPlanIds = [
    WHOP_PLAN_IDS.premium_yearly,
    WHOP_PLAN_IDS.platform_finotaur_yearly,
    'plan_M2zS1EoNXJF10', // legacy $1,090/yr Finotaur — active members remain until migrated
    WHOP_PLAN_IDS.platform_enterprise_yearly,
    WHOP_PLAN_IDS.newsletter_yearly,  // plan_bp2QTGuwfpj0A — legacy WAR ZONE
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
  newsletterChoice?: string;
}

export function buildWhopCheckoutUrl(options: CheckoutOptions): string {
  const { planId, userEmail, userId, affiliateCode, clickId, redirectUrl, newsletterChoice } = options;
  
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan ID: ${planId}`);
  }
  
  if (plan.comingSoon) {
    throw new Error(`${plan.displayName} is coming soon`);
  }
  
  const baseUrl = `https://whop.com/checkout/${plan.whopPlanId}`;
  const params = new URLSearchParams();
  
  if (userEmail) {
  params.append('email', userEmail);
  params.append('lock_email', 'true');
}
  
  if (userId) {
    params.set('metadata[finotaur_user_id]', userId);
    params.set('metadata[finotaur_email]', userEmail || '');
    params.set('metadata[subscription_category]', plan.category);
    params.set('metadata[billing_interval]', plan.period);  // 🔥 v4.3.0: Track interval
    
  }
  
  // Apply intro discount coupon for eligible plans
  if (plan.hasIntroDiscount) {
    params.set('d', 'FINOTAUR50');
  } else if (affiliateCode) {
    // 🔥 v7.1.0: Apply promo/affiliate code for plans without intro discount
    params.set('d', affiliateCode);
  }
  
  if (clickId) {
    params.set('ref', clickId);
  }
  
  // Success redirect URL based on product type
  const baseRedirect = redirectUrl || 'https://www.finotaur.com';
  if (plan.isNewsletter) {
    params.set('redirect_url', `${baseRedirect}/app/all-markets/warzone?payment=success&source=whop`);
  } else if (plan.isTopSecret) {
    params.set('redirect_url', `${baseRedirect}/app/top-secret?payment=success&source=whop`);
  } else if (plan.isPlatform) {
    params.set('redirect_url', `${baseRedirect}/platform-pricing?payment=success&source=whop&plan=${plan.name}`);
  } else {
    params.set('redirect_url', `${baseRedirect}/app/journal/overview?payment=success&source=whop`);
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

// Basic and platform_core removed 2026-06 (zero subscribers).
export const PLAN_FEATURES = {
  premium: {
    maxTrades: Infinity,
    autoSync: true,
    aiInsights: true,
    advancedAnalytics: true,
    prioritySupport: true,
    newsletter: false,
    topSecret: false,
  },
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
    // Page access
    stockAnalyzer: true,
    sectorAnalyzer: false,
    flowScanner: false,
    optionsIntelligence: false,
    aiAssistant: false,
    macroAnalyzer: false,
    myPortfolio: false,
    aiScanner: false,
    stockAnalysisPerDay: 3,
    sectorAnalysisPerMonth: 0,
    // Journal access for FREE tier
    journalAccess: true,
    journalMaxTrades: 15,
    journalTradesLifetime: true,
    journalMaxPortfolios: 1,
    journalBacktest: false,
  },
  platform_finotaur: {
    dashboardAccess: true,
    marketData: true,
    advancedCharts: true,
    customWatchlists: true,
    priceAlerts: 999999,
    aiInsights: true,
    advancedScreeners: true,
    apiAccess: true,
    prioritySupport: true,
    customReports: true,
    newsletter: true,
    topSecret: true,
    // Page access
    stockAnalyzer: true,
    sectorAnalyzer: true,
    flowScanner: true,
    optionsIntelligence: true,
    aiAssistant: true,
    macroAnalyzer: true,
    myPortfolio: false,       // Enterprise only
    aiScanner: true,
    stockAnalysisPerDay: 7,
    sectorAnalysisPerMonth: 999999,
    // Journal access for Finotaur tier
    journalAccess: true,
    journalMaxTrades: 999999,
    journalTradesLifetime: false,
    journalMaxPortfolios: 40,
    journalBacktest: true,
  },
 platform_enterprise: {
    dashboardAccess: true,
    marketData: true,
    advancedCharts: true,
    customWatchlists: true,
    priceAlerts: 999999,
    aiInsights: true,
    advancedScreeners: true,
    apiAccess: true,
    prioritySupport: true,
    customReports: true,
    dedicatedSupport: false,
    customIntegrations: false,
    sla: false,
    whiteLabel: false,
    newsletter: true,
    topSecret: true,
    // Page access - ALL PAGES
    stockAnalyzer: true,
    sectorAnalyzer: true,
    flowScanner: true,
    optionsIntelligence: true,
    aiAssistant: true,
    macroAnalyzer: true,
    myPortfolio: true,        // Enterprise exclusive
    aiScanner: true,
    stockAnalysisPerDay: 999999,
    sectorAnalysisPerMonth: 999999,
    // Journal access for Enterprise tier
    journalAccess: true,
    journalMaxTrades: 999999,
    journalTradesLifetime: false,
    journalMaxPortfolios: 40,
        journalBacktest: true,
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
// PLATFORM LIMITS
// ============================================

// platform_core removed 2026-06 (zero subscribers).
export const PLATFORM_LIMITS = {
  platform_free: {
    apiCallsPerDay: 0,
    watchlistItems: 5,
    savedScreeners: 1,
    alertsActive: 3,
    exportsPerMonth: 0,
    stockAnalysisPerDay: 3,
    sectorAnalysisPerMonth: 0,
  },
  platform_finotaur: {
    apiCallsPerDay: 5000,
    watchlistItems: 500,
    savedScreeners: 50,
    alertsActive: 999999,
    exportsPerMonth: 100,
    stockAnalysisPerDay: 7,
    sectorAnalysisPerMonth: 999999,
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