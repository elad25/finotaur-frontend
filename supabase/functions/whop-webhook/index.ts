// =====================================================
// FINOTAUR WHOP WEBHOOK HANDLER - v3.12.0
// =====================================================
// 
// 🔥 v3.12.0 - BUNDLE BREAK: CANCEL + RESUBSCRIBE FLOW
// 
// Changes from v3.11.0:
// - REMOVED: Whop API change_plan (not supported by Whop)
// - NEW: When bundle breaks, BOTH products are cancelled at period end
// - NEW: When discounted product deactivates, send email with checkout link
// - Newsletter: User gets email to resubscribe at $69.99 (plan_U6lF2eO5y9469)
// - Top Secret: User gets email to resubscribe at $89.99 (plan_tUvQbCrEQ4197)
// - Uses Whop checkout session API to create new subscription link
// - Sends billing email via Resend
// 
// v3.6.0 - AUTO-CANCEL WAR ZONE WITH TOP SECRET
// - Added prod_u7QrZi90xiCZA to NEWSLETTER_PRODUCT_IDS (Top Secret member discount)
// - When Top Secret is deactivated, automatically cancel War Zone subscription
// - Cancel at period end (user keeps access until billing period ends)
// - Added cancelWarZoneForTopSecretMember() helper function
// - Added WHOP_API_KEY environment variable usage for Whop API calls
// 
// Deploy: supabase functions deploy whop-webhook
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

// ============================================
// CONFIGURATION
// ============================================

const WHOP_WEBHOOK_SECRET = Deno.env.get("WHOP_WEBHOOK_SECRET") || "";
const WHOP_API_KEY = Deno.env.get("WHOP_API_KEY") || Deno.env.get("WHOP_BEARER_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 🔥 v3.9.0: Newsletter Product IDs - Synced with whop-config.ts v4.4.0
const NEWSLETTER_PRODUCT_IDS = new Set([
  'prod_qlaV5Uu6LZlYn',  // War Zone Intelligence - Monthly ($69.99/month)
  'prod_8b3VWkZdena4B',  // War Zone Intelligence - Yearly ($699/year)
  'prod_u7QrZi90xiCZA',  // War Zone Intelligence - Monthly for Top Secret Members ($30/month)
]);

// 🔥 Top Secret Product IDs - Synced with whop-config.ts v4.4.0
const TOP_SECRET_PRODUCT_IDS = new Set([
  'prod_nl6YXbLp4t5pz',  // Top Secret (regular: monthly $89.99, yearly $899)
  'prod_e8Er36RubeFXU',  // Top Secret For War Zone Members ($50/month)
]);

// 🔥 v3.10.0: Top Secret Plan IDs - For identifying specific plans
const TOP_SECRET_PLAN_IDS = new Set([
  'plan_tUvQbCrEQ4197',  // Top Secret Monthly ($89.99)
  'plan_PxxbBlSdkyeo7',  // Top Secret Yearly ($899)
  'plan_7VQxCZ5Kpw6f0',  // Top Secret for War Zone Members ($50)
]);

// 🔥 v3.9.0: Newsletter Plan IDs - Synced with whop-config.ts v4.4.0
const NEWSLETTER_PLAN_IDS = new Set([
  'plan_U6lF2eO5y9469',  // War Zone Monthly ($69.99)
  'plan_bp2QTGuwfpj0A',  // War Zone Yearly ($699)
  'plan_BPJdT6Tyjmzcx',  // War Zone Monthly - Top Secret Member discount ($30)
]);

// ============================================
// HELPER: Get billing interval from plan ID
// ============================================

// 🔥 v3.7.0: All Plan IDs - Synced with whop-config.ts v4.4.0
const YEARLY_PLAN_IDS = new Set([
  'plan_bp2QTGuwfpj0A',  // War Zone Yearly ($699/year)
  'plan_PxxbBlSdkyeo7',  // Top Secret Yearly ($899/year)
]);

// 🔥 v3.8.0: Cross-product discount Plan IDs
const CROSS_DISCOUNT_PLAN_IDS = {
  // War Zone for Top Secret members
  'plan_BPJdT6Tyjmzcx': { product: 'newsletter', discount_for: 'top_secret_member', price: 30 },
  // Top Secret for War Zone members
  'plan_7VQxCZ5Kpw6f0': { product: 'top_secret', discount_for: 'warzone_member', price: 50 },
};

// 🔥 v3.9.0: All Plan IDs - Synced with whop-config.ts v4.4.0
const NEWSLETTER_PLAN_IDS_MAP = {
  monthly: 'plan_U6lF2eO5y9469',           // War Zone Monthly $69.99
  yearly: 'plan_bp2QTGuwfpj0A',            // War Zone Yearly $699
  top_secret_discount: 'plan_BPJdT6Tyjmzcx',  // War Zone for Top Secret members $30
};

const TOP_SECRET_PLAN_IDS_MAP = {
  monthly: 'plan_tUvQbCrEQ4197',       // Top Secret Monthly $89.99
  yearly: 'plan_PxxbBlSdkyeo7',        // Top Secret Yearly $899
  warzone_discount: 'plan_7VQxCZ5Kpw6f0',  // Top Secret for War Zone members $50
};

function getBillingInterval(planId: string): 'monthly' | 'yearly' {
  return YEARLY_PLAN_IDS.has(planId) ? 'yearly' : 'monthly';
}

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
      isNewsletter: dbPlan.finotaur_plan === 'newsletter',
      isTopSecret: dbPlan.finotaur_plan === 'top_secret',
    };
  }

  const fallbackMapping: Record<string, PlanInfo> = {
    "prod_ZaDN418HLst3r": { plan: "basic", interval: "monthly", price: 19.99, maxTrades: 25, isNewsletter: false, isTopSecret: false },
    "prod_bPwSoYGedsbyh": { plan: "basic", interval: "yearly", price: 149.00, maxTrades: 25, isNewsletter: false, isTopSecret: false },
    "prod_Kq2pmLT1JyGsU": { plan: "premium", interval: "monthly", price: 39.99, maxTrades: 999999, isNewsletter: false, isTopSecret: false },
    "prod_vON7zlda6iuII": { plan: "premium", interval: "yearly", price: 299.00, maxTrades: 999999, isNewsletter: false, isTopSecret: false },
    // Newsletter fallback - Synced with WHOP_CONFIG v4.4.0
    "prod_qlaV5Uu6LZlYn": { plan: "newsletter", interval: "monthly", price: 69.99, maxTrades: 0, isNewsletter: true, isTopSecret: false },
    "prod_8b3VWkZdena4B": { plan: "newsletter", interval: "yearly", price: 699.00, maxTrades: 0, isNewsletter: true, isTopSecret: false },
    "prod_u7QrZi90xiCZA": { plan: "newsletter", interval: "monthly", price: 30.00, maxTrades: 0, isNewsletter: true, isTopSecret: false },
    // Top Secret fallback
    "prod_nl6YXbLp4t5pz": { plan: "top_secret", interval: "monthly", price: 89.99, maxTrades: 0, isNewsletter: false, isTopSecret: true },
    "prod_e8Er36RubeFXU": { plan: "top_secret", interval: "monthly", price: 50.00, maxTrades: 0, isNewsletter: false, isTopSecret: true },  // 🔥 Top Secret For War Zone
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

// 🔥 PRIORITY 7: If only ONE pending checkout in last hour, use it
  const { data: recentCheckouts } = await supabase
    .from("pending_checkouts")
    .select("user_id, user_email")
    .eq("product_type", productType)
    .is("completed_at", null)
    .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false });

  if (recentCheckouts?.length === 1) {
    console.log("✅ Found SINGLE recent checkout, assuming match");
    return {
      id: recentCheckouts[0].user_id,
      email: recentCheckouts[0].user_email,
      emailMismatch: true,
      lookupMethod: 'pending_checkout_single_recent',
    };
  }

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

    if (!WHOP_API_KEY) {
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

// 🔥 v3.8.0: Call Whop API to cancel at period end (correct endpoint)
    const whopResponse = await fetch(`https://api.whop.com/api/v5/memberships/${warZoneMembershipId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancellation_mode: "at_period_end",  // 🔥 Cancel at period end, not immediately
      }),
    });

    if (!whopResponse.ok) {
      const errorText = await whopResponse.text();
      console.error("❌ Whop API error:", whopResponse.status, errorText);
      
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
        message: `Whop API error: ${whopResponse.status} - DB updated`, 
        warZoneCancelled: true 
      };
    }

    const whopData = await whopResponse.json();
    console.log("✅ Whop API response:", whopData);

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

    // Extract metadata early for logging
    const finotaurUserId = extractFinotaurUserId(payload.data);
    const finotaurEmail = extractFinotaurEmail(payload.data);  // 🔥 v3.5.0

    // 🔥 Detect if this is a newsletter/top secret event
    const isNewsletterEvent = isNewsletter(productId);
    const isTopSecretEvent = isTopSecret(productId);

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
      case "payment.succeeded":
        result = await handlePaymentSucceeded(supabase, payload, commissionConfig, finotaurUserId, finotaurEmail, clickId);
        break;
        
      case "membership.activated":
      case "membership.went_valid":
        result = await handleMembershipActivated(supabase, payload, finotaurUserId, finotaurEmail);
        break;

      case "membership.deactivated":
      case "membership.went_invalid":
      case "membership.canceled":
        result = await handleMembershipDeactivated(supabase, payload, finotaurUserId);
        break;

      case "membership.cancel_at_period_end_changed":
        result = await handleCancelAtPeriodEndChanged(supabase, payload, finotaurUserId, finotaurEmail);
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
              
              try {
                console.log("🔑 WHOP_API_KEY exists:", !!WHOP_API_KEY, "length:", WHOP_API_KEY?.length || 0);
                
                const cancelResponse = await fetch(
                  `https://api.whop.com/api/v5/memberships/${currentProfile.newsletter_whop_membership_id}/cancel`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${WHOP_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ cancellation_mode: "immediately" }),
                  }
                );
                
                const responseText = await cancelResponse.text();
                console.log("📝 Cancel response status:", cancelResponse.status, "body:", responseText);
                
                if (cancelResponse.ok) {
                  console.log("✅ Old monthly membership cancelled successfully");
                } else {
                  console.warn("⚠️ Failed to cancel old membership:", cancelResponse.status, responseText);
                }
              } catch (cancelError) {
                console.error("❌ Error cancelling old membership:", cancelError);
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
      
      // 🔥 v3.12.0: Bundle price change is now handled via membership deactivation
      // When bundle breaks, the discounted product is cancelled at period end
      // and user receives email with checkout link to resubscribe at full price
      // See handleMembershipDeactivated() for the implementation

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
      
      // 🔥 v3.12.0: Bundle price change is now handled via membership deactivation
      // When bundle breaks, the discounted product is cancelled at period end
      // and user receives email with checkout link to resubscribe at full price
      // See handleMembershipDeactivated() for the implementation
      
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
              
              try {
                console.log("🔑 WHOP_API_KEY exists:", !!WHOP_API_KEY, "length:", WHOP_API_KEY?.length || 0);
                
                const cancelResponse = await fetch(
                  `https://api.whop.com/api/v5/memberships/${currentProfile.top_secret_whop_membership_id}/cancel`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${WHOP_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ cancellation_mode: "immediately" }),
                  }
                );
                
                const responseText = await cancelResponse.text();
                console.log("📝 Cancel response status:", cancelResponse.status, "body:", responseText);
                
                if (cancelResponse.ok) {
                  console.log("✅ Old monthly membership cancelled successfully");
                } else {
                  console.warn("⚠️ Failed to cancel old membership:", cancelResponse.status, responseText);
                }
              } catch (cancelError) {
                console.error("❌ Error cancelling old membership:", cancelError);
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
        return { 
          success: result?.success ?? true, 
          message: `Top Secret payment: ${userEmail} → ${result?.interval || 'monthly'}` 
        };
      }
    }

    // ═══════════════════════════════════════════════
    // 🔥 JOURNAL SUBSCRIPTION - Use RPC!
    // ═══════════════════════════════════════════════

    if (isFirstPayment) {
      // FIRST PAYMENT - Call activate_whop_subscription RPC
      console.log("🆕 Calling activate_whop_subscription RPC (first payment)...");
      
      const { data: result, error } = await supabase.rpc('activate_whop_subscription', {
        p_user_email: userEmail,  // 🔥 v3.5.0: Uses finotaurEmail if available
        p_whop_user_id: whopUserId,
        p_whop_membership_id: membershipId,
        p_whop_product_id: productId,
        p_finotaur_user_id: finotaurUserId || null,
        p_affiliate_code: promoCode || null,
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
        p_promo_code: promoCode || null,
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

  // 🔥 Handle Top Secret activation
  if (isTopSecretActivation) {
    return await handleTopSecretActivation(supabase, {
      userEmail,  // 🔥 v3.5.0: Uses finotaurEmail if available
      whopUserId: whopUserId || '',
      membershipId,
      productId: productId || '',
      finotaurUserId,
    }, payload);  // 🔥 v3.14.0: Pass payload for plan ID extraction
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
// 🔥 v3.12.0: BUNDLE RESUBSCRIBE HELPERS
// ============================================

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

// Full price plan IDs
const FULL_PRICE_PLANS = {
  newsletter: 'plan_U6lF2eO5y9469',  // War Zone Monthly $69.99
  top_secret: 'plan_tUvQbCrEQ4197',  // Top Secret Monthly $89.99
};

// Discounted plan IDs (bundle pricing)
const DISCOUNTED_PLANS = {
  newsletter: 'plan_BPJdT6Tyjmzcx',  // War Zone for Top Secret members $30
  top_secret: 'plan_7VQxCZ5Kpw6f0',  // Top Secret for War Zone members $50
};

/**
 * Create Whop checkout session for resubscription at full price
 */
async function createResubscribeCheckoutLink(
  planId: string,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
  try {
    console.log(`🔗 Creating checkout link for plan ${planId}, user ${userEmail}`);
    
    if (!WHOP_API_KEY) {
      console.error("❌ WHOP_API_KEY not configured");
      return { success: false, error: "WHOP_API_KEY not configured" };
    }

    const response = await fetch("https://api.whop.com/api/v2/checkout_sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        metadata: {
          finotaur_user_id: userId,
          finotaur_email: userEmail,
          resubscribe_reason: "bundle_price_change",
        },
        redirect_url: `https://www.finotaur.com/app/settings?tab=billing&resubscribe=success`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Whop checkout API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Whop API error: ${response.status}` };
    }

    const data = await response.json();
    let checkoutUrl = data.purchase_url;
    
    // Add email prefill
    if (checkoutUrl && userEmail) {
      const urlObj = new URL(checkoutUrl);
      urlObj.searchParams.set('email', userEmail);
      checkoutUrl = urlObj.toString();
    }

    console.log(`✅ Checkout link created: ${checkoutUrl}`);
    return { success: true, checkoutUrl };

  } catch (error) {
    console.error("❌ Error creating checkout link:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Send billing email with checkout link for resubscription
 */
async function sendBillingEmail(
  userEmail: string,
  userName: string | null,
  productName: string,
  oldPrice: number,
  newPrice: number,
  checkoutUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📧 Sending billing email to ${userEmail} for ${productName}`);
    
    if (!RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY not configured");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const displayName = userName || userEmail.split('@')[0];
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Action Required: Your ${productName} Subscription</title>
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #333333; border-radius: 16px; overflow: hidden;">
    
    <!-- Header with Logo -->
    <tr>
      <td style="padding: 40px 40px 20px 40px; text-align: center;">
        <a href="https://www.finotaur.com" target="_blank" style="text-decoration: none;">
          <img src="https://www.finotaur.com/logo.png" alt="Finotaur" style="max-width: 160px; height: auto;" />
        </a>
      </td>
    </tr>
    
    <!-- Title -->
    <tr>
      <td style="padding: 0 40px 10px 40px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #C9A646; letter-spacing: 0.5px;">
          Action Required
        </h1>
      </td>
    </tr>
    
    <!-- Subtitle -->
    <tr>
      <td style="padding: 0 40px 30px 40px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #888888;">
          Your ${productName} Subscription
        </p>
      </td>
    </tr>
    
    <!-- Gold Divider -->
    <tr>
      <td style="padding: 0 40px;">
        <div style="height: 1px; background: linear-gradient(to right, transparent, #C9A646, transparent);"></div>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px 40px;">
        
        <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: #ffffff;">
          Hello ${displayName},
        </p>
        
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.7; color: #cccccc;">
          Your bundle discount has ended because the other product in your bundle was cancelled.
        </p>
        
        <!-- Price Change Box -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-bottom: 25px;">
          <tr>
            <td style="background-color: rgba(201, 166, 70, 0.08); border-left: 3px solid #C9A646; border-radius: 0 8px 8px 0; padding: 20px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #888888;">
                Previous bundle price:
              </p>
              <p style="margin: 0 0 15px 0; font-size: 20px; font-weight: 600; color: #666666; text-decoration: line-through;">
                $${oldPrice.toFixed(2)}/month
              </p>
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #888888;">
                New standalone price:
              </p>
              <p style="margin: 0; font-size: 24px; font-weight: 600; color: #C9A646;">
                $${newPrice.toFixed(2)}/month
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.7; color: #cccccc;">
          To continue your <strong style="color: #ffffff;">${productName}</strong> access, please resubscribe using the button below:
        </p>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-bottom: 25px;">
          <tr>
            <td align="center">
              <a href="${checkoutUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; background-color: #C9A646; color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                Resubscribe Now
              </a>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 20px 0; font-size: 13px; color: #666666; text-align: center;">
          If you don't resubscribe, your ${productName} access will end.
        </p>
        
        <!-- Divider -->
        <div style="height: 1px; background-color: #333333; margin: 25px 0;"></div>
        
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #666666;">
          If you have any questions, please contact us at <a href="mailto:support@finotaur.com" style="color: #C9A646;">support@finotaur.com</a>
        </p>
        
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 25px 40px; border-top: 1px solid #222222; text-align: center;">
        <p style="margin: 0 0 5px 0; font-size: 13px; color: #888888;">
          <span style="color: #C9A646; font-weight: 600;">FINOTAUR</span> | Institutional Grade Research
        </p>
        <p style="margin: 0; font-size: 11px; color: #555555;">
          © ${new Date().getFullYear()} Finotaur. All rights reserved.
        </p>
      </td>
    </tr>
    
  </table>
  
</body>
</html>
    `.trim();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Finotaur Billing <billing@finotaur.com>",
        to: [userEmail],
        reply_to: "support@finotaur.com",
        subject: `Action Required: Your ${productName} Subscription`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Resend API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Resend API error: ${response.status}` };
    }

    const result = await response.json();
    console.log(`✅ Billing email sent to ${userEmail}, ID: ${result.id}`);
    return { success: true };

  } catch (error) {
    console.error("❌ Error sending billing email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Handle bundle break: send checkout link email to user
 */
async function handleBundleBreakResubscribe(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  userName: string | null,
  deactivatedProduct: 'newsletter' | 'top_secret'
): Promise<{ success: boolean; message: string }> {
  try {
    // Determine which product needs resubscribe (the OTHER product)
    const productToResubscribe = deactivatedProduct === 'newsletter' ? 'top_secret' : 'newsletter';
    
    console.log(`🔄 Checking if ${productToResubscribe} needs resubscribe after ${deactivatedProduct} deactivation`);
    
    // Check if the other product has pending resubscribe flag
    const pendingField = productToResubscribe === 'newsletter' 
      ? 'newsletter_pending_price_change' 
      : 'top_secret_pending_price_change';
    const planIdField = productToResubscribe === 'newsletter'
      ? 'newsletter_whop_plan_id'
      : 'top_secret_whop_plan_id';
    
    const { data: profile } = await supabase
      .from('profiles')
      .select(`${pendingField}, ${planIdField}, display_name`)
      .eq('id', userId)
      .single();
    
    if (!profile) {
      console.log(`⚠️ Profile not found for user ${userId}`);
      return { success: false, message: "Profile not found" };
    }
    
    const hasPendingChange = profile[pendingField];
    const currentPlanId = profile[planIdField];
    const discountedPlanId = DISCOUNTED_PLANS[productToResubscribe];
    
    // Check if this product was on discounted plan AND has pending change
    if (!hasPendingChange) {
      console.log(`ℹ️ No pending price change for ${productToResubscribe}`);
      return { success: true, message: "No pending price change" };
    }
    
    if (currentPlanId !== discountedPlanId) {
      console.log(`ℹ️ ${productToResubscribe} is not on discounted plan (current: ${currentPlanId})`);
      // Clear the flag since it's not on discounted plan
      await supabase
        .from('profiles')
        .update({
          [pendingField]: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      return { success: true, message: "Not on discounted plan" };
    }
    
    console.log(`🔥 Bundle break confirmed - ${productToResubscribe} needs to resubscribe at full price`);
    
    // Get full price plan
    const fullPricePlanId = FULL_PRICE_PLANS[productToResubscribe];
    const productName = productToResubscribe === 'newsletter' ? 'War Zone Newsletter' : 'Top Secret';
    const oldPrice = productToResubscribe === 'newsletter' ? 30 : 50;
    const newPrice = productToResubscribe === 'newsletter' ? 69.99 : 89.99;
    
    // Step 1: Create checkout link
    const checkoutResult = await createResubscribeCheckoutLink(fullPricePlanId, userId, userEmail);
    
    if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
      console.error(`❌ Failed to create checkout link: ${checkoutResult.error}`);
      return { success: false, message: checkoutResult.error || "Failed to create checkout link" };
    }
    
    // Step 2: Send email
    const emailResult = await sendBillingEmail(
      userEmail,
      userName || profile.display_name,
      productName,
      oldPrice,
      newPrice,
      checkoutResult.checkoutUrl
    );
    
    if (!emailResult.success) {
      console.error(`❌ Failed to send billing email: ${emailResult.error}`);
      // Continue anyway - log the checkout link
    }
    
    // Step 3: Update DB - clear pending flag and store checkout info
    await supabase
      .from('profiles')
      .update({
        [pendingField]: false,
        [`${productToResubscribe === 'newsletter' ? 'newsletter' : 'top_secret'}_new_price`]: null,
        [`${productToResubscribe === 'newsletter' ? 'newsletter' : 'top_secret'}_resubscribe_checkout_url`]: checkoutResult.checkoutUrl,
        [`${productToResubscribe === 'newsletter' ? 'newsletter' : 'top_secret'}_resubscribe_sent_at`]: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    
    // Step 4: Log the event
    await supabase
      .from('whop_webhook_log')
      .insert({
        event_id: `bundle_resubscribe_${userId}_${Date.now()}`,
        event_type: "bundle_break_resubscribe_email_sent",
        whop_user_id: null,
        whop_membership_id: null,
        whop_product_id: null,
        payload: {
          user_id: userId,
          user_email: userEmail,
          deactivated_product: deactivatedProduct,
          resubscribe_product: productToResubscribe,
          old_price: oldPrice,
          new_price: newPrice,
          checkout_url: checkoutResult.checkoutUrl,
          email_sent: emailResult.success,
        },
        processed: true,
        processing_result: `Resubscribe email ${emailResult.success ? 'sent' : 'failed'} for ${productName}`,
        metadata: {
          triggered_by: "bundle_break",
          checkout_plan_id: fullPricePlanId,
        },
      });
    
    console.log(`✅ Bundle break handled: ${productName} resubscribe email ${emailResult.success ? 'sent' : 'logged'}`);
    
    return { 
      success: true, 
      message: `Resubscribe email ${emailResult.success ? 'sent' : 'failed (checkout link logged)'} for ${productName}` 
    };
    
  } catch (error) {
    console.error("❌ Error handling bundle break resubscribe:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
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

    // 🔥 v3.12.0: Check if Top Secret needs resubscribe email (bundle break)
    let resubscribeMessage = '';
    if (result?.user_id) {
      const resubscribeResult = await handleBundleBreakResubscribe(
        supabase,
        result.user_id,
        result.email || userEmail,
        null,
        'newsletter'  // Newsletter was deactivated, check if Top Secret needs resubscribe
      );
      
      if (resubscribeResult.success && resubscribeResult.message.includes('email')) {
        resubscribeMessage = ` | Top Secret resubscribe email sent`;
      }
    }

    return { 
      success: result?.success ?? true, 
      message: `Newsletter deactivated: ${result?.email || userEmail}${resubscribeMessage}` 
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

    // 🔥 v3.12.0: Check if Newsletter needs resubscribe email (bundle break)
    let resubscribeMessage = '';
    if (result?.user_id) {
      const resubscribeResult = await handleBundleBreakResubscribe(
        supabase,
        result.user_id,
        result.email || userEmail,
        null,
        'top_secret'  // Top Secret was deactivated, check if Newsletter needs resubscribe
      );
      
      if (resubscribeResult.success && resubscribeResult.message.includes('email')) {
        resubscribeMessage = ` | Newsletter resubscribe email sent`;
      }
    }

    return { 
      success: result?.success ?? true, 
      message: `Top Secret deactivated: ${result?.email || userEmail}${warZoneMessage}${resubscribeMessage}` 
    };
  }

  // ═══════════════════════════════════════════════
  // 🔥 JOURNAL SUBSCRIPTION - Use RPC!
  // ═══════════════════════════════════════════════

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
  await supabase.from("subscription_events").insert({
    user_id: profile.id,
    event_type: cancelAtPeriodEnd ? "subscription_scheduled_cancel_whop" : "subscription_reactivated_whop",
    old_plan: isNewsletterProduct ? profile.newsletter_status : profile.top_secret_status,
    new_plan: isNewsletterProduct ? profile.newsletter_status : profile.top_secret_status,
    metadata: {
      whop_membership_id: membershipId,
      product_id: productId,
      plan_id: planId,
      cancel_at_period_end: cancelAtPeriodEnd,
      source: "whop_webhook_cancel_at_period_end_changed"
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