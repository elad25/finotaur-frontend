// =====================================================
// FINOTAUR WHOP WEBHOOK HANDLER - v3.4.0
// =====================================================
// 
// 🔥 v3.4.0 - NEWSLETTER (WAR ZONE) SUPPORT
// 
// Changes from v3.2.0:
// - Added NEWSLETTER_PRODUCT_IDS for War Zone product
// - Added isNewsletter() helper to detect newsletter products
// - Newsletter events routed to separate RPC functions
// - Newsletter doesn't affect journal subscription (account_type, max_trades)
// - Users can have both newsletter + journal subscriptions
// - Added pending_downgrade_plan support for plan changes
// 
// Newsletter Configuration:
// - Product ID: prod_qlaV5Uu6LZlYn
// - Plan ID: plan_LCBG5yJpoNtW3
// - Price: $20/month
// - Trial: 7 days free
// 
// Commission Structure (from affiliate_config):
// - tier_1: 10% (monthly)
// - tier_2: 15% (monthly)
// - tier_3: 20% (monthly)
// - Annual: 15% (fixed for all tiers)
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

// ============================================
// CONFIGURATION
// ============================================

const WHOP_WEBHOOK_SECRET = Deno.env.get("WHOP_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 🔥 NEW: Newsletter Product IDs
const NEWSLETTER_PRODUCT_IDS = new Set([
  'prod_qlaV5Uu6LZlYn',  // War Zone Intelligence Newsletter
]);

// Default commission rates (fallback if DB config not found)
const DEFAULT_COMMISSION_RATES = {
  tier_1: 0.10,  // 10%
  tier_2: 0.15,  // 15%
  tier_3: 0.20,  // 20%
  annual: 0.15,  // 15% for annual
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

interface WhopMetadata {
  finotaur_user_id?: string;
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
  isNewsletter: boolean;  // 🔥 NEW
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
  lookupMethod: 'finotaur_user_id' | 'email';
}

// ============================================
// 🔥 NEW: Check if product is Newsletter
// ============================================

function isNewsletter(productId: string | undefined): boolean {
  if (!productId) return false;
  return NEWSLETTER_PRODUCT_IDS.has(productId);
}

// ============================================
// SIGNATURE VERIFICATION
// ============================================

function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  if (!signature || !WHOP_WEBHOOK_SECRET) {
    console.warn("⚠️ Missing signature or webhook secret");
    return false;
  }

  try {
    const hmac = createHmac("sha256", WHOP_WEBHOOK_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    
    const cleanSignature = signature.replace('sha256=', '');
    const isValid = cleanSignature === expectedSignature;
    
    if (!isValid) {
      console.error("❌ Signature mismatch");
    }
    
    return isValid;
  } catch (error) {
    console.error("❌ Signature verification error:", error);
    return false;
  }
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
      isNewsletter: dbPlan.finotaur_plan === 'newsletter',  // 🔥 NEW
    };
  }

  // Fallback for journal subscriptions
  const fallbackMapping: Record<string, PlanInfo> = {
    "prod_ZaDN418HLst3r": { plan: "basic", interval: "monthly", price: 19.99, maxTrades: 25, isNewsletter: false },
    "prod_bPwSoYGedsbyh": { plan: "basic", interval: "yearly", price: 149.00, maxTrades: 25, isNewsletter: false },
    "prod_Kq2pmLT1JyGsU": { plan: "premium", interval: "monthly", price: 39.99, maxTrades: 999999, isNewsletter: false },
    "prod_vON7zlda6iuII": { plan: "premium", interval: "yearly", price: 299.00, maxTrades: 999999, isNewsletter: false },
    // Newsletter fallback
    "prod_qlaV5Uu6LZlYn": { plan: "newsletter", interval: "monthly", price: 20.00, maxTrades: 0, isNewsletter: true },
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
// Find user by ID or email with fallback
// ============================================

async function findUser(
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
      
      if (emailMismatch) {
        console.warn("⚠️ Email mismatch detected:", {
          finotaurEmail: userById.email,
          whopEmail: whopEmail,
          userId: userById.id,
        });
      }
      
      return {
        id: userById.id,
        email: userById.email,
        emailMismatch,
        lookupMethod: 'finotaur_user_id',
      };
    }
    
    console.warn("⚠️ User not found by finotaur_user_id, trying email fallback");
  }

  // OPTION 2: Fallback to email lookup
  if (whopEmail) {
    console.log("📧 Looking up user by email:", whopEmail);
    
    const { data: userByEmail, error: userByEmailError } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", whopEmail)
      .maybeSingle();

    if (!userByEmailError && userByEmail) {
      return {
        id: userByEmail.id,
        email: userByEmail.email,
        emailMismatch: false,
        lookupMethod: 'email',
      };
    }
  }

  console.warn(`⚠️ User not found: finotaur_user_id=${finotaurUserId}, email=${whopEmail}`);
  return null;
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
    
    const signature = req.headers.get("x-whop-signature") || 
                      req.headers.get("whop-signature") ||
                      req.headers.get("X-Whop-Signature");

    const skipVerification = Deno.env.get("SKIP_WEBHOOK_VERIFICATION") === "true";
    
    if (!skipVerification && !verifyWebhookSignature(rawBody, signature)) {
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

    // Extract finotaur_user_id early for logging
    const finotaurUserId = extractFinotaurUserId(payload.data);

    // 🔥 NEW: Detect if this is a newsletter event
    const isNewsletterEvent = isNewsletter(productId);

    console.log("📨 Webhook received:", {
      eventType,
      eventId,
      timestamp: payload.timestamp,
      finotaurUserId,
      whopEmail: payload.data.user?.email,
      productId,
      isNewsletter: isNewsletterEvent,  // 🔥 Log newsletter detection
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

    // Log webhook
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
        metadata: finotaurUserId ? { finotaur_user_id: finotaurUserId, is_newsletter: isNewsletterEvent } : { is_newsletter: isNewsletterEvent },
      })
      .select()
      .single();

    let result: { success: boolean; message: string };

    switch (eventType) {
      case "payment.succeeded":
        result = await handlePaymentSucceeded(supabase, payload, commissionConfig, finotaurUserId);
        break;

      case "membership.activated":
      case "membership.went_valid":
        result = await handleMembershipActivated(supabase, payload, finotaurUserId);
        break;

      case "membership.deactivated":
      case "membership.went_invalid":
      case "membership.canceled":
        result = await handleMembershipDeactivated(supabase, payload, finotaurUserId);
        break;

      case "payment.failed":
        result = { success: true, message: `Payment failure logged` };
        break;

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
// PAYMENT SUCCEEDED
// ============================================

async function handlePaymentSucceeded(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  commissionConfig: CommissionConfig,
  finotaurUserId: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    const data = payload.data as WhopPaymentData;
    
    const userEmail = data.user?.email;
    const whopUserId = data.user?.id;
    const productId = data.product?.id;
    const membershipId = data.membership?.id;
    const promoCode = extractPromoCode(data);
    
    let paymentAmount = data.subtotal || data.total || data.usd_total || 0;
    if (paymentAmount > 1000) {
      paymentAmount = paymentAmount / 100;
    }

    // 🔥 NEW: Check if this is a newsletter payment
    const isNewsletterPayment = isNewsletter(productId);

    console.log("💰 Processing payment.succeeded:", {
      finotaurUserId,
      email: userEmail,
      productId,
      membershipId,
      amount: paymentAmount,
      promoCode,
      billingReason: data.billing_reason,
      isNewsletter: isNewsletterPayment,  // 🔥 Log
    });

    if (!productId) {
      return { success: false, message: "No product ID in payment data" };
    }

    // 🔥 NEW: Handle newsletter payment separately
    if (isNewsletterPayment) {
      return await handleNewsletterPayment(supabase, {
        userEmail,
        whopUserId,
        membershipId,
        productId,
        paymentAmount,
        finotaurUserId,
      });
    }

    // ======= REGULAR JOURNAL SUBSCRIPTION FLOW =======

    const user = await findUser(supabase, finotaurUserId, userEmail);
    if (!user) {
      return { 
        success: false, 
        message: `User not found: finotaur_user_id=${finotaurUserId}, email=${userEmail}` 
      };
    }

    console.log("👤 User identified:", {
      userId: user.id,
      userEmail: user.email,
      lookupMethod: user.lookupMethod,
      emailMismatch: user.emailMismatch,
    });

    const planInfo = await getPlanInfo(supabase, productId);
    if (!planInfo) {
      return { success: false, message: `Unknown product: ${productId}` };
    }

    // Calculate dates
    const now = new Date();
    const subscriptionEndsAt = new Date(now);
    if (planInfo.interval === "monthly") {
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
    } else {
      subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
    }

    // Update profile for journal subscription
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        account_type: planInfo.plan,
        subscription_status: "active",
        subscription_interval: planInfo.interval,
        subscription_started_at: now.toISOString(),
        subscription_expires_at: subscriptionEndsAt.toISOString(),
        subscription_cancel_at_period_end: false,
        pending_downgrade_plan: null,
        cancellation_reason: null,
        whop_user_id: whopUserId,
        whop_membership_id: membershipId,
        whop_product_id: productId,
        whop_customer_email: userEmail,
        payment_provider: "whop",
        max_trades: planInfo.maxTrades,
        current_month_trades_count: 0,
        billing_cycle_start: now.toISOString().split('T')[0],
        ...(user.emailMismatch && {
          subscription_notes: `Email mismatch: Finotaur=${user.email}, Whop=${userEmail}`,
        }),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("❌ Failed to update profile:", updateError);
      return { success: false, message: `Failed to update profile: ${updateError.message}` };
    }

    console.log(`✅ Profile updated: ${user.email} → ${planInfo.plan} (${planInfo.interval})${user.emailMismatch ? ' [EMAIL MISMATCH]' : ''}`);

    // Process affiliate
    if (promoCode) {
      const isFirstPayment = data.billing_reason === "subscription_create";
      await processAffiliateFromPayment(supabase, commissionConfig, {
        promoCode,
        userId: user.id,
        userEmail: user.email,
        whopUserId,
        membershipId,
        productId,
        planInfo,
        paymentAmount,
        isFirstPayment,
      });
    }

    return { 
      success: true, 
      message: `Payment processed: ${planInfo.plan} (${planInfo.interval}) for ${user.email}${promoCode ? ` with promo ${promoCode}` : ''}${user.emailMismatch ? ' [EMAIL MISMATCH]' : ''}` 
    };

  } catch (error) {
    console.error("❌ handlePaymentSucceeded error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// 🔥 NEW: NEWSLETTER PAYMENT HANDLER
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
  params: NewsletterPaymentParams
): Promise<{ success: boolean; message: string }> {
  const { userEmail, whopUserId, membershipId, productId, paymentAmount, finotaurUserId } = params;

  console.log("📰 Processing NEWSLETTER payment:", {
    userEmail,
    finotaurUserId,
    membershipId,
    amount: paymentAmount,
  });

  try {
    // Call the newsletter-specific RPC function
const { data: result, error } = await supabase.rpc('handle_newsletter_payment', {
  p_user_email: userEmail || '',
  p_whop_user_id: whopUserId || '',
  p_whop_membership_id: membershipId || '',
  p_whop_product_id: productId || '',
  p_payment_amount: paymentAmount,
  p_finotaur_user_id: finotaurUserId || null,  // TEXT, explicitly null
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
// ============================================

async function handleMembershipActivated(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  finotaurUserId: string | null
): Promise<{ success: boolean; message: string }> {
  const data = payload.data as WhopMembershipData;
  const membershipId = data.id;
  const userEmail = data.user?.email;
  const whopUserId = data.user?.id;
  const productId = data.product?.id;

  // 🔥 NEW: Check if this is a newsletter activation
  const isNewsletterActivation = isNewsletter(productId);

  console.log("🎫 Processing membership.activated:", {
    membershipId,
    userEmail,
    productId,
    isNewsletter: isNewsletterActivation,
    finotaurUserId,
  });

  // 🔥 NEW: Handle newsletter activation (trial start)
  if (isNewsletterActivation) {
    return await handleNewsletterActivation(supabase, {
      userEmail,
      whopUserId,
      membershipId,
      productId,
      finotaurUserId,
    });
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
    const user = await findUser(supabase, finotaurUserId, userEmail);
    if (user) {
      console.log(`📝 Membership activated for user found by finotaur_user_id: ${user.email}`);
    }
  }

  return { success: true, message: `Membership activated event received for ${membershipId}` };
}

// ============================================
// 🔥 NEW: NEWSLETTER ACTIVATION HANDLER
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
  params: NewsletterActivationParams
): Promise<{ success: boolean; message: string }> {
  const { userEmail, whopUserId, membershipId, productId, finotaurUserId } = params;

  console.log("📰 Processing NEWSLETTER activation (trial start):", {
    userEmail,
    finotaurUserId,
    membershipId,
  });

  try {
    // Call the newsletter-specific RPC function
const { data: result, error } = await supabase.rpc('activate_newsletter_subscription', {
  p_user_email: userEmail || '',
  p_whop_user_id: whopUserId || '',
  p_whop_membership_id: membershipId || '',
  p_whop_product_id: productId || '',
  p_finotaur_user_id: finotaurUserId || null,  // TEXT, explicitly null
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
// MEMBERSHIP DEACTIVATED
// ============================================

async function handleMembershipDeactivated(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  finotaurUserId: string | null
): Promise<{ success: boolean; message: string }> {
  const data = payload.data as WhopMembershipData;
  const membershipId = data.id;
  const userEmail = data.user?.email;
  const productId = data.product?.id;

  // 🔥 NEW: Check if this is a newsletter deactivation
  const isNewsletterDeactivation = isNewsletter(productId);

  console.log("❌ Processing membership.deactivated:", {
    membershipId,
    userEmail,
    productId,
    isNewsletter: isNewsletterDeactivation,
    finotaurUserId,
  });

  // 🔥 NEW: Handle newsletter deactivation
  if (isNewsletterDeactivation) {
    return await handleNewsletterDeactivation(supabase, membershipId);
  }

  // ======= REGULAR JOURNAL SUBSCRIPTION FLOW =======

  // Try to find user by membership ID first
  let user: { id: string; email: string; pending_downgrade_plan?: string } | null = null;

  const { data: userByMembership } = await supabase
    .from("profiles")
    .select("id, email, pending_downgrade_plan")
    .eq("whop_membership_id", membershipId)
    .maybeSingle();

  if (userByMembership) {
    user = userByMembership;
  } else if (finotaurUserId || userEmail) {
    const foundUser = await findUser(supabase, finotaurUserId, userEmail);
    if (foundUser) {
      user = { id: foundUser.id, email: foundUser.email };
    }
  }

  if (!user) {
    return { 
      success: false, 
      message: `User not found for membership: ${membershipId}, finotaur_user_id: ${finotaurUserId}` 
    };
  }

  // Determine target plan (use pending_downgrade_plan if set, otherwise free)
  const targetPlan = user.pending_downgrade_plan || 'free';
  const newMaxTrades = targetPlan === 'basic' ? 25 : targetPlan === 'premium' ? 999999 : 10;

  // Downgrade user
  await supabase
    .from("profiles")
    .update({
      account_type: targetPlan,
      subscription_status: targetPlan === 'free' ? "cancelled" : "pending_resubscribe",
      subscription_cancel_at_period_end: false,
      pending_downgrade_plan: null,
      cancellation_reason: null,
      max_trades: newMaxTrades,
      // Clear Whop IDs only if going to free
      ...(targetPlan === 'free' && {
        whop_membership_id: null,
        whop_product_id: null,
      }),
    })
    .eq("id", user.id);

  // Update affiliate referral (only if going to free = churn)
  if (targetPlan === 'free') {
    await supabase
      .from("affiliate_referrals")
      .update({
        status: "churned",
        churned_at: new Date().toISOString(),
        subscription_cancelled_at: new Date().toISOString(),
      })
      .eq("referred_user_id", user.id);
  }

  console.log(`✅ Subscription deactivated: ${user.email} → ${targetPlan}`);
  return { success: true, message: `Subscription deactivated for ${user.email} → ${targetPlan}` };
}

// ============================================
// 🔥 NEW: NEWSLETTER DEACTIVATION HANDLER
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

    const userEmail = result?.email || 'unknown';
    const previousStatus = result?.previous_status || 'unknown';

    return { 
      success: true, 
      message: `Newsletter deactivated: ${userEmail} (was: ${previousStatus})` 
    };

  } catch (error) {
    console.error("❌ handleNewsletterDeactivation error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
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