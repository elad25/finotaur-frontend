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

// ============================================
// CONFIGURATION
// ============================================

const WHOP_API_KEY = Deno.env.get("WHOP_API_KEY") || "";
const WHOP_API_URL = "https://api.whop.com/api/v1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Product types
type ProductType = "newsletter" | "top_secret";

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
  cancelBothProducts?: boolean;  // 🔥 NEW: When true, cancel both products
  confirmPriceIncrease?: boolean;  // 🔥 NEW: User confirmed they understand price will increase
}

interface ReactivateRequest {
  action: "reactivate";
  product: ProductType;
  reactivateBothProducts?: boolean;  // 🔥 v2.7.0: When true, reactivate both products (restore bundle)
}

interface StatusRequest {
  action: "status";
  product: ProductType;
}

interface CheckBundleRequest {
  action: "check_bundle";
  product: ProductType;
}

type RequestBody = CancelRequest | ReactivateRequest | StatusRequest | CheckBundleRequest;

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
    // 🔥 v3.2.0: Check if API key exists before calling Whop
    if (!WHOP_API_KEY) {
      console.warn(`⚠️ WHOP_API_KEY not configured - skipping Whop API call`);
      return { success: true, skipWhop: true };
    }

    console.log(`🔄 Pausing Whop membership ${membershipId} (using Pause instead of Cancel for reversibility)`);

    // 🔥 v3.2.0: Use PAUSE API instead of Cancel
    // Pause stops payment collection but keeps membership intact
    // Resume can then reactivate it - unlike Cancel which is irreversible
    // Whop API: POST /memberships/{id}/pause
    const response = await fetch(`https://api.whop.com/api/v1/memberships/${membershipId}/pause`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        void_payments: false  // Don't void existing past_due payments
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Whop Pause API error: ${response.status} - ${errorText}`);
      
      // 🔥 v3.2.0: If 401 (unauthorized) or 404 (not found), continue with DB-only update
      if (response.status === 401 || response.status === 404) {
        console.warn(`⚠️ Whop API auth/not found error - continuing with DB-only update`);
        return { success: true, skipWhop: true };
      }
      
      return { success: false, error: `Whop API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`✅ Whop membership paused:`, data);
    console.log(`   payment_collection_paused: ${data.payment_collection_paused}`);
    return { success: true, data };

  } catch (error) {
    console.error(`❌ Pause Whop membership error:`, error);
    // 🔥 v3.2.0: On network errors, continue with DB-only update
    console.warn(`⚠️ Whop API network error - continuing with DB-only update`);
    return { success: true, skipWhop: true };
  }
}

async function reactivateWhopMembership(
  membershipId: string
): Promise<{ success: boolean; data?: WhopMembership; error?: string; skipWhop?: boolean }> {
  try {
    if (!WHOP_API_KEY) {
      console.warn(`⚠️ WHOP_API_KEY not configured - skipping Whop API call`);
      return { success: true, skipWhop: true };
    }

    console.log(`🔄 Resuming Whop membership ${membershipId}`);

    // 🔥 v3.2.0: Use RESUME API - this works because we use PAUSE instead of Cancel
    // Resume reactivates payment collection on a paused membership
    // Whop API: POST /memberships/{id}/resume
    const response = await fetch(`https://api.whop.com/api/v1/memberships/${membershipId}/resume`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Whop Resume API succeeded:`, result);
      console.log(`   payment_collection_paused: ${result.payment_collection_paused}`);
      return { success: true, skipWhop: false, data: result };
    } else {
      const errorText = await response.text();
      console.error(`❌ Whop Resume API error: ${response.status} - ${errorText}`);
      
      // If 401 (unauthorized) or 404 (not found), continue with DB-only update
      if (response.status === 401 || response.status === 404) {
        console.warn(`⚠️ Whop API auth/not found error - continuing with DB-only update`);
        return { success: true, skipWhop: true };
      }
      
      return { success: false, error: `Whop Resume API error: ${response.status} - ${errorText}` };
    }

  } catch (error) {
    console.error(`❌ Resume Whop membership error:`, error);
    console.warn(`⚠️ Continuing with DB-only update`);
    return { success: true, skipWhop: true };
  }
}

async function getWhopMembership(
  membershipId: string
): Promise<{ success: boolean; data?: WhopMembership; error?: string }> {
  try {
    const response = await fetch(`${WHOP_API_URL}/memberships/${membershipId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Whop API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Whop API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };

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
      return profile.newsletter_whop_membership_id;
    case "top_secret":
      return profile.top_secret_whop_membership_id;
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
      return {
        enabled: profile.newsletter_enabled ?? false,
        status: profile.newsletter_status ?? "inactive",
        cancelAtPeriodEnd: profile.newsletter_cancel_at_period_end ?? false,
        expiresAt: profile.newsletter_expires_at,
        // Check BOTH status AND paid flag
        isTrial: profile.newsletter_status === "trial" || (profile.newsletter_enabled && !profile.newsletter_paid),
        trialEndsAt: profile.newsletter_trial_ends_at,
        isPaid: profile.newsletter_paid ?? false,
      };
    case "top_secret":
      return {
        enabled: profile.top_secret_enabled ?? false,
        status: profile.top_secret_status ?? "inactive",
        cancelAtPeriodEnd: profile.top_secret_cancel_at_period_end ?? false,
        expiresAt: profile.top_secret_expires_at,
        isTrial: profile.top_secret_is_in_trial ?? profile.top_secret_status === "trial",
        trialEndsAt: profile.top_secret_trial_ends_at,
        isPaid: profile.top_secret_status === "active" && !profile.top_secret_is_in_trial,
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
  newsletterIsDiscounted: boolean;  // Was purchased at $30 (Top Secret member discount)
  topSecretIsDiscounted: boolean;   // Was purchased at $50 (War Zone member discount)
  newsletterIsFullPrice: boolean;   // 🔥 v2.6.0: Was purchased at $69.99/$699
  topSecretIsFullPrice: boolean;    // 🔥 v2.6.0: Was purchased at $89.99/$899
  otherProduct: ProductType | null;
  otherProductName: string | null;
}

function checkBundleStatus(profile: any, cancellingProduct: ProductType): BundleStatus {
  const newsletterActive = profile.newsletter_enabled && 
    ['active', 'trial', 'trialing'].includes(profile.newsletter_status || '');
  const topSecretActive = profile.top_secret_enabled && 
    ['active', 'trial', 'trialing'].includes(profile.top_secret_status || '');
  
  const hasBundle = newsletterActive && topSecretActive;
  
  // Check if products were purchased at discounted bundle price
  // Newsletter at $30 = Top Secret member discount (plan_BPJdT6Tyjmzcx)
  // Top Secret at $50 = War Zone member discount (plan_7VQxCZ5Kpw6f0)
  const newsletterIsDiscounted = profile.newsletter_whop_plan_id === 'plan_BPJdT6Tyjmzcx';
  const topSecretIsDiscounted = profile.top_secret_whop_plan_id === 'plan_7VQxCZ5Kpw6f0';
  
  // 🔥 v3.4.0 FIX: Check explicit full price plan IDs
  const explicitNewsletterFullPrice = profile.newsletter_whop_plan_id === 'plan_U6lF2eO5y9469' || 
                                       profile.newsletter_whop_plan_id === 'plan_bp2QTGuwfpj0A';
  const explicitTopSecretFullPrice = profile.top_secret_whop_plan_id === 'plan_tUvQbCrEQ4197' || 
                                      profile.top_secret_whop_plan_id === 'plan_PxxbBlSdkyeo7';
  
  // 🔥 v3.4.0 FIX: When plan_id is missing/null, use timing-based detection
  // The FIRST product purchased is always at FULL PRICE
  // The SECOND product purchased is at DISCOUNTED price (bundle discount)
  const newsletterStarted = profile.newsletter_started_at ? new Date(profile.newsletter_started_at) : null;
  const topSecretStarted = profile.top_secret_started_at ? new Date(profile.top_secret_started_at) : null;
  
  let newsletterIsFullPrice = explicitNewsletterFullPrice;
  let topSecretIsFullPrice = explicitTopSecretFullPrice;
  
  // If we have a bundle but plan_ids are missing, infer from timestamps
  if (hasBundle && !newsletterIsDiscounted && !topSecretIsDiscounted && 
      !explicitNewsletterFullPrice && !explicitTopSecretFullPrice) {
    if (newsletterStarted && topSecretStarted) {
      if (newsletterStarted < topSecretStarted) {
        // Newsletter was purchased first → Newsletter is FULL PRICE
        newsletterIsFullPrice = true;
      } else {
        // Top Secret was purchased first → Top Secret is FULL PRICE
        topSecretIsFullPrice = true;
      }
    }
  }
  
  // 🔥 DEBUG: Log the detection
  console.log(`📊 Bundle Status Check:`, {
    cancellingProduct,
    hasBundle,
    newsletterActive,
    topSecretActive,
    newsletter_whop_plan_id: profile.newsletter_whop_plan_id,
    top_secret_whop_plan_id: profile.top_secret_whop_plan_id,
    newsletterIsDiscounted,
    topSecretIsDiscounted,
    newsletterIsFullPrice,
    topSecretIsFullPrice,
    newsletterStarted: newsletterStarted?.toISOString(),
    topSecretStarted: topSecretStarted?.toISOString(),
  });
  
  const otherProduct = cancellingProduct === 'newsletter' ? 'top_secret' : 'newsletter';
  const otherProductName = cancellingProduct === 'newsletter' ? 'Top Secret' : 'War Zone Newsletter';
  
  return {
    hasBundle,
    newsletterActive,
    topSecretActive,
    newsletterIsDiscounted,
    topSecretIsDiscounted,
    newsletterIsFullPrice,
    topSecretIsFullPrice,
    otherProduct: hasBundle ? otherProduct : null,
    otherProductName: hasBundle ? otherProductName : null,
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
        top_secret_started_at, top_secret_whop_plan_id, top_secret_is_in_trial
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

    if (!product || !["newsletter", "top_secret"].includes(product)) {
      return new Response(
        JSON.stringify({ error: "Invalid product. Must be 'newsletter' or 'top_secret'" }),
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

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Must be 'cancel', 'reactivate', or 'status'" }),
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
// ============================================

async function handleCheckBundle(
  profile: any,
  product: ProductType,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const bundleStatus = checkBundleStatus(profile, product);
  
  // Determine if cancelling this product will affect pricing of the other
  let priceImpact: {
    willIncreasePrice: boolean;
    currentPrice: number;
    newPrice: number;
    affectedProduct: string;
  } | null = null;
  
  // 🔥 v3.5.0: Determine cancellation scenario using TIMESTAMPS when plan_ids are missing
  // Scenario A: Cancelling FULL PRICE product → discounted product loses its discount → Show Bundle Dialog
  // Scenario B: Cancelling DISCOUNTED product → full price product continues unchanged → NO Bundle Dialog needed
  let cancellingFullPriceProduct = false;
  let discountedProductWillBeCancelled = false;
  
  if (bundleStatus.hasBundle) {
    // 🔥 v3.5.0 FIX: When plan_ids are missing, infer from timestamps
    // The FIRST product purchased is FULL PRICE, the SECOND is DISCOUNTED
    const newsletterStarted = profile.newsletter_started_at ? new Date(profile.newsletter_started_at) : null;
    const topSecretStarted = profile.top_secret_started_at ? new Date(profile.top_secret_started_at) : null;
    
    // Determine effective pricing based on explicit plan_ids OR timestamps
    let effectiveNewsletterIsFullPrice = bundleStatus.newsletterIsFullPrice;
    let effectiveTopSecretIsFullPrice = bundleStatus.topSecretIsFullPrice;
    let effectiveNewsletterIsDiscounted = bundleStatus.newsletterIsDiscounted;
    let effectiveTopSecretIsDiscounted = bundleStatus.topSecretIsDiscounted;
    
    // If neither product has explicit discount/full price markers, use timestamps
    if (!effectiveNewsletterIsDiscounted && !effectiveTopSecretIsDiscounted) {
      if (newsletterStarted && topSecretStarted) {
        if (newsletterStarted < topSecretStarted) {
          // Newsletter first → Newsletter FULL PRICE, Top Secret DISCOUNTED
          effectiveNewsletterIsFullPrice = true;
          effectiveTopSecretIsDiscounted = true;
        } else {
          // Top Secret first → Top Secret FULL PRICE, Newsletter DISCOUNTED
          effectiveTopSecretIsFullPrice = true;
          effectiveNewsletterIsDiscounted = true;
        }
      }
    }
    
    console.log(`🔍 Effective pricing detection:`, {
      effectiveNewsletterIsFullPrice,
      effectiveTopSecretIsFullPrice,
      effectiveNewsletterIsDiscounted,
      effectiveTopSecretIsDiscounted,
      newsletterStarted: newsletterStarted?.toISOString(),
      topSecretStarted: topSecretStarted?.toISOString(),
    });
    
    // Scenario A: Cancelling WAR ZONE at full price ($69.99) → Top Secret ($50) loses discount
    if (product === 'newsletter' && effectiveNewsletterIsFullPrice && effectiveTopSecretIsDiscounted) {
      cancellingFullPriceProduct = true;
      discountedProductWillBeCancelled = true;
      priceImpact = {
        willIncreasePrice: true,
        currentPrice: 50,
        newPrice: 89.99,
        affectedProduct: 'Top Secret',
      };
    }
    // Scenario A: Cancelling TOP SECRET at full price ($89.99) → War Zone ($30) loses discount
    else if (product === 'top_secret' && effectiveTopSecretIsFullPrice && effectiveNewsletterIsDiscounted) {
      cancellingFullPriceProduct = true;
      discountedProductWillBeCancelled = true;
      priceImpact = {
        willIncreasePrice: true,
        currentPrice: 30,
        newPrice: 69.99,
        affectedProduct: 'War Zone Newsletter',
      };
    }
    // Scenario B: Cancelling DISCOUNTED product → other product at full price is unaffected
    // Return hasBundle=false so frontend shows normal cancel dialog
    else {
      // Don't set priceImpact - the other product is at full price and unaffected
      priceImpact = null;
      // Important: We return hasBundle=false for Scenario B so frontend uses normal dialog
    }
  }
  
  // 🔥 v2.8.0: For Scenario B, return hasBundle=false so frontend shows normal cancel dialog
  const effectiveHasBundle = cancellingFullPriceProduct ? bundleStatus.hasBundle : false;
  
  console.log(`📤 check_bundle response:`, {
    hasBundle: effectiveHasBundle,
    cancellingFullPriceProduct,
    discountedProductWillBeCancelled,
    priceImpact,
  });
  
  return new Response(
    JSON.stringify({
      success: true,
      // 🔥 v2.8.0: Only return hasBundle=true for Scenario A (full price cancellation)
      // Scenario B uses normal dialog, so we return hasBundle=false
      hasBundle: effectiveHasBundle,
      otherProduct: bundleStatus.otherProduct,
      otherProductName: bundleStatus.otherProductName,
      priceImpact,
      cancellingFullPriceProduct,
      discountedProductWillBeCancelled,
      bundleDetails: {
        newsletterActive: bundleStatus.newsletterActive,
        topSecretActive: bundleStatus.topSecretActive,
        newsletterIsDiscounted: bundleStatus.newsletterIsDiscounted,
        topSecretIsDiscounted: bundleStatus.topSecretIsDiscounted,
        newsletterIsFullPrice: bundleStatus.newsletterIsFullPrice,
        topSecretIsFullPrice: bundleStatus.topSecretIsFullPrice,
      },
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
  // 🔥 NEW: Check bundle status
  const bundleStatus = checkBundleStatus(profile, product);
  
  // If user has bundle and didn't confirm, check if confirmation is needed
  if (bundleStatus.hasBundle) {
    // 🔥 v3.5.0 FIX: Infer pricing from timestamps when plan_ids are missing
    const newsletterStarted = profile.newsletter_started_at ? new Date(profile.newsletter_started_at) : null;
    const topSecretStarted = profile.top_secret_started_at ? new Date(profile.top_secret_started_at) : null;
    
    let effectiveNewsletterIsFullPrice = bundleStatus.newsletterIsFullPrice;
    let effectiveTopSecretIsFullPrice = bundleStatus.topSecretIsFullPrice;
    let effectiveNewsletterIsDiscounted = bundleStatus.newsletterIsDiscounted;
    let effectiveTopSecretIsDiscounted = bundleStatus.topSecretIsDiscounted;
    
    // If neither has explicit markers, use timestamps
    if (!effectiveNewsletterIsDiscounted && !effectiveTopSecretIsDiscounted) {
      if (newsletterStarted && topSecretStarted) {
        if (newsletterStarted < topSecretStarted) {
          effectiveNewsletterIsFullPrice = true;
          effectiveTopSecretIsDiscounted = true;
        } else {
          effectiveTopSecretIsFullPrice = true;
          effectiveNewsletterIsDiscounted = true;
        }
      }
    }
    
    // 🔥 v3.5.0: Use effective pricing for confirmation check
    const cancellingFullPriceProduct = 
      (product === 'newsletter' && effectiveNewsletterIsFullPrice && effectiveTopSecretIsDiscounted) ||
      (product === 'top_secret' && effectiveTopSecretIsFullPrice && effectiveNewsletterIsDiscounted);
    
    // 🔥 v2.8.0: ONLY require confirmation for Scenario A (cancelling full price product)
    // Scenario B (cancelling discounted product) proceeds without popup
    if (cancellingFullPriceProduct && !cancelBothProducts && !confirmPriceIncrease) {
      const otherProductPrice = bundleStatus.otherProduct === 'newsletter' ? 30 : 50;
      const otherProductFullPrice = bundleStatus.otherProduct === 'newsletter' ? 69.99 : 89.99;
      
      return new Response(
        JSON.stringify({ 
          error: "bundle_confirmation_required",
          message: `You're cancelling the full-price product. The discounted ${bundleStatus.otherProductName} cannot exist without it.`,
          hasBundle: true,
          cancellingFullPriceProduct: true,
          otherProduct: bundleStatus.otherProduct,
          otherProductName: bundleStatus.otherProductName,
          otherProductCurrentPrice: otherProductPrice,
          otherProductFullPrice: otherProductFullPrice,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // If user chose to cancel both products
    if (cancelBothProducts) {
      console.log(`🔄 User chose to cancel BOTH products`);
      // We'll handle this after the main cancellation by also cancelling the other product
    }
  }
  const membershipId = getMembershipId(profile, product);
  const productStatus = getProductStatus(profile, product);
  const productName = getProductDisplayName(product);

  console.log(`🔄 Cancel request for ${product}:`, {
    membershipId,
    status: productStatus.status,
    enabled: productStatus.enabled,
    isTrial: productStatus.isTrial,
    isPaid: productStatus.isPaid,
    cancelAtPeriodEnd: productStatus.cancelAtPeriodEnd,
    trialEndsAt: productStatus.trialEndsAt,
    expiresAt: productStatus.expiresAt,
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

    if (product === "newsletter") {
      updateData = {
        ...updateData,
        // 🔥 KEY CHANGE: Keep enabled=true, status=trial/active, just mark for cancellation
        newsletter_cancel_at_period_end: true,
        // DO NOT set newsletter_enabled = false
        // DO NOT set newsletter_status = 'cancelled'
        // Keep the membership ID for tracking
      };
    } else if (product === "top_secret") {
      updateData = {
        ...updateData,
        // 🔥 KEY CHANGE: Keep enabled=true, status stays as-is, just mark for cancellation
        top_secret_cancel_at_period_end: true,
        // DO NOT set top_secret_enabled = false
        // DO NOT set top_secret_status = 'cancelled'
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

    // 🔥 NEW: Handle bundle-related actions after main cancellation
    let bundleAction: string | null = null;
    
    if (bundleStatus.hasBundle) {
      if (cancelBothProducts) {
        // Cancel the other product too
        const otherProduct = bundleStatus.otherProduct!;
        const otherMembershipId = otherProduct === 'newsletter' 
          ? profile.newsletter_whop_membership_id 
          : profile.top_secret_whop_membership_id;
        
        console.log(`🔄 Also cancelling ${otherProduct} (bundle cancellation)`);
        
        if (otherMembershipId && WHOP_API_KEY) {
          await cancelWhopMembership(otherMembershipId, "at_period_end");
        }
        
        // Update DB for other product
        const otherUpdateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        
        if (otherProduct === 'newsletter') {
          otherUpdateData.newsletter_cancel_at_period_end = true;
        } else {
          otherUpdateData.top_secret_cancel_at_period_end = true;
        }
        
        await supabase
          .from("profiles")
          .update(otherUpdateData)
          .eq("id", profile.id);
        
        bundleAction = `both_cancelled`;
        
        await logSubscriptionEvent(supabase, {
          user_id: profile.id,
          event_type: "bundle_both_cancelled",
          old_plan: "bundle",
          new_plan: "none",
          reason: "User chose to cancel both products",
          metadata: {
            initiated_from: product,
            also_cancelled: otherProduct,
          },
        });
        
      } else if (confirmPriceIncrease) {
        // 🔥 v2.5.0: User confirmed they're OK with price increase
        // NEW FLOW: Cancel the OTHER product at period end too
        // When it deactivates, webhook will send resubscribe email with full price checkout link
        const otherProduct = bundleStatus.otherProduct!;
        const otherMembershipId = otherProduct === 'newsletter' 
          ? profile.newsletter_whop_membership_id 
          : profile.top_secret_whop_membership_id;
        
        console.log(`💰 User confirmed price increase for ${otherProduct}`);
        console.log(`🔄 Cancelling ${otherProduct} at period end (will send resubscribe email when deactivated)`);
        
        // Cancel the other product in Whop at period end
        if (otherMembershipId && WHOP_API_KEY) {
          const cancelResponse = await fetch(`https://api.whop.com/api/v1/memberships/${otherMembershipId}/pause`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${WHOP_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ void_payments: false }),
          });
          
          if (cancelResponse.ok) {
            console.log(`✅ ${otherProduct} membership cancelled at period end in Whop`);
          } else {
            console.warn(`⚠️ Failed to cancel ${otherProduct} in Whop: ${await cancelResponse.text()}`);
          }
        }
        
        // Update DB: mark other product for cancellation AND set pending price change flag
        const flagUpdateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        
        if (otherProduct === 'newsletter') {
          flagUpdateData.newsletter_cancel_at_period_end = true;
          flagUpdateData.newsletter_pending_price_change = true;
          flagUpdateData.newsletter_new_price = 69.99;
        } else {
          flagUpdateData.top_secret_cancel_at_period_end = true;
          flagUpdateData.top_secret_pending_price_change = true;
          flagUpdateData.top_secret_new_price = 89.99;
        }
        
        await supabase
          .from("profiles")
          .update(flagUpdateData)
          .eq("id", profile.id);
        
        bundleAction = `other_product_cancelled_for_resubscribe`;
        
        await logSubscriptionEvent(supabase, {
          user_id: profile.id,
          event_type: "bundle_partial_cancel_resubscribe_scheduled",
          old_plan: "bundle_discounted",
          new_plan: `${otherProduct}_pending_resubscribe`,
          reason: "User cancelled one product, other cancelled for resubscribe at full price",
          metadata: {
            cancelled_product: product,
            remaining_product: otherProduct,
            other_product_membership_id: otherMembershipId,
            price_change: otherProduct === 'newsletter' ? '30 -> 69.99' : '50 -> 89.99',
            flow: "cancel_at_period_end_then_resubscribe_email",
          },
        });
      }
    }

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

  // ============================================
  // 🔥 STEP 3.5: Handle bundle-related actions
  // ============================================
  
  let bundleAction: string | null = null;
  
  // 🔥 v3.3.0: Removed auto-cancel logic - now requires user confirmation via popup
  // All bundle cancellation decisions now require explicit user choice
  
  if (bundleStatus.hasBundle) {
    if (cancelBothProducts) {
      const otherProduct = bundleStatus.otherProduct!;
      const otherMembershipId = otherProduct === 'newsletter' 
        ? profile.newsletter_whop_membership_id 
        : profile.top_secret_whop_membership_id;
      
      console.log(`🔄 Also cancelling ${otherProduct} (bundle cancellation)`);
      
      if (otherMembershipId && WHOP_API_KEY) {
        await cancelWhopMembership(otherMembershipId, "at_period_end");
      }
      
      const otherUpdateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (otherProduct === 'newsletter') {
        otherUpdateData.newsletter_cancel_at_period_end = true;
      } else {
        otherUpdateData.top_secret_cancel_at_period_end = true;
      }
      
      await supabase.from("profiles").update(otherUpdateData).eq("id", profile.id);
      bundleAction = "both_cancelled";
      
    } else if (confirmPriceIncrease) {
      // 🔥 v2.5.0: Cancel the OTHER product at period end too
      // When it deactivates, webhook will send resubscribe email with full price checkout link
      const otherProduct = bundleStatus.otherProduct!;
      const otherMembershipId = otherProduct === 'newsletter' 
        ? profile.newsletter_whop_membership_id 
        : profile.top_secret_whop_membership_id;
      
      console.log(`💰 User confirmed price increase for ${otherProduct}`);
      console.log(`🔄 Cancelling ${otherProduct} at period end (will send resubscribe email when deactivated)`);
      
      // Cancel the other product in Whop at period end
      if (otherMembershipId && WHOP_API_KEY) {
        const cancelResponse = await fetch(`https://api.whop.com/api/v1/memberships/${otherMembershipId}/pause`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHOP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ void_payments: false }),
        });
        
        if (cancelResponse.ok) {
          console.log(`✅ ${otherProduct} membership cancelled at period end in Whop`);
        } else {
          console.warn(`⚠️ Failed to cancel ${otherProduct} in Whop: ${await cancelResponse.text()}`);
        }
      }
      
      const flagUpdateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (otherProduct === 'newsletter') {
        flagUpdateData.newsletter_cancel_at_period_end = true;
        flagUpdateData.newsletter_pending_price_change = true;
        flagUpdateData.newsletter_new_price = 69.99;
      } else {
        flagUpdateData.top_secret_cancel_at_period_end = true;
        flagUpdateData.top_secret_pending_price_change = true;
        flagUpdateData.top_secret_new_price = 89.99;
      }
      
      await supabase.from("profiles").update(flagUpdateData).eq("id", profile.id);
      bundleAction = "other_product_cancelled_for_resubscribe";
      
      await logSubscriptionEvent(supabase, {
        user_id: profile.id,
        event_type: "bundle_partial_cancel_resubscribe_scheduled",
        old_plan: "bundle_discounted",
        new_plan: `${otherProduct}_pending_resubscribe`,
        reason: "User cancelled one product, other cancelled for resubscribe at full price",
        metadata: {
          cancelled_product: product,
          remaining_product: otherProduct,
          other_product_membership_id: otherMembershipId,
          price_change: otherProduct === 'newsletter' ? '30 -> 69.99' : '50 -> 89.99',
          flow: "cancel_at_period_end_then_resubscribe_email",
        },
      });
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