// types/whop.ts
// All TypeScript types for Whop integration
// 🔥 v3.1 - 14-Day Free Trial + Intro Discount Support
// 
// TRIAL FLOW:
// 1. User signs up → Free trial starts (7-14 days depending on plan)
// 2. During trial → Full access, no payment required
// 3. Trial ends → Automatic billing (with intro discount if applicable)
// 4. If payment succeeds → Subscription becomes 'active'
// 5. If payment fails → Subscription becomes 'past_due'
// 
// 🔥 v3.1 INTRO DISCOUNT:
// - Newsletter: 7-day trial → $10/mo for 2 months (50% off) → $20/mo
// - Top Secret: 14-day trial → $17.50/mo for 2 months (50% off) → $35/mo
// 
// TRIAL RULES:
// - Basic Monthly: 14-day trial (can be used multiple times)
// - Basic Yearly: 14-day trial (can be used multiple times)
// - Premium: NO trial (immediate billing)
// - Platform Pro: 14-day trial (ONE-TIME ONLY - tracked in DB)
// - Newsletter: 7-day trial + 50% OFF first 2 months
// - Top Secret: 14-day trial + 50% OFF first 2 months

// ===========================================
// PLAN TYPES
// ===========================================

export type PlanId = 
  | 'basic_monthly'
  | 'basic_yearly'
  | 'premium_monthly'
  | 'premium_yearly'
  | 'newsletter_monthly'
  | 'top_secret_monthly'
  | 'top_secret_yearly'
  | 'lifetime';

export type PlanName = 'basic' | 'premium' | 'newsletter' | 'top_secret' | 'lifetime';

export type BillingPeriod = 'monthly' | 'yearly' | 'lifetime';

// ===========================================
// SUBSCRIPTION STATUS - 🔥 EXPANDED
// ===========================================

export type SubscriptionStatus = 
  | 'active'          // Paid subscription, active
  | 'inactive'        // No subscription
  | 'canceled'        // User cancelled, still has access until period end
  | 'past_due'        // Payment failed
  | 'trialing'        // In free trial period
  | 'trial'           // Alias for 'trialing'
  | 'trial_expired'   // Trial ended, awaiting first payment
  | 'incomplete'      // Payment setup incomplete
  | 'unpaid';         // Payment failed, access revoked

// ===========================================
// PLAN CONFIGURATION - 🔥 v3.1 UPDATED
// ===========================================

export interface PlanConfig {
  id: PlanId;
  whopPlanId: string;
  name: PlanName;
  displayName: string;
  price: number;
  period: BillingPeriod;
  periodLabel: string;
  features: string[];
  popular?: boolean;
  badge?: string;
  
  // 🔥 TRIAL CONFIGURATION
  trialDays?: number;           // Number of free trial days (0 = no trial)
  trialOnceOnly?: boolean;      // If true, trial can only be used once per user
  
  // 🔥 v3.1: INTRO DISCOUNT CONFIGURATION
  hasIntroDiscount?: boolean;   // Has introductory pricing?
  introDiscountMonths?: number; // How many months of intro pricing (e.g., 2)
  introDiscountPercent?: number;// Discount percentage (e.g., 50 = 50% off)
  introPrice?: number;          // Intro price per month (e.g., $10 instead of $20)
  
  // EXAMPLE:
  // Newsletter (War Zone):
  //   trialDays: 7 (free)
  //   hasIntroDiscount: false
  //   price: 69.99 (regular price)
  //
  // Top Secret:
  //   trialDays: 14 (free)
  //   hasIntroDiscount: true
  //   introDiscountMonths: 2
  //   introPrice: 35 ($35/mo for 2 months)
  //   price: 89.99 (regular price after intro)
}

export interface PlanPricing {
  price: number;
  period: string;
  savings?: string;
  // 🔥 v3.1: Intro pricing
  introPrice?: number;
  introMonths?: number;
}

// ===========================================
// USER SUBSCRIPTION - 🔥 UPDATED
// ===========================================

export interface UserSubscription {
  plan: PlanName;
  status: SubscriptionStatus;
  whopCustomerId: string | null;
  whopMembershipId: string | null;
  startedAt: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
  isActive: boolean;
  
  // 🔥 TRIAL STATUS
  isInTrial: boolean;                    // Currently in trial period?
  trialEndsAt: string | null;            // When trial ends (ISO timestamp)
  trialDaysRemaining: number | null;     // Days remaining in trial
  
  // 🔥 TRIAL HISTORY (for one-time trials like Platform Pro)
  hasUsedTrial: boolean;                 // Has user ever used a trial for this plan?
  trialUsedAt: string | null;            // When trial was first used (ISO timestamp)
  
  // 🔥 v3.1: INTRO DISCOUNT STATUS
  isInIntroDiscount: boolean;            // Currently paying intro price?
  introMonthsRemaining: number | null;   // Months of intro pricing remaining
  introEndsAt: string | null;            // When intro pricing ends
  nextBillingAmount: number | null;      // What they'll pay next billing cycle
  
  // EXAMPLE:
  // Newsletter user in trial:
  //   isInTrial: true
  //   trialEndsAt: "2026-01-15T00:00:00Z"
  //   trialDaysRemaining: 5
  //   status: "trialing"
  //
  // Newsletter user in intro period:
  //   isInTrial: false
  //   isInIntroDiscount: true
  //   introMonthsRemaining: 1
  //   nextBillingAmount: 10  (still $10/mo)
  //   status: "active"
  //
  // Newsletter user after intro:
  //   isInTrial: false
  //   isInIntroDiscount: false
  //   introMonthsRemaining: 0
  //   nextBillingAmount: 20  (full price)
  //   status: "active"
}

// ===========================================
// AFFILIATE TYPES
// ===========================================

export interface AffiliateData {
  affiliateCode: string | null;
  clickId: string | null;
  hasAffiliate: boolean;
  expiresAt: number | null;
}

export interface AffiliateClickParams {
  code: string;
  userAgent: string;
  referrerUrl: string | null;
  landingPage: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
}

// ===========================================
// CHECKOUT TYPES
// ===========================================

export interface CheckoutOptions {
  plan: PlanId;
  email?: string;
  affiliateCode?: string;
  clickId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

// ===========================================
// WEBHOOK TYPES - 🔥 UPDATED
// ===========================================

export interface WhopWebhookUser {
  id: string;
  email: string;
  username?: string;
}

export interface WhopWebhookData {
  id: string;
  product: { id: string };
  plan?: { id: string };
  user: WhopWebhookUser;
  status: string;
  valid: boolean;
  cancel_at_period_end?: boolean;
  created_at: number;
  expires_at?: number;
  canceled_at?: number;
  
  // 🔥 TRIAL FIELDS
  trial_end?: number;              // Unix timestamp when trial ends
  trialing?: boolean;              // Is currently in trial?
  trial_start?: number;            // Unix timestamp when trial started
  
  metadata?: Record<string, string>;
}

export interface WhopWebhookPayload {
  action: string;
  data: WhopWebhookData;
}

// ===========================================
// ACCOUNT TYPES
// ===========================================

export type AccountType = 'free' | 'basic' | 'premium' | 'admin' | 'vip' | 'trial';

// ===========================================
// TRIAL HELPER TYPES - 🔥 v3.1 UPDATED
// ===========================================

/**
 * Trial eligibility check result
 */
export interface TrialEligibility {
  isEligible: boolean;              // Can user start a trial?
  reason?: string;                  // Why not eligible? (if !isEligible)
  trialDays: number;                // How many days in trial
  requiresPaymentMethod: boolean;   // Must provide payment upfront?
  autoChargeDate: string | null;    // When automatic billing occurs (ISO timestamp)
  // 🔥 v3.1: Intro discount info
  hasIntroDiscount: boolean;        // Will get intro pricing after trial?
  introMonths?: number;             // How many months of intro pricing
  introPrice?: number;              // Price during intro period
  regularPrice?: number;            // Regular price after intro
}

/**
 * Trial state snapshot
 */
export interface TrialState {
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  startedAt: string;                // ISO timestamp
  endsAt: string;                   // ISO timestamp
  daysRemaining: number;
  willAutoBill: boolean;            // Will auto-charge at end?
  nextBillingDate: string | null;   // When next charge occurs
  // 🔥 v3.1: Intro discount info
  hasIntroDiscount: boolean;
  introMonthsRemaining?: number;
  introPrice?: number;
}

// ===========================================
// 🔥 v3.1: PRICING DISPLAY HELPERS
// ===========================================

/**
 * Get display price for a plan (accounting for intro pricing)
 */
export interface PlanPricingDisplay {
  displayPrice: number;             // What to show prominently
  regularPrice: number;             // Regular price (strikethrough if intro)
  hasDiscount: boolean;             // Show discount badge?
  discountText?: string;            // E.g., "50% OFF first 2 months"
  priceBreakdown?: string;          // E.g., "$10/mo for 2 months, then $20/mo"
  trialText?: string;               // E.g., "7 days free"
}