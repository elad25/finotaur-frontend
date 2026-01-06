// src/constants/credits.ts
// =====================================================
// FINOTAUR AI CREDITS SYSTEM - CONSTANTS
// =====================================================
// Version: 1.0.0
// Date: 2026-01-03
// =====================================================

// ============================================
// CREDIT COSTS BY ACTION
// ============================================

export const CREDIT_COSTS = {
  // ═══════════════════════════════════════════
  // ⚡ LIGHT ACTIONS (0 credits) - Cached/View
  // ═══════════════════════════════════════════
  
  // Morning Brief
  morning_brief_view: 0,
  
  // Market Pulse
  market_pulse_view: 0,
  
  // Macro
  macro_overview_view: 0,
  
  // Trade Ideas
  trade_ideas_cached: 0,
  
  // Options
  options_chain_view: 0,
  
  // Earnings
  earnings_calendar_view: 0,
  
  // Portfolio
  portfolio_overview: 0,

  // ═══════════════════════════════════════════
  // 🧠 MEDIUM ACTIONS (3-8 credits) - Analysis
  // ═══════════════════════════════════════════
  
  // Morning Brief
  morning_brief_refresh: 3,
  morning_brief_deep_dive: 3,
  
  // Market Pulse
  market_pulse_refresh: 3,
  market_pulse_why: 3,
  market_pulse_sector: 5,
  market_pulse_correlation: 5,
  
  // Macro
  macro_explain: 3,
  macro_impact: 5,
  macro_calendar_ai: 5,
  
  // Company Analysis
  company_overview: 5,
  company_compare: 8,
  company_bull_bear: 8,
  
  // Options
  options_greeks_explain: 3,
  options_iv_analysis: 5,
  options_risk_reward: 5,
  options_what_if: 5,
  
  // Portfolio
  portfolio_correlation: 5,
  portfolio_earnings_alert: 5,
  
  // Trade Ideas
  trade_ideas_explain: 3,
  trade_ideas_risks: 5,
  
  // AI Chat
  ai_chat_message: 3,
  ai_chat_with_context: 8,
  ai_chat_summarize: 3,

  // ═══════════════════════════════════════════
  // 🔥 HEAVY ACTIONS (10-20 credits) - Deep AI
  // ═══════════════════════════════════════════
  
  // Morning Brief
  morning_brief_custom: 10,
  
  // Portfolio
  portfolio_full_scan: 10,
  portfolio_hedge_suggest: 12,
  portfolio_rebalance: 15,
  portfolio_what_if: 10,
  
  // Company Analysis
  company_full_analysis: 12,
  company_financials: 12,
  company_valuation: 15,
  company_10k_summary: 15,
  company_10q_summary: 12,
  company_earnings_call: 12,
  company_red_flags: 10,
  
  // Options
  options_strategy_suggest: 12,
  options_earnings_play: 15,
  options_uoa_analysis: 10,
  options_hedge_suggest: 12,
  options_spread_builder: 10,
  
  // Trade Ideas
  trade_ideas_generate: 10,
  trade_ideas_personalized: 15,
  
  // AI Reports
  ai_generate_report: 20,
  ai_research_topic: 18,
} as const;

// ============================================
// ACTION TYPE MAPPING
// ============================================

export type CreditAction = keyof typeof CREDIT_COSTS;

export const ACTION_TYPES: Record<CreditAction, 'light' | 'medium' | 'heavy'> = {
  // Light
  morning_brief_view: 'light',
  market_pulse_view: 'light',
  macro_overview_view: 'light',
  trade_ideas_cached: 'light',
  options_chain_view: 'light',
  earnings_calendar_view: 'light',
  portfolio_overview: 'light',
  
  // Medium
  morning_brief_refresh: 'medium',
  morning_brief_deep_dive: 'medium',
  market_pulse_refresh: 'medium',
  market_pulse_why: 'medium',
  market_pulse_sector: 'medium',
  market_pulse_correlation: 'medium',
  macro_explain: 'medium',
  macro_impact: 'medium',
  macro_calendar_ai: 'medium',
  company_overview: 'medium',
  company_compare: 'medium',
  company_bull_bear: 'medium',
  options_greeks_explain: 'medium',
  options_iv_analysis: 'medium',
  options_risk_reward: 'medium',
  options_what_if: 'medium',
  portfolio_correlation: 'medium',
  portfolio_earnings_alert: 'medium',
  trade_ideas_explain: 'medium',
  trade_ideas_risks: 'medium',
  ai_chat_message: 'medium',
  ai_chat_with_context: 'medium',
  ai_chat_summarize: 'medium',
  
  // Heavy
  morning_brief_custom: 'heavy',
  portfolio_full_scan: 'heavy',
  portfolio_hedge_suggest: 'heavy',
  portfolio_rebalance: 'heavy',
  portfolio_what_if: 'heavy',
  company_full_analysis: 'heavy',
  company_financials: 'heavy',
  company_valuation: 'heavy',
  company_10k_summary: 'heavy',
  company_10q_summary: 'heavy',
  company_earnings_call: 'heavy',
  company_red_flags: 'heavy',
  options_strategy_suggest: 'heavy',
  options_earnings_play: 'heavy',
  options_uoa_analysis: 'heavy',
  options_hedge_suggest: 'heavy',
  options_spread_builder: 'heavy',
  trade_ideas_generate: 'heavy',
  trade_ideas_personalized: 'heavy',
  ai_generate_report: 'heavy',
  ai_research_topic: 'heavy',
};

// ============================================
// PLAN CONFIGURATIONS
// ============================================

export type PlanType = 'free' | 'core' | 'pro' | 'enterprise';

export interface PlanConfig {
  name: string;
  monthlyCredits: number;
  dailyLightLimit: number | null; // null = unlimited
  dailyHeavyLimit: number;
  maxRollover: number;
  canPurchaseCredits: boolean;
  price: number;
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    name: 'Free',
    monthlyCredits: 30,
    dailyLightLimit: 5,
    dailyHeavyLimit: 0,
    maxRollover: 0,
    canPurchaseCredits: false,
    price: 0,
  },
  core: {
    name: 'Core',
    monthlyCredits: 600,
    dailyLightLimit: 15,
    dailyHeavyLimit: 3,
    maxRollover: 0,
    canPurchaseCredits: true,
    price: 39,
  },
  pro: {
    name: 'Pro',
    monthlyCredits: 1500,
    dailyLightLimit: null, // unlimited
    dailyHeavyLimit: 8,
    maxRollover: 500,
    canPurchaseCredits: true,
    price: 69,
  },
  enterprise: {
    name: 'Enterprise',
    monthlyCredits: 5000,
    dailyLightLimit: null,
    dailyHeavyLimit: 25,
    maxRollover: 1000,
    canPurchaseCredits: true,
    price: 199,
  },
};

// ============================================
// CREDIT PACKS (No Expiration!)
// ============================================

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  savings: string;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'boost',
    name: 'Boost',
    credits: 150,
    price: 9,
    savings: '83%',
  },
  {
    id: 'power',
    name: 'Power',
    credits: 400,
    price: 19,
    savings: '79%',
    popular: true,
  },
  {
    id: 'heavy',
    name: 'Heavy',
    credits: 1200,
    price: 49,
    savings: '76%',
  },
  {
    id: 'desk',
    name: 'Desk',
    credits: 3000,
    price: 99,
    savings: '70%',
  },
];

// ============================================
// UI DISPLAY HELPERS
// ============================================

export const ACTION_DISPLAY = {
  light: {
    label: 'Quick Insight',
    icon: '⚡',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  medium: {
    label: 'Smart Analysis',
    icon: '🧠',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  heavy: {
    label: 'Deep AI',
    icon: '🔥',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
} as const;

// ============================================
// SOFT CAP MESSAGES
// ============================================

export const SOFT_CAP_MESSAGES = {
  approaching: "You're approaching your daily limit! 🔥",
  exceeded: "You're on fire today! Actions now cost 2x credits.",
  upgrade: "Upgrade to Pro for 8 heavy actions/day!",
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCreditCost(action: CreditAction): number {
  return CREDIT_COSTS[action];
}

export function getActionType(action: CreditAction): 'light' | 'medium' | 'heavy' {
  return ACTION_TYPES[action];
}

export function getActionDisplay(action: CreditAction) {
  const type = ACTION_TYPES[action];
  return ACTION_DISPLAY[type];
}

export function formatCredits(credits: number): string {
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}k`;
  }
  return credits.toString();
}

export function getPlanConfig(plan: string | null): PlanConfig {
  const planKey = (plan || 'free') as PlanType;
  return PLAN_CONFIGS[planKey] || PLAN_CONFIGS.free;
}