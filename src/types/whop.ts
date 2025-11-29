// types/whop.ts
// All TypeScript types for Whop integration

// ===========================================
// PLAN TYPES
// ===========================================

export type PlanId = 
  | 'basic_monthly'
  | 'basic_yearly'
  | 'premium_monthly'
  | 'premium_yearly'
  | 'lifetime';

export type PlanName = 'free' | 'basic' | 'premium' | 'lifetime';

export type BillingPeriod = 'monthly' | 'yearly' | 'lifetime';

export type SubscriptionStatus = 
  | 'active'
  | 'inactive'
  | 'canceled'
  | 'past_due'
  | 'trialing';

// ===========================================
// PLAN CONFIGURATION
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
}

export interface PlanPricing {
  price: number;
  period: string;
  savings?: string;
}

// ===========================================
// USER SUBSCRIPTION
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
// WEBHOOK TYPES (for reference)
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
  metadata?: Record<string, string>;
}

export interface WhopWebhookPayload {
  action: string;
  data: WhopWebhookData;
}