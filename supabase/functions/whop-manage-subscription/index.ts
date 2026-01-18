// =====================================================
// FINOTAUR PRODUCT SUBSCRIPTION MANAGEMENT - v2.0.0
// =====================================================
// Edge Function for managing Newsletter & Top Secret subscriptions
// 
// Handles: Newsletter (War Zone) & Top Secret products
// Actions: cancel, reactivate, status
//
// 🔥 v2.0.0 CHANGES:
// - Added support for FREE TRIAL cancellation (no Whop membership)
// - Better error handling and logging
// - Fixed validation for trial users
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
const WHOP_API_URL = "https://api.whop.com/api/v2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Product types
type ProductType = "newsletter" | "top_secret";

// ============================================
// CORS HEADERS
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ============================================
// TYPES
// ============================================

interface CancelRequest {
  action: "cancel";
  product: ProductType;
  reason?: string;
}

interface ReactivateRequest {
  action: "reactivate";
  product: ProductType;
}

interface StatusRequest {
  action: "status";
  product: ProductType;
}

type RequestBody = CancelRequest | ReactivateRequest | StatusRequest;

interface WhopMembership {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
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
): Promise<{ success: boolean; data?: WhopMembership; error?: string }> {
  try {
    console.log(`🔄 Canceling Whop membership ${membershipId} with mode: ${mode}`);

    const response = await fetch(`${WHOP_API_URL}/memberships/${membershipId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Whop API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Whop API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`✅ Whop membership canceled:`, data);
    return { success: true, data };

  } catch (error) {
    console.error(`❌ Cancel Whop membership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function reactivateWhopMembership(
  membershipId: string
): Promise<{ success: boolean; data?: WhopMembership; error?: string }> {
  try {
    console.log(`🔄 Reactivating Whop membership ${membershipId}`);

    const response = await fetch(`${WHOP_API_URL}/memberships/${membershipId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancel_at_period_end: false }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Whop API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Whop API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`✅ Whop membership reactivated:`, data);
    return { success: true, data };

  } catch (error) {
    console.error(`❌ Reactivate Whop membership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
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
        isTrial: profile.newsletter_status === "trial",
        trialEndsAt: profile.newsletter_trial_ends_at,
        isPaid: profile.newsletter_paid ?? false,
      };
    case "top_secret":
      return {
        enabled: profile.top_secret_enabled ?? false,
        status: profile.top_secret_status ?? "inactive",
        cancelAtPeriodEnd: profile.top_secret_cancel_at_period_end ?? false,
        expiresAt: profile.top_secret_expires_at,
        isTrial: profile.top_secret_status === "trial",
        trialEndsAt: null, // Top Secret doesn't have trial
        isPaid: true, // Top Secret is always paid
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
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
        newsletter_paid, newsletter_trial_ends_at,
        top_secret_enabled, top_secret_status, top_secret_whop_membership_id,
        top_secret_expires_at, top_secret_cancel_at_period_end, top_secret_interval
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

      case "cancel":
        return handleCancel(supabase, profile, product, (body as CancelRequest).reason, corsHeaders);

      case "reactivate":
        return handleReactivate(supabase, profile, product, corsHeaders);

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

  // If has Whop membership, get live status from Whop API
  if (membershipId && WHOP_API_KEY) {
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
// CANCEL HANDLER - v2.0 with Trial Support
// ============================================

async function handleCancel(
  supabase: any,
  profile: any,
  product: ProductType,
  reason: string | undefined,
  corsHeaders: Record<string, string>
): Promise<Response> {
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
        expiresAt: productStatus.expiresAt
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // CASE 1: FREE TRIAL - Cancel directly in DB
  // ============================================
  
  if (productStatus.isTrial && !membershipId) {
    console.log(`📝 Canceling FREE TRIAL directly in DB (no Whop membership)`);

    let updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (product === "newsletter") {
      updateData = {
        ...updateData,
        newsletter_enabled: false,
        newsletter_status: "cancelled",
        newsletter_cancel_at_period_end: false,
        newsletter_unsubscribed_at: new Date().toISOString(),
      };
    } else if (product === "top_secret") {
      updateData = {
        ...updateData,
        top_secret_enabled: false,
        top_secret_status: "cancelled",
        top_secret_cancel_at_period_end: false,
        top_secret_unsubscribed_at: new Date().toISOString(),
      };
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (updateError) {
      console.error("❌ Profile update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to cancel trial subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the event
    await logSubscriptionEvent(supabase, {
      user_id: profile.id,
      event_type: "trial_cancelled",
      old_plan: `${product}_trial`,
      new_plan: "none",
      reason: reason || "User cancelled free trial",
      metadata: {
        product_type: product,
        cancelled_at: new Date().toISOString(),
        was_trial: true,
      },
    });

    console.log(`✅ Free trial cancelled successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Your ${productName} free trial has been cancelled.`,
        subscription: {
          product,
          status: "cancelled",
          cancelAtPeriodEnd: false,
          expiresAt: null,
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

  console.log(`🔄 Canceling PAID subscription via Whop API`);

  const cancelResult = await cancelWhopMembership(membershipId, "at_period_end");

  if (!cancelResult.success) {
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

  return new Response(
    JSON.stringify({
      success: true,
      message: `Your ${productName} subscription has been cancelled. You'll continue to have access until ${expiresDate}.`,
      subscription: {
        product,
        status: productStatus.status,
        cancelAtPeriodEnd: true,
        expiresAt: productStatus.expiresAt,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// REACTIVATE HANDLER
// ============================================

async function handleReactivate(
  supabase: any,
  profile: any,
  product: ProductType,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const membershipId = getMembershipId(profile, product);
  const productStatus = getProductStatus(profile, product);
  const productName = getProductDisplayName(product);

  console.log(`🔄 Reactivate request for ${product}:`, {
    membershipId,
    status: productStatus.status,
    cancelAtPeriodEnd: productStatus.cancelAtPeriodEnd,
  });

  // Validate: must have pending cancellation
  if (!productStatus.cancelAtPeriodEnd) {
    return new Response(
      JSON.stringify({ error: `No pending cancellation to undo for ${productName}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate: must have membership for paid subscriptions
  if (!membershipId) {
    return new Response(
      JSON.stringify({ error: `No Whop membership found for ${productName}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // STEP 1: Reactivate via Whop API
  // ============================================

  const reactivateResult = await reactivateWhopMembership(membershipId);

  if (!reactivateResult.success) {
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

  return new Response(
    JSON.stringify({
      success: true,
      message: `Your ${productName} subscription has been reactivated!`,
      subscription: {
        product,
        status: "active",
        cancelAtPeriodEnd: false,
        expiresAt: productStatus.expiresAt,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}