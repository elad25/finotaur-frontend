// =====================================================
// FINOTAUR PRODUCT SUBSCRIPTION MANAGEMENT - v3.2.0
// =====================================================
// Edge Function for managing Newsletter & Top Secret subscriptions
// 
// Handles: Newsletter (War Zone) & Top Secret products
// Actions: cancel, reactivate, status
//
// 🔥 v3.2.0 CHANGES - PAUSE/RESUME FLOW:
// - CHANGED: Cancel now uses Whop PAUSE API instead of Cancel API
// - CHANGED: Reactivate now uses Whop RESUME API
// - WHY: Pause/Resume is fully reversible, Cancel is NOT reversible via API
// - User "cancels" → Whop pauses payment collection (payment_collection_paused = true)
// - User "reactivates" → Whop resumes payment collection (payment_collection_paused = false)
// - User keeps access while paused, but NO new charges until resumed
// - When billing period ends + still paused → membership goes invalid
// - Perfect sync between Finotaur DB and Whop state
//
// 🔥 v2.3.0 CHANGES:
// - FIXED: Trial/Free cancellation now sets cancel_at_period_end = true
// - User keeps access until trial_ends_at or expires_at
//
// Deployment:
// supabase functions deploy whop-manage-subscription
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cancelMembership as centralCancelMembership, uncancelMembership, resumeMembership as centralResumeMembership, getMembership } from "../_shared/whop-api.ts";

// ============================================
// CONFIGURATION
// ============================================

const WHOP_API_KEY = Deno.env.get("WHOP_API_KEY") || "";
const WHOP_API_URL = "https://api.whop.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Product types
type ProductType = "newsletter" | "top_secret" | "bundle";

// ============================================
// CORS HEADERS
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-auth",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

// ============================================
// TYPES
// ============================================

interface CancelRequest {
  action: "cancel";
  product: ProductType;
  reason?: string;
  cancelBothProducts?: boolean;
  confirmPriceIncrease?: boolean;
}

interface UpgradeCheckRequest {
  action: "check_upgrade";
  product: ProductType;  // 🔥 הוספה
  currentProduct: ProductType;
  targetProduct: ProductType;
  targetInterval: 'monthly' | 'yearly';
}

interface NoRefundConfirmation {
  currentPlan: string;
  currentPlanExpiresAt: string;
  daysRemaining: number;
  estimatedValue: number;
  newPlan: string;
  newPlanPrice: number;
  requiresConfirmation: boolean;
  blocked?: boolean;
  blockReason?: string;
}

interface ReactivateRequest {
  action: "reactivate";
  product: ProductType;
  reactivateBothProducts?: boolean;
}

interface StatusRequest {
  action: "status";
  product: ProductType;
}

interface CheckBundleRequest {
  action: "check_bundle";
  product: ProductType;
}

type RequestBody = CancelRequest | ReactivateRequest | StatusRequest | CheckBundleRequest | UpgradeCheckRequest;

interface WhopMembership {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  payment_collection_paused: boolean;  // 🔥 v3.2.0: New field for Pause/Resume flow
  renewal_period_end: string;
  product: { id: string; title: string };
  plan: { id: string };
}

// ============================================
// WHOP API HELPERS
// ============================================

async function cancelWhopMembership(
  membershipId: string,
  mode: "at_period_end" | "immediate" = "at_period_end"
): Promise<{ success: boolean; data?: WhopMembership; error?: string; skipWhop?: boolean }> {
  try {
    const result = await centralCancelMembership(membershipId, mode);
    
    if (!result.success) {
      // Handle graceful fallback cases
      if (result.status === 404 || result.status === 401) {
        console.warn(`⚠️ Whop API ${result.status} - continuing with DB-only update`);
        return { success: true, skipWhop: true };
      }
      if (result.status === 422) {
        console.warn(`⚠️ Membership already cancelled (422) - continuing with DB-only update`);
        return { success: true, skipWhop: true };
      }
      return { success: false, error: result.error };
    }
    
    console.log(`✅ Whop membership ${mode === 'immediate' ? 'cancelled immediately' : 'scheduled for cancellation'}:`, result.data);
    return { success: true, data: result.data as WhopMembership };

  } catch (error) {
    console.error(`❌ Cancel Whop membership error:`, error);
    console.warn(`⚠️ Whop API network error - continuing with DB-only update`);
    return { success: true, skipWhop: true };
  }
}

async function reactivateWhopMembership(
  membershipId: string
): Promise<{ success: boolean; data?: WhopMembership; error?: string; skipWhop?: boolean }> {
  try {
    console.log(`🔄 Reactivating Whop membership ${membershipId}`);

    // Step 1: Try UNCANCEL first (for memberships cancelled with at_period_end)
    console.log(`🔄 Step 1: Trying Uncancel API...`);
    const uncancelResult = await uncancelMembership(membershipId);
    
    if (uncancelResult.success && uncancelResult.status !== 422) {
      console.log(`✅ Whop Uncancel API succeeded`);
      return { success: true, skipWhop: false, data: uncancelResult.data as WhopMembership };
    }
    
    // Step 2: If Uncancel fails (422 = not scheduled for cancellation), try Resume
    if (uncancelResult.status === 422 || uncancelResult.status === 400) {
      console.log(`🔄 Step 2: Trying Resume API (for paused memberships)...`);
      const resumeResult = await centralResumeMembership(membershipId);
      
      if (resumeResult.success) {
        console.log(`✅ Whop Resume API succeeded`);
        return { success: true, skipWhop: false, data: resumeResult.data as WhopMembership };
      }
      
      console.error(`❌ Whop Resume API also failed: ${resumeResult.error}`);
    }
    
    // If both fail with auth/not-found, fallback to DB-only
    if (uncancelResult.status === 401 || uncancelResult.status === 404) {
      console.warn(`⚠️ Whop API auth/not found error - continuing with DB-only update`);
      return { success: true, skipWhop: true };
    }
      
    return { success: false, error: uncancelResult.error || `Whop API error` };

  } catch (error) {
    console.error(`❌ Reactivate Whop membership error:`, error);
    console.warn(`⚠️ Continuing with DB-only update`);
    return { success: true, skipWhop: true };
  }
}

async function getWhopMembership(
  membershipId: string
): Promise<{ success: boolean; data?: WhopMembership; error?: string }> {
  try {
    const result = await getMembership(membershipId);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data as WhopMembership };

  } catch (error) {
    console.error(`❌ Get Whop membership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// HELPER: Log subscription event
// ============================================

async function logSubscriptionEvent(
  supabase: any,
  eventData: {
    user_id: string;
    event_type: string;
    old_plan: string;
    new_plan: string;
    reason?: string;
    scheduled_at?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from("subscription_events")
      .insert(eventData);
    
    if (error) {
      console.warn("⚠️ Failed to log subscription event:", error.message);
    } else {
      console.log("📝 Subscription event logged:", eventData.event_type);
    }
  } catch (err) {
    console.warn("⚠️ Failed to log subscription event:", err);
  }
}

// ============================================
// HELPER: Get membership ID by product
// ============================================

function getMembershipId(profile: any, product: ProductType): string | null {
  switch (product) {
    case "newsletter":
      // 🔥 v4.2.0: If user has Bundle, use bundle_whop_membership_id for newsletter operations
      if (profile.bundle_enabled && profile.bundle_whop_membership_id && !profile.newsletter_whop_membership_id) {
        return profile.bundle_whop_membership_id;
      }
      return profile.newsletter_whop_membership_id;
    case "top_secret":
      // 🔥 v4.2.0: If user has Bundle, use bundle_whop_membership_id for top_secret operations
      if (profile.bundle_enabled && profile.bundle_whop_membership_id && !profile.top_secret_whop_membership_id) {
        return profile.bundle_whop_membership_id;
      }
      return profile.top_secret_whop_membership_id;
    case "bundle":
      return profile.bundle_whop_membership_id;
    default:
      return null;
  }
}

// ============================================
// HELPER: Get product status
// ============================================

function getProductStatus(profile: any, product: ProductType): {
  enabled: boolean;
  status: string;
  cancelAtPeriodEnd: boolean;
  expiresAt: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  isPaid: boolean;
} {
  switch (product) {
    case "newsletter":
      // 🔥 v4.2.0: If newsletter is via Bundle, inherit Bundle's trial/paid status
      const newsletterViaBundleOnly = profile.bundle_enabled && profile.bundle_whop_membership_id && !profile.newsletter_whop_membership_id;
      return {
        enabled: profile.newsletter_enabled ?? false,
        status: profile.newsletter_status ?? "inactive",
        cancelAtPeriodEnd: newsletterViaBundleOnly 
          ? (profile.bundle_cancel_at_period_end ?? false)
          : (profile.newsletter_cancel_at_period_end ?? false),
        expiresAt: newsletterViaBundleOnly 
          ? profile.bundle_expires_at 
          : profile.newsletter_expires_at,
        isTrial: newsletterViaBundleOnly
          ? (profile.bundle_is_in_trial ?? profile.bundle_status === "trial")
          : (profile.newsletter_status === "trial" || (profile.newsletter_enabled && !profile.newsletter_paid)),
        trialEndsAt: newsletterViaBundleOnly
          ? profile.bundle_trial_ends_at
          : profile.newsletter_trial_ends_at,
        isPaid: newsletterViaBundleOnly
          ? (profile.bundle_status === "active" && !profile.bundle_is_in_trial)
          : (profile.newsletter_paid ?? false),
      };
    case "top_secret":
      // 🔥 v4.2.0: If top_secret is via Bundle, inherit Bundle's trial/paid status
      const topSecretViaBundleOnly = profile.bundle_enabled && profile.bundle_whop_membership_id && !profile.top_secret_whop_membership_id;
      return {
        enabled: profile.top_secret_enabled ?? false,
        status: profile.top_secret_status ?? "inactive",
        cancelAtPeriodEnd: topSecretViaBundleOnly 
          ? (profile.bundle_cancel_at_period_end ?? false)
          : (profile.top_secret_cancel_at_period_end ?? false),
        expiresAt: topSecretViaBundleOnly 
          ? profile.bundle_expires_at 
          : profile.top_secret_expires_at,
        isTrial: topSecretViaBundleOnly
          ? (profile.bundle_is_in_trial ?? profile.bundle_status === "trial")
          : (profile.top_secret_is_in_trial ?? profile.top_secret_status === "trial"),
        trialEndsAt: topSecretViaBundleOnly
          ? profile.bundle_trial_ends_at
          : profile.top_secret_trial_ends_at,
        isPaid: topSecretViaBundleOnly
          ? (profile.bundle_status === "active" && !profile.bundle_is_in_trial)
          : (profile.top_secret_status === "active" && !profile.top_secret_is_in_trial),
      };
    case "bundle":
      return {
        enabled: profile.bundle_enabled ?? false,
        status: profile.bundle_status ?? "inactive",
        cancelAtPeriodEnd: profile.bundle_cancel_at_period_end ?? false,
        expiresAt: profile.bundle_expires_at,
        isTrial: profile.bundle_is_in_trial ?? profile.bundle_status === "trial",
        trialEndsAt: profile.bundle_trial_ends_at,
        isPaid: profile.bundle_status === "active" && !profile.bundle_is_in_trial,
      };
    default:
      return { 
        enabled: false, 
        status: "inactive", 
        cancelAtPeriodEnd: false, 
        expiresAt: null,
        isTrial: false,
        trialEndsAt: null,
        isPaid: false,
      };
  }
}

// ============================================
// HELPER: Get product display name
// ============================================

function getProductDisplayName(product: ProductType): string {
  switch (product) {
    case "newsletter":
      return "War Zone Newsletter";
    case "top_secret":
      return "Top Secret";
    case "bundle":
      return "War Zone + Top Secret Bundle";
    default:
      return product;
  }
}

// ============================================
// 🔥 NEW: Check if user has bundle (both products)
// ============================================

interface BundleStatus {
  hasBundle: boolean;
  newsletterActive: boolean;
  topSecretActive: boolean;
  bundleActive: boolean;
  otherProduct: ProductType | null;
  otherProductName: string | null;
  newsletterIsDiscounted: boolean;  // 🔥 v5.1.0: For bundle reactivation logic
  topSecretIsDiscounted: boolean;   // 🔥 v5.1.0: For bundle reactivation logic
}

function checkBundleStatus(profile: any, cancellingProduct: ProductType): BundleStatus {
  // 🔥 v5.0.0: Simplified - no more discounted prices logic
  // Products: War Zone, Top Secret, Bundle (each has monthly/yearly)
  
  const newsletterActive = profile.newsletter_enabled && 
    ['active', 'trial', 'trialing'].includes(profile.newsletter_status || '');
  const topSecretActive = profile.top_secret_enabled && 
    ['active', 'trial', 'trialing'].includes(profile.top_secret_status || '');
  const bundleActive = profile.bundle_enabled && 
    ['active', 'trial', 'trialing'].includes(profile.bundle_status || '');
  
  // hasBundle = user has Bundle product OR has both individual products
  const hasBundle = bundleActive || (newsletterActive && topSecretActive);
  
  const otherProduct = cancellingProduct === 'newsletter' ? 'top_secret' : 
                       cancellingProduct === 'top_secret' ? 'newsletter' : null;
  const otherProductName = cancellingProduct === 'newsletter' ? 'Top Secret' : 
                           cancellingProduct === 'top_secret' ? 'War Zone Newsletter' : null;
  
  console.log(`📊 Bundle Status Check:`, {
    cancellingProduct,
    hasBundle,
    bundleActive,
    newsletterActive,
    topSecretActive,
  });
  
  // 🔥 v5.1.0: Check if products are at discounted bundle prices
  const newsletterIsDiscounted = profile.newsletter_whop_plan_id === 'plan_BPJdT6Tyjmzcx';  // War Zone for Top Secret members $30
  const topSecretIsDiscounted = profile.top_secret_whop_plan_id === 'plan_7VQxCZ5Kpw6f0';   // Top Secret for War Zone members $50
  
  return {
    hasBundle,
    newsletterActive,
    topSecretActive,
    bundleActive,
    otherProduct: hasBundle ? otherProduct : null,
    otherProductName: hasBundle ? otherProductName : null,
    newsletterIsDiscounted,
    topSecretIsDiscounted,
  };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS preflight - MUST return 200 with proper headers
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      console.error("❌ Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`👤 User authenticated: ${user.email} (${user.id})`);

    // Get user's profile with all subscription fields
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id, email,
        newsletter_enabled, newsletter_status, newsletter_whop_membership_id,
        newsletter_expires_at, newsletter_cancel_at_period_end,
        newsletter_paid, newsletter_trial_ends_at, newsletter_started_at,
        newsletter_whop_plan_id, newsletter_interval,
        top_secret_enabled, top_secret_status, top_secret_whop_membership_id,
        top_secret_expires_at, top_secret_cancel_at_period_end, top_secret_interval,
        top_secret_started_at, top_secret_whop_plan_id, top_secret_is_in_trial,
        bundle_enabled, bundle_status, bundle_whop_membership_id,
        bundle_expires_at, bundle_cancel_at_period_end, bundle_interval,
        bundle_started_at, bundle_is_in_trial, bundle_trial_ends_at
      `)
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile error:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Profile loaded:`, {
      newsletter_status: profile.newsletter_status,
      newsletter_enabled: profile.newsletter_enabled,
      newsletter_paid: profile.newsletter_paid,
      newsletter_whop_membership_id: profile.newsletter_whop_membership_id,
    });

    // Parse request body
    const body: RequestBody = await req.json();
    const { product } = body;

    if (!product || !["newsletter", "top_secret", "bundle"].includes(product)) {
      return new Response(
        JSON.stringify({ error: "Invalid product. Must be 'newsletter', 'top_secret', or 'bundle'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📨 Request:`, { action: body.action, product, userId: user.id });

    // Route to appropriate handler
    switch (body.action) {
      case "status":
        return handleStatus(profile, product, corsHeaders);

      // 🔥 NEW: Check bundle status before cancellation
      case "check_bundle":
        return handleCheckBundle(profile, product, corsHeaders);

      case "cancel":
        return handleCancel(
          supabase, 
          profile, 
          product, 
          (body as CancelRequest).reason, 
          (body as CancelRequest).cancelBothProducts,
          (body as CancelRequest).confirmPriceIncrease,
          corsHeaders
        );

      case "reactivate":
        return handleReactivate(
          supabase, 
          profile, 
          product, 
          corsHeaders,
          (body as ReactivateRequest).reactivateBothProducts
        );

      case "check_upgrade":
        return handleCheckUpgrade(
          profile,
          (body as UpgradeCheckRequest).currentProduct,
          (body as UpgradeCheckRequest).targetProduct,
          (body as UpgradeCheckRequest).targetInterval,
          corsHeaders
        );

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Must be 'cancel', 'reactivate', 'status', or 'check_upgrade'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("❌ Handler error:", error);
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
// STATUS HANDLER
// ============================================

async function handleStatus(
  profile: any,
  product: ProductType,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const status = getProductStatus(profile, product);
  const membershipId = getMembershipId(profile, product);

  const response = {
    success: true,
    product,
    subscription: {
      ...status,
      hasMembership: !!membershipId,
    },
  };

  // If has Whop membership AND is paid, get live status from Whop API
  if (membershipId && status.isPaid && WHOP_API_KEY) {
    const whopResult = await getWhopMembership(membershipId);
    if (whopResult.success && whopResult.data) {
      response.subscription.cancelAtPeriodEnd = whopResult.data.cancel_at_period_end;
      response.subscription.status = whopResult.data.status === "active" ? "active" : whopResult.data.status;
    }
  }

  return new Response(
    JSON.stringify(response),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// 🔥 NEW: CHECK BUNDLE HANDLER
// Returns bundle status so frontend can show appropriate popup
// 🔥 v4.0.0: Simplified - when cancelling full price, BOTH get cancelled (no keep at full price option)
// ============================================

async function handleCheckBundle(
  profile: any,
  product: ProductType,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // 🔥 v5.0.0: Simplified - no discounted prices, just check if user has Bundle
  const bundleStatus = checkBundleStatus(profile, product);
  
  console.log(`📤 check_bundle response:`, {
    hasBundle: bundleStatus.hasBundle,
    bundleActive: bundleStatus.bundleActive,
    product,
  });
  
  return new Response(
    JSON.stringify({
      success: true,
      hasBundle: bundleStatus.hasBundle,
      bundleActive: bundleStatus.bundleActive,
      otherProduct: bundleStatus.otherProduct,
      otherProductName: bundleStatus.otherProductName,
      bundleDetails: {
        newsletterActive: bundleStatus.newsletterActive,
        topSecretActive: bundleStatus.topSecretActive,
        bundleActive: bundleStatus.bundleActive,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// 🔥 NEW: CHECK UPGRADE HANDLER
// Returns upgrade eligibility and No Refund confirmation requirements
// ============================================

async function handleCheckUpgrade(
  profile: any,
  currentProduct: ProductType,
  targetProduct: ProductType,
  targetInterval: 'monthly' | 'yearly',
  corsHeaders: Record<string, string>
): Promise<Response> {
  
  // Get current subscription info
  const currentStatus = getProductStatus(profile, currentProduct);
  const currentInterval = profile[`${currentProduct}_interval`] || 'monthly';
  
  // RULE: Yearly → Monthly is BLOCKED (Downgrade)
  if (currentInterval === 'yearly' && targetInterval === 'monthly') {
    return new Response(
      JSON.stringify({
        success: true,
        allowed: false,
        blocked: true,
        blockReason: "לא ניתן לעבור ממנוי שנתי לחודשי. אפשרויות: המתן לסיום המנוי השנתי או שדרג לתוכנית שנתית אחרת.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // RULE: Yearly → Yearly requires No Refund confirmation
  if (currentInterval === 'yearly' && targetInterval === 'yearly' && currentStatus.expiresAt) {
    const expiresAt = new Date(currentStatus.expiresAt);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate estimated value based on product
    const yearlyPrices: Record<string, number> = {
      newsletter: 699,
      top_secret: 899,
      bundle: 1090,
    };
    
    const currentYearlyPrice = yearlyPrices[currentProduct] || 699;
    const estimatedValue = Math.round((daysRemaining / 365) * currentYearlyPrice);
    
    const targetPrices: Record<string, Record<string, number>> = {
      bundle: { yearly: 1090 },
      newsletter: { yearly: 699 },
      top_secret: { yearly: 899 },
    };
    
    const newPlanPrice = targetPrices[targetProduct]?.[targetInterval] || 0;
    
    const noRefundInfo: NoRefundConfirmation = {
      currentPlan: `${getProductDisplayName(currentProduct)} Yearly`,
      currentPlanExpiresAt: currentStatus.expiresAt,
      daysRemaining,
      estimatedValue,
      newPlan: `${getProductDisplayName(targetProduct)} Yearly`,
      newPlanPrice,
      requiresConfirmation: true,
    };
    
    return new Response(
      JSON.stringify({
        success: true,
        allowed: true,
        requiresNoRefundConfirmation: true,
        noRefundInfo,
        message: `⚠️ שים לב: יש לך מנוי שנתי פעיל עד ${expiresAt.toLocaleDateString('he-IL')}. מעבר עכשיו לא יזכה אותך על התקופה שנותרה.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Monthly → anything is allowed without confirmation
  return new Response(
    JSON.stringify({
      success: true,
      allowed: true,
      requiresNoRefundConfirmation: false,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// CANCEL HANDLER - v2.4.0 with Bundle Support
// ============================================

async function handleCancel(
  supabase: any,
  profile: any,
  product: ProductType,
  reason: string | undefined,
  cancelBothProducts: boolean | undefined,
  confirmPriceIncrease: boolean | undefined,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // 🔥 v5.0.0: Simplified - no discounted prices logic
  // Products: War Zone, Top Secret, Bundle (each can be cancelled independently)
  // Cancel = PAUSE (reversible with RESUME)
  
  const bundleStatus = checkBundleStatus(profile, product);
  const membershipId = getMembershipId(profile, product);
  const productStatus = getProductStatus(profile, product);
  const productName = getProductDisplayName(product);

  // 🔥 v4.2.0: Enhanced logging for debugging Bundle-related cancellations
  const isViaBundleOnly = profile.bundle_enabled && 
                           profile.bundle_whop_membership_id && 
                           ((product === 'newsletter' && !profile.newsletter_whop_membership_id) ||
                            (product === 'top_secret' && !profile.top_secret_whop_membership_id));
  
  console.log(`🔄 Cancel request for ${product}:`, {
    membershipId,
    status: productStatus.status,
    enabled: productStatus.enabled,
    isTrial: productStatus.isTrial,
    isPaid: productStatus.isPaid,
    cancelAtPeriodEnd: productStatus.cancelAtPeriodEnd,
    trialEndsAt: productStatus.trialEndsAt,
    expiresAt: productStatus.expiresAt,
    isViaBundleOnly,
    bundleEnabled: profile.bundle_enabled,
    bundleMembershipId: profile.bundle_whop_membership_id,
  });

  // Validate: must be active or trial
  if (!productStatus.enabled && productStatus.status !== 'active' && productStatus.status !== 'trial') {
    return new Response(
      JSON.stringify({ error: `No active ${productName} subscription to cancel` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if already pending cancellation
  if (productStatus.cancelAtPeriodEnd) {
    return new Response(
      JSON.stringify({ 
        error: `${productName} subscription is already scheduled for cancellation`,
        expiresAt: productStatus.expiresAt || productStatus.trialEndsAt
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // 🔥 v2.4.0 FIX: TRIAL OR FREE = Schedule cancellation at period end
  // AND also cancel via Whop API if membership exists!
  // ============================================
  
  if (productStatus.isTrial || !productStatus.isPaid) {
    console.log(`📝 Scheduling FREE/TRIAL cancellation at period end (isTrial: ${productStatus.isTrial}, isPaid: ${productStatus.isPaid})`);

    // 🔥 v2.4.0: Even trial users have Whop memberships - cancel them too!
    if (membershipId && WHOP_API_KEY) {
      console.log(`🔄 Also canceling trial via Whop API (membership: ${membershipId})`);
      const cancelResult = await cancelWhopMembership(membershipId, "at_period_end");
      if (cancelResult.success) {
        console.log(`✅ Whop membership cancelled at period end`);
      } else {
        console.warn(`⚠️ Whop cancel failed: ${cancelResult.error} - continuing with DB update`);
      }
    }

    // Determine when access ends
    const accessEndsAt = productStatus.trialEndsAt || productStatus.expiresAt || null;

    let updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // 🔥 v4.2.0: Check if this product is via Bundle
    const newsletterViaBundleOnly = product === "newsletter" && profile.bundle_enabled && profile.bundle_whop_membership_id && !profile.newsletter_whop_membership_id;
    const topSecretViaBundleOnly = product === "top_secret" && profile.bundle_enabled && profile.bundle_whop_membership_id && !profile.top_secret_whop_membership_id;

    if (product === "newsletter") {
      updateData = {
        ...updateData,
        // 🔥 KEY CHANGE: Keep enabled=true, status=trial/active, just mark for cancellation
        newsletter_cancel_at_period_end: true,
        // 🔥 v4.2.0: If via Bundle, also mark Bundle for cancellation
        ...(newsletterViaBundleOnly && { bundle_cancel_at_period_end: true }),
      };
    } else if (product === "top_secret") {
      updateData = {
        ...updateData,
        // 🔥 KEY CHANGE: Keep enabled=true, status stays as-is, just mark for cancellation
        top_secret_cancel_at_period_end: true,
        // 🔥 v4.2.0: If via Bundle, also mark Bundle for cancellation
        ...(topSecretViaBundleOnly && { bundle_cancel_at_period_end: true }),
      };
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (updateError) {
      console.error("❌ Profile update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to cancel subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the event
    await logSubscriptionEvent(supabase, {
      user_id: profile.id,
      event_type: "cancel_scheduled",
      old_plan: `${product}_${productStatus.isTrial ? 'trial' : 'free'}`,
      new_plan: "none",
      reason: reason || "User requested cancellation",
      scheduled_at: accessEndsAt || undefined,
      metadata: {
        product_type: product,
        cancelled_at: new Date().toISOString(),
        was_trial: productStatus.isTrial,
        was_paid: productStatus.isPaid,
        access_until: accessEndsAt,
        cancellation_type: "at_period_end",
      },
    });

    // Format the access end date for user message
    const accessEndsFormatted = accessEndsAt 
      ? new Date(accessEndsAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric'
        })
      : 'the end of your trial period';

    console.log(`✅ Trial/Free subscription scheduled for cancellation, access until: ${accessEndsFormatted}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Your ${productName} ${productStatus.isTrial ? 'free trial' : 'subscription'} has been scheduled for cancellation. You'll continue to have access until ${accessEndsFormatted}.`,
        subscription: {
          product,
          status: productStatus.status, // Keep current status (trial/active)
          cancelAtPeriodEnd: true,
          expiresAt: accessEndsAt,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // CASE 2: PAID SUBSCRIPTION - Cancel via Whop
  // ============================================

  if (!membershipId) {
    console.error(`❌ No Whop membership ID found for paid subscription`);
    return new Response(
      JSON.stringify({ error: `No Whop membership found for ${productName}. Please contact support.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`🔄 Canceling PAID subscription via Whop API (membership: ${membershipId})`);

  const cancelResult = await cancelWhopMembership(membershipId, "at_period_end");

  if (!cancelResult.success) {
    // If Whop returns 404, it means the membership doesn't exist
    // In this case, just mark for cancellation in DB
    if (cancelResult.error?.includes("404")) {
      console.warn(`⚠️ Whop membership ${membershipId} not found (404). Marking for cancellation in DB only.`);
      
      let updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (product === "newsletter") {
        updateData = {
          ...updateData,
          newsletter_cancel_at_period_end: true,
        };
      } else if (product === "top_secret") {
        updateData = {
          ...updateData,
          top_secret_cancel_at_period_end: true,
        };
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile.id);

      if (updateError) {
        console.error("❌ Profile update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to cancel subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await logSubscriptionEvent(supabase, {
        user_id: profile.id,
        event_type: "cancel_scheduled_orphan",
        old_plan: product,
        new_plan: "none",
        reason: reason || "User cancelled - Whop membership not found",
        scheduled_at: productStatus.expiresAt || undefined,
        metadata: {
          product_type: product,
          cancelled_at: new Date().toISOString(),
          orphan_membership_id: membershipId,
        },
      });

      const expiresDate = productStatus.expiresAt 
        ? new Date(productStatus.expiresAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
          })
        : 'the end of your billing period';

console.log(`✅ Subscription scheduled for cancellation`);

    // 🔥 v5.0.0: Simplified - each product cancelled independently
    // No bundle-related actions needed
    let bundleAction: string | null = null;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Your ${productName} subscription has been scheduled for cancellation. You'll continue to have access until ${expiresDate}.`,
        subscription: {
          product,
          status: productStatus.status,
          cancelAtPeriodEnd: true,
          expiresAt: productStatus.expiresAt,
        },
        bundleAction,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    }

    // Other Whop errors - return the error
    return new Response(
      JSON.stringify({ error: cancelResult.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // STEP 2: Update profile in DB
  // ============================================

  let updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (product === "newsletter") {
    updateData.newsletter_cancel_at_period_end = true;
  } else if (product === "top_secret") {
    updateData.top_secret_cancel_at_period_end = true;
  } else if (product === "bundle") {
    updateData.bundle_cancel_at_period_end = true;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", profile.id);

  if (updateError) {
    console.error("❌ Profile update error:", updateError);
    // Don't fail - Whop was already updated successfully
  }

  // ============================================
  // STEP 3: Log subscription event
  // ============================================

  await logSubscriptionEvent(supabase, {
    user_id: profile.id,
    event_type: "cancel_scheduled",
    old_plan: product,
    new_plan: "none",
    reason: reason || "User requested cancellation",
    scheduled_at: productStatus.expiresAt || undefined,
    metadata: {
      whop_membership_id: membershipId,
      product_type: product,
      cancelled_at: new Date().toISOString(),
    },
  });

  // 🔥 v5.1.0: Bundle → Single product transition logic
  let bundleAction: string | null = null;
  let resumeOldSubscription = false;
  
  // If cancelling Bundle, check if user has paused individual subscriptions to resume
  if (product === 'bundle') {
    const hasOldNewsletterPaused = profile.newsletter_paused_for_bundle && profile.newsletter_whop_membership_id;
    const hasOldTopSecretPaused = profile.top_secret_paused_for_bundle && profile.top_secret_whop_membership_id;
    
    if (hasOldNewsletterPaused || hasOldTopSecretPaused) {
      bundleAction = 'will_resume_paused_subscriptions';
      
      // Resume paused subscriptions when bundle period ends
      // This will be handled by membership.deactivated webhook
      console.log(`📌 Bundle cancelled - will resume paused subscriptions at period end:`, {
        newsletter: hasOldNewsletterPaused ? profile.newsletter_whop_membership_id : null,
        topSecret: hasOldTopSecretPaused ? profile.top_secret_whop_membership_id : null,
      });
    } else {
      bundleAction = 'no_previous_subscriptions';
      console.log(`📌 Bundle cancelled - user has no previous subscriptions to resume`);
    }
  }

  // ============================================
  // STEP 4: Return success response
  // ============================================

  const expiresDate = productStatus.expiresAt 
    ? new Date(productStatus.expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })
    : 'the end of your billing period';

  console.log(`✅ Paid subscription cancelled successfully, expires: ${expiresDate}`);

  // 🔥 v2.6.0: Build appropriate message based on bundle action
  let successMessage = `Your ${productName} subscription has been cancelled. You'll continue to have access until ${expiresDate}.`;
  
  if (bundleAction === "discounted_product_auto_cancelled") {
    const otherProductName = bundleStatus.otherProductName;
    successMessage += ` Your ${otherProductName} subscription (purchased at the discounted bundle price) has also been cancelled. You'll receive an email with a link to resubscribe at the regular price if you wish to continue.`;
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: successMessage,
      subscription: {
        product,
        status: productStatus.status,
        cancelAtPeriodEnd: true,
        expiresAt: productStatus.expiresAt,
      },
      bundleAction,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// REACTIVATE HANDLER - v2.2.0 with FREE/TRIAL support
// ============================================

async function handleReactivate(
  supabase: any,
  profile: any,
  product: ProductType,
  corsHeaders: Record<string, string>,
  reactivateBothProducts?: boolean  // 🔥 v2.7.0: Optional flag to restore bundle
): Promise<Response> {
  const membershipId = getMembershipId(profile, product);
  const productStatus = getProductStatus(profile, product);
  const productName = getProductDisplayName(product);

  console.log(`🔄 Reactivate request for ${product}:`, {
    membershipId,
    status: productStatus.status,
    enabled: productStatus.enabled,
    isPaid: productStatus.isPaid,
    cancelAtPeriodEnd: productStatus.cancelAtPeriodEnd,
    reactivateBothProducts,
  });

  // ============================================
  // 🔥 v2.7.0: BUNDLE REACTIVATION LOGIC
  // ============================================
  
  const bundleStatus = checkBundleStatus(profile, product);
  
  // Check if THIS product is the DISCOUNTED one
  const thisProductIsDiscounted = 
    (product === 'newsletter' && bundleStatus.newsletterIsDiscounted) ||
    (product === 'top_secret' && bundleStatus.topSecretIsDiscounted);
  
  // Check if the OTHER product is also pending cancellation
  const otherProduct = product === 'newsletter' ? 'top_secret' : 'newsletter';
  const otherProductCancelAtPeriodEnd = otherProduct === 'newsletter' 
    ? profile.newsletter_cancel_at_period_end 
    : profile.top_secret_cancel_at_period_end;
  
  // 🔥 SCENARIO: User tries to reactivate DISCOUNTED product while FULL PRICE is still cancelling
  if (thisProductIsDiscounted && otherProductCancelAtPeriodEnd && !reactivateBothProducts) {
    console.log(`⚠️ User trying to reactivate DISCOUNTED ${product} but ${otherProduct} is still cancelling`);
    
    // Return special response asking user to choose
    const otherProductName = otherProduct === 'newsletter' ? 'War Zone Newsletter' : 'Top Secret';
    const discountedPrice = product === 'newsletter' ? 30 : 50;
    const fullPrice = product === 'newsletter' ? 69.99 : 89.99;
    const bundleTotalPrice = product === 'newsletter' 
      ? 69.99 + 50  // War Zone full + Top Secret discounted
      : 89.99 + 30; // Top Secret full + War Zone discounted
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "bundle_reactivate_choice_required",
        message: `Your ${productName} was purchased at the discounted bundle price. The ${otherProductName} is also being cancelled.`,
        bundleChoice: {
          canRestoreBundle: true,
          discountedProduct: product,
          discountedProductName: productName,
          discountedPrice: discountedPrice,
          fullPriceProduct: otherProduct,
          fullPriceProductName: otherProductName,
          fullPrice: fullPrice,
          bundleTotalPrice: bundleTotalPrice,
          options: [
            {
              action: "restore_bundle",
              label: `Restore both subscriptions (Bundle: $${bundleTotalPrice.toFixed(2)}/month)`,
              description: `Keep your bundle discount - ${otherProductName} at full price + ${productName} at discounted price`,
            },
            {
              action: "resubscribe_full_price",
              label: `Subscribe to ${productName} only at $${fullPrice}/month`,
              description: `Get a new subscription at the regular price`,
              requiresNewCheckout: true,
            },
          ],
        },
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // 🔥 SCENARIO: User chose to restore BOTH products (bundle)
  if (reactivateBothProducts && otherProductCancelAtPeriodEnd) {
    console.log(`🔄 Restoring BUNDLE - reactivating both ${product} and ${otherProduct}`);
    
    // Reactivate the OTHER product first
    const otherMembershipId = otherProduct === 'newsletter' 
      ? profile.newsletter_whop_membership_id 
      : profile.top_secret_whop_membership_id;
    
    if (otherMembershipId && WHOP_API_KEY) {
      console.log(`🔄 Reactivating ${otherProduct} via Whop API (membership: ${otherMembershipId})`);
      const otherReactivateResult = await reactivateWhopMembership(otherMembershipId);
      if (otherReactivateResult.success) {
        console.log(`✅ ${otherProduct} Whop membership reactivated`);
      } else {
        console.warn(`⚠️ Failed to reactivate ${otherProduct} in Whop: ${otherReactivateResult.error}`);
      }
    }
    
    // Update DB for the other product
    const otherUpdateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (otherProduct === 'newsletter') {
      otherUpdateData.newsletter_cancel_at_period_end = false;
      otherUpdateData.newsletter_pending_price_change = false;
      otherUpdateData.newsletter_new_price = null;
    } else {
      otherUpdateData.top_secret_cancel_at_period_end = false;
      otherUpdateData.top_secret_pending_price_change = false;
      otherUpdateData.top_secret_new_price = null;
    }
    
    await supabase.from("profiles").update(otherUpdateData).eq("id", profile.id);
    
    // Log the bundle restoration
    await logSubscriptionEvent(supabase, {
      user_id: profile.id,
      event_type: "bundle_restored",
      old_plan: "bundle_cancelling",
      new_plan: "bundle_active",
      reason: "User chose to restore both products",
      metadata: {
        initiated_from: product,
        also_reactivated: otherProduct,
        bundle_restored: true,
      },
    });
    
    console.log(`✅ ${otherProduct} reactivated as part of bundle restoration`);
    // Continue to reactivate the main product below...
  }
  
  // 🔥 SCENARIO: User reactivates FULL PRICE product - also reactivate discounted one
  const otherProductIsDiscounted = 
    (otherProduct === 'newsletter' && profile.newsletter_whop_plan_id === 'plan_BPJdT6Tyjmzcx') ||
    (otherProduct === 'top_secret' && profile.top_secret_whop_plan_id === 'plan_7VQxCZ5Kpw6f0');
  
  if (!thisProductIsDiscounted && otherProductIsDiscounted && otherProductCancelAtPeriodEnd) {
    console.log(`🔥 Reactivating FULL PRICE ${product} - also reactivating DISCOUNTED ${otherProduct} to preserve bundle`);
    
    const otherMembershipId = otherProduct === 'newsletter' 
      ? profile.newsletter_whop_membership_id 
      : profile.top_secret_whop_membership_id;
    
    if (otherMembershipId && WHOP_API_KEY) {
      console.log(`🔄 Reactivating ${otherProduct} via Whop API (membership: ${otherMembershipId})`);
      const otherReactivateResult = await reactivateWhopMembership(otherMembershipId);
      if (otherReactivateResult.success) {
        console.log(`✅ ${otherProduct} Whop membership reactivated`);
      } else {
        console.warn(`⚠️ Failed to reactivate ${otherProduct} in Whop: ${otherReactivateResult.error}`);
      }
    }
    
    // Update DB for the other product
    const otherUpdateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (otherProduct === 'newsletter') {
      otherUpdateData.newsletter_cancel_at_period_end = false;
      otherUpdateData.newsletter_pending_price_change = false;
      otherUpdateData.newsletter_new_price = null;
    } else {
      otherUpdateData.top_secret_cancel_at_period_end = false;
      otherUpdateData.top_secret_pending_price_change = false;
      otherUpdateData.top_secret_new_price = null;
    }
    
    await supabase.from("profiles").update(otherUpdateData).eq("id", profile.id);
    
    // Log the automatic bundle restoration
    await logSubscriptionEvent(supabase, {
      user_id: profile.id,
      event_type: "bundle_auto_restored",
      old_plan: "bundle_cancelling",
      new_plan: "bundle_active",
      reason: "Full price product reactivated - discounted product automatically restored",
      metadata: {
        reactivated_product: product,
        auto_reactivated: otherProduct,
        was_discounted: true,
      },
    });
    
    console.log(`✅ Bundle automatically restored - ${otherProduct} also reactivated`);
  }

  // ============================================
  // 🔥 v2.2.0 NEW: Handle reactivation of CANCELLED FREE/TRIAL subscriptions
  // These users can reactivate without going through checkout again
  // ============================================
  
  if (productStatus.status === 'cancelled') {
    // Check if this was a free/trial subscription (not paid)
    // For newsletter: check newsletter_paid flag
    // For top_secret: it's always paid, so this path won't be used
    
    const wasPaidSubscription = product === "newsletter" 
      ? profile.newsletter_paid === true 
      : true; // Top Secret is always paid
    
    if (!wasPaidSubscription) {
      console.log(`📝 Reactivating cancelled FREE/TRIAL subscription directly in DB`);

      let updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (product === "newsletter") {
        updateData = {
          ...updateData,
          newsletter_enabled: true,
          newsletter_status: "trial", // Restore to trial status
          newsletter_cancel_at_period_end: false,
          newsletter_unsubscribed_at: null,
          // If they didn't have a start date, set one now
          newsletter_started_at: profile.newsletter_started_at || new Date().toISOString(),
        };
      } else if (product === "top_secret") {
        // Top Secret doesn't have free tier, but handle just in case
        updateData = {
          ...updateData,
          top_secret_enabled: true,
          top_secret_status: "trial",
          top_secret_cancel_at_period_end: false,
          top_secret_unsubscribed_at: null,
          top_secret_started_at: profile.top_secret_started_at || new Date().toISOString(),
        };
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile.id);

      if (updateError) {
        console.error("❌ Profile update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to reactivate subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log the event
      await logSubscriptionEvent(supabase, {
        user_id: profile.id,
        event_type: "free_reactivated",
        old_plan: "cancelled",
        new_plan: `${product}_trial`,
        metadata: {
          product_type: product,
          reactivated_at: new Date().toISOString(),
          was_paid: false,
        },
      });

      console.log(`✅ Free/Trial subscription reactivated successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Your ${productName} subscription has been reactivated! Welcome back.`,
          subscription: {
            product,
            status: "trial",
            cancelAtPeriodEnd: false,
            expiresAt: null,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // If it was a paid subscription that's now cancelled, they need to resubscribe
    console.log(`ℹ️ Cancelled PAID subscription - user needs to resubscribe`);
    return new Response(
      JSON.stringify({ 
        error: `Your ${productName} subscription has been cancelled. Please subscribe again to restore access.`,
        requiresResubscribe: true,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // CASE 2: Handle pending cancellation (cancel_at_period_end = true)
  // ============================================
  
  if (!productStatus.cancelAtPeriodEnd) {
    return new Response(
      JSON.stringify({ error: `No pending cancellation to undo for ${productName}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // 🔥 v2.4.0: Handle trial/free reactivation (undo pending cancellation)
  // Also calls Whop API if membership exists!
  // ============================================

  if (productStatus.isTrial || !productStatus.isPaid) {
    console.log(`📝 Undoing trial/free cancellation (isTrial: ${productStatus.isTrial}, isPaid: ${productStatus.isPaid})`);
    
    // 🔥 v2.4.0: Even trial users have Whop memberships - reactivate them too!
    if (membershipId && WHOP_API_KEY) {
      console.log(`🔄 Also reactivating trial via Whop API (membership: ${membershipId})`);
      const reactivateResult = await reactivateWhopMembership(membershipId);
      if (reactivateResult.success) {
        if (reactivateResult.skipWhop) {
          console.log(`✅ DB will be updated (Whop API skipped - user can uncancel manually at Whop)`);
        } else {
          console.log(`✅ Whop membership reactivated`);
        }
      } else {
        console.warn(`⚠️ Whop reactivate failed: ${reactivateResult.error} - continuing with DB update`);
      }
    }

    let updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (product === "newsletter") {
      updateData.newsletter_cancel_at_period_end = false;
    } else if (product === "top_secret") {
      updateData.top_secret_cancel_at_period_end = false;
    } else if (product === "bundle") {
      updateData.bundle_cancel_at_period_end = false;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (updateError) {
      console.error("❌ Profile update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to reactivate subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await logSubscriptionEvent(supabase, {
      user_id: profile.id,
      event_type: "reactivated",
      old_plan: "cancelling",
      new_plan: `${product}_trial`,
      metadata: {
        product_type: product,
        reactivated_at: new Date().toISOString(),
        was_trial: true,
        whop_membership_id: membershipId || null,
      },
    });

    console.log(`✅ Trial/Free subscription reactivated successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Your ${productName} subscription has been reactivated!`,
        subscription: {
          product,
          status: productStatus.status,
          cancelAtPeriodEnd: false,
          expiresAt: productStatus.expiresAt || productStatus.trialEndsAt,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // CASE 3: PAID subscription with pending cancellation - Reactivate via Whop
  // ============================================

  // 🔥 v2.5.0: Get the effective membership ID for this product
  // membershipId is already set correctly by getMembershipId() at the start of this function
  const effectiveMembershipId = membershipId;
  
  console.log(`📋 Reactivate PAID - Debug info:`, {
    product,
    effectiveMembershipId,
    profile_top_secret_whop_membership_id: profile.top_secret_whop_membership_id,
    profile_newsletter_whop_membership_id: profile.newsletter_whop_membership_id,
    WHOP_API_KEY_EXISTS: !!WHOP_API_KEY,
  });

  if (!effectiveMembershipId) {
    // No Whop membership but has pending cancellation - just update DB
    console.log(`📝 No Whop membership ID found, reactivating in DB only`);
    
    let updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (product === "newsletter") {
      updateData.newsletter_cancel_at_period_end = false;
    } else if (product === "top_secret") {
      updateData.top_secret_cancel_at_period_end = false;
    } else if (product === "bundle") {
      updateData.bundle_cancel_at_period_end = false;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (updateError) {
      console.error("❌ Profile update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to reactivate subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await logSubscriptionEvent(supabase, {
      user_id: profile.id,
      event_type: "reactivated_db_only",
      old_plan: "cancelling",
      new_plan: product,
      metadata: {
        product_type: product,
        reactivated_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Your ${productName} subscription has been reactivated!`,
        subscription: {
          product,
          status: productStatus.status,
          cancelAtPeriodEnd: false,
          expiresAt: productStatus.expiresAt,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // STEP 1: Reactivate via Whop API
  // ============================================

  console.log(`🔄 Reactivating via Whop API (membership: ${effectiveMembershipId})`);

  const reactivateResult = await reactivateWhopMembership(effectiveMembershipId!);

  // 🔥 v2.6.0: If Whop was skipped (API key issue or auth error), just update DB
  if (reactivateResult.skipWhop) {
    console.log(`📝 Whop API skipped - updating DB only`);
  } else if (!reactivateResult.success) {
    // If Whop returns 404, just update DB
    if (reactivateResult.error?.includes("404")) {
      console.warn(`⚠️ Whop membership ${membershipId} not found. Reactivating in DB only.`);
      
      let updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (product === "newsletter") {
        updateData.newsletter_cancel_at_period_end = false;
      } else if (product === "top_secret") {
        updateData.top_secret_cancel_at_period_end = false;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile.id);

      if (updateError) {
        console.error("❌ Profile update error:", updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Your ${productName} subscription has been reactivated!`,
          subscription: {
            product,
            status: productStatus.status,
            cancelAtPeriodEnd: false,
            expiresAt: productStatus.expiresAt,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: reactivateResult.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // STEP 2: Update profile in DB
  // ============================================

  let updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (product === "newsletter") {
    updateData.newsletter_cancel_at_period_end = false;
  } else if (product === "top_secret") {
    updateData.top_secret_cancel_at_period_end = false;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", profile.id);

  if (updateError) {
    console.error("❌ Profile update error:", updateError);
    // Don't fail - Whop was already updated successfully
  }

  // ============================================
  // STEP 3: Log subscription event
  // ============================================

  await logSubscriptionEvent(supabase, {
    user_id: profile.id,
    event_type: "reactivated",
    old_plan: "cancelling",
    new_plan: product,
    metadata: {
      whop_membership_id: membershipId,
      product_type: product,
      reactivated_at: new Date().toISOString(),
    },
  });

  // ============================================
  // STEP 4: Return success response
  // ============================================

  console.log(`✅ Subscription reactivated successfully`);

  // 🔥 v2.7.0: Check if bundle was restored
  const otherProductWasAlsoReactivated = 
    (reactivateBothProducts && otherProductCancelAtPeriodEnd) ||
    (!thisProductIsDiscounted && otherProductIsDiscounted && otherProductCancelAtPeriodEnd);
  
  let successMessage = `Your ${productName} subscription has been reactivated!`;
  
  if (otherProductWasAlsoReactivated) {
    const otherProductName = otherProduct === 'newsletter' ? 'War Zone Newsletter' : 'Top Secret';
    successMessage = `Great news! Your bundle has been restored. Both ${productName} and ${otherProductName} subscriptions are now active.`;
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: successMessage,
      subscription: {
        product,
        status: "active",
        cancelAtPeriodEnd: false,
        expiresAt: productStatus.expiresAt,
      },
      bundleRestored: otherProductWasAlsoReactivated,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}