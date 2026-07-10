// =====================================================
// FINOTAUR WHOP WEBHOOK HANDLER - v7.3.0
// =====================================================
//
// 🔥 v7.3.0 - Member-refers-friend Phase 2: refund/dispute clawback. New
// handleRefundOrDispute() routes payment.refunded / refund.* /
// payment.disputed / dispute.* / payment.chargeback events to the
// reverse_commissions_for_refund RPC, which cancels any not-yet-paid
// affiliate commission tied to the refunded membership and decrements the
// affiliate's running totals to match. Never throws — always resolves
// {success:true} so Whop doesn't retry-storm.
//
// 🔥 v7.2.0 - Member-refers-friend enrollment: after a first-payment success
// via activate_whop_subscription, fire-and-forget an invoke of create-whop-promo
// (mode='member') so a new paying member gets their own referral coupon
// provisioned automatically. Gated by affiliate_config.member_referral.enabled;
// never blocks or throws into the payment path.
//
// 🔥 v7.1.0 - Affiliate attribution fallback via checkout metadata:
// activate_whop_subscription/handle_whop_payment now fall back to the
// metadata affiliate_code when no paid promo_code is present on the payment.
//
// 🔥 v7.0.0 - BUNDLE REMOVED: Finotaur Platform replaces Bundle
// - Finotaur tier (prod_LtP5GbpPfp9bn/prod_CbWpZrn5P7wc9) includes Newsletter + Top Secret + Journal Premium
// - Removed all bundle-specific logic, cross-discount pricing
// - Platform check prevents deactivation of Newsletter/Top Secret when Finotaur is active
// 
// v3.6.0 - AUTO-CANCEL WAR ZONE WITH TOP SECRET
// - When Top Secret is deactivated, automatically cancel War Zone subscription
// 
// Deploy: supabase functions deploy whop-webhook
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { cancelMembership, pauseMembership, resumeMembership, createCheckoutSession } from "../_shared/whop-api.ts";


// ============================================
// CONFIGURATION
// ============================================

const WHOP_WEBHOOK_SECRET = Deno.env.get("WHOP_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 🔥 v3.9.0: Newsletter Product IDs - Synced with whop-config.ts v4.4.0
const NEWSLETTER_PRODUCT_IDS = new Set([
  'prod_qlaV5Uu6LZlYn',  // War Zone Intelligence - Monthly ($69.99/month)
  'prod_8b3VWkZdena4B',  // War Zone Intelligence - Yearly ($699/year)
]);

// 🔥 Top Secret Product IDs - Synced with whop-config.ts v4.4.0
const TOP_SECRET_PRODUCT_IDS = new Set([
  'prod_nl6YXbLp4t5pz',  // Top Secret (regular: monthly $89.99)
  'prod_aGd9mbl2XUIFO',  // Top Secret Yearly ($899/year)
]);


// 🔥 v6.0.0: Platform Product IDs - Core & Enterprise (NOT Bundle/Finotaur - those use BUNDLE)
const PLATFORM_PRODUCT_IDS = new Set([
  'prod_HDYzeNp6WOJwh',  // Platform Core Monthly - $59/month with 14-day trial
  'prod_YAdXQrHtt72Gd',  // Platform Core Yearly - $590/year
  'prod_LtP5GbpPfp9bn',  // Finotaur Monthly - $89/month with 14-day trial
  'prod_CbWpZrn5P7wc9',  // Finotaur Yearly - $890/year
  'prod_CIKv0J5Rq6aFk',  // Copilot Monthly - $200/month
  'prod_9e5E84XpsrhWE',  // Copilot Yearly ($2,000/year)
]);

// 🔥 v3.10.0: Top Secret Plan IDs - For identifying specific plans
const TOP_SECRET_PLAN_IDS = new Set([
  'plan_tUvQbCrEQ4197',  // Top Secret Monthly ($89.99)
  'plan_PxxbBlSdkyeo7',  // Top Secret Yearly ($899)
]);

// ============================================
// 🔥 v6.0.0: HELPER: Check if product is Platform (Core/Enterprise)
// ============================================

function isPlatform(productId: string | undefined): boolean {
  if (!productId) return false;
  return PLATFORM_PRODUCT_IDS.has(productId);
}

// 🔥 v6.0.0: Get platform plan name from product ID
function getPlatformPlanFromProduct(productId: string): string {
  if (productId === 'prod_HDYzeNp6WOJwh' || productId === 'prod_YAdXQrHtt72Gd') return 'platform_core';
  if (productId === 'prod_LtP5GbpPfp9bn' || productId === 'prod_CbWpZrn5P7wc9') return 'platform_finotaur';
  if (productId === 'prod_CIKv0J5Rq6aFk' || productId === 'prod_9e5E84XpsrhWE') return 'platform_enterprise';
  return 'platform_core'; // fallback
}

// 🔥 v3.9.0: Newsletter Plan IDs - Synced with whop-config.ts v4.4.0
const NEWSLETTER_PLAN_IDS = new Set([
  'plan_U6lF2eO5y9469',  // War Zone Monthly ($69.99)
  'plan_bp2QTGuwfpj0A',  // War Zone Yearly ($699)
]);

// 🔥 v8.8.0: Journal Product ID → plan info (for downgrade detection)
const PRODUCT_ID_TO_PLAN_JOURNAL: Record<string, { plan: string; interval: string }> = {
  'prod_ZaDN418HLst3r': { plan: 'basic', interval: 'monthly' },
  'prod_bPwSoYGedsbyh': { plan: 'basic', interval: 'yearly' },
  'prod_Kq2pmLT1JyGsU': { plan: 'premium', interval: 'monthly' },
  'prod_vON7zlda6iuII': { plan: 'premium', interval: 'yearly' },
  // Intro Offer — hidden product, same entitlements as Journal Premium Monthly. Placeholder product ID.
  'prod_vnQlVO0WVdmiI': { plan: 'premium', interval: 'monthly' },
};

// ============================================
// HELPER: Get billing interval from plan ID
// ============================================

// 🔥 v3.7.0: All Plan IDs - Synced with whop-config.ts v4.4.0
const YEARLY_PLAN_IDS = new Set([
  'plan_bp2QTGuwfpj0A',  // War Zone Yearly ($699/year)
  'plan_PxxbBlSdkyeo7',  // Top Secret Yearly ($899/year)
  'plan_0uYhhF6fX5IKh',  // Finotaur Platform Yearly — $890/yr plan (2026-07)
  'plan_M2zS1EoNXJF10',  // Finotaur Platform Yearly — legacy $1,090/yr plan — active members remain until migrated
  'plan_6w5KTZsSGp7Ss',  // Platform Core Yearly ($590/year)
  'plan_dfy2uADNyEExg',  // Copilot Yearly ($2,000/year)
]);

function getBillingInterval(planId: string): 'monthly' | 'yearly' {
  return YEARLY_PLAN_IDS.has(planId) ? 'yearly' : 'monthly';
}

// Default commission rates (fallback if DB config not found)
// 🔥 v7.1.0: Flat 0.20 across all tiers — synced with affiliate_config DB defaults
const DEFAULT_COMMISSION_RATES = {
  tier_1: 0.20,  // 20%
  tier_2: 0.20,  // 20%
  tier_3: 0.20,  // 20%
  annual: 0.20,  // 20% for annual
} as const;

// ============================================
// CORS HEADERS
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-whop-signature, whop-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================
// TYPES
// ============================================

interface WhopUser {
  id: string;
  name?: string | null;
  email?: string;
  username?: string;
}

interface WhopProduct {
  id: string;
  title?: string;
  route?: string;
}

interface WhopMembership {
  id: string;
  status?: string;
}

interface WhopPromoCode {
  id: string;
  code: string;
  amount_off?: number;
  promo_type?: string;
}

// 🔥 v3.5.0: Updated to include finotaur_email
interface WhopMetadata {
  finotaur_user_id?: string;
  finotaur_email?: string;      // 🔥 v3.5.0: Original email from Finotaur account
  expected_email?: string;      // Legacy field (backwards compatibility)
  click_id?: string;
  [key: string]: string | undefined;
}

interface WhopPaymentData {
  id: string;
  user: WhopUser;
  product: WhopProduct;
  membership: WhopMembership;
  plan?: { id: string };
  total?: number;
  subtotal?: number;
  usd_total?: number;
  currency?: string;
  status?: string;
  promo_code?: WhopPromoCode | null;
  paid_at?: string;
  created_at?: string;
  billing_reason?: string;
  metadata?: WhopMetadata;
  checkout_session?: {
    metadata?: WhopMetadata;
  };
  custom_metadata?: WhopMetadata;
}

interface WhopMembershipData {
  id: string;
  user: WhopUser;
  product: WhopProduct;
  plan?: { id: string };
  status: string;
  cancel_at_period_end?: boolean;  // 🔥 v3.15.0: Added for cancel_at_period_end_changed webhook
  promo_code?: { id: string } | null;
  created_at?: string;
  canceled_at?: string | null;
  renewal_period_start?: string;
  renewal_period_end?: string;
  metadata?: WhopMetadata;
  checkout_session?: {
    metadata?: WhopMetadata;
  };
  custom_metadata?: WhopMetadata;
}

interface WhopWebhookPayload {
  id: string;
  type: string;
  timestamp: string;
  api_version: string;
  data: WhopPaymentData | WhopMembershipData;
}

interface PlanInfo {
  plan: string;
  interval: string;
  price: number;
  maxTrades: number;
  isNewsletter: boolean;
  isTopSecret: boolean;
  isPlatform?: boolean;
}

interface CommissionConfig {
  tier_1: number;
  tier_2: number;
  tier_3: number;
  annual: number;
}

interface UserLookupResult {
  id: string;
  email: string;
  emailMismatch: boolean;
  lookupMethod: 'finotaur_user_id' | 'email' | 'whop_customer_email' | 'partial_email' | 'pending_checkout_email' | 'pending_checkout_single' | 'pending_checkout_partial' | 'pending_checkout_single_recent' | 'pending_checkout_whop_user_id';
}

// ============================================
// HELPER: Check if product is Newsletter
// ============================================

function isNewsletter(productId: string | undefined): boolean {
  if (!productId) return false;
  return NEWSLETTER_PRODUCT_IDS.has(productId);
}

// ============================================
// HELPER: Check if product is Top Secret
// ============================================

function isTopSecret(productId: string | undefined): boolean {
  if (!productId) return false;
  return TOP_SECRET_PRODUCT_IDS.has(productId);
}

// ============================================
// SIGNATURE VERIFICATION
// ============================================

// Constant-time string comparison to avoid timing oracles on the HMAC check.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Verify a Standard Webhooks signature — the scheme Whop migrated to. The HMAC
// is taken over `${webhook-id}.${webhook-timestamp}.${body}`, base64-encoded,
// and delivered in the `webhook-signature` header as a space-separated list of
// `v1,<sig>` entries. The secret is base64 (optionally `whsec_`-prefixed) and is
// decoded to raw key bytes before signing.
function verifyStandardWebhook(body: string, headers: Headers, secret: string): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !sigHeader) return false;

  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(rawSecret), (c) => c.charCodeAt(0));
  } catch {
    // Secret wasn't valid base64 — fall back to treating it as a raw UTF-8 key.
    keyBytes = new TextEncoder().encode(rawSecret);
  }

  const hmac = createHmac("sha256", keyBytes);
  hmac.update(`${id}.${timestamp}.${body}`);
  const expected = hmac.digest("base64");

  // Each entry is `v<version>,<base64-signature>`; any match passes.
  return sigHeader.split(" ").some((entry) => {
    const comma = entry.indexOf(",");
    const sig = comma >= 0 ? entry.slice(comma + 1) : entry;
    return timingSafeEqual(sig, expected);
  });
}

// Legacy scheme (pre-migration Whop): hex HMAC-SHA256 of the raw body delivered
// in `x-whop-signature`. Kept as a fallback so older-style deliveries don't break.
function verifyLegacySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const expected = hmac.digest("hex");
  return timingSafeEqual(signature.replace("sha256=", ""), expected);
}

function verifyWebhookSignature(payload: string, headers: Headers): boolean {
  if (!WHOP_WEBHOOK_SECRET) {
    console.warn("⚠️ Signature check skipped: WHOP_WEBHOOK_SECRET not configured");
    return false;
  }

  // Standard Webhooks first (current Whop scheme), then the legacy fallback.
  if (verifyStandardWebhook(payload, headers, WHOP_WEBHOOK_SECRET)) return true;

  const legacySig = headers.get("x-whop-signature") ||
                    headers.get("whop-signature") ||
                    headers.get("X-Whop-Signature");
  if (verifyLegacySignature(payload, legacySig, WHOP_WEBHOOK_SECRET)) return true;

  // Non-secret diagnostics only (which header families + secret format were
  // present) so we can see WHY a delivery failed without leaking credentials.
  const stdSig = headers.get("webhook-signature");
  console.error("❌ Signature mismatch", {
    hasStandardHeaders: !!(headers.get("webhook-id") && headers.get("webhook-timestamp") && stdSig),
    hasLegacyHeader: !!legacySig,
    standardSigLen: stdSig?.length ?? 0,
    legacySigLen: legacySig?.length ?? 0,
    secretLen: WHOP_WEBHOOK_SECRET.length,
    secretLooksB64: /^(whsec_)?[A-Za-z0-9+/=]+$/.test(WHOP_WEBHOOK_SECRET),
  });
  return false;
}

// ============================================
// HELPER: Get commission rates from DB
// ============================================

async function getCommissionConfig(supabase: SupabaseClient): Promise<CommissionConfig> {
  try {
    const { data: monthlyConfig } = await supabase
      .from("affiliate_config")
      .select("config_value")
      .eq("config_key", "commission_rates")
      .single();

    const { data: annualConfig } = await supabase
      .from("affiliate_config")
      .select("config_value")
      .eq("config_key", "annual_commission_rate")
      .single();

    const rates: CommissionConfig = {
      tier_1: monthlyConfig?.config_value?.tier_1?.rate ?? DEFAULT_COMMISSION_RATES.tier_1,
      tier_2: monthlyConfig?.config_value?.tier_2?.rate ?? DEFAULT_COMMISSION_RATES.tier_2,
      tier_3: monthlyConfig?.config_value?.tier_3?.rate ?? DEFAULT_COMMISSION_RATES.tier_3,
      annual: annualConfig?.config_value?.rate ?? DEFAULT_COMMISSION_RATES.annual,
    };

    console.log("📊 Commission rates loaded:", rates);
    return rates;
  } catch (error) {
    console.warn("⚠️ Failed to load commission config, using defaults:", error);
    return DEFAULT_COMMISSION_RATES;
  }
}

// ============================================
// HELPER: Get member-referral config from DB
// 🔥 v7.2.0: used to gate the post-first-payment enrollment fire-and-forget
// ============================================

async function getMemberReferralConfig(supabase: SupabaseClient): Promise<{ enabled: boolean }> {
  try {
    const { data } = await supabase
      .from("affiliate_config")
      .select("config_value")
      .eq("config_key", "member_referral")
      .single();

    return { enabled: data?.config_value?.enabled === true };
  } catch (error) {
    console.warn("⚠️ Failed to load member_referral config, defaulting to disabled:", error);
    return { enabled: false };
  }
}

// ============================================
// HELPER: Get commission rate for affiliate
// ============================================

function getCommissionRate(
  config: CommissionConfig,
  tier: string,
  subscriptionType: string
): number {
  if (subscriptionType === "yearly") {
    return config.annual;
  }

  switch (tier) {
    case "tier_3":
      return config.tier_3;
    case "tier_2":
      return config.tier_2;
    default:
      return config.tier_1;
  }
}

// ============================================
// HELPER: Get plan info from DB
// ============================================

async function getPlanInfo(
  supabase: SupabaseClient,
  productId: string
): Promise<PlanInfo | null> {
  const { data: dbPlan } = await supabase
    .from("whop_plan_mapping")
    .select("finotaur_plan, billing_interval, price_usd, max_trades")
    .eq("whop_product_id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (dbPlan) {
    return {
      plan: dbPlan.finotaur_plan,
      interval: dbPlan.billing_interval,
      price: parseFloat(dbPlan.price_usd),
      maxTrades: dbPlan.max_trades === -1 ? 999999 : dbPlan.max_trades,
      isNewsletter: dbPlan.finotaur_plan === 'newsletter',
      isTopSecret: dbPlan.finotaur_plan === 'top_secret',
    };
  }

  const fallbackMapping: Record<string, PlanInfo> = {
    "prod_ZaDN418HLst3r": { plan: "basic", interval: "monthly", price: 19.99, maxTrades: 25, isNewsletter: false, isTopSecret: false },
    "prod_bPwSoYGedsbyh": { plan: "basic", interval: "yearly", price: 149.00, maxTrades: 25, isNewsletter: false, isTopSecret: false },
    "prod_Kq2pmLT1JyGsU": { plan: "premium", interval: "monthly", price: 39.99, maxTrades: 999999, isNewsletter: false, isTopSecret: false },
    "prod_vON7zlda6iuII": { plan: "premium", interval: "yearly", price: 299.00, maxTrades: 999999, isNewsletter: false, isTopSecret: false },
    // Intro Offer — hidden product, same entitlements as Journal Premium Monthly. Placeholder product ID.
    "prod_vnQlVO0WVdmiI": { plan: "premium", interval: "monthly", price: 31.49, maxTrades: 999999, isNewsletter: false, isTopSecret: false },
    // Newsletter fallback - Synced with WHOP_CONFIG v4.4.0
    "prod_qlaV5Uu6LZlYn": { plan: "newsletter", interval: "monthly", price: 69.99, maxTrades: 0, isNewsletter: true, isTopSecret: false },
    "prod_8b3VWkZdena4B": { plan: "newsletter", interval: "yearly", price: 699.00, maxTrades: 0, isNewsletter: true, isTopSecret: false },
    // Top Secret fallback
    "prod_nl6YXbLp4t5pz": { plan: "top_secret", interval: "monthly", price: 89.99, maxTrades: 0, isNewsletter: false, isTopSecret: true },
    // 🔥 v7.0.0: Finotaur Platform
    "prod_LtP5GbpPfp9bn": { plan: "platform_finotaur", interval: "monthly", price: 89.00, maxTrades: 999999, isNewsletter: false, isTopSecret: false, isPlatform: true },
    "prod_CbWpZrn5P7wc9": { plan: "platform_finotaur", interval: "yearly", price: 890.00, maxTrades: 999999, isNewsletter: false, isTopSecret: false, isPlatform: true },
  };

  return fallbackMapping[productId] || null;
}

// ============================================
// Extract finotaur_user_id from metadata
// ============================================

function extractFinotaurUserId(data: WhopPaymentData | WhopMembershipData): string | null {
  const possibleLocations = [
    data.metadata?.finotaur_user_id,
    data.checkout_session?.metadata?.finotaur_user_id,
    data.custom_metadata?.finotaur_user_id,
  ];

  for (const userId of possibleLocations) {
    if (userId && typeof userId === 'string' && userId.length > 0) {
      console.log("✅ Found finotaur_user_id in metadata:", userId);
      return userId;
    }
  }

  return null;
}

// ============================================
// 🔥 v3.5.0: Extract finotaur_email from metadata
// ============================================

function extractFinotaurEmail(data: WhopPaymentData | WhopMembershipData): string | null {
  const possibleLocations = [
    data.metadata?.finotaur_email,
    data.checkout_session?.metadata?.finotaur_email,
    data.custom_metadata?.finotaur_email,
    // Fallback to expected_email (older format for backwards compatibility)
    data.metadata?.expected_email,
    data.checkout_session?.metadata?.expected_email,
    data.custom_metadata?.expected_email,
  ];

  for (const email of possibleLocations) {
    if (email && typeof email === 'string' && email.length > 0) {
      console.log("✅ Found finotaur_email in metadata:", email);
      return email;
    }
  }

  return null;
}

// ============================================
// Extract click_id from metadata
// ============================================

function extractClickId(data: WhopPaymentData | WhopMembershipData): string | null {
  const possibleLocations = [
    data.metadata?.click_id,
    data.checkout_session?.metadata?.click_id,
    data.custom_metadata?.click_id,
  ];

  for (const clickId of possibleLocations) {
    if (clickId && typeof clickId === 'string' && clickId.length > 0) {
      console.log("✅ Found click_id in metadata:", clickId);
      return clickId;
    }
  }

  return null;
}

// ============================================
// 🔥 v7.1.0: Extract affiliate_code from metadata
// ============================================

function extractAffiliateCode(data: WhopPaymentData | WhopMembershipData): string | null {
  const possibleLocations = [
    data.metadata?.affiliate_code,
    data.checkout_session?.metadata?.affiliate_code,
    data.custom_metadata?.affiliate_code,
  ];

  for (const affiliateCode of possibleLocations) {
    if (affiliateCode && typeof affiliateCode === 'string' && affiliateCode.length > 0) {
      console.log("✅ Found affiliate_code in metadata:", affiliateCode);
      return affiliateCode;
    }
  }

  return null;
}

// ============================================
// 🔥 Fire first-party paid_conversion event (ad attribution)
// ============================================
//
// ADDITIVE ONLY. Never throws — any failure is caught and logged by the
// caller. Attributes the payment back to the acquisition ad by joining the
// paying user's earliest `signup` event (props carry the UTM params set at
// signup) and writes one `paid_conversion` row to `public.events`.

async function firePaidConversion(
  supabaseServiceClient: SupabaseClient,
  userId: string | null,
  payment: {
    whopPaymentId: string;
    whopMembershipId: string | null;
    plan: string | null;
    product: string | null;
    amountUsd: number | null;
    currency: string | null;
    isFirstPayment: boolean;
  }
): Promise<void> {
  // Idempotency guard — skip if we already recorded this Whop payment.
  const { data: existing } = await supabaseServiceClient
    .from("events")
    .select("id")
    .eq("event_name", "paid_conversion")
    .eq("props->>whop_payment_id", payment.whopPaymentId)
    .maybeSingle();

  if (existing) {
    console.log("[whop-webhook] paid_conversion already recorded, skipping:", payment.whopPaymentId);
    return;
  }

  // Look up the acquisition UTM from the user's earliest signup event.
  let utm_source: string | null = null;
  let utm_medium: string | null = null;
  let utm_campaign: string | null = null;
  let utm_content: string | null = null;
  let utm_term: string | null = null;

  if (userId) {
    const { data: signupEvent } = await supabaseServiceClient
      .from("events")
      .select("props")
      .eq("user_id", userId)
      .eq("event_name", "signup")
      .order("ts", { ascending: true })
      .limit(1)
      .maybeSingle();

    const signupProps = signupEvent?.props ?? {};
    utm_source = signupProps.utm_source ?? null;
    utm_medium = signupProps.utm_medium ?? null;
    utm_campaign = signupProps.utm_campaign ?? null;
    utm_content = signupProps.utm_content ?? null;
    utm_term = signupProps.utm_term ?? null;
  }

  // Best-effort is_first_payment: trust the payload's own signal when present,
  // else fall back to "no prior paid_conversion event for this user".
  let isFirstPayment = payment.isFirstPayment;
  if (userId) {
    const { data: priorConversion } = await supabaseServiceClient
      .from("events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_name", "paid_conversion")
      .limit(1)
      .maybeSingle();
    isFirstPayment = !priorConversion;
  }

  const { error } = await supabaseServiceClient.from("events").insert({
    event_name: "paid_conversion",
    user_id: userId,
    source: "whop_webhook",
    props: {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      plan: payment.plan,
      product: payment.product,
      amount_usd: payment.amountUsd,
      currency: payment.currency,
      whop_payment_id: payment.whopPaymentId,
      whop_membership_id: payment.whopMembershipId,
      is_first_payment: isFirstPayment,
    },
  });

  if (error) {
    console.error("[whop-webhook] paid_conversion insert failed", error);
    return;
  }

  console.log("[whop-webhook] paid_conversion recorded:", payment.whopPaymentId);
}

// ============================================
// 📊 Meta Conversions API — server-side Purchase (ad optimization)
// ============================================
//
// ADDITIVE ONLY. Never throws — the caller wraps it in try/catch. Sends a
// server-side `Purchase` to Meta's Conversions API so Meta can optimize
// delivery toward buyers. Dedupes with any client-side Purchase via `event_id`
// (= Whop payment id). The access token is a server secret and is NEVER logged.

const META_CAPI_PIXEL_ID = "992779070272021";
const META_CAPI_API_VERSION = "v20.0";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fireMetaCapiPurchase(
  email: string | null,
  purchase: {
    eventId: string;
    value: number | null;
    currency: string | null;
    plan: string | null;
  }
): Promise<void> {
  // Accept either secret name — META_CAPI_TOKEN is what's set in prod;
  // META_CAPI_ACCESS_TOKEN kept as a fallback for the originally-documented name.
  const accessToken =
    Deno.env.get("META_CAPI_TOKEN") || Deno.env.get("META_CAPI_ACCESS_TOKEN") || "";
  if (!accessToken) {
    console.log("[whop-webhook] Meta CAPI skipped — META_CAPI_TOKEN not set");
    return;
  }
  if (!email) {
    console.log("[whop-webhook] Meta CAPI skipped — no email for user_data");
    return;
  }

  // Meta requires the email normalized (trim + lowercase) then SHA-256 hashed.
  const hashedEmail = await sha256Hex(email.trim().toLowerCase());
  const testEventCode = Deno.env.get("META_CAPI_TEST_EVENT_CODE") || "";

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: purchase.eventId, // dedup with any client-side Purchase
        action_source: "website",
        event_source_url: "https://www.finotaur.com",
        user_data: { em: [hashedEmail] },
        custom_data: {
          value: purchase.value ?? 0,
          currency: (purchase.currency || "USD").toUpperCase(),
          content_name: purchase.plan ?? undefined,
        },
      },
    ],
  };
  if (testEventCode) body.test_event_code = testEventCode;

  // The access token lives in the query string, so the URL is NEVER logged.
  const url = `https://graph.facebook.com/${META_CAPI_API_VERSION}/${META_CAPI_PIXEL_ID}/events?access_token=${encodeURIComponent(accessToken)}`;

  // Bound the request so a slow Meta API can never hang webhook processing.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(`[whop-webhook] Meta CAPI Purchase failed: ${resp.status} ${errText.slice(0, 300)}`);
      return;
    }
    console.log("[whop-webhook] Meta CAPI Purchase sent:", purchase.eventId, testEventCode ? "(test)" : "");
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// Find user by ID or email with fallback
// ============================================

async function tryFindUser(
  supabase: SupabaseClient,
  finotaurUserId: string | null,
  whopEmail: string | undefined
): Promise<UserLookupResult | null> {
  
  // OPTION 1: Try finotaur_user_id first (PREFERRED)
  if (finotaurUserId) {
    console.log("🔍 Looking up user by finotaur_user_id:", finotaurUserId);
    
    const { data: userById, error: userByIdError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", finotaurUserId)
      .maybeSingle();

    if (!userByIdError && userById) {
      const emailMismatch = whopEmail 
        ? userById.email?.toLowerCase() !== whopEmail.toLowerCase()
        : false;
      
      return {
        id: userById.id,
        email: userById.email,
        emailMismatch,
        lookupMethod: 'finotaur_user_id',
      };
    }
  }

  // OPTION 2: Try exact email match
  if (whopEmail) {
    console.log("📧 Looking up user by exact email:", whopEmail);
    
    const { data: userByEmail } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", whopEmail)
      .maybeSingle();

    if (userByEmail) {
      return {
        id: userByEmail.id,
        email: userByEmail.email,
        emailMismatch: false,
        lookupMethod: 'email',
      };
    }
  }

  // OPTION 3: Try whop_customer_email (returning customers)
  if (whopEmail) {
    console.log("📧 Looking up user by whop_customer_email:", whopEmail);
    
    const { data: userByWhopEmail } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("whop_customer_email", whopEmail)
      .maybeSingle();

    if (userByWhopEmail) {
      console.log("✅ Found user by whop_customer_email:", userByWhopEmail.id);
      return {
        id: userByWhopEmail.id,
        email: userByWhopEmail.email,
        emailMismatch: true,
        lookupMethod: 'whop_customer_email',
      };
    }
  }

  // OPTION 4: Try partial email match (same username prefix)
  if (whopEmail) {
    const emailUsername = whopEmail.split('@')[0].toLowerCase();
    const genericUsernames = ['info', 'admin', 'test', 'user', 'mail', 'contact'];
    
    if (emailUsername.length >= 5 && !genericUsernames.includes(emailUsername)) {
      console.log("📧 Trying partial email match for username:", emailUsername);
      
      const { data: userByPartial } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", `${emailUsername}@%`)
        .limit(1)
        .maybeSingle();

      if (userByPartial) {
        console.log("⚠️ Found user by PARTIAL email match:", {
          foundEmail: userByPartial.email,
          whopEmail: whopEmail,
          userId: userByPartial.id
        });
        
        return {
          id: userByPartial.id,
          email: userByPartial.email,
          emailMismatch: true,
          lookupMethod: 'partial_email',
        };
      }
    }
  }

  return null;
}

// 🔥 NEW: Find user from pending_checkouts table
async function findUserFromPendingCheckout(
  supabase: SupabaseClient,
  whopEmail: string | undefined,
  productType: 'newsletter' | 'top_secret' | 'journal',
  whopUserId?: string  // 🔥 v3.13.0: Added Whop User ID for better matching
): Promise<UserLookupResult | null> {
console.log("🔍 Looking up user in pending_checkouts for:", { whopEmail, whopUserId, productType });
  
  // 🔥 PRIORITY 0: Check by Whop User ID first (most reliable for returning customers)
  if (whopUserId) {
    const { data: pendingByWhopUser } = await supabase
      .from("pending_checkouts")
      .select("user_id, user_email")
      .eq("whop_user_id", whopUserId)
      .eq("product_type", productType)
      .is("completed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingByWhopUser) {
      console.log("✅ Found user in pending_checkouts by Whop User ID:", pendingByWhopUser.user_id);
      return {
        id: pendingByWhopUser.user_id,
        email: pendingByWhopUser.user_email,
        emailMismatch: whopEmail ? pendingByWhopUser.user_email.toLowerCase() !== whopEmail.toLowerCase() : false,
        lookupMethod: 'pending_checkout_whop_user_id',
      };
    }
  }
  
  if (!whopEmail) return null;
  
  // Check if the Whop email matches a pending checkout's user_email
  const { data: pendingByEmail } = await supabase
    .from("pending_checkouts")
    .select("user_id, user_email")
    .eq("user_email", whopEmail)
    .eq("product_type", productType)
    .is("completed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingByEmail) {
    console.log("✅ Found user in pending_checkouts by email match:", pendingByEmail.user_id);
    return {
      id: pendingByEmail.user_id,
      email: pendingByEmail.user_email,
      emailMismatch: false,
      lookupMethod: 'pending_checkout_email',
    };
  }

  // If only ONE pending checkout exists for this product type in the last hour,
  // it's very likely this user (they just changed email at Whop)
  const { data: recentPending } = await supabase
    .from("pending_checkouts")
    .select("user_id, user_email")
    .eq("product_type", productType)
    .is("completed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  if (recentPending && recentPending.length === 1) {
    console.log("✅ Found SINGLE pending checkout, assuming match:", recentPending[0].user_email);
    return {
      id: recentPending[0].user_id,
      email: recentPending[0].user_email,
      emailMismatch: true,
      lookupMethod: 'pending_checkout_single',
    };
  }

  // Check by partial email match in pending checkouts
  if (whopEmail) {
    const emailUsername = whopEmail.split('@')[0].toLowerCase();
    
    if (emailUsername.length >= 4) {
      const { data: pendingByPartial } = await supabase
        .from("pending_checkouts")
        .select("user_id, user_email")
        .eq("product_type", productType)
        .is("completed_at", null)
        .gt("expires_at", new Date().toISOString())
        .ilike("user_email", `${emailUsername}@%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingByPartial) {
        console.log("✅ Found pending checkout by PARTIAL email match:", {
          pendingEmail: pendingByPartial.user_email,
          whopEmail: whopEmail,
          userId: pendingByPartial.user_id
        });
        return {
          id: pendingByPartial.user_id,
          email: pendingByPartial.user_email,
          emailMismatch: true,
          lookupMethod: 'pending_checkout_partial',
        };
      }
    }
  }

  // All lookup methods exhausted — return no match.
  // The caller will log the event to whop_webhook_log (processed:false) for manual reconciliation.
  return null;
}

// 🔥 NEW: Mark pending checkout as completed
async function completePendingCheckout(
  supabase: SupabaseClient,
  userId: string,
  productType: 'newsletter' | 'top_secret' | 'journal',
  whopMembershipId: string
): Promise<void> {
  const { error } = await supabase
    .from("pending_checkouts")
    .update({ 
      completed_at: new Date().toISOString(),
      whop_membership_id: whopMembershipId
    })
    .eq("user_id", userId)
    .eq("product_type", productType)
    .is("completed_at", null);

  if (error) {
    console.warn("⚠️ Failed to mark pending checkout as completed:", error);
  } else {
    console.log("✅ Marked pending checkout as completed for user:", userId);
  }
}

// Main findUser function WITH RETRY LOGIC AND PENDING CHECKOUT SUPPORT
async function findUser(
  supabase: SupabaseClient,
  finotaurUserId: string | null,
  whopEmail: string | undefined,
  productType?: 'newsletter' | 'top_secret' | 'journal',
  whopUserId?: string  // 🔥 v3.13.0: Added for better pending_checkout matching
): Promise<UserLookupResult | null> {
  
  // First attempt - standard lookup
  let user = await tryFindUser(supabase, finotaurUserId, whopEmail);
  
  // 🔥 NEW: If not found, try pending_checkouts table
  if (!user && productType) {
    user = await findUserFromPendingCheckout(supabase, whopEmail, productType, whopUserId);
  }
  
  // 🔥 RETRY LOGIC: If not found and we have identifiers, wait and retry
  if (!user && (finotaurUserId || whopEmail)) {
    console.log('⏳ User not found on first attempt, retrying in 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    user = await tryFindUser(supabase, finotaurUserId, whopEmail);
    
    // Try pending checkouts again after retry
    if (!user && productType) {
      user = await findUserFromPendingCheckout(supabase, whopEmail, productType);
    }
    
    // Second retry after 3 more seconds
    if (!user) {
      console.log('⏳ Still not found, final retry in 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      user = await tryFindUser(supabase, finotaurUserId, whopEmail);
      
      if (!user && productType) {
        user = await findUserFromPendingCheckout(supabase, whopEmail, productType);
      }
    }
  }
  
  if (!user) {
    console.warn(`⚠️ User not found after retries: finotaur_user_id=${finotaurUserId}, email=${whopEmail}`);
  }
  
  return user;
}

// ============================================
// HELPER: Extract promo code
// ============================================

function extractPromoCode(data: WhopPaymentData | WhopMembershipData): string | null {
  if ('promo_code' in data && data.promo_code && typeof data.promo_code === 'object') {
    if ('code' in data.promo_code && data.promo_code.code) {
      console.log("✅ Found promo_code:", data.promo_code.code);
      return data.promo_code.code.toUpperCase();
    }
  }
  return null;
}

// ============================================
// 🔥 v3.6.0: CANCEL WAR ZONE FOR TOP SECRET MEMBER
// Called when Top Secret subscription is deactivated
// Cancels at period end so user keeps access until billing period ends
// ============================================

async function cancelWarZoneForTopSecretMember(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; message: string; warZoneCancelled: boolean }> {
  console.log("🔥 Checking if user has War Zone subscription to cancel...", { userId, userEmail });

  try {
    // Step 1: Check if user has an active War Zone subscription
    const { data: profile } = await supabase
      .from("profiles")
      .select("newsletter_enabled, newsletter_status, newsletter_whop_membership_id")
      .eq("id", userId)
      .single();

    if (!profile) {
      console.log("⚠️ Profile not found for War Zone cancellation check");
      return { success: true, message: "Profile not found", warZoneCancelled: false };
    }

    // Check if War Zone is active
    const hasActiveWarZone = profile.newsletter_enabled && 
      ['active', 'trial', 'trialing'].includes(profile.newsletter_status || '');

    if (!hasActiveWarZone) {
      console.log("ℹ️ User does not have active War Zone subscription");
      return { success: true, message: "No active War Zone subscription", warZoneCancelled: false };
    }

    const warZoneMembershipId = profile.newsletter_whop_membership_id;

    if (!warZoneMembershipId) {
      console.log("⚠️ User has War Zone but no membership ID - updating DB only");
      
      // Just update DB to mark as cancelled at period end
      await supabase
        .from("profiles")
        .update({
          newsletter_cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return { success: true, message: "War Zone marked for cancellation (no Whop ID)", warZoneCancelled: true };
    }

    // Step 2: Cancel War Zone membership via Whop API (at period end)
    console.log("🚀 Cancelling War Zone membership via Whop API:", warZoneMembershipId);

    if (!Deno.env.get("WHOP_API_KEY")) {
      console.error("❌ WHOP_API_KEY not configured");
      
      // Still update DB
      await supabase
        .from("profiles")
        .update({
          newsletter_cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return { 
        success: false, 
        message: "WHOP_API_KEY not configured - DB updated but Whop not called", 
        warZoneCancelled: true 
      };
    }

const cancelResult = await cancelMembership(warZoneMembershipId, 'at_period_end');

    if (!cancelResult.success && cancelResult.status !== 404 && cancelResult.status !== 422) {
      console.error("❌ Whop API error:", cancelResult.error);
      
      // Still update DB
      await supabase
        .from("profiles")
        .update({
          newsletter_cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return { 
        success: false, 
        message: `Whop API error: ${cancelResult.error} - DB updated`, 
        warZoneCancelled: true 
      };
    }

    console.log("✅ Whop API cancel result:", cancelResult.data);

    // Step 3: Update database
    await supabase
      .from("profiles")
      .update({
        newsletter_cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Step 4: Log the automatic cancellation
    await supabase
      .from("whop_webhook_log")
      .insert({
        event_id: `auto_cancel_warzone_${userId}_${Date.now()}`,
        event_type: "auto_cancel_warzone_with_topsecret",
        whop_user_id: null,
        whop_membership_id: warZoneMembershipId,
        whop_product_id: null,
        payload: { 
          reason: "Top Secret subscription deactivated",
          user_id: userId,
          user_email: userEmail,
          war_zone_membership_id: warZoneMembershipId,
        },
        processed: true,
        processing_result: "War Zone cancelled at period end due to Top Secret deactivation",
        metadata: { 
          triggered_by: "top_secret_deactivation",
          cancel_type: "at_period_end",
        },
      });

    console.log("✅ War Zone subscription cancelled at period end for Top Secret member:", userEmail);

    return { 
      success: true, 
      message: `War Zone cancelled at period end for ${userEmail}`, 
      warZoneCancelled: true 
    };

  } catch (error) {
    console.error("❌ Error cancelling War Zone for Top Secret member:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error", 
      warZoneCancelled: false 
    };
  }
}

// ============================================
// 🔥 v3.6.1: GRANT WAR ZONE FOR TOP SECRET MEMBER
// Called when Top Secret subscription is activated or renewed
// Grants the user WAR ZONE (newsletter) entitlement automatically
// Mirror of cancelWarZoneForTopSecretMember — keep these in sync
// ============================================

async function grantWarZoneForTopSecretMember(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; message: string }> {
  console.log("🔥 Granting War Zone for Top Secret member...", { userId, userEmail });

  try {
    // Step 1: Read the user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("top_secret_status, top_secret_interval, newsletter_enabled, newsletter_status, newsletter_whop_membership_id")
      .eq("id", userId)
      .single();

    if (!profile) {
      console.log("⚠️ Profile not found for War Zone grant");
      return { success: false, message: "Profile not found" };
    }

    // Step 2: No-clobber guard — do not override a separately-purchased active War Zone
    const hasSeparateWarZone =
      profile.newsletter_whop_membership_id != null &&
      ['active', 'trial', 'trialing'].includes(profile.newsletter_status || '');

    if (hasSeparateWarZone) {
      console.log("ℹ️ Separate War Zone membership exists, not overriding", {
        newsletter_whop_membership_id: profile.newsletter_whop_membership_id,
        newsletter_status: profile.newsletter_status,
      });
      return { success: true, message: "Separate War Zone exists, not overriding" };
    }

    // Step 3: Grant War Zone — mirror the Top Secret status
    const grantedStatus =
      ['trial', 'trialing'].includes(profile.top_secret_status || '')
        ? 'trial'
        : 'active';

    const grantedInterval = profile.top_secret_interval || 'monthly';

    await supabase
      .from("profiles")
      .update({
        newsletter_enabled: true,
        newsletter_status: grantedStatus,
        newsletter_interval: grantedInterval,
        newsletter_whop_membership_id: null,
        newsletter_cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Step 4: Audit log — mirror exact column shape of cancelWarZoneForTopSecretMember
    await supabase
      .from("whop_webhook_log")
      .insert({
        event_id: `auto_grant_warzone_${userId}_${Date.now()}`,
        event_type: "auto_grant_warzone_with_topsecret",
        whop_user_id: null,
        whop_membership_id: null,
        whop_product_id: null,
        payload: {
          reason: "Top Secret subscription activated",
          user_id: userId,
          user_email: userEmail,
          granted_status: grantedStatus,
          granted_interval: grantedInterval,
        },
        processed: true,
        processing_result: "War Zone granted via Top Secret entitlement",
        metadata: {
          triggered_by: "top_secret_activation",
          source: "top_secret",
          granted_status: grantedStatus,
        },
      });

    const message = `War Zone granted (${grantedStatus}) via Top Secret for ${userEmail}`;
    console.log("✅", message);
    return { success: true, message };

  } catch (error) {
    console.error("❌ Error granting War Zone for Top Secret member:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// BROKER CONNECTION LIFECYCLE HELPERS
// ============================================

async function markBrokerConnectionsCanceled(
  admin: SupabaseClient,
  userId: string,
): Promise<{ updated: number }> {
  // status='canceled' is valid once migration 2026-05-09_broker_connections_retry_columns.sql
  // deploys (it drops the old CHECK and adds one that includes 'canceled').
  const { data, error } = await admin
    .from('broker_connections')
    .update({
      status: 'canceled',
      is_active: false,
      disconnected_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .neq('status', 'canceled') // idempotent guard — skip rows already canceled
    .select('id');
  if (error) {
    console.error('[whop-webhook] markBrokerConnectionsCanceled error:', error);
    return { updated: 0 };
  }
  console.info(`[whop-webhook] canceled ${data?.length ?? 0} broker connections for user ${userId}`);
  return { updated: data?.length ?? 0 };
}

async function reactivateBrokerConnections(
  admin: SupabaseClient,
  userId: string,
): Promise<{ attempted: number; succeeded: number }> {
  // Only target rows this lifecycle set to 'canceled' — payment.succeeded fires on first
  // payment too, and we don't want to reconnect rows that were never canceled by this
  // lifecycle (e.g. rows the user manually disconnected).
  const { data: canceled, error } = await admin
    .from('broker_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'canceled');
  if (error) {
    console.error('[whop-webhook] reactivateBrokerConnections fetch error:', error);
    return { attempted: 0, succeeded: 0 };
  }
  if (!canceled || canceled.length === 0) {
    return { attempted: 0, succeeded: 0 };
  }

  let succeeded = 0;
  for (const row of canceled) {
    try {
      const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/tradovate-auth`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          mode: 'reconnect',
          credentialId: row.id,
          userId,
          source: 'whop_resume',
        }),
      });
      if (res.ok) succeeded++;
      else console.warn(`[whop-webhook] reconnect failed for ${row.id}: ${res.status}`);
    } catch (e) {
      console.error(`[whop-webhook] reconnect exception for ${row.id}:`, (e as Error).message);
    }
  }

  console.info(`[whop-webhook] reactivated ${succeeded}/${canceled.length} broker connections for user ${userId}`);
  return { attempted: canceled.length, succeeded };
}

// ============================================
// 🔥 v7.3.0: REFUND / DISPUTE CLAWBACK
// Called on payment.refunded / refund.* / payment.disputed / dispute.* /
// payment.chargeback. Cancels not-yet-paid affiliate commissions for the
// affected membership via reverse_commissions_for_refund and decrements the
// affiliate's running totals to match. NEVER throws — always resolves
// {success:true} so Whop doesn't retry-storm on our account of a clawback.
// ============================================

async function handleRefundOrDispute(
  supabase: SupabaseClient,
  data: WhopPaymentData | WhopMembershipData,
  eventType: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Mirror the top-level extraction (index.ts ~line 1463): payment-shaped
    // payloads carry the membership under `.membership.id`; membership-shaped
    // payloads (mirrors handleMembershipDeactivated's `data.id`) ARE the
    // membership, so `.id` is the membership id itself.
    const membershipId = 'membership' in data ? data.membership?.id : data.id;

    if (!membershipId) {
      console.warn(`[whop-webhook] handleRefundOrDispute: no membership id on ${eventType} payload`);
      return { success: true, message: `${eventType} acknowledged — no membership id to reverse` };
    }

    const { data: result, error } = await supabase.rpc('reverse_commissions_for_refund', {
      p_whop_membership_id: membershipId,
      p_reason: eventType,
    });

    if (error) {
      console.error(`[whop-webhook] reverse_commissions_for_refund RPC error for ${eventType}:`, error);
      return { success: true, message: `${eventType} acknowledged — commission reversal RPC failed (logged)` };
    }

    console.log(`[whop-webhook] reverse_commissions_for_refund result for ${eventType}:`, result);

    if (result?.paid_untouched_count > 0) {
      console.error(
        '[whop-webhook] REFUND on referral with ALREADY-PAID commissions — manual review needed',
        { eventType, membershipId, result }
      );
    }

    return {
      success: true,
      message: `${eventType} processed: ${JSON.stringify(result)}`,
    };
  } catch (err) {
    console.error(`[whop-webhook] handleRefundOrDispute unexpected error for ${eventType}:`, err);
    return { success: true, message: `${eventType} acknowledged — handler threw (logged, non-fatal)` };
  }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();

  try {
    const rawBody = await req.text();

    if (!verifyWebhookSignature(rawBody, req.headers)) {
      console.error("❌ Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: WhopWebhookPayload = JSON.parse(rawBody);
    const eventType = payload.type || "unknown";
    const eventId = payload.id || `evt_${Date.now()}`;
    const productId = payload.data.product?.id;

    // Extract metadata early for logging
    const finotaurUserId = extractFinotaurUserId(payload.data);
    const finotaurEmail = extractFinotaurEmail(payload.data);  // 🔥 v3.5.0

    // 🔥 Detect if this is a newsletter/top secret/platform event
    const isNewsletterEvent = isNewsletter(productId);
    const isTopSecretEvent = isTopSecret(productId);
    const isPlatformEvent = isPlatform(productId);

    console.log("📨 Webhook received:", {
      eventType,
      eventId,
      timestamp: payload.timestamp,
      finotaurUserId,
      finotaurEmail,           // 🔥 v3.5.0: Log original email from metadata
      whopEmail: payload.data.user?.email,
      productId,
      isNewsletter: isNewsletterEvent,
      isTopSecret: isTopSecretEvent,
      isPlatform: isPlatformEvent,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Load commission config
    const commissionConfig = await getCommissionConfig(supabase);

    // Check for duplicates
    const { data: existingEvent } = await supabase
      .from("whop_webhook_log")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      console.log("⚠️ Duplicate event, skipping:", eventId);
      return new Response(
        JSON.stringify({ success: true, message: "Duplicate event ignored" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = payload.data;
    const whopUserId = data.user?.id;
    const whopMembershipId = 'membership' in data ? data.membership?.id : data.id;
    const whopProductId = data.product?.id;

    // Log webhook (🔥 v3.5.0: include finotaur_email in metadata)
    const { data: logEntry } = await supabase
      .from("whop_webhook_log")
      .insert({
        event_id: eventId,
        event_type: eventType,
        whop_user_id: whopUserId,
        whop_membership_id: whopMembershipId,
        whop_product_id: whopProductId,
        payload: payload,
        processed: false,
        metadata: { 
          finotaur_user_id: finotaurUserId, 
          finotaur_email: finotaurEmail,  // 🔥 v3.5.0
          is_newsletter: isNewsletterEvent,
          is_top_secret: isTopSecretEvent,
        },
      })
      .select()
      .single();

    let result: { success: boolean; message: string };

    // Extract click_id for affiliate tracking
    const clickId = extractClickId(payload.data);

    switch (eventType) {
      case "payment.succeeded": {
        result = await handlePaymentSucceeded(supabase, payload, commissionConfig, finotaurUserId, finotaurEmail, clickId);
        // Broker lifecycle: payment success after a prior cancel — attempt to reconnect broker
        if (finotaurUserId) {
          await reactivateBrokerConnections(supabase, finotaurUserId);
        }
        // 🔥 Ad attribution + 📊 Meta CAPI — both additive, both guarded, both
        // fire only after a successful payment and NEVER break payment handling.
        if (result.success) {
          const paymentData = payload.data as WhopPaymentData;
          let amountUsd = paymentData.subtotal ?? paymentData.total ?? paymentData.usd_total ?? 0;
          if (amountUsd > 1000) amountUsd = amountUsd / 100;

          // 🔥 First-party paid_conversion event (ad attribution).
          try {
            await firePaidConversion(supabase, finotaurUserId, {
              whopPaymentId: paymentData.id,
              whopMembershipId: paymentData.membership?.id ?? null,
              plan: paymentData.plan?.id ?? null,
              product: paymentData.product?.id ?? null,
              amountUsd,
              currency: paymentData.currency ?? null,
              isFirstPayment: paymentData.billing_reason === "subscription_create",
            });
          } catch (e) {
            console.error('[whop-webhook] paid_conversion failed', e);
          }

          // 📊 Server-side Meta CAPI Purchase so Meta can optimize to buyers
          // (timeout-bounded, token never logged; no-op if secret/email absent).
          try {
            const capiEmail = finotaurEmail || paymentData.user?.email || null;
            await fireMetaCapiPurchase(capiEmail, {
              eventId: paymentData.id,
              value: amountUsd,
              currency: paymentData.currency ?? null,
              plan: paymentData.plan?.id ?? null,
            });
          } catch (e) {
            console.error('[whop-webhook] Meta CAPI Purchase error', e);
          }
        }
        break;
      }
        
      case "membership.activated":
      case "membership.went_valid":
        result = await handleMembershipActivated(supabase, payload, finotaurUserId, finotaurEmail);
        break;

      case "membership.deactivated":
      case "membership.went_invalid":
      case "membership.canceled":
      case "membership.expired": {
        result = await handleMembershipDeactivated(supabase, payload, finotaurUserId);
        // Broker lifecycle: terminal subscription event — disconnect broker connections
        if (finotaurUserId) {
          await markBrokerConnectionsCanceled(supabase, finotaurUserId);
        } else {
          console.info('[whop-webhook] broker cancel skipped — no finotaur_user_id for event:', eventType);
        }
        break;
      }

      case "membership.cancel_at_period_end_changed":
        result = await handleCancelAtPeriodEndChanged(supabase, payload, finotaurUserId, finotaurEmail);
        break;

      case "payment.failed": {
        // payment.failed fires on every retry attempt — NOT a terminal event.
        // Terminal subscription death is signaled by membership.went_invalid (below).
        // No broker mutation here.
        //
        // Sprint W.1: fire-and-forget dunning email so the user knows their
        // card failed. payment-failed-notify is never-throw + has its own
        // kill-switch (PAYMENT_ALERT_DISABLED) + RESEND_API_KEY guard, so this
        // call never breaks webhook processing.
        try {
          if (!finotaurUserId) {
            console.info('[whop-webhook] payment-failed-notify skipped — no finotaur_user_id');
            result = { success: true, message: `Payment failure logged (no user_id for email)` };
            break;
          }
          const data = payload.data || {};
          let amountCents = data.subtotal ?? data.total ?? data.usd_total ?? 0;
          // Whop sends "small" amounts as dollars and "large" amounts as cents
          // (per handlePaymentSucceeded heuristic line 1310). Normalize to cents
          // for the email function's formatter.
          if (amountCents > 0 && amountCents < 1000) amountCents = Math.round(amountCents * 100);
          const productId = data.product?.id ?? '';
          const productName = isPlatform(productId)
            ? (productId === 'prod_LtP5GbpPfp9bn' || productId === 'prod_CbWpZrn5P7wc9' ? 'FINOTAUR'
              : productId === 'prod_CIKv0J5Rq6aFk' ? 'Platform Enterprise'
              : 'Platform Core')
            : NEWSLETTER_PRODUCT_IDS.has(productId) ? 'War Zone Intelligence'
            : TOP_SECRET_PRODUCT_IDS.has(productId) ? 'Top Secret'
            : 'subscription';

          // Fire-and-forget invoke. We do NOT await — webhook must respond fast
          // and the email is non-critical for webhook idempotency.
          void supabase.functions
            .invoke('payment-failed-notify', {
              body: {
                user_id: finotaurUserId,
                finotaur_email: finotaurEmail,
                product_name: productName,
                amount_cents: amountCents,
                currency: data.currency ?? 'USD',
                whop_membership_id: whopMembershipId,
              },
            })
            .catch((err) => {
              console.warn('[whop-webhook] payment-failed-notify invoke failed:', err?.message ?? err);
            });
        } catch (notifyErr) {
          console.warn('[whop-webhook] payment-failed-notify wiring error (non-fatal):',
            notifyErr instanceof Error ? notifyErr.message : String(notifyErr));
        }

        result = { success: true, message: `Payment failure logged + dunning email queued` };
        break;
      }

      case "membership.resumed": {
        result = { success: true, message: `Membership resumed acknowledged` };
        // Broker lifecycle: subscription resumed — attempt to reconnect broker
        if (finotaurUserId) {
          await reactivateBrokerConnections(supabase, finotaurUserId);
        } else {
          console.info('[whop-webhook] broker reactivate skipped — no finotaur_user_id for event: membership.resumed');
        }
        break;
      }

      // 🔥 v7.3.0: Refund / dispute clawback. Whop's exact event names vary by
      // dashboard config — cover the plausible family; anything not listed
      // here still falls through to default (acknowledged, no-op).
      case "payment.refunded":
      case "refund.created":
      case "refund.updated":
      case "payment.disputed":
      case "dispute.created":
      case "dispute.updated":
      case "payment.chargeback": {
        result = await handleRefundOrDispute(supabase, payload.data, eventType);
        break;
      }

      default:
        result = { success: true, message: `Event type ${eventType} acknowledged` };
    }

    // Update log
    if (logEntry) {
      await supabase
        .from("whop_webhook_log")
        .update({
          processed: result.success,
          processing_result: result.message,
          error_message: result.success ? null : result.message,
          processed_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Webhook processed in ${duration}ms:`, result);

    return new Response(
      JSON.stringify({ ...result, duration_ms: duration }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================
// 🔥 v3.16.0: VALIDATE USER EMAIL - Prevent duplicate purchases with different emails
// ============================================

async function validateAndLockUserEmail(
  supabase: SupabaseClient,
  finotaurUserId: string | null,
  whopEmail: string,
  productType: 'newsletter' | 'top_secret' | 'journal'
): Promise<{ 
  valid: boolean; 
  userId: string | null; 
  userEmail: string | null;
  reason?: string;
}> {
  // If we have finotaur_user_id, check if user already has a different whop_customer_email
  if (finotaurUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, whop_customer_email')
      .eq('id', finotaurUserId)
      .single();
    
    if (profile) {
      // If user already has a whop_customer_email and it's different, reject
      if (profile.whop_customer_email && 
          profile.whop_customer_email.toLowerCase() !== whopEmail.toLowerCase()) {
        console.log("⚠️ User trying to purchase with different email!", {
          finotaurUserId,
          existingWhopEmail: profile.whop_customer_email,
          newWhopEmail: whopEmail,
        });
        
        // Return the existing user - we'll link to their account anyway
        return {
          valid: true,
          userId: profile.id,
          userEmail: profile.email,
          reason: `Email mismatch ignored - linking to existing account (${profile.email})`,
        };
      }
      
      // First purchase or same email - all good
      return {
        valid: true,
        userId: profile.id,
        userEmail: profile.email,
      };
    }
  }
  
  // No finotaur_user_id - try to find user by whop_customer_email
  const { data: existingByWhopEmail } = await supabase
    .from('profiles')
    .select('id, email, whop_customer_email')
    .ilike('whop_customer_email', whopEmail)
    .maybeSingle();
  
  if (existingByWhopEmail) {
    console.log("✅ Found existing user by whop_customer_email:", existingByWhopEmail.id);
    return {
      valid: true,
      userId: existingByWhopEmail.id,
      userEmail: existingByWhopEmail.email,
    };
  }
  
  // No existing user found - this is okay for first purchase
  return {
    valid: true,
    userId: null,
    userEmail: null,
  };
}

// ============================================
// PAYMENT SUCCEEDED
// 🔥 v3.5.0: Now accepts finotaurEmail parameter
// ============================================

async function handlePaymentSucceeded(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  commissionConfig: CommissionConfig,
  finotaurUserId: string | null,
  finotaurEmail: string | null,  // 🔥 v3.5.0: Added parameter
  clickId: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    const data = payload.data as WhopPaymentData;
    
    // 🔥 v3.5.0: Get BOTH emails
    const whopEmail = data.user?.email || '';  // Email user entered in Whop checkout
    
    // 🔥 v3.5.0: Use finotaurEmail if available, otherwise fallback to whopEmail
    const userEmail = finotaurEmail || whopEmail;
    
    // 🔥 v3.5.0: Detect email mismatch for logging
    const emailMismatch = finotaurEmail && whopEmail && 
                          finotaurEmail.toLowerCase() !== whopEmail.toLowerCase();
    
    const whopUserId = data.user?.id || '';
    const productId = data.product?.id || '';
    const membershipId = data.membership?.id || '';
    const promoCode = extractPromoCode(data);
    // 🔥 v7.1.0: Attribution fallback — a paid promo code always wins; if the
    // customer didn't apply one, fall back to the metadata affiliate_code set
    // by create-whop-checkout (member-referral / affiliate-link attribution).
    const metadataAffiliateCode = extractAffiliateCode(data);
    const isFirstPayment = data.billing_reason === "subscription_create";
    
    let paymentAmount = data.subtotal || data.total || data.usd_total || 0;
    if (paymentAmount > 1000) {
      paymentAmount = paymentAmount / 100;
    }

    const isNewsletterPayment = isNewsletter(productId);

    console.log("💰 Processing payment.succeeded:", {
      finotaurUserId,
      finotaurEmail,           // 🔥 v3.5.0: Original email from metadata
      whopEmail,               // 🔥 v3.5.0: Email from Whop checkout
      emailUsed: userEmail,    // 🔥 v3.5.0: Which email we're using
      emailMismatch,           // 🔥 v3.5.0: Did user change email?
      productId,
      membershipId,
      amount: paymentAmount,
      promoCode,
      billingReason: data.billing_reason,
      isNewsletter: isNewsletterPayment,
      isFirstPayment,
    });

    if (!productId) {
      return { success: false, message: "No product ID in payment data" };
    }

    // ═══════════════════════════════════════════════
    // NEWSLETTER PAYMENT - Use RPC
    // ═══════════════════════════════════════════════
    
    if (isNewsletterPayment) {
      console.log("📰 Processing Newsletter payment...");
      
      // 🔥 v3.7.0: Get billing interval from plan ID
      const planId = data.plan?.id || '';
      const billingInterval = getBillingInterval(planId);
      
      // 🔥 v3.14.0: Check if this is an upgrade from monthly to yearly
      // Check for upgrade if user has existing trial/active monthly subscription
      if (billingInterval === 'yearly') {
        const userResult = await findUser(supabase, finotaurUserId, userEmail, 'newsletter');
        
        if (userResult) {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('newsletter_interval, newsletter_status, newsletter_whop_membership_id')
            .eq('id', userResult.id)
            .single();
          
          // 🔥 v3.14.0: Detect upgrade from monthly (including trial!) to yearly
          if (currentProfile?.newsletter_interval === 'monthly' && 
              ['active', 'trial', 'trialing'].includes(currentProfile?.newsletter_status || '')) {
            // This IS an upgrade! Use the upgrade function
            console.log("🔥 Detected Newsletter UPGRADE from monthly to yearly");
            
            // 🔥 Cancel old monthly membership in Whop
            if (currentProfile.newsletter_whop_membership_id && 
                currentProfile.newsletter_whop_membership_id !== membershipId) {
              console.log("🔥 Cancelling old monthly membership:", currentProfile.newsletter_whop_membership_id);
              
              const cancelResult = await cancelMembership(currentProfile.newsletter_whop_membership_id, 'immediate');
              if (cancelResult.success) {
                console.log("✅ Old monthly Newsletter membership cancelled successfully");
              } else {
                console.warn("⚠️ Failed to cancel old Newsletter membership:", cancelResult.error);
              }
            }
            
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            
            const { data: upgradeResult, error: upgradeError } = await supabase.rpc('handle_newsletter_upgrade_to_yearly', {
              p_user_id: userResult.id,
              p_new_whop_membership_id: membershipId,
              p_new_expires_at: expiresAt.toISOString(),
            });
            
            if (upgradeError) {
              console.error("❌ handle_newsletter_upgrade_to_yearly RPC error:", upgradeError);
              return { success: false, message: `Newsletter upgrade failed: ${upgradeError.message}` };
            }
            
            console.log("✅ Newsletter upgrade RPC result:", upgradeResult);
            return { 
              success: upgradeResult?.success ?? true, 
              message: `Newsletter UPGRADED to yearly: ${userEmail} (saved $140!)` 
            };
          }
        }
      }
      
      

      // Regular newsletter payment (not an upgrade)
      console.log("📰 Calling handle_newsletter_payment RPC...");
      
      // 🔥 v3.13.0: Try to find user from pending_checkouts if finotaurUserId is null
      let resolvedUserId = finotaurUserId;
      let resolvedEmail = userEmail;
      
      if (!resolvedUserId) {
        console.log("🔍 finotaurUserId is null, searching pending_checkouts...");
        const pendingUser = await findUserFromPendingCheckout(supabase, whopEmail, 'newsletter', whopUserId);
        
        if (pendingUser) {
          console.log("✅ Found user from pending_checkouts:", pendingUser.id);
          resolvedUserId = pendingUser.id;
          resolvedEmail = pendingUser.email;
        } else {
          // Also try findUser which includes other lookup methods
          const foundUser = await findUser(supabase, null, whopEmail, 'newsletter', whopUserId);
          if (foundUser) {
            console.log("✅ Found user via findUser:", foundUser.id);
            resolvedUserId = foundUser.id;
            resolvedEmail = foundUser.email;
          }
        }
      }
      
      console.log("📰 RPC params:", {
        p_user_email: resolvedEmail,
        p_whop_customer_email: whopEmail,
        p_finotaur_user_id: resolvedUserId,
      });
      
      const { data: result, error } = await supabase.rpc('handle_newsletter_payment', {
        p_user_email: resolvedEmail,
        p_whop_user_id: whopUserId,
        p_whop_membership_id: membershipId,
        p_whop_product_id: productId,
        p_payment_amount: paymentAmount,
        p_finotaur_user_id: resolvedUserId || null,
        p_billing_interval: billingInterval,
        p_whop_customer_email: whopEmail,
      });
      
      if (error) {
        console.error("❌ handle_newsletter_payment RPC error:", error);
        return { success: false, message: `Newsletter payment failed: ${error.message}` };
      }

      console.log("✅ Newsletter payment RPC result:", result);
      
      // 🔥 Mark pending checkout as completed
      if (result?.success && result?.user_id) {
        await completePendingCheckout(supabase, result.user_id, 'newsletter', membershipId);
      }
      
      return { 
        success: result?.success ?? true, 
        message: `Newsletter payment: ${userEmail} → ${result?.newsletter_status || 'active'}${emailMismatch ? ' [email mismatch resolved]' : ''}` 
      };
    }

    // ═══════════════════════════════════════════════
    // 🔥 TOP SECRET PAYMENT - Use RPC
    // ═══════════════════════════════════════════════
    
    const isTopSecretPayment = isTopSecret(productId);
    
if (isTopSecretPayment) {
      const planId = data.plan?.id || '';
      const billingInterval = getBillingInterval(planId);

      
      // 🔥 v3.14.0: Check if this is an upgrade from monthly to yearly
      // Check for upgrade if user has existing trial/active monthly subscription
      if (billingInterval === 'yearly') {
        const userResult = await findUser(supabase, finotaurUserId, userEmail, 'top_secret');
        
        if (userResult) {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('top_secret_interval, top_secret_status, top_secret_whop_membership_id')
            .eq('id', userResult.id)
            .single();
          
          // 🔥 v3.14.0: Detect upgrade from monthly (including trial!) to yearly
          if (currentProfile?.top_secret_interval === 'monthly' && 
              ['active', 'trial', 'trialing'].includes(currentProfile?.top_secret_status || '')) {
            // This IS an upgrade!
            console.log("🔥 Detected Top Secret UPGRADE from monthly to yearly");
            
            // 🔥 v3.9.1: Cancel old monthly membership in Whop (ONCE!)
            if (currentProfile.top_secret_whop_membership_id && 
                currentProfile.top_secret_whop_membership_id !== membershipId) {
              console.log("🔥 Cancelling old monthly membership:", currentProfile.top_secret_whop_membership_id);
              
              const cancelResult = await cancelMembership(currentProfile.top_secret_whop_membership_id, 'immediate');
              if (cancelResult.success) {
                console.log("✅ Old monthly Top Secret membership cancelled successfully");
              } else {
                console.warn("⚠️ Failed to cancel old Top Secret membership:", cancelResult.error);
              }
            }
            
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            
            const { data: upgradeResult, error: upgradeError } = await supabase.rpc('handle_top_secret_upgrade_to_yearly', {
              p_user_id: userResult.id,
              p_new_whop_membership_id: membershipId,
              p_new_expires_at: expiresAt.toISOString(),
            });
            
            if (upgradeError) {
              console.error("❌ handle_top_secret_upgrade_to_yearly RPC error:", upgradeError);
              return { success: false, message: `Top Secret upgrade failed: ${upgradeError.message}` };
            }
            
            console.log("✅ Top Secret upgrade RPC result:", upgradeResult);
            // 🔥 v3.6.1: Grant War Zone on Top Secret upgrade — never let this break activation
            if (userResult.id) {
              try {
                await grantWarZoneForTopSecretMember(supabase, userResult.id, userEmail);
              } catch (e) {
                console.error("grant warzone failed (upgrade path)", e);
              }
            }
            return {
              success: upgradeResult?.success ?? true,
              message: `Top Secret UPGRADED to yearly: ${userEmail} (saved $180.88!)`
            };
          }
        }
      }
      
      if (isFirstPayment) {
        console.log("🔐 Calling activate_top_secret_subscription RPC (first payment)...");
        
        const { data: result, error } = await supabase.rpc('activate_top_secret_subscription', {
          p_user_email: userEmail,  // 🔥 v3.5.0: Uses finotaurEmail if available
          p_whop_user_id: whopUserId,
          p_whop_membership_id: membershipId,
          p_whop_product_id: productId,
          p_whop_plan_id: planId,
          p_finotaur_user_id: finotaurUserId || null,
        });

        if (error) {
          console.error("❌ activate_top_secret_subscription RPC error:", error);
          return { success: false, message: `Top Secret activation failed: ${error.message}` };
        }

        console.log("✅ Top Secret activation RPC result:", result);
        // 🔥 v3.6.1: Grant War Zone on Top Secret activation — never let this break activation
        const tsActivateUserId = result?.user_id ?? finotaurUserId;
        if (tsActivateUserId) {
          try {
            await grantWarZoneForTopSecretMember(supabase, tsActivateUserId, userEmail);
          } catch (e) {
            console.error("grant warzone failed (activation path)", e);
          }
        }
        return {
          success: result?.success ?? true,
          message: `Top Secret activated: ${userEmail} → ${result?.interval || 'monthly'} ($${result?.price_usd || paymentAmount})${emailMismatch ? ' [email mismatch resolved]' : ''}`
        };
      } else {
        console.log("🔐 Calling handle_top_secret_payment RPC (recurring payment)...");
        
        const { data: result, error } = await supabase.rpc('handle_top_secret_payment', {
          p_user_email: userEmail,  // 🔥 v3.5.0: Uses finotaurEmail if available
          p_whop_user_id: whopUserId,
          p_whop_membership_id: membershipId,
          p_whop_product_id: productId,
          p_whop_plan_id: planId,
          p_payment_amount: paymentAmount,
          p_finotaur_user_id: finotaurUserId || null,
        });

        if (error) {
          console.error("❌ handle_top_secret_payment RPC error:", error);
          return { success: false, message: `Top Secret payment failed: ${error.message}` };
        }

        console.log("✅ Top Secret payment RPC result:", result);
        // 🔥 v3.6.1: Grant War Zone on Top Secret renewal — never let this break activation
        const tsRecurringUserId = result?.user_id ?? finotaurUserId;
        if (tsRecurringUserId) {
          try {
            await grantWarZoneForTopSecretMember(supabase, tsRecurringUserId, userEmail);
          } catch (e) {
            console.error("grant warzone failed (recurring path)", e);
          }
        }
        return {
          success: result?.success ?? true,
          message: `Top Secret payment: ${userEmail} → ${result?.interval || 'monthly'}`
        };
      }
    }

    // ═══════════════════════════════════════════════
    // 🔥 v6.0.0: PLATFORM SUBSCRIPTION (Core / Enterprise)
    // ═══════════════════════════════════════════════

    if (isPlatform(productId)) {
      console.log("🖥️ Processing PLATFORM payment...", {
        dataId: data.id,
        membershipId: data.membership?.id,
        resolvedMembershipId: membershipId,
        productId,
        planId: data.plan?.id,
      });

      const planId = data.plan?.id || '';
      const billingInterval = getBillingInterval(planId);
      const platformPlan = getPlatformPlanFromProduct(productId);

      // Find user
      const userResult = await findUser(supabase, finotaurUserId, userEmail, 'journal');
      if (!userResult) {
        console.error("❌ User not found for Platform activation");
        return { success: false, message: "User not found for Platform activation. User must register on Finotaur before purchasing." };
      }

      const resolvedUserId = userResult.id;
      const resolvedEmail = userResult.email;

      // 🔥 v6.1.0: Check if this is a plan change or upgrade - cancel old membership
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('platform_plan, platform_subscription_status, platform_whop_membership_id, platform_billing_interval, platform_subscription_expires_at, platform_core_trial_used_at, platform_finotaur_trial_used_at, trial_used')
        .eq('id', resolvedUserId)
        .single();

      // 🔥 v7.1.0: Enhanced upgrade detection - also check by platform_plan
      const hasOldMembership = currentProfile?.platform_whop_membership_id && 
          currentProfile.platform_whop_membership_id !== membershipId &&
          ['active', 'trial', 'trialing'].includes(currentProfile?.platform_subscription_status || '');

      // 🔥 v8.0.0: DOWNGRADE DETECTION
      // Plan hierarchy: enterprise > finotaur > core
      const PLAN_RANK: Record<string, number> = {
        platform_enterprise: 3,
        platform_finotaur: 2,
        platform_core: 1,
      };
      const oldPlanRank = PLAN_RANK[currentProfile?.platform_plan || ''] ?? 0;
      const newPlanRank = PLAN_RANK[platformPlan] ?? 0;
      const isDowngrade = hasOldMembership && newPlanRank < oldPlanRank;

      if (hasOldMembership && !isDowngrade) {
        // UPGRADE or same-tier switch — cancel old membership immediately
        const oldMembershipId = currentProfile.platform_whop_membership_id;
        console.log("🔥 Detected Platform UPGRADE - cancelling old membership immediately:", oldMembershipId);
        
        if (oldMembershipId.startsWith('mem_')) {
          const cancelResult = await cancelMembership(oldMembershipId, 'immediate');
          if (cancelResult.success) {
            console.log("✅ Old Platform membership cancelled successfully");
          } else {
            console.warn("⚠️ Failed to cancel old Platform membership:", cancelResult.error);
          }
        } else {
          console.warn("⚠️ Stored membership ID is not a real membership:", oldMembershipId, "- skipping Whop cancel");
        }
      }

      if (isDowngrade) {
        // DOWNGRADE — Keep old plan access until old billing period ends
        // New (lower) membership is active in Whop but we hold its activation in our DB
        const oldMembershipId = currentProfile.platform_whop_membership_id;
        const oldExpiresAt = currentProfile.platform_subscription_expires_at;
        console.log("🔻 Detected Platform DOWNGRADE — keeping old plan access until:", oldExpiresAt);

        // Store the pending downgrade info but DON'T switch plan yet
        await supabase.from('profiles').update({
          platform_pending_downgrade_plan: platformPlan,
          platform_pending_downgrade_membership_id: membershipId,
          platform_cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        }).eq('id', resolvedUserId);

        // Cancel old membership in Whop at period end (not immediately)
        if (oldMembershipId && oldMembershipId.startsWith('mem_')) {
          await cancelMembership(oldMembershipId, 'at_period_end');
          console.log("✅ Old membership scheduled for cancellation at period end");
        }

        return {
          success: true,
          message: `Platform DOWNGRADE to ${platformPlan} scheduled. User keeps ${currentProfile.platform_plan} until ${oldExpiresAt}.`
        };
      }

      // 🔥 v8.6.0: If Core/Finotaur/Enterprise — handle existing Journal subscription
      // Core includes Basic → cancel Basic if user had standalone Basic
      // Finotaur/Enterprise includes Premium → cancel Basic OR Premium
      // EXCEPTION: Yearly Journal → cancel at_period_end only, Platform permissions take precedence
let existingSubs: any = null;
    if (platformPlan === 'platform_core' || platformPlan === 'platform_finotaur' || platformPlan === 'platform_enterprise') {
      ({ data: existingSubs } = await supabase
        .from('profiles')
        .select('whop_membership_id, subscription_status, account_type, subscription_interval, subscription_expires_at, newsletter_whop_membership_id, newsletter_status, top_secret_whop_membership_id, top_secret_status')
        .eq('id', userResult.id)
        .single());

        if (existingSubs) {
          // 1) Cancel standalone Journal (Basic/Premium)
          // For Core: only cancel if existing journal is Basic (Core includes Basic, not Premium)
          // For Finotaur/Enterprise: cancel any journal tier (they include Premium)
          // 🔥 v8.6.0: Yearly Journal → at_period_end (keeps running, permissions covered by Platform)
          
          const existingAccountType = existingSubs.account_type; // 'basic' or 'premium'
          const shouldCancelJournal = existingSubs.whop_membership_id && 
            ['active', 'trialing', 'trial'].includes(existingSubs.subscription_status || '') &&
            (
              // Core: cancel Basic OR Premium at_period_end (Core grants Basic access)
              (platformPlan === 'platform_core' && ['basic', 'premium'].includes(existingAccountType || '')) ||
              // Finotaur/Enterprise: cancel any (they cover Premium)
              (platformPlan === 'platform_finotaur' || platformPlan === 'platform_enterprise')
            );

          if (shouldCancelJournal) {
            // Premium cancelled by Core → always at_period_end (user keeps access until billing date)
            const isPremiumCancelledByCore = platformPlan === 'platform_core' && existingAccountType === 'premium';
            const isYearlyJournal = existingSubs.subscription_interval === 'yearly';
            const useAtPeriodEnd = isYearlyJournal || isPremiumCancelledByCore;
            console.log(`🔥 v8.6.0: Handling standalone Journal (${isYearlyJournal ? 'yearly→at_period_end' : isPremiumCancelledByCore ? 'premium+core→at_period_end' : 'monthly→immediate'}):`, existingSubs.whop_membership_id);
            
                        if (existingSubs.whop_membership_id.startsWith('mem_')) {
              if (useAtPeriodEnd) {
                // Yearly: schedule cancellation at period end, don't revoke access
                // Platform already grants higher/equal access — user just won't be double-charged
                const r = await cancelMembership(existingSubs.whop_membership_id, 'at_period_end');
                if (r.success) {
                  console.log(`✅ Yearly Journal (${existingAccountType}) scheduled for cancellation at period end — Platform grants access`);
                  await supabase.from('profiles').update({
                    subscription_cancel_at_period_end: true,
                    // 🔥 v8.9.0: Save yearly expiry AND plan so Platform cancel can restore access
                    journal_yearly_expires_at: existingSubs.subscription_expires_at,
                    journal_yearly_plan: existingAccountType, // 'basic' or 'premium'
                    updated_at: new Date().toISOString(),
                  }).eq('id', userResult.id);
                } else {
                  console.warn("⚠️ Failed to schedule Yearly Journal cancellation:", r.error);
                }
              } else {
                // Monthly: cancel immediately
                const r = await cancelMembership(existingSubs.whop_membership_id, 'immediate');
                console.log(r.success ? `✅ Monthly Journal (${existingAccountType}) cancelled immediately` : "⚠️ Monthly Journal cancel failed:", r.error);
              }
            }
          }

          // 2) Cancel standalone Newsletter (War Zone) — always immediate
          if (existingSubs.newsletter_whop_membership_id && 
              ['active', 'trialing', 'trial'].includes(existingSubs.newsletter_status || '')) {
            console.log("🔥 v7.4.0: Cancelling standalone Newsletter:", existingSubs.newsletter_whop_membership_id);
            if (existingSubs.newsletter_whop_membership_id.startsWith('mem_')) {
              const r = await cancelMembership(existingSubs.newsletter_whop_membership_id, 'immediate');
              console.log(r.success ? "✅ Newsletter cancelled" : "⚠️ Newsletter cancel failed:", r.error);
            }
          }

          // 3) Cancel standalone Top Secret — always immediate
          if (existingSubs.top_secret_whop_membership_id && 
              ['active', 'trialing', 'trial'].includes(existingSubs.top_secret_status || '')) {
            console.log("🔥 v7.4.0: Cancelling standalone Top Secret:", existingSubs.top_secret_whop_membership_id);
            if (existingSubs.top_secret_whop_membership_id.startsWith('mem_')) {
              const r = await cancelMembership(existingSubs.top_secret_whop_membership_id, 'immediate');
              console.log(r.success ? "✅ Top Secret cancelled" : "⚠️ Top Secret cancel failed:", r.error);
            }
          }
        }
      }

      // Detect trial: payment amount = 0 on first payment
      // 🔥 v8.0.0: NO trial if this is a downgrade situation
      const isInTrial = isFirstPayment && paymentAmount === 0 && !isDowngrade;
      const trialEndsAt = isInTrial 
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // 🔥 v8.0.0: On downgrade, use old plan's billing date as new expiry
      // This ensures the user is billed on the same date they would have been on the old plan
      const oldExpiresAt = currentProfile?.platform_subscription_expires_at;
      const expiresAt = (isDowngrade && oldExpiresAt)
        ? oldExpiresAt  // Keep original billing date
        : billingInterval === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Update profile
const { error: updateError } = await supabase
        .from('profiles')
        .update({
          platform_plan: platformPlan,
          platform_subscription_status: isInTrial ? 'trial' : 'active',
          platform_billing_interval: billingInterval,
          platform_subscription_started_at: new Date().toISOString(),
          platform_trial_ends_at: trialEndsAt,
          platform_is_in_trial: isInTrial,
          platform_cancel_at_period_end: false,
          platform_whop_membership_id: membershipId || data.membership?.id || data.id,
          platform_whop_user_id: whopUserId || '',
          platform_whop_product_id: productId || '',
          platform_whop_plan_id: planId,
          platform_whop_customer_email: userEmail || '',
          platform_payment_provider: 'whop',
          ...(isInTrial && platformPlan === 'platform_core' ? { platform_core_trial_used_at: new Date().toISOString() } : {}),
...(isInTrial && platformPlan === 'platform_finotaur' ? { platform_finotaur_trial_used_at: new Date().toISOString() } : {}),
          // 🔥 v8.5.0: Core includes Journal Basic (25 trades/month, 1 portfolio, no backtest)
          // 🔥 v8.9.0: If user had Premium (yearly or at_period_end), keep Premium access until it expires
          ...(platformPlan === 'platform_core' ? (() => {
            const coreExistingSubs = existingSubs ?? null;
            const hadPremiumAtPeriodEnd = coreExistingSubs?.account_type === 'premium' && 
              (coreExistingSubs?.subscription_interval === 'yearly' || coreExistingSubs?.subscription_cancel_at_period_end === true);
            // 🔥 v8.9.1: If yearly Premium — keep Premium access until original expiry date
            const premiumExpiresAt = hadPremiumAtPeriodEnd 
              ? (coreExistingSubs?.subscription_expires_at ?? expiresAt)
              : expiresAt;
            return {
              account_type: hadPremiumAtPeriodEnd ? 'premium' : 'basic',
              max_trades: hadPremiumAtPeriodEnd ? 999999 : 25,
              subscription_status: hadPremiumAtPeriodEnd ? 'active' : (isInTrial ? 'trial' : 'active'),
              subscription_interval: hadPremiumAtPeriodEnd ? (coreExistingSubs?.subscription_interval ?? billingInterval) : billingInterval,
              subscription_expires_at: premiumExpiresAt,
              subscription_cancel_at_period_end: hadPremiumAtPeriodEnd ? true : false,
              subscription_started_at: new Date().toISOString(),
              is_in_trial: hadPremiumAtPeriodEnd ? false : isInTrial,
              trial_ends_at: hadPremiumAtPeriodEnd ? null : trialEndsAt,
              platform_bundle_journal_granted: true,
            };
          })() : {}),
          // 🔥 v7.0.0: Finotaur includes Journal Premium + Newsletter + Top Secret
          ...(platformPlan === 'platform_finotaur' ? {
            account_type: 'premium',
            max_trades: 999999,
            subscription_status: 'active',
            subscription_interval: billingInterval,
            subscription_expires_at: expiresAt,
            subscription_started_at: new Date().toISOString(),
            is_in_trial: isInTrial,
            trial_ends_at: trialEndsAt,
            newsletter_enabled: true,
            newsletter_status: isInTrial ? 'trial' : 'active',
            newsletter_paid: true,
            newsletter_whop_membership_id: null,
            top_secret_enabled: true,
            top_secret_status: isInTrial ? 'trial' : 'active',
            top_secret_interval: 'monthly',
            top_secret_whop_membership_id: null,
            platform_bundle_journal_granted: true,
            platform_bundle_newsletter_granted: true,
            // 🔥 v8.1.0: Ensure platform_subscription_expires_at is always set
            platform_subscription_expires_at: expiresAt,
          } : {}),
          // 🔥 v7.0.0: Enterprise includes everything Finotaur has + AI Portfolio
          ...(platformPlan === 'platform_enterprise' ? {
            account_type: 'premium',
            max_trades: 999999,
            subscription_status: 'active',
            subscription_interval: billingInterval,
            subscription_expires_at: expiresAt,
            subscription_started_at: new Date().toISOString(),
            is_in_trial: isInTrial,
            trial_ends_at: trialEndsAt,
            newsletter_enabled: true,
            newsletter_status: isInTrial ? 'trial' : 'active',
            newsletter_paid: true,
            newsletter_whop_membership_id: null,
            top_secret_enabled: true,
            top_secret_status: isInTrial ? 'trial' : 'active',
            top_secret_interval: 'monthly',
            top_secret_whop_membership_id: null,
            enterprise_ai_portfolio_enabled: true,
            platform_bundle_journal_granted: true,
            platform_bundle_newsletter_granted: true,
            // 🔥 v8.1.0: Ensure platform_subscription_expires_at is always set
            platform_subscription_expires_at: expiresAt,
          } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedUserId);

      if (updateError) {
        console.error("❌ Platform subscription update error:", updateError);
        return { success: false, message: `Platform activation failed: ${updateError.message}` };
      }

      console.log("✅ Platform subscription activated:", {
        userId: resolvedUserId,
        email: resolvedEmail,
        plan: platformPlan,
        interval: billingInterval,
        isInTrial,
      });

      return {
        success: true,
        message: `Platform ${platformPlan} activated for ${resolvedEmail} (${billingInterval})${isInTrial ? ' [trial]' : ''}`
      };
    }

    // ═══════════════════════════════════════════════
    // 🔥 JOURNAL SUBSCRIPTION - Use RPC!
    // 🔥 v7.3.0: Cancel old membership on upgrade (basic→premium, monthly→yearly)
    // ═══════════════════════════════════════════════

    if (isFirstPayment) {
      // 🔥 v7.3.0 / v7.5.0: Find user first (handles email mismatch, pending_checkouts, etc.)
      // journalUser is used BOTH for upgrade check AND for RPC user resolution
      const journalUser = await findUser(supabase, finotaurUserId, userEmail, 'journal', whopUserId);
      if (journalUser) {
        const { data: currentJournal } = await supabase
          .from('profiles')
          .select('whop_membership_id, subscription_status, account_type, subscription_interval')
          .eq('id', journalUser.id)
          .single();

        if (currentJournal?.whop_membership_id && 
            currentJournal.whop_membership_id !== membershipId &&
            ['active', 'trial', 'trialing'].includes(currentJournal.subscription_status || '')) {
          
          const oldPlan = currentJournal.account_type; // 'basic' or 'premium'
          const newPlanInfo = PRODUCT_ID_TO_PLAN_JOURNAL[productId] || null;
          const newPlan = newPlanInfo?.plan || null;
          const newInterval = newPlanInfo?.interval || 'monthly';
          const oldInterval = currentJournal.subscription_interval;

          // 🔥 v8.8.0: Detect downgrade (e.g. premium → basic/core)
          const PLAN_TIER: Record<string, number> = { basic: 1, premium: 2 };
          const oldTier = PLAN_TIER[oldPlan || ''] ?? 0;
          const newTier = PLAN_TIER[newPlan || ''] ?? 0;
          const isJournalDowngrade = newTier < oldTier;
          const isPremiumDowngradedByCore = oldPlan === 'premium' && newPlan === 'basic';

          // 🔥 Premium Yearly → always immediate cancel of old subscription
          const isPremiumYearlyUpgrade = newPlan === 'premium' && newInterval === 'yearly';
          const useAtPeriodEnd = !isPremiumYearlyUpgrade && (isJournalDowngrade || (oldInterval === 'yearly' && newPlan === oldPlan));

          console.log(`🔥 v8.8.0: Journal transition — ${oldPlan}(${oldInterval}) → ${newPlan}, useAtPeriodEnd=${useAtPeriodEnd}`);

          if (currentJournal.whop_membership_id.startsWith('mem_')) {
            if (useAtPeriodEnd) {
              const cancelResult = await cancelMembership(currentJournal.whop_membership_id, 'at_period_end');
              if (cancelResult.success) {
                console.log(`✅ Old Journal (${oldPlan}) scheduled for cancellation at period end — user keeps access`);
                // Mark in DB: premium stays active until period end
                await supabase.from('profiles').update({
                  subscription_cancel_at_period_end: true,
                  updated_at: new Date().toISOString(),
                }).eq('id', journalUser.id);
              } else {
                console.warn("⚠️ Failed to schedule Journal cancellation at period end:", cancelResult.error);
              }
            } else {
              const cancelResult = await cancelMembership(currentJournal.whop_membership_id, 'immediate');
              if (cancelResult.success) {
                console.log("✅ Old Journal membership cancelled immediately (upgrade)");
              } else {
                console.warn("⚠️ Failed to cancel old Journal membership:", cancelResult.error);
              }
            }
          }
        }
      }

      // 🔥 v7.5.0: Use resolved user from findUser (handles email mismatch via pending_checkouts)
      const resolvedJournalUserId = journalUser?.id || finotaurUserId;
      const resolvedJournalEmail = journalUser?.email || userEmail;

      console.log("🔥 v7.5.0: Journal activation user resolution:", {
        finotaurUserId,
        journalUserFound: !!journalUser,
        resolvedUserId: resolvedJournalUserId,
        resolvedEmail: resolvedJournalEmail,
        lookupMethod: journalUser?.lookupMethod,
      });

      // FIRST PAYMENT - Call activate_whop_subscription RPC
      console.log("🆕 Calling activate_whop_subscription RPC (first payment)...");
      
      const { data: result, error } = await supabase.rpc('activate_whop_subscription', {
        p_user_email: resolvedJournalEmail,  // 🔥 v7.5.0: Use resolved email (not Whop's potentially wrong email)
        p_whop_user_id: whopUserId,
        p_whop_membership_id: membershipId,
        p_whop_product_id: productId,
        p_finotaur_user_id: resolvedJournalUserId || null,  // 🔥 v7.5.0: Use resolved user ID
        p_affiliate_code: promoCode || metadataAffiliateCode || null,  // 🔥 v7.1.0: fallback to metadata affiliate code
        p_click_id: clickId || null,
      });

      if (error) {
        console.error("❌ activate_whop_subscription RPC error:", error);
        return { success: false, message: `Subscription activation failed: ${error.message}` };
      }

      console.log("✅ activate_whop_subscription RPC result:", result);

      if (!result?.success) {
        return {
          success: false,
          message: result?.error || 'Subscription activation failed'
        };
      }

      // 🔥 v7.2.0: Member-refers-friend enrollment — fire-and-forget provisioning
      // of the new paying member's own referral coupon via create-whop-promo.
      // Mirrors the payment-failed-notify pattern above: own try/catch,
      // .catch() on the promise, never awaited into the payment path, gated
      // by its own kill-switch (member_referral.enabled).
      if (result?.user_id) {
        try {
          const memberReferralConfig = await getMemberReferralConfig(supabase);
          if (memberReferralConfig.enabled) {
            void supabase.functions
              .invoke('create-whop-promo', {
                body: { mode: 'member', user_id: result.user_id },
              })
              .then(({ error: promoError }) => {
                if (promoError) {
                  console.warn('[whop-webhook] create-whop-promo (member enrollment) failed:', promoError.message ?? promoError);
                } else {
                  console.info('[whop-webhook] create-whop-promo (member enrollment) queued for user:', result.user_id);
                }
              })
              .catch((err) => {
                console.warn('[whop-webhook] create-whop-promo invoke failed:', err?.message ?? err);
              });
          } else {
            console.info('[whop-webhook] member-referral enrollment skipped — member_referral.enabled=false');
          }
        } catch (memberReferralErr) {
          console.warn('[whop-webhook] member-referral enrollment wiring error (non-fatal):',
            memberReferralErr instanceof Error ? memberReferralErr.message : String(memberReferralErr));
        }
      }

      // 🔥 Intro Offer — mark the one-time-ever offer as used once activation
      // succeeds. Placeholder plan ID (find/replace when the real plan exists).
      // Never let this break activation.
      if (data.plan?.id === 'plan_u6VqqKZlb0axR' && resolvedJournalUserId) {
        try {
          await supabase
            .from('intro_offer_state')
            .update({
              status: 'used',
              used_at: new Date().toISOString(),
              whop_membership_id: membershipId,
            })
            .eq('user_id', resolvedJournalUserId);
        } catch (e) {
          console.error("intro offer state update failed", e);
        }
      }

      return {
        success: true,
        message: `Subscription activated: ${result?.plan} (${result?.interval}) for ${userEmail}${promoCode ? ` with promo ${promoCode}` : ''}${emailMismatch ? ' [email mismatch resolved]' : ''}`
      };

    } else {
      // RECURRING PAYMENT - Call handle_whop_payment RPC
      console.log("🔄 Calling handle_whop_payment RPC (recurring payment)...");
      
      const { data: result, error } = await supabase.rpc('handle_whop_payment', {
        p_whop_membership_id: membershipId,
        p_payment_amount: paymentAmount,
        p_is_first_payment: false,
        p_promo_code: promoCode || metadataAffiliateCode || null,  // 🔥 v7.1.0: fallback to metadata affiliate code
      });

      if (error) {
        console.error("❌ handle_whop_payment RPC error:", error);
        return { success: false, message: `Payment processing failed: ${error.message}` };
      }

      console.log("✅ handle_whop_payment RPC result:", result);

      if (!result?.success) {
        return { 
          success: false, 
          message: result?.error || result?.message || 'Payment processing failed' 
        };
      }

      return { 
        success: true, 
        message: result?.message || `Recurring payment processed for ${userEmail}` 
      };
    }

  } catch (error) {
    console.error("❌ handlePaymentSucceeded error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// 🔥 NEWSLETTER PAYMENT HANDLER
// ============================================

interface NewsletterPaymentParams {
  userEmail: string | undefined;
  whopUserId: string;
  membershipId: string;
  productId: string;
  paymentAmount: number;
  finotaurUserId: string | null;
}

async function handleNewsletterPayment(
  supabase: SupabaseClient,
  params: NewsletterPaymentParams & { planId?: string }  // 🔥 Add planId to params
): Promise<{ success: boolean; message: string }> {
  const { userEmail, whopUserId, membershipId, productId, paymentAmount, finotaurUserId, planId } = params;

  console.log("📰 Processing NEWSLETTER payment:", {
    userEmail,
    finotaurUserId,
    membershipId,
    amount: paymentAmount,
  });

  try {
// 🔥 v3.7.0: Get billing interval from plan ID
    const billingInterval = getBillingInterval(planId || '');

    
    // Call the newsletter-specific RPC function
    const { data: result, error } = await supabase.rpc('handle_newsletter_payment', {
      p_user_email: userEmail,
      p_whop_user_id: whopUserId,
      p_whop_membership_id: membershipId,
      p_whop_product_id: productId,
      p_payment_amount: paymentAmount,
      p_finotaur_user_id: finotaurUserId || null,
      p_billing_interval: billingInterval,
    });

    if (error) {
      console.error("❌ handle_newsletter_payment RPC error:", error);
      return { success: false, message: `Newsletter payment failed: ${error.message}` };
    }

    console.log("✅ Newsletter payment processed:", result);

    const wasInTrial = result?.was_in_trial || false;
    const status = result?.newsletter_status || 'active';

    return { 
      success: true, 
      message: `Newsletter payment: ${userEmail} → ${status}${wasInTrial ? ' (trial ended)' : ''}` 
    };

  } catch (error) {
    console.error("❌ handleNewsletterPayment error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// MEMBERSHIP ACTIVATED
// 🔥 v3.5.0: Now accepts finotaurEmail parameter
// ============================================

async function handleMembershipActivated(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  finotaurUserId: string | null,
  finotaurEmail: string | null  // 🔥 v3.5.0: Added parameter
): Promise<{ success: boolean; message: string }> {
  const data = payload.data as WhopMembershipData;
  const membershipId = data.id;
  const whopEmail = data.user?.email;
  const userEmail = finotaurEmail || whopEmail;  // 🔥 v3.5.0: Prefer finotaurEmail
  const whopUserId = data.user?.id;
  const productId = data.product?.id;

  // Check product types
  const isNewsletterActivation = isNewsletter(productId);
  const isTopSecretActivation = isTopSecret(productId);

  console.log("🎫 Processing membership.activated:", {
    membershipId,
    finotaurEmail,     // 🔥 v3.5.0
    whopEmail,
    userEmail,         // 🔥 v3.5.0: Which email we're using
    productId,
    isNewsletter: isNewsletterActivation,
    isTopSecret: isTopSecretActivation,
    finotaurUserId,
  });

  // Handle newsletter activation (trial start)
  if (isNewsletterActivation) {
    return await handleNewsletterActivation(supabase, {
      userEmail,  // 🔥 v3.5.0: Uses finotaurEmail if available
      whopUserId: whopUserId || '',
      membershipId,
      productId: productId || '',
      finotaurUserId,
    }, payload);  // 🔥 v3.7.0: Pass payload for plan ID extraction
  }
  // ═══════════════════════════════════════════════
  // 🔥 TOP SECRET SUBSCRIPTION
  // ═══════════════════════════════════════════════

  if (isTopSecretActivation) {
    return await handleTopSecretActivation(supabase, {
      userEmail,  // 🔥 v3.5.0: Uses finotaurEmail if available
      whopUserId: whopUserId || '',
      membershipId,
      productId: productId || '',
      finotaurUserId,
    }, payload);  // 🔥 v3.14.0: Pass payload for plan ID extraction
  }

  // ═══════════════════════════════════════════════
  // 🔥 v6.0.0: PLATFORM SUBSCRIPTION (Core / Enterprise)
  // ═══════════════════════════════════════════════

  if (isPlatform(productId)) {
    console.log("🖥️ Processing PLATFORM membership.activated...");

    const planId = data.plan?.id || '';
    const billingInterval = getBillingInterval(planId);
    const platformPlan = getPlatformPlanFromProduct(productId || '');
    const isInTrial = data.status === 'trialing';
    const trialEndsAt = isInTrial && data.renewal_period_end
      ? new Date(data.renewal_period_end).toISOString()
      : null;

    // Find user
    const userResult = await findUser(supabase, finotaurUserId, userEmail, 'journal');
    if (!userResult) {
      console.error("❌ User not found for Platform activation");
      return { success: false, message: "User not found for Platform activation" };
    }

    // 🔥 v7.1.0: Enhanced - also fetch platform_plan for better detection
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('platform_whop_membership_id, platform_subscription_status, platform_plan')
      .eq('id', userResult.id)
      .single();

    const hasOldMembership = currentProfile?.platform_whop_membership_id && 
        currentProfile.platform_whop_membership_id !== data.id &&
        ['active', 'trial', 'trialing'].includes(currentProfile?.platform_subscription_status || '');

    if (hasOldMembership) {
      console.log("🔥 Cancelling old Platform membership on activation:", currentProfile.platform_whop_membership_id);
      
      // 🔥 v7.1.0: Validate it's a real membership ID before cancelling
      const oldId = currentProfile.platform_whop_membership_id;
      if (oldId.startsWith('mem_')) {
        // 🔥 v8.9.0: If old Platform was yearly, save expiry before cancelling
        // so that if new Platform is later cancelled, we can restore lower-tier access
        const { data: oldPlatformProfile } = await supabase
          .from('profiles')
          .select('platform_billing_interval, platform_subscription_expires_at, platform_plan')
          .eq('id', userResult.id)
          .single();

        const isOldPlatformYearly = oldPlatformProfile?.platform_billing_interval === 'yearly';
        const oldPlatformExpiresAt = oldPlatformProfile?.platform_subscription_expires_at;
        const oldPlatformPlanName = oldPlatformProfile?.platform_plan;

        if (isOldPlatformYearly && oldPlatformExpiresAt) {
          await supabase.from('profiles').update({
            platform_yearly_expires_at: oldPlatformExpiresAt,
            platform_yearly_plan: oldPlatformPlanName,
          }).eq('id', userResult.id);
          console.log(`🔥 v8.9.0: Saved old yearly Platform expiry: ${oldPlatformPlanName} until ${oldPlatformExpiresAt}`);
        }

        const cancelResult = await cancelMembership(oldId, 'immediate');
        if (cancelResult.success) {
          console.log("✅ Old Platform membership cancelled on activation");
        } else {
          console.warn("⚠️ Failed to cancel old Platform membership:", cancelResult.error);
        }
      } else {
        console.warn("⚠️ Stored membership ID is not a real membership:", oldId, "- skipping Whop cancel");
      }
    }
    // 🔥 v8.6.0: Cancel standalone Journal when platform activates:
    // - Core: cancel Basic only (Core includes Basic, not Premium)
    // - Finotaur/Enterprise: cancel any tier (they include Premium)
    // EXCEPTION: Yearly Journal → cancel at_period_end, Platform permissions take precedence
    let existingSubs: any = null;
    if (platformPlan === 'platform_core' || platformPlan === 'platform_finotaur' || platformPlan === 'platform_enterprise') {
      ({ data: existingSubs } = await supabase
        .from('profiles')
        .select('whop_membership_id, subscription_status, account_type, subscription_interval, subscription_expires_at, newsletter_whop_membership_id, newsletter_status, top_secret_whop_membership_id, top_secret_status')
        .eq('id', userResult.id)
        .single());

      if (existingSubs) {
        // 1) Cancel standalone Journal (Basic/Premium)
        // For Core: cancel only if existing is Basic (Core covers Basic, not Premium)
        // For Finotaur/Enterprise: cancel any tier
        const existingAccountType = existingSubs.account_type; // 'basic' or 'premium'
          const shouldCancelJournal = existingSubs.whop_membership_id && 
            ['active', 'trialing', 'trial'].includes(existingSubs.subscription_status || '') &&
            (
              // Core: cancel Basic OR Premium (Basic=immediate, Premium=at_period_end)
              (platformPlan === 'platform_core' && ['basic', 'premium'].includes(existingAccountType || '')) ||
              // Finotaur/Enterprise: cancel any (they cover Premium)
              (platformPlan === 'platform_finotaur' || platformPlan === 'platform_enterprise')
            );

          if (shouldCancelJournal) {
            // 🔥 v8.7.0: Core + Premium → at_period_end (user keeps Premium access until billing date)
            // Core + Basic → immediate (Core already covers Basic access)
            const isPremiumCancelledByCore = platformPlan === 'platform_core' && existingAccountType === 'premium';
            const isYearlyJournal = existingSubs.subscription_interval === 'yearly';
            const useAtPeriodEnd = isYearlyJournal || isPremiumCancelledByCore;
            console.log(`🔥 v8.7.0: Handling standalone Journal (${isYearlyJournal ? 'yearly→at_period_end' : isPremiumCancelledByCore ? 'premium+core→at_period_end' : 'monthly→immediate'}):`, existingSubs.whop_membership_id);

            if (existingSubs.whop_membership_id.startsWith('mem_')) {
              if (useAtPeriodEnd) {
                // at_period_end: keep Premium access until billing date
                const r = await cancelMembership(existingSubs.whop_membership_id, 'at_period_end');
                if (r.success) {
                  console.log(`✅ Journal (${existingAccountType}) scheduled for cancellation at period end — user keeps Premium access`);
                 await supabase.from('profiles').update({
                    subscription_cancel_at_period_end: true,
                    // 🔥 v8.9.0: Save yearly expiry AND plan so Platform cancel can restore access
                    journal_yearly_expires_at: existingSubs.subscription_expires_at,
                    journal_yearly_plan: existingAccountType, // 'basic' or 'premium'
                    updated_at: new Date().toISOString(),
                  }).eq('id', userResult.id);
                } else {
                  console.warn("⚠️ Failed to schedule Journal cancellation at period end:", r.error);
                }
              } else {
                // Immediate: Core+Basic or Finotaur/Enterprise+any
                const r = await cancelMembership(existingSubs.whop_membership_id, 'immediate');
                console.log(r.success ? `✅ Journal (${existingAccountType}) cancelled immediately` : "⚠️ Journal immediate cancel failed:", r.error);
              }
            }
          }

        // 2) Cancel standalone Newsletter (War Zone) — always immediate
        if (existingSubs.newsletter_whop_membership_id && 
            ['active', 'trialing', 'trial'].includes(existingSubs.newsletter_status || '')) {
          console.log("🔥 v7.4.0: Cancelling standalone Newsletter on activation:", existingSubs.newsletter_whop_membership_id);
          if (existingSubs.newsletter_whop_membership_id.startsWith('mem_')) {
            const r = await cancelMembership(existingSubs.newsletter_whop_membership_id, 'immediate');
            console.log(r.success ? "✅ Newsletter cancelled" : "⚠️ Newsletter cancel failed:", r.error);
          }
        }

        // 3) Cancel standalone Top Secret — always immediate
        if (existingSubs.top_secret_whop_membership_id && 
            ['active', 'trialing', 'trial'].includes(existingSubs.top_secret_status || '')) {
          console.log("🔥 v7.4.0: Cancelling standalone Top Secret on activation:", existingSubs.top_secret_whop_membership_id);
          if (existingSubs.top_secret_whop_membership_id.startsWith('mem_')) {
            const r = await cancelMembership(existingSubs.top_secret_whop_membership_id, 'immediate');
            console.log(r.success ? "✅ Top Secret cancelled" : "⚠️ Top Secret cancel failed:", r.error);
          }
        }
      }
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        platform_plan: platformPlan,
        platform_subscription_status: isInTrial ? 'trial' : 'active',
        platform_billing_interval: billingInterval,
        platform_subscription_started_at: new Date().toISOString(),
        platform_trial_ends_at: trialEndsAt,
        platform_is_in_trial: isInTrial,
        platform_cancel_at_period_end: false,
        platform_whop_membership_id: data.id,
        platform_whop_user_id: data.user?.id || '',
        platform_whop_product_id: productId || '',
        platform_whop_plan_id: planId,
        platform_whop_customer_email: data.user?.email || '',
        platform_payment_provider: 'whop',
        ...(isInTrial && platformPlan === 'platform_core' ? { platform_core_trial_used_at: new Date().toISOString() } : {}),
...(isInTrial && platformPlan === 'platform_finotaur' ? { platform_finotaur_trial_used_at: new Date().toISOString() } : {}),
        // 🔥 v8.5.0: Core includes Journal Basic (25 trades/month, 1 portfolio, no backtest)
        // 🔥 v8.9.0: If user had Premium (yearly or at_period_end), keep Premium access until it expires
        ...(platformPlan === 'platform_core' ? (() => {
          const coreExistingSubs = existingSubs ?? null;
          const hadPremiumAtPeriodEnd = coreExistingSubs?.account_type === 'premium' && 
            (coreExistingSubs?.subscription_interval === 'yearly' || coreExistingSubs?.subscription_cancel_at_period_end === true);
          const defaultExpiry = billingInterval === 'yearly'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          // 🔥 v8.9.1: If yearly Premium — keep Premium access until original expiry date
          const premiumExpiresAt = hadPremiumAtPeriodEnd
            ? (coreExistingSubs?.subscription_expires_at ?? defaultExpiry)
            : defaultExpiry;
          return {
            account_type: hadPremiumAtPeriodEnd ? 'premium' : 'basic',
            max_trades: hadPremiumAtPeriodEnd ? 999999 : 25,
            subscription_status: hadPremiumAtPeriodEnd ? 'active' : (isInTrial ? 'trial' : 'active'),
            subscription_interval: hadPremiumAtPeriodEnd ? (coreExistingSubs?.subscription_interval ?? billingInterval) : billingInterval,
            subscription_expires_at: premiumExpiresAt,
            subscription_cancel_at_period_end: hadPremiumAtPeriodEnd ? true : false,
            subscription_started_at: new Date().toISOString(),
            is_in_trial: hadPremiumAtPeriodEnd ? false : isInTrial,
            trial_ends_at: hadPremiumAtPeriodEnd ? null : trialEndsAt,
            platform_bundle_journal_granted: true,
          };
        })() : {}),
        // 🔥 v7.0.0: Finotaur includes Journal Premium + Newsletter + Top Secret
        ...(platformPlan === 'platform_finotaur' ? {
          account_type: 'premium',
          max_trades: 999999,
          subscription_status: 'active',
          subscription_interval: billingInterval,
          subscription_started_at: new Date().toISOString(),
          is_in_trial: isInTrial,
          trial_ends_at: trialEndsAt,
          newsletter_enabled: true,
          newsletter_status: isInTrial ? 'trial' : 'active',
          newsletter_paid: true,
          top_secret_enabled: true,
          top_secret_status: isInTrial ? 'trial' : 'active',
          top_secret_interval: 'monthly',
          platform_bundle_journal_granted: true,
          platform_bundle_newsletter_granted: true,
          // 🔥 v8.1.0: Ensure platform fields are set on activation (covers Trial period)
          platform_subscription_expires_at: trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        } : {}),
        // 🔥 v7.0.0: Enterprise includes everything Finotaur has + AI Portfolio
        ...(platformPlan === 'platform_enterprise' ? {
          account_type: 'premium',
          max_trades: 999999,
          subscription_status: 'active',
          subscription_interval: billingInterval,
          subscription_started_at: new Date().toISOString(),
          is_in_trial: isInTrial,
          trial_ends_at: trialEndsAt,
          newsletter_enabled: true,
          newsletter_status: isInTrial ? 'trial' : 'active',
          newsletter_paid: true,
          top_secret_enabled: true,
          top_secret_status: isInTrial ? 'trial' : 'active',
          top_secret_interval: 'monthly',
          enterprise_ai_portfolio_enabled: true,
          platform_bundle_journal_granted: true,
          platform_bundle_newsletter_granted: true,
          // 🔥 v8.1.0: Ensure platform fields are set on activation (covers Trial period)
          platform_subscription_expires_at: trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userResult.id);

    if (updateError) {
      console.error("❌ Platform activation update error:", updateError);
      return { success: false, message: `Platform activation failed: ${updateError.message}` };
    }

    console.log("✅ Platform membership activated:", {
      userId: userResult.id,
      plan: platformPlan,
      interval: billingInterval,
      isInTrial,
    });

    return {
      success: true,
      message: `Platform ${platformPlan} membership activated for ${userEmail} (${billingInterval})${isInTrial ? ' [trial]' : ''}`
    };
  }

  // ======= REGULAR JOURNAL SUBSCRIPTION FLOW =======

  // Check if already processed by payment.succeeded
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email, subscription_status")
    .eq("whop_membership_id", membershipId)
    .maybeSingle();

  if (existingProfile && existingProfile.subscription_status === "active") {
    return { success: true, message: `Membership already active for ${existingProfile.email}` };
  }

  // Try to find user by finotaur_user_id if not found by membership
  if (!existingProfile && finotaurUserId) {
    const user = await findUser(supabase, finotaurUserId, userEmail, 'journal');
    if (user) {
      console.log(`📝 Membership activated for user found by finotaur_user_id: ${user.email}`);
    }
  }

  return { success: true, message: `Membership activated event received for ${membershipId}` };
}

// ============================================
// 🔥 NEWSLETTER ACTIVATION HANDLER
// ============================================

interface NewsletterActivationParams {
  userEmail: string | undefined;
  whopUserId: string;
  membershipId: string;
  productId: string;
  finotaurUserId: string | null;
}

async function handleNewsletterActivation(
  supabase: SupabaseClient,
  params: NewsletterActivationParams,
  payload: WhopWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const { userEmail, whopUserId, membershipId, productId, finotaurUserId } = params;

  // 🔥 v3.15.0: Get billing interval FIRST - before any logging
  const membershipData = payload.data as WhopMembershipData;
  const planId = membershipData.plan?.id || '';
  const billingInterval = getBillingInterval(planId);

  console.log("📰 Processing NEWSLETTER activation:", {
    userEmail,
    finotaurUserId,
    membershipId,
    planId,
    billingInterval,
  });

  // 🔥 v3.15.0: If this is a YEARLY plan, SKIP activation entirely!
  // Let payment.succeeded handle it - yearly has no trial!
  if (billingInterval === 'yearly') {
    console.log("🔥 YEARLY Newsletter activation detected - SKIPPING COMPLETELY! Deferring to payment.succeeded");
    return { 
      success: true, 
      message: `Newsletter yearly activation SKIPPED - payment.succeeded will handle it` 
    };
  }

  try {
    // 🔥 v3.13.0: Try to find user from pending_checkouts if finotaurUserId is null
    let resolvedUserId = finotaurUserId;
    let resolvedEmail = userEmail;
    
    if (!resolvedUserId) {
      console.log("🔍 finotaurUserId is null, searching pending_checkouts for activation...");
      const pendingUser = await findUserFromPendingCheckout(supabase, userEmail, 'newsletter');
      
      if (pendingUser) {
        console.log("✅ Found user from pending_checkouts:", pendingUser.id);
        resolvedUserId = pendingUser.id;
        resolvedEmail = pendingUser.email;
      } else {
        const foundUser = await findUser(supabase, null, userEmail, 'newsletter');
        if (foundUser) {
          console.log("✅ Found user via findUser:", foundUser.id);
          resolvedUserId = foundUser.id;
          resolvedEmail = foundUser.email;
        }
      }
    }
    
    const { data: result, error } = await supabase.rpc('activate_newsletter_subscription', {
      p_user_email: resolvedEmail || '',
      p_whop_user_id: whopUserId || '',
      p_whop_membership_id: membershipId || '',
      p_whop_product_id: productId || '',
      p_finotaur_user_id: resolvedUserId || null,
      p_billing_interval: billingInterval,
    });

    if (error) {
      console.error("❌ activate_newsletter_subscription RPC error:", error);
      return { success: false, message: `Newsletter activation failed: ${error.message}` };
    }

    console.log("✅ Newsletter activated:", result);

    const isNewTrial = result?.is_new_trial || false;
    const status = result?.newsletter_status || 'trial';
    const trialEndsAt = result?.trial_ends_at;

    return { 
      success: true, 
      message: `Newsletter activated: ${userEmail} → ${status}${isNewTrial ? ` (trial ends: ${trialEndsAt})` : ''}` 
    };

  } catch (error) {
    console.error("❌ handleNewsletterActivation error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// 🔥 TOP SECRET ACTIVATION HANDLER
// ============================================

interface TopSecretActivationParams {
  userEmail: string | undefined;
  whopUserId: string;
  membershipId: string;
  productId: string;
  finotaurUserId: string | null;
}

async function handleTopSecretActivation(
  supabase: SupabaseClient,
  params: TopSecretActivationParams,
  payload: WhopWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const { userEmail, whopUserId, membershipId, productId, finotaurUserId } = params;

  // 🔥 v3.15.0: Get billing interval FIRST - before any logging
  const membershipData = payload.data as WhopMembershipData;
  const planId = membershipData.plan?.id || '';
  const billingInterval = getBillingInterval(planId);

  console.log("🔐 Processing TOP SECRET activation:", {
    userEmail,
    finotaurUserId,
    membershipId,
    planId,
    billingInterval,
  });

  // 🔥 v3.15.0: If this is a YEARLY plan, SKIP activation entirely!
  // Let payment.succeeded handle it
  if (billingInterval === 'yearly') {
    console.log("🔥 YEARLY Top Secret activation detected - SKIPPING COMPLETELY! Deferring to payment.succeeded");
    return { 
      success: true, 
      message: `Top Secret yearly activation SKIPPED - payment.succeeded will handle it` 
    };
  }

  try {
    // 🔥 v3.14.0: If this is a YEARLY plan, check if user is upgrading from monthly
    // If so, SKIP activation - let payment.succeeded handle the upgrade
    if (finotaurUserId) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('top_secret_interval, top_secret_status')
        .eq('id', finotaurUserId)
        .single();
      
      if (currentProfile?.top_secret_interval === 'monthly' && 
          ['active', 'trial', 'trialing'].includes(currentProfile?.top_secret_status || '')) {
        console.log("🔥 Yearly activation for existing monthly subscriber - skipping, will be handled by payment.succeeded");
        return { 
          success: true, 
          message: `Top Secret yearly upgrade detected - deferring to payment.succeeded handler` 
        };
      }
    }
    
    // Note: For membership.activated without payment (which shouldn't happen for Top Secret 
    // since it has no trial), we still call activate to ensure the user is set up
    const { data: result, error } = await supabase.rpc('activate_top_secret_subscription', {
      p_user_email: userEmail || '',
      p_whop_user_id: whopUserId || '',
      p_whop_membership_id: membershipId || '',
      p_whop_product_id: productId || '',
      p_whop_plan_id: '', // Will be determined from payment
      p_finotaur_user_id: finotaurUserId || null,
    });

    if (error) {
      console.error("❌ activate_top_secret_subscription RPC error:", error);
      return { success: false, message: `Top Secret activation failed: ${error.message}` };
    }

    console.log("✅ Top Secret activated:", result);

    return { 
      success: true, 
      message: `Top Secret activated: ${userEmail} → ${result?.top_secret_status || 'active'}` 
    };

  } catch (error) {
    console.error("❌ handleTopSecretActivation error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// 🔥 v8.0.0: ACTIVATE PENDING DOWNGRADE
// Called when old membership expires and new lower plan should kick in
// ============================================

async function activatePendingDowngrade(
  supabase: SupabaseClient,
  profile: any,
  newMembershipId: string
): Promise<{ success: boolean; message: string }> {
  const newPlan = profile.platform_pending_downgrade_plan;
  const userId = profile.id;
  const userEmail = profile.email;

  console.log(`🔻 activatePendingDowngrade: ${profile.platform_plan} → ${newPlan} for ${userEmail}`);

  // Determine account_type and permissions for new plan
  const PLAN_RANK: Record<string, number> = {
    platform_enterprise: 3,
    platform_finotaur: 2,
    platform_core: 1,
  };

  const isOldPlanHigher = (PLAN_RANK[profile.platform_plan] ?? 0) > (PLAN_RANK[newPlan] ?? 0);

  // Build update payload for the new lower plan
  const updatePayload: Record<string, any> = {
    platform_plan: newPlan,
    platform_subscription_status: 'active',
    platform_whop_membership_id: newMembershipId,
    platform_is_in_trial: false,        // NO trial on downgrade
    platform_cancel_at_period_end: false,
    platform_pending_downgrade_plan: null,
    platform_pending_downgrade_membership_id: null,
    updated_at: new Date().toISOString(),
  };

  // Remove higher-tier perms if downgrading FROM finotaur/enterprise
  if (profile.platform_plan === 'platform_finotaur' || profile.platform_plan === 'platform_enterprise') {
    if (newPlan === 'platform_core') {
      // Core: basic journal only, no newsletter/top_secret
      updatePayload.account_type = 'basic';
      updatePayload.max_trades = 25;
      updatePayload.newsletter_enabled = false;
      updatePayload.newsletter_status = 'cancelled';
      updatePayload.top_secret_enabled = false;
      updatePayload.top_secret_status = 'cancelled';
      updatePayload.platform_bundle_newsletter_granted = false;
      if (profile.platform_plan === 'platform_enterprise') {
        updatePayload.enterprise_ai_portfolio_enabled = false;
      }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId);

  if (error) {
    console.error("❌ activatePendingDowngrade error:", error);
    return { success: false, message: `Pending downgrade activation failed: ${error.message}` };
  }

  console.log(`✅ Downgrade activated: ${profile.platform_plan} → ${newPlan} for ${userEmail}`);
  return {
    success: true,
    message: `Platform downgrade activated: ${userEmail} (${profile.platform_plan} → ${newPlan})`
  };
}

// ============================================
// MEMBERSHIP DEACTIVATED
// 🔥 v3.12.0: Now handles bundle break resubscribe flow!
// ============================================

async function handleMembershipDeactivated(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  finotaurUserId: string | null
): Promise<{ success: boolean; message: string }> {
  const data = payload.data as WhopMembershipData;
  const membershipId = data.id;
  const userEmail = data.user?.email || '';
  const productId = data.product?.id || '';

  const isNewsletterDeactivation = isNewsletter(productId);
  const isTopSecretDeactivation = isTopSecret(productId);

  console.log("❌ Processing membership.deactivated:", {
    membershipId,
    userEmail,
    productId,
    isNewsletter: isNewsletterDeactivation,
    isTopSecret: isTopSecretDeactivation,
    finotaurUserId,
  });

  // ═══════════════════════════════════════════════
  // NEWSLETTER DEACTIVATION - Use RPC
  // ═══════════════════════════════════════════════

  if (isNewsletterDeactivation) {
    console.log("📰 Processing newsletter deactivation...");
    
    // 🔥 v3.14.0: Check if user reactivated in our DB before processing deactivation
    // Since Whop doesn't support uncancel via API, we track reactivation intent in our DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, newsletter_cancel_at_period_end, newsletter_whop_membership_id, newsletter_status')
      .eq('newsletter_whop_membership_id', membershipId)
      .single();
    
// 🔥 v7.0.0: If user has active Finotaur/Enterprise, SKIP standalone deactivation
    if (profile) {
      const { data: platformCheck } = await supabase
        .from('profiles')
        .select('platform_plan, platform_subscription_status')
        .eq('id', profile.id)
        .single();
      
      if (platformCheck && 
          ['platform_finotaur', 'platform_enterprise'].includes(platformCheck.platform_plan) &&
          ['active', 'trial', 'trialing'].includes(platformCheck.platform_subscription_status || '')) {
        console.log(`✅ User has active ${platformCheck.platform_plan} - SKIPPING Newsletter deactivation`);
        return { success: true, message: `Newsletter deactivation SKIPPED - user has ${platformCheck.platform_plan}` };
      }
    }
    
    if (profile && profile.newsletter_cancel_at_period_end === false) {
      console.log(`⚠️ User reactivated newsletter in DB - user wants to KEEP subscription`);
      console.log(`💡 User ID: ${profile.id}, Email: ${profile.email}`);
      console.log(`💡 Whop cancelled the membership, but user clicked "Undo Cancellation"`);
      console.log(`💡 Keeping access and NOT deactivating - user should resubscribe to continue after this`);
      
      // 🔥 v3.14.0: DON'T change status to needs_resubscribe yet!
      // Keep the user's current access intact - they clicked "undo cancellation"
      // Just log the event and let them know they need to resubscribe
      await supabase.from('subscription_events').insert({
        user_id: profile.id,
        event_type: 'whop_deactivated_but_user_reactivated',
        old_plan: profile.newsletter_status || 'trial',
        new_plan: profile.newsletter_status || 'trial',
        metadata: {
          whop_membership_id: membershipId,
          user_reactivated_in_db: true,
          note: 'Whop sent deactivation but user had clicked Undo Cancellation - keeping access',
          action_needed: 'User should resubscribe to continue access'
        }
      });
      
      return { 
        success: true, 
        message: `Newsletter: User reactivated in DB, keeping access. Email: ${profile.email}` 
      };
    }
    
    console.log("📰 Calling deactivate_newsletter_subscription RPC...");
    
    const { data: result, error } = await supabase.rpc('deactivate_newsletter_subscription', {
      p_whop_membership_id: membershipId,
    });

    if (error) {
      console.error("❌ deactivate_newsletter_subscription RPC error:", error);
      return { success: false, message: `Newsletter deactivation failed: ${error.message}` };
    }

    console.log("✅ Newsletter deactivation RPC result:", result);

    return { 
      success: result?.success ?? true, 
      message: `Newsletter deactivated: ${result?.email || userEmail}` 
    };
  }

  // ═══════════════════════════════════════════════
  // 🔥 v3.6.0: TOP SECRET DEACTIVATION - Also cancel War Zone!
  // ═══════════════════════════════════════════════

  if (isTopSecretDeactivation) {
    console.log("🔐 Processing top secret deactivation...");
    
    // 🔥 v3.14.0: Check if user reactivated in our DB before processing deactivation
    // Since Whop doesn't support uncancel via API, we track reactivation intent in our DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, top_secret_cancel_at_period_end, top_secret_whop_membership_id, top_secret_status')
      .eq('top_secret_whop_membership_id', membershipId)
      .single();
    
    // 🔥 v7.0.0: If user has active Finotaur/Enterprise, SKIP Top Secret deactivation
    if (profile) {
      const { data: platformCheck } = await supabase
        .from('profiles')
        .select('platform_plan, platform_subscription_status')
        .eq('id', profile.id)
        .single();
      
      if (platformCheck && 
          ['platform_finotaur', 'platform_enterprise'].includes(platformCheck.platform_plan) &&
          ['active', 'trial', 'trialing'].includes(platformCheck.platform_subscription_status || '')) {
        console.log(`✅ User has active ${platformCheck.platform_plan} - SKIPPING Top Secret deactivation`);
        return { success: true, message: `Top Secret deactivation SKIPPED - user has ${platformCheck.platform_plan}` };
      }
    }
    
    if (profile && profile.top_secret_cancel_at_period_end === false) {
      console.log(`⚠️ User reactivated top_secret in DB - user wants to KEEP subscription`);
      console.log(`💡 User ID: ${profile.id}, Email: ${profile.email}`);
      console.log(`💡 Whop cancelled the membership, but user clicked "Undo Cancellation"`);
      console.log(`💡 Keeping access and NOT deactivating - user should resubscribe to continue after this`);
      
      // 🔥 v3.14.0: DON'T change status to needs_resubscribe yet!
      // Keep the user's current access intact - they clicked "undo cancellation"
      // Just log the event and let them know they need to resubscribe
      await supabase.from('subscription_events').insert({
        user_id: profile.id,
        event_type: 'whop_deactivated_but_user_reactivated',
        old_plan: profile.top_secret_status || 'trial',
        new_plan: profile.top_secret_status || 'trial',
        metadata: {
          whop_membership_id: membershipId,
          user_reactivated_in_db: true,
          note: 'Whop sent deactivation but user had clicked Undo Cancellation - keeping access',
          action_needed: 'User should resubscribe to continue access'
        }
      });
      
      return { 
        success: true, 
        message: `Top Secret: User reactivated in DB, keeping access. Email: ${profile.email}` 
      };
    }
    
    console.log("🔐 Calling deactivate_top_secret_subscription RPC...");
    
    const { data: result, error } = await supabase.rpc('deactivate_top_secret_subscription', {
      p_whop_membership_id: membershipId,
    });

    if (error) {
      console.error("❌ deactivate_top_secret_subscription RPC error:", error);
      return { success: false, message: `Top Secret deactivation failed: ${error.message}` };
    }

    console.log("✅ Top Secret deactivation RPC result:", result);

    // 🔥 v3.6.0: Now cancel War Zone subscription too!
    let warZoneMessage = '';
    if (result?.user_id) {
      console.log("🔥 Top Secret deactivated - checking for War Zone subscription to cancel...");
      
      const warZoneResult = await cancelWarZoneForTopSecretMember(
        supabase, 
        result.user_id, 
        result.email || userEmail
      );
      
      if (warZoneResult.warZoneCancelled) {
        warZoneMessage = ` | War Zone also cancelled at period end`;
        console.log("✅ War Zone subscription marked for cancellation at period end");
      }
    }

    return { 
      success: result?.success ?? true, 
      message: `Top Secret deactivated: ${result?.email || userEmail}${warZoneMessage}` 
    };
  }

  // ═══════════════════════════════════════════════
  // 🔥 v6.0.0: PLATFORM DEACTIVATION (Core / Enterprise)
  // ═══════════════════════════════════════════════

  if (isPlatform(productId)) {
    console.log("🖥️ Processing PLATFORM deactivation...");

    // 🔥 v6.5.0: Find user by membership ID OR by email (for stale membership lookups)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, platform_plan, platform_subscription_status, platform_whop_membership_id, whop_membership_id, subscription_status, platform_pending_downgrade_plan, platform_pending_downgrade_membership_id, platform_subscription_expires_at, journal_yearly_expires_at, journal_yearly_plan, platform_yearly_expires_at, platform_yearly_plan')
      .eq('platform_whop_membership_id', membershipId)
      .single();

    if (!profile) {
      // 🔥 v8.0.0: Also check if this is the OLD membership of a pending downgrade
      // (user has already stored a pending_downgrade and the old membership is now expiring)
      const { data: pendingDowngradeProfile } = await supabase
        .from('profiles')
        .select('id, email, platform_plan, platform_whop_membership_id, platform_pending_downgrade_plan, platform_pending_downgrade_membership_id, platform_subscription_expires_at, whop_membership_id, subscription_status')
        .eq('platform_pending_downgrade_membership_id', membershipId)
        .maybeSingle();

      if (pendingDowngradeProfile?.platform_pending_downgrade_plan) {
        // This is the NEW (lower) membership being activated — old plan is expiring
        // Now we switch the user to the lower plan
        console.log("🔻 Activating pending downgrade:", {
          oldPlan: pendingDowngradeProfile.platform_plan,
          newPlan: pendingDowngradeProfile.platform_pending_downgrade_plan,
          newMembershipId: membershipId,
        });
        return await activatePendingDowngrade(supabase, pendingDowngradeProfile, membershipId);
      }

      console.warn("⚠️ No user found for platform deactivation, membership:", membershipId);
      return { success: true, message: `Platform deactivation: no user found for ${membershipId}` };
    }

    // 🔥 v8.0.0: Check if this deactivation is the OLD membership expiring due to a pending downgrade
    if (profile.platform_pending_downgrade_plan && profile.platform_pending_downgrade_membership_id) {
      console.log("🔻 Old membership expired — activating pending downgrade now:", {
        oldPlan: profile.platform_plan,
        newPlan: profile.platform_pending_downgrade_plan,
        newMembershipId: profile.platform_pending_downgrade_membership_id,
      });
      return await activatePendingDowngrade(supabase, profile, profile.platform_pending_downgrade_membership_id);
    }

    // 🔥 v6.5.0: Race condition guard — if user already upgraded to a NEW plan
    // (e.g. Core → Finotaur), the old membership deactivation should be ignored.
    // This happens when Bundle/Finotaur payment.succeeded already updated platform_whop_membership_id
    // to the new membership, but the old Core deactivation webhook arrives later.
    // 🔥 v8.1.0: Safety check - if user already upgraded to higher plan, ignore deactivation of lower tier
    if (['platform_finotaur', 'platform_enterprise'].includes(profile.platform_plan || '') &&
        ['active', 'trial', 'trialing'].includes(profile.platform_subscription_status || '')) {
      console.log(`⚠️ Ignoring deactivation — user already on ${profile.platform_plan} (higher plan):`, {
        deactivatedMembership: membershipId,
        currentPlan: profile.platform_plan,
      });
      return { success: true, message: `Platform deactivation ignored — user has active ${profile.platform_plan}` };
    }

    if (profile.platform_whop_membership_id !== membershipId) {
      console.log("⚠️ Ignoring stale platform deactivation — membership already replaced:", {
        deactivatedMembership: membershipId,
        currentMembership: profile.platform_whop_membership_id,
        currentPlan: profile.platform_plan,
      });
      return { success: true, message: `Platform deactivation ignored (stale): ${profile.email}` };
    }

const oldPlan = profile.platform_plan;
    
    // 🔥 v8.9.0: Check active membership AND unexpired yearly subscriptions
    const now = new Date();
    const journalYearlyExpiresAt = profile.journal_yearly_expires_at;
    const journalYearlyStillValid = journalYearlyExpiresAt && new Date(journalYearlyExpiresAt) > now;
    const journalYearlyPlan = profile.journal_yearly_plan; // 'basic' or 'premium'

    const platformYearlyExpiresAt = profile.platform_yearly_expires_at;
    const platformYearlyStillValid = platformYearlyExpiresAt && new Date(platformYearlyExpiresAt) > now;
    const platformYearlyPlan = profile.platform_yearly_plan; // e.g. 'platform_core'

    const hasOwnJournalSub = (profile.whop_membership_id && 
      ['active', 'trialing'].includes(profile.subscription_status || '')) ||
      !!journalYearlyStillValid;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        platform_plan: 'free',
        platform_subscription_status: 'cancelled',
        platform_is_in_trial: false,
        platform_cancel_at_period_end: false,
        platform_pending_downgrade_plan: null,
        platform_pending_downgrade_membership_id: null,
        // 🔥 v8.9.0: Finotaur/Enterprise deactivation — check for yearly Platform fallback
        ...(oldPlan === 'platform_finotaur' || oldPlan === 'platform_enterprise' ? (() => {
          const base = {
            newsletter_enabled: false,
            newsletter_status: 'cancelled',
            top_secret_enabled: false,
            top_secret_status: 'cancelled',
            platform_bundle_newsletter_granted: false,
            ...(oldPlan === 'platform_enterprise' ? { enterprise_ai_portfolio_enabled: false } : {}),
          };
          if (platformYearlyStillValid && platformYearlyPlan) {
            console.log(`🔥 v8.9.0: Restoring yearly Platform access: ${platformYearlyPlan} until ${platformYearlyExpiresAt}`);
            return {
              ...base,
              platform_plan: platformYearlyPlan,
              platform_subscription_status: 'active',
              platform_subscription_expires_at: platformYearlyExpiresAt,
              platform_cancel_at_period_end: false,
              platform_yearly_expires_at: null,
              platform_yearly_plan: null,
              account_type: 'basic',
              max_trades: 25,
              subscription_status: 'active',
              platform_bundle_journal_granted: true,
            };
          }
          return {
            ...base,
            account_type: 'free',
            max_trades: 15,
            subscription_status: 'inactive',
            platform_bundle_journal_granted: false,
          };
        })() : {}),
        // 🔥 v8.9.0: Core deactivation — restore yearly Journal if still valid
        ...(oldPlan === 'platform_core' ? (() => {
          if (journalYearlyStillValid && journalYearlyPlan) {
            const maxTrades = journalYearlyPlan === 'premium' ? 999999 : 25;
            console.log(`🔥 v8.9.0: Restoring yearly Journal access: ${journalYearlyPlan} until ${journalYearlyExpiresAt}`);
            return {
              account_type: journalYearlyPlan,
              max_trades: maxTrades,
              subscription_status: 'active',
              subscription_expires_at: journalYearlyExpiresAt,
              subscription_cancel_at_period_end: false,
              platform_bundle_journal_granted: false,
              journal_yearly_expires_at: null,
              journal_yearly_plan: null,
            };
          }
          if (!hasOwnJournalSub) {
            return {
              account_type: 'free',
              max_trades: 15,
              subscription_status: 'inactive',
              platform_bundle_journal_granted: false,
            };
          }
          return {};
        })() : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error("❌ Platform deactivation error:", updateError);
      return { success: false, message: `Platform deactivation failed: ${updateError.message}` };
    }

    console.log("✅ Platform deactivated:", { userId: profile.id, email: profile.email, oldPlan,
      journalDowngraded: oldPlan === 'platform_finotaur' && !hasOwnJournalSub });

    return {
      success: true,
      message: `Platform deactivated: ${profile.email} (${oldPlan} → free)${oldPlan === 'platform_finotaur' && !hasOwnJournalSub ? ' [Journal also downgraded]' : ''}`
    };
  }

  // ═══════════════════════════════════════════════
  // 🔥 JOURNAL SUBSCRIPTION - Use RPC!
  // 🔥 v7.4.0: If user has active Platform — keep permissions, only clean up membership fields
  // ═══════════════════════════════════════════════

  // Check if user has active Platform that already covers Journal access
  const { data: profileForJournal } = await supabase
    .from('profiles')
    .select('id, platform_plan, platform_subscription_status, account_type')
    .eq('whop_membership_id', membershipId)
    .maybeSingle();

  if (profileForJournal?.platform_plan && 
      ['active', 'trial', 'trialing'].includes(profileForJournal.platform_subscription_status || '')) {
    console.log("🔥 v7.4.0: Journal deactivated but Platform is active — keeping permissions:", {
      userId: profileForJournal.id,
      platformPlan: profileForJournal.platform_plan,
      currentAccountType: profileForJournal.account_type,
    });
    // Only clear Journal membership fields — don't touch account_type or max_trades
    await supabase.from('profiles').update({
      whop_membership_id: null,
      subscription_status: 'inactive',
      subscription_cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }).eq('id', profileForJournal.id);
    
    return { 
      success: true, 
      message: `Journal deactivated but permissions kept via active Platform (${profileForJournal.platform_plan}): ${profileForJournal.id}` 
    };
  }

  console.log("📦 Calling deactivate_whop_subscription RPC...");
  
  const { data: result, error } = await supabase.rpc('deactivate_whop_subscription', {
    p_whop_membership_id: membershipId,
  });

  if (error) {
    console.error("❌ deactivate_whop_subscription RPC error:", error);
    return { success: false, message: `Subscription deactivation failed: ${error.message}` };
  }

  console.log("✅ deactivate_whop_subscription RPC result:", result);

  if (!result?.success) {
    return { 
      success: false, 
      message: result?.error || 'Subscription deactivation failed' 
    };
  }

  return { 
    success: true, 
    message: `Subscription deactivated: ${result?.email || userEmail} → ${result?.new_plan || 'free'}` 
  };
}

// ============================================
// 🔥 NEWSLETTER DEACTIVATION HANDLER
// ============================================

async function handleNewsletterDeactivation(
  supabase: SupabaseClient,
  membershipId: string
): Promise<{ success: boolean; message: string }> {
  console.log("📰 Processing NEWSLETTER deactivation:", { membershipId });

  try {
    // Call the newsletter-specific RPC function
    const { data: result, error } = await supabase.rpc('deactivate_newsletter_subscription', {
      p_whop_membership_id: membershipId || '',
    });

    if (error) {
      console.error("❌ deactivate_newsletter_subscription RPC error:", error);
      return { success: false, message: `Newsletter deactivation failed: ${error.message}` };
    }

    console.log("✅ Newsletter deactivated:", result);

    const userEmailResult = result?.email || 'unknown';
    const previousStatus = result?.previous_status || 'unknown';

    return { 
      success: true, 
      message: `Newsletter deactivated: ${userEmailResult} (was: ${previousStatus})` 
    };

  } catch (error) {
    console.error("❌ handleNewsletterDeactivation error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// 🔥 v3.15.0: HANDLE CANCEL AT PERIOD END CHANGED
// This webhook fires when user cancels OR uncancels via Whop UI
// ============================================

async function handleCancelAtPeriodEndChanged(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  finotaurUserId: string | null,
  finotaurEmail: string | null
): Promise<{ success: boolean; message: string }> {
  const data = payload.data as WhopMembershipData;
  const membershipId = data.id;
  const cancelAtPeriodEnd = data.cancel_at_period_end ?? true;
  const productId = data.product?.id;
  const planId = data.plan?.id;
  const userEmail = data.user?.email || finotaurEmail || '';
  
  console.log(`🔄 Cancel at period end changed:`, {
    membershipId,
    cancelAtPeriodEnd,
    productId,
    planId,
    userEmail
  });

  // Determine product type
  const isNewsletterProduct = isNewsletter(productId);
  const isTopSecretProduct = isTopSecret(productId);

  if (!isNewsletterProduct && !isTopSecretProduct) {
    return { success: true, message: `Product ${productId} not tracked` };
  }

  // Find user by membership ID or email
  let profile = null;
  
  if (isNewsletterProduct) {
    const { data: foundProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("newsletter_whop_membership_id", membershipId)
      .single();
    profile = foundProfile;
  } else if (isTopSecretProduct) {
    const { data: foundProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("top_secret_whop_membership_id", membershipId)
      .single();
    profile = foundProfile;
  }
  
  // Fallback: try by finotaur_user_id
  if (!profile && finotaurUserId) {
    const { data: foundProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", finotaurUserId)
      .single();
    profile = foundProfile;
  }
  
  // Fallback: try by email
  if (!profile && userEmail) {
    const { data: foundProfile } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", userEmail)
      .single();
    profile = foundProfile;
  }

  if (!profile) {
    console.log(`⚠️ No profile found for membership ${membershipId}`);
    return { success: true, message: `No profile found for membership ${membershipId}` };
  }

  // Update the cancel_at_period_end flag based on Whop's webhook
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };
  
  if (isNewsletterProduct) {
    updateData.newsletter_cancel_at_period_end = cancelAtPeriodEnd;
    
    await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);
    
    console.log(`✅ Newsletter cancel_at_period_end set to ${cancelAtPeriodEnd} for ${profile.email}`);
  }

  if (isTopSecretProduct) {
    updateData.top_secret_cancel_at_period_end = cancelAtPeriodEnd;
    
    await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);
    
    console.log(`✅ Top Secret cancel_at_period_end set to ${cancelAtPeriodEnd} for ${profile.email}`);
  }
  // Log the event
  const currentStatus = isNewsletterProduct 
    ? profile.newsletter_status 
    : profile.top_secret_status;
      
  await supabase.from("subscription_events").insert({
    user_id: profile.id,
    event_type: cancelAtPeriodEnd ? "subscription_scheduled_cancel_whop" : "subscription_reactivated_whop",
    old_plan: currentStatus,
    new_plan: currentStatus,
    metadata: {
      whop_membership_id: membershipId,
      product_id: productId,
      plan_id: planId,
      cancel_at_period_end: cancelAtPeriodEnd,
      source: "whop_webhook_cancel_at_period_end_changed",
      product_type: isNewsletterProduct ? 'newsletter' : 'top_secret'
    }
  });

  const action = cancelAtPeriodEnd ? "scheduled for cancellation" : "REACTIVATED";
  const product = isNewsletterProduct ? "Newsletter" : "Top Secret";
  
  return { 
    success: true, 
    message: `${product} ${action} via Whop for ${profile.email}` 
  };
}

// ============================================
// AFFILIATE PROCESSING
// ============================================

interface AffiliatePaymentParams {
  promoCode: string;
  userId: string;
  userEmail: string;
  whopUserId: string;
  membershipId: string;
  productId: string;
  planInfo: PlanInfo;
  paymentAmount: number;
  isFirstPayment: boolean;
}

async function processAffiliateFromPayment(
  supabase: SupabaseClient,
  commissionConfig: CommissionConfig,
  params: AffiliatePaymentParams
): Promise<void> {
  const {
    promoCode,
    userId,
    userEmail,
    whopUserId,
    membershipId,
    productId,
    planInfo,
    paymentAmount,
    isFirstPayment,
  } = params;

  // 🔥 Skip affiliate processing for newsletter (no commissions for newsletter yet)
  if (planInfo.isNewsletter) {
    console.log("⚠️ Skipping affiliate processing for newsletter subscription");
    return;
  }

  try {
    console.log("📊 Processing affiliate:", { promoCode, isFirstPayment, amount: paymentAmount });

    // Find affiliate
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, user_id, commission_enabled, affiliate_type, current_tier")
      .or(`affiliate_code.ilike.${promoCode},coupon_code.ilike.${promoCode}`)
      .eq("status", "active")
      .maybeSingle();

    if (!affiliate) {
      console.log(`⚠️ Affiliate not found for code: ${promoCode}`);
      return;
    }

    // No self-referral
    if (affiliate.user_id === userId) {
      console.log("⚠️ Self-referral blocked");
      return;
    }

    // Check commission enabled
    if (!affiliate.commission_enabled) {
      console.log("⚠️ Commission disabled for this affiliate");
      return;
    }

    // GET COMMISSION RATE FROM CONFIG
    const commissionRate = getCommissionRate(
      commissionConfig,
      affiliate.current_tier || "tier_1",
      planInfo.interval
    );
    const commissionAmount = Math.round(paymentAmount * commissionRate * 100) / 100;

    console.log(`💵 Commission: ${(commissionRate * 100).toFixed(0)}% of $${paymentAmount} = $${commissionAmount}`);

    // Check existing referral
    const { data: existingReferral } = await supabase
      .from("affiliate_referrals")
      .select("id, status, first_payment_date")
      .eq("referred_user_id", userId)
      .maybeSingle();

    const now = new Date();
    const verificationEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (existingReferral) {
      // Update existing
      const updateData: Record<string, unknown> = {
        subscription_plan: planInfo.plan,
        subscription_type: planInfo.interval,
        subscription_price_usd: paymentAmount,
        total_payments_usd: paymentAmount,
        updated_at: now.toISOString(),
      };

      if (isFirstPayment && !existingReferral.first_payment_date) {
        updateData.status = "verification_pending";
        updateData.first_payment_amount_usd = paymentAmount;
        updateData.first_payment_date = now.toISOString();
        updateData.verification_start = now.toISOString();
        updateData.verification_end = verificationEnd.toISOString();
        updateData.subscription_started_at = now.toISOString();
        updateData.coupon_code_used = promoCode;
      }

      await supabase
        .from("affiliate_referrals")
        .update(updateData)
        .eq("id", existingReferral.id);

      // Create commission if first payment
      if (isFirstPayment && !existingReferral.first_payment_date) {
        await createCommission(supabase, {
          affiliateId: affiliate.id,
          referralId: existingReferral.id,
          baseAmount: paymentAmount,
          commissionRate,
          commissionAmount,
          tier: affiliate.current_tier || "tier_1",
          subscriptionType: planInfo.interval,
        });
      }
    } else {
      // Create new referral
      const { data: newReferral } = await supabase
        .from("affiliate_referrals")
        .insert({
          affiliate_id: affiliate.id,
          referred_user_id: userId,
          referred_user_email: userEmail,
          signup_date: now.toISOString(),
          signup_plan: planInfo.plan,
          subscription_plan: planInfo.plan,
          subscription_type: planInfo.interval,
          subscription_price_usd: paymentAmount,
          subscription_started_at: now.toISOString(),
          first_payment_amount_usd: paymentAmount,
          first_payment_date: now.toISOString(),
          total_payments_usd: paymentAmount,
          status: "verification_pending",
          verification_start: now.toISOString(),
          verification_end: verificationEnd.toISOString(),
          commission_eligible: true,
          coupon_code_used: promoCode,
          whop_membership_id: membershipId,
          whop_user_id: whopUserId,
          whop_product_id: productId,
        })
        .select()
        .single();

      if (newReferral) {
        // Update affiliate stats
        await supabase.rpc("increment_affiliate_signups", { p_affiliate_id: affiliate.id });

        // Create commission
        await createCommission(supabase, {
          affiliateId: affiliate.id,
          referralId: newReferral.id,
          baseAmount: paymentAmount,
          commissionRate,
          commissionAmount,
          tier: affiliate.current_tier || "tier_1",
          subscriptionType: planInfo.interval,
        });
      }
    }

    // Log activity
    await supabase
      .from("affiliate_activity_log")
      .insert({
        affiliate_id: affiliate.id,
        activity_type: isFirstPayment ? "first_payment_received" : "recurring_payment_received",
        description: `${isFirstPayment ? "First" : "Recurring"} payment: $${paymentAmount} (${planInfo.interval}), Commission: $${commissionAmount} (${(commissionRate * 100).toFixed(0)}%)`,
        metadata: {
          user_email: userEmail,
          plan: planInfo.plan,
          interval: planInfo.interval,
          amount: paymentAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          tier: affiliate.current_tier,
          promo_code: promoCode,
        },
        is_system_action: true,
      });

  } catch (error) {
    console.error("❌ processAffiliateFromPayment error:", error);
  }
}

// ============================================
// COMMISSION CREATION
// ============================================

interface CreateCommissionParams {
  affiliateId: string;
  referralId: string;
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  tier: string;
  subscriptionType: string;
}

async function createCommission(
  supabase: SupabaseClient,
  params: CreateCommissionParams
): Promise<void> {
  const { affiliateId, referralId, baseAmount, commissionRate, commissionAmount, tier, subscriptionType } = params;

  try {
    const now = new Date();
    const commissionMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Determine commission type
    const commissionType = subscriptionType === "yearly" ? "annual_upfront" : "monthly_recurring";

    console.log(`💵 Creating commission: $${commissionAmount} (${(commissionRate * 100).toFixed(0)}% of $${baseAmount}) - ${commissionType}`);

    // Create commission
    await supabase
      .from("affiliate_commissions")
      .insert({
        affiliate_id: affiliateId,
        referral_id: referralId,
        commission_type: commissionType,
        commission_month: commissionMonth.toISOString().split('T')[0],
        base_amount_usd: baseAmount,
        commission_rate: commissionRate,
        commission_amount_usd: commissionAmount,
        tier_at_time: tier,
        status: "pending",
        month_number: 1,
      });

    // Update affiliate totals
    const { data: currentAffiliate } = await supabase
      .from("affiliates")
      .select("total_pending_usd, total_earnings_usd")
      .eq("id", affiliateId)
      .single();

    if (currentAffiliate) {
      await supabase
        .from("affiliates")
        .update({
          total_pending_usd: Number(currentAffiliate.total_pending_usd || 0) + commissionAmount,
          total_earnings_usd: Number(currentAffiliate.total_earnings_usd || 0) + commissionAmount,
          last_activity_at: now.toISOString(),
        })
        .eq("id", affiliateId);
    }

    // Update referral
    await supabase
      .from("affiliate_referrals")
      .update({
        commission_earned_usd: commissionAmount,
        commission_eligible: true,
        commission_start_date: now.toISOString(),
      })
      .eq("id", referralId);

    console.log(`✅ Commission created: $${commissionAmount} for affiliate ${affiliateId}`);

  } catch (error) {
    console.error("❌ createCommission error:", error);
  }
}