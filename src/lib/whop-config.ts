// =====================================================
// FINOTAUR WHOP CONFIGURATION - v7.0.0
// =====================================================
// 🔥 v7.0.0 CHANGES:
// - REMOVED: Bundle, cross-product discounts, discount products
// - Finotaur Platform tier replaces Bundle (includes Newsletter + Top Secret + Journal Premium)
// - Standalone products: Newsletter ($69.99/mo, $699/yr), Top Secret ($89.99/mo, $899/yr)
// - Platform tiers: Core ($59/mo), Finotaur ($109/mo), Copilot ($200/mo)
// =====================================================

// ============================================
// TYPES
// ============================================

// 🔥 v4.0: Subscription categories
export type SubscriptionCategory = 'journal' | 'platform';

// Journal plans (existing)
export type JournalPlanName = 'basic' | 'premium';

// Platform plans (NEW)
export type PlatformPlanName = 'platform_free' | 'platform_core' | 'platform_finotaur' | 'platform_enterprise';

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
  | 'platform_finotaur_monthly'
  | 'platform_finotaur_yearly'
  | 'platform_enterprise_monthly'
  | 'platform_enterprise_yearly'
  // Standalone products
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
  includesJournal?: 'basic' | 'premium';
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
  // Journal - Basic ($24.99/mo). New plan as of 2026-06-17 (prior plan
  // plan_2hIXaJbGP1tYN was the legacy $19.99 price).
  basic_monthly: 'plan_H0VDCb6iD1dYQ',
  basic_yearly: 'plan_x0jTFLe9qNv8i',
  
  // Journal - Premium (no trial)
  premium_monthly: 'plan_v7QKxkvKIZooe',
  premium_yearly: 'plan_gBG436aeJxaHU',
  
// 🔥 Platform - Core ($59/month, 14-day trial)
  platform_core_monthly: 'plan_M4ig2ZhYd2RUE',
  platform_core_yearly: 'plan_6w5KTZsSGp7Ss',
  
  // 🔥 Platform - Finotaur ($109/month, 14-day trial)
  platform_finotaur_monthly: 'plan_ICooR8aqtdXad',
  platform_finotaur_yearly: 'plan_M2zS1EoNXJF10',
  
  // 🔥 Platform - Copilot ($200/month, no trial)
  platform_enterprise_monthly: 'plan_nHveClWPmjJNT',
  platform_enterprise_yearly: 'plan_dfy2uADNyEExg',
  
// ═══════════════════════════════════════════
  // 🔥 v4.4.0: Newsletter (War Zone) - SYNCED WITH WHOP!
  // ═══════════════════════════════════════════
  newsletter_monthly: 'plan_U6lF2eO5y9469',  // Regular price $69.99/month
  newsletter_yearly: 'plan_bp2QTGuwfpj0A',   // Yearly $699/year
  // Top Secret
  top_secret_monthly: 'plan_tUvQbCrEQ4197',           // Top Secret Monthly - $89.99/month
  top_secret_yearly: 'plan_PxxbBlSdkyeo7',            // Top Secret Yearly - $899/year
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
  platform_finotaur_monthly: 'prod_LtP5GbpPfp9bn',
  platform_finotaur_yearly: 'prod_CbWpZrn5P7wc9',
  platform_enterprise_monthly: 'prod_CIKv0J5Rq6aFk',
  platform_enterprise_yearly: 'prod_9e5E84XpsrhWE',
  
// ═══════════════════════════════════════════
  // 🔥 v4.3.0: Newsletter (War Zone) - Product IDs
  // ═══════════════════════════════════════════
  newsletter_monthly: 'prod_qlaV5Uu6LZlYn',
  newsletter_yearly: 'prod_8b3VWkZdena4B',
  // Top Secret
  top_secret: 'prod_nl6YXbLp4t5pz',
  top_secret_yearly: 'prod_aGd9mbl2XUIFO',   // 🔥 Top Secret Yearly - standalone product
  
} as const;

// 🔥 Platform Product IDs Set - for quick lookup
export const PLATFORM_PRODUCT_IDS = new Set([
  'prod_HDYzeNp6WOJwh',  // Core Monthly
  'prod_YAdXQrHtt72Gd',  // Core Yearly
  'prod_LtP5GbpPfp9bn',  // Finotaur Monthly
  'prod_CbWpZrn5P7wc9',  // Finotaur Yearly
  'prod_CIKv0J5Rq6aFk',  // Copilot Monthly
  'prod_9e5E84XpsrhWE',  // Copilot Yearly
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
  'prod_LtP5GbpPfp9bn': { plan: 'platform_finotaur', interval: 'monthly', category: 'platform', isPlatform: true },
  'prod_CbWpZrn5P7wc9': { plan: 'platform_finotaur', interval: 'yearly', category: 'platform', isPlatform: true },
  'prod_CIKv0J5Rq6aFk': { plan: 'platform_enterprise', interval: 'monthly', category: 'platform', isPlatform: true },
  'prod_9e5E84XpsrhWE': { plan: 'platform_enterprise', interval: 'yearly', category: 'platform', isPlatform: true },
  
// ═══════════════════════════════════════════
  // 🔥 v4.3.0: Newsletter (War Zone) - All Products
  // ═══════════════════════════════════════════
  'prod_qlaV5Uu6LZlYn': { plan: 'newsletter', interval: 'monthly', category: 'journal', isNewsletter: true },
  'prod_8b3VWkZdena4B': { plan: 'newsletter', interval: 'yearly', category: 'journal', isNewsletter: true },  
  // Top Secret - Regular
  'prod_nl6YXbLp4t5pz': { plan: 'top_secret', interval: 'monthly', category: 'journal', isTopSecret: true },
  
  // 🔥 Top Secret Yearly - STANDALONE PRODUCT
  'prod_aGd9mbl2XUIFO': { plan: 'top_secret', interval: 'yearly', category: 'journal', isTopSecret: true },
  };

// Plan ID to Name lookup
export const PLAN_ID_TO_NAME: Record<string, string> = {
  // Journal
  'plan_H0VDCb6iD1dYQ': 'basic_monthly', // current $24.99 plan (2026-06-17)
  'plan_2hIXaJbGP1tYN': 'basic_monthly', // legacy $19.99 plan — kept for in-flight refs
  'plan_x0jTFLe9qNv8i': 'basic_yearly',
  'plan_v7QKxkvKIZooe': 'premium_monthly',
  'plan_gBG436aeJxaHU': 'premium_yearly',
  
  // Platform
  'plan_M4ig2ZhYd2RUE': 'platform_core_monthly',
  'plan_6w5KTZsSGp7Ss': 'platform_core_yearly',
  'prod_HDYzeNp6WOJwh': 'platform_core_monthly',
  'prod_YAdXQrHtt72Gd': 'platform_core_yearly',
  // 🔥 Finotaur Platform
  'plan_ICooR8aqtdXad': 'platform_finotaur_monthly',
  'plan_M2zS1EoNXJF10': 'platform_finotaur_yearly',
  'plan_nHveClWPmjJNT': 'platform_enterprise_monthly',
  'plan_dfy2uADNyEExg': 'platform_enterprise_yearly',
  'prod_9e5E84XpsrhWE': 'platform_enterprise_yearly',
  
  // ═══════════════════════════════════════════
  // 🔥 v4.4.0: Newsletter (War Zone) - SYNCED!
  // ═══════════════════════════════════════════
  'plan_U6lF2eO5y9469': 'newsletter_monthly',
  'plan_bp2QTGuwfpj0A': 'newsletter_yearly',
  // Top Secret - SYNCED with WHOP_PLAN_IDS!
  'plan_tUvQbCrEQ4197': 'top_secret_monthly',
  'plan_PxxbBlSdkyeo7': 'top_secret_yearly',
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
    price: 24.99,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 25,
    trialDays: 14,
    badge: '14-Day Free Trial',
    category: 'journal',
    features: [
      '14-day free trial',
      'Broker sync — leading brokers supported',
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
    price: 229,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 19.08,
    maxTrades: 25,
    trialDays: 14,
    badge: '14-Day Free Trial + Save 24%',
    category: 'journal',
    features: [
      '14-day free trial',
      'Broker sync — leading brokers supported',
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
    price: 44.99,
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
    price: 409,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 34.08,
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
    price: 59,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 14,
    trialOnceOnly: false,
    badge: '14-Day Free Trial',
    category: 'platform',
    isPlatform: true,
    includesJournal: 'basic',
    features: [
      '14-day free trial',
      'Full market dashboard',
      'Real-time market data',
      'Advanced charts & indicators',
      'Unlimited watchlists',
      '50 price alerts',
      'Basic screeners',
      'Daily market briefing',
      'Priority email support',
      '🎁 Journal Basic INCLUDED (25 trades/mo)',
    ],
  },
  platform_core_yearly: {
    id: 'platform_core_yearly',
    whopPlanId: WHOP_PLAN_IDS.platform_core_yearly,
    whopProductId: WHOP_PRODUCT_IDS.platform_core_yearly,
    name: 'platform_core',
    displayName: 'Core',
    price: 590,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 49.17,
    maxTrades: 0,
    trialDays: 0,
    badge: 'Save 17%',
    category: 'platform',
    isPlatform: true,
    includesJournal: 'basic',
    features: [
      'Full market dashboard',
      'Real-time market data',
      'Advanced charts & indicators',
      'Unlimited watchlists',
      '50 price alerts',
      'Basic screeners',
      'Daily market briefing',
      'Priority email support',
      '🎁 Journal Basic INCLUDED (25 trades/mo)',
      '1 month FREE!',
    ],
  },

  // ═══════════════════════════════════════════
  // 🔥 PLATFORM - PRO ($69/month, 14-day ONE-TIME trial)
  // ═══════════════════════════════════════════
  platform_finotaur_monthly: {
    id: 'platform_finotaur_monthly',
    whopPlanId: WHOP_PLAN_IDS.platform_finotaur_monthly,
    whopProductId: WHOP_PRODUCT_IDS.platform_finotaur_monthly,
    name: 'platform_finotaur',
    displayName: 'Finotaur',
    price: 109,
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
      'Everything in Core, plus:',
      '🎁 Journal Premium INCLUDED ($40/mo value)',
      '🎁 War Zone + Top Secret Reports INCLUDED',
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
    price: 1090,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 90.83,
    maxTrades: 0,
    trialDays: 0,
    trialOnceOnly: false,
    popular: true,
    badge: 'Best Value - Save 17%',
    category: 'platform',
    isPlatform: true,
    includesJournal: 'premium',
    features: [
      'Everything in Core, plus:',
      '🎁 Journal Premium INCLUDED ($40/mo value)',
      '🎁 War Zone + Top Secret Reports INCLUDED',
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

  // ═══════════════════════════════════════════
  // 🔥 v4.3.0: NEWSLETTER (WAR ZONE) - UPDATED!
  // Monthly: $49/month with 7-day trial
  // Yearly: $397/year (NO trial) - saves $191
  // ═══════════════════════════════════════════
  newsletter_monthly: {
    id: 'newsletter_monthly',
    whopPlanId: WHOP_PLAN_IDS.newsletter_monthly,  // plan_U6lF2eO5y9469
    whopProductId: WHOP_PRODUCT_IDS.newsletter_monthly,  // prod_qlaV5Uu6LZlYn
    name: 'newsletter',
    displayName: 'War Zone Intelligence',
    price: 69.99,  // 🔥 v4.4.0: $69.99/month (synced with DB)
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 7,
    isNewsletter: true,
    discordIncluded: true,
    badge: '🔥 7-Day Free Trial + 50% OFF',
    category: 'journal',
    hasIntroDiscount: true,
    introDiscountMonths: 2,
    introDiscountPercent: 50,
    introPrice: 44.99,
    features: [
      '🎁 14 days FREE trial',
      '🔥 Then $44.99/month for 2 months (50% OFF)',
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

  newsletter_yearly: {
    id: 'newsletter_yearly',
    whopPlanId: WHOP_PLAN_IDS.newsletter_yearly,  // plan_bp2QTGuwfpj0A
    whopProductId: WHOP_PRODUCT_IDS.newsletter_yearly,  // prod_8b3VWkZdena4B
    name: 'newsletter',
    displayName: 'War Zone Intelligence (Annual)',
    price: 699,  // 🔥 v4.4.0: $699/year (synced with DB)
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 58.25,  // $699/12 = ~$58.25/month
    maxTrades: 0,
    trialDays: 0,  // 🔥 NO trial for yearly!
    isNewsletter: true,
    discordIncluded: true,
    badge: '💰 Save $140.88/year',  // ($69.99*12) - $699 = $140.88 savings
    category: 'journal',
    features: [
      '💰 Save $140.88/year vs monthly',
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
  // TOP SECRET - 14-day trial + 50% OFF first 2 months
  // ═══════════════════════════════════════════
  top_secret_monthly: {
    id: 'top_secret_monthly',
    whopPlanId: WHOP_PLAN_IDS.top_secret_monthly,
    whopProductId: WHOP_PRODUCT_IDS.top_secret,
    name: 'top_secret',
    displayName: 'Top Secret',
    price: 89.99,
    period: 'monthly',
    periodLabel: '/month',
    maxTrades: 0,
    trialDays: 14,
    isTopSecret: true,
    discordIncluded: true,
    badge: '🔥 14-Day Trial + 50% OFF First 2 Months',
    category: 'journal',
    hasIntroDiscount: true,
    introDiscountMonths: 2,
    introDiscountPercent: 50,
    introPrice: 45,
    features: [
      '🎁 14 days FREE trial',
      '🔥 Then $45/month for 2 months (50% OFF)',
      '💰 Regular price: $89.99/month after',
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
    price: 899,
    period: 'yearly',
    periodLabel: '/year',
    monthlyEquivalent: 74.92,
    maxTrades: 0,
    trialDays: 14,
    isTopSecret: true,
    discordIncluded: true,
    badge: '🔥 14-Day Trial + Save $180.88/year',
    category: 'journal',
    features: [
      '🎁 14 days FREE trial',
      '💰 Save $180.88/year vs monthly',
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

export function isCorePlan(planName: PlanName): boolean {
  return planName === 'platform_core';
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

export function isBasicPlan(planName: PlanName): boolean {
  return planName === 'basic';
}

export function isPremiumPlan(planName: PlanName): boolean {
  return planName === 'premium';
}

// 🔥 v4.3.0: Updated with correct newsletter yearly plan ID
export function getIntervalFromPlanId(planId: string): 'monthly' | 'yearly' {
  const yearlyPlanIds = [
    WHOP_PLAN_IDS.basic_yearly,
    WHOP_PLAN_IDS.premium_yearly,
    WHOP_PLAN_IDS.platform_core_yearly,
    WHOP_PLAN_IDS.platform_finotaur_yearly,
    WHOP_PLAN_IDS.platform_enterprise_yearly,
    WHOP_PLAN_IDS.newsletter_yearly,  // plan_bp2QTGuwfpj0A
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

export const PLAN_FEATURES = {
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
    // Page access
    stockAnalyzer: true,
    sectorAnalyzer: true,
    flowScanner: true,
    optionsIntelligence: false,
    aiAssistant: true,
    macroAnalyzer: false,
    myPortfolio: false,
    aiScanner: false,
    stockAnalysisPerDay: 5,
    sectorAnalysisPerMonth: 3,
    // Journal access for Core tier
    journalAccess: true,
    journalMaxTrades: 25,
    journalTradesLifetime: false,
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
  platform_core: {
    apiCallsPerDay: 0,
    watchlistItems: 100,
    savedScreeners: 10,
    alertsActive: 50,
    exportsPerMonth: 10,
    stockAnalysisPerDay: 5,
    sectorAnalysisPerMonth: 3,
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