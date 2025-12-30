// =====================================================
// FINOTAUR WHOP SUBSCRIPTION MANAGEMENT - v3.0.0
// =====================================================
// Edge Function for managing Whop subscriptions
// 
// 🔧 v1.0.1: Removed .catch() on Supabase queries
// 🔧 v2.0.0: Added cancellation feedback collection
// 🔥 v3.0.0: Removed free tier - cancellation = subscription ends
//            Users must re-subscribe to Basic or Premium
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

interface CancellationFeedback {
  reason_id: string;
  reason_label: string;
  feedback?: string;
}

interface CancelRequest {
  action: "cancel";
  mode?: "at_period_end" | "immediate";
  reason?: string;  // Legacy support
  // New structured feedback
  reason_id?: string;
  reason_label?: string;
  feedback?: string;
}

interface UndoCancelRequest {
  action: "undo_cancel";
}

interface DowngradeRequest {
  action: "downgrade";
  targetPlan: "basic"; // 🔥 CHANGED: Only basic, no free
}

interface StatusRequest {
  action: "status";
}

type RequestBody = CancelRequest | UndoCancelRequest | DowngradeRequest | StatusRequest;

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
  mode: "at_period_end" | "immediate"
): Promise<{ success: boolean; data?: WhopMembership; error?: string }> {
  try {
    console.log(`🔄 Canceling membership ${membershipId} with mode: ${mode}`);

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
    console.log(`✅ Membership canceled:`, data);
    return { success: true, data };

  } catch (error) {
    console.error(`❌ Cancel membership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function reactivateWhopMembership(
  membershipId: string
): Promise<{ success: boolean; data?: WhopMembership; error?: string }> {
  try {
    console.log(`🔄 Reactivating membership ${membershipId}`);

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
    console.log(`✅ Membership reactivated:`, data);
    return { success: true, data };

  } catch (error) {
    console.error(`❌ Reactivate membership error:`, error);
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
    console.error(`❌ Get membership error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// HELPER: Safe event logging
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
      console.warn("Failed to log subscription event:", error.message);
    }
  } catch (err) {
    console.warn("Failed to log subscription event:", err);
  }
}

// ============================================
// HELPER: Save cancellation feedback
// ============================================

async function saveCancellationFeedback(
  supabase: any,
  userId: string,
  reasonId: string,
  reasonLabel: string,
  feedbackText: string | null,
  planCancelled: string,
  subscriptionType: string | null,
  whopMembershipId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📝 Saving cancellation feedback for user ${userId}`);
    
    const { data, error } = await supabase.rpc("save_cancellation_feedback", {
      p_user_id: userId,
      p_reason_id: reasonId,
      p_reason_label: reasonLabel,
      p_feedback_text: feedbackText || null,
      p_plan_cancelled: planCancelled,
      p_subscription_type: subscriptionType,
      p_whop_membership_id: whopMembershipId,
    });

    if (error) {
      console.error("❌ Failed to save cancellation feedback:", error.message);
      return { success: false, error: error.message };
    }

    console.log(`✅ Cancellation feedback saved:`, data);
    return { success: true };

  } catch (err) {
    console.error("❌ Failed to save cancellation feedback:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
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
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`👤 User authenticated: ${user.email}`);

    // Get user's profile with Whop membership ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, account_type, subscription_status, subscription_interval, whop_membership_id, subscription_expires_at, subscription_cancel_at_period_end, pending_downgrade_plan")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = req.method === "GET" 
      ? { action: "status" } 
      : await req.json();

    console.log(`📨 Request:`, { action: body.action, userId: user.id });

    // Route to appropriate handler
    switch (body.action) {
      case "status":
        return handleStatus(profile, corsHeaders);

      case "cancel":
        return handleCancel(supabase, profile, body as CancelRequest, corsHeaders);

      case "undo_cancel":
        return handleUndoCancel(supabase, profile, corsHeaders);

      case "downgrade":
        return handleDowngrade(supabase, profile, body as DowngradeRequest, corsHeaders);

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
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
  corsHeaders: Record<string, string>
): Promise<Response> {
  const response = {
    success: true,
    subscription: {
      plan: profile.account_type,
      status: profile.subscription_status,
      expiresAt: profile.subscription_expires_at,
      cancelAtPeriodEnd: profile.subscription_cancel_at_period_end || false,
      pendingDowngrade: profile.pending_downgrade_plan || null,
      hasMembership: !!profile.whop_membership_id,
    },
  };

  // If has Whop membership, get live status
  if (profile.whop_membership_id && WHOP_API_KEY) {
    const whopResult = await getWhopMembership(profile.whop_membership_id);
    if (whopResult.success && whopResult.data) {
      response.subscription.cancelAtPeriodEnd = whopResult.data.cancel_at_period_end;
      response.subscription.status = whopResult.data.status;
    }
  }

  return new Response(
    JSON.stringify(response),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// CANCEL HANDLER - 🔥 UPDATED: No free tier
// ============================================

async function handleCancel(
  supabase: any,
  profile: any,
  request: CancelRequest,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Validate
  if (!profile.whop_membership_id) {
    return new Response(
      JSON.stringify({ error: "No active subscription to cancel" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 🔥 REMOVED: No more free plan check - basic and premium can both be cancelled

  // Check if already pending cancellation
  if (profile.subscription_cancel_at_period_end) {
    return new Response(
      JSON.stringify({ 
        error: "Subscription is already scheduled for cancellation",
        expiresAt: profile.subscription_expires_at
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // STEP 1: Save cancellation feedback FIRST
  // ============================================
  
  const reasonId = request.reason_id || "other";
  const reasonLabel = request.reason_label || request.reason || "Other";
  const feedbackText = request.feedback || null;

  const feedbackResult = await saveCancellationFeedback(
    supabase,
    profile.id,
    reasonId,
    reasonLabel,
    feedbackText,
    profile.account_type,
    profile.subscription_interval,
    profile.whop_membership_id
  );

  if (!feedbackResult.success) {
    console.warn("⚠️ Failed to save feedback, but continuing with cancellation:", feedbackResult.error);
  }

  // ============================================
  // STEP 2: Cancel via Whop API
  // ============================================

  const cancelResult = await cancelWhopMembership(
    profile.whop_membership_id,
    "at_period_end"
  );

  if (!cancelResult.success) {
    return new Response(
      JSON.stringify({ error: cancelResult.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // STEP 3: Update profile
  // 🔥 CHANGED: pending_downgrade_plan = null (no free tier)
  // User will need to re-subscribe after expiration
  // ============================================

  const updateData: Record<string, any> = {
    subscription_cancel_at_period_end: true,
    pending_downgrade_plan: null, // 🔥 No downgrade target - subscription just ends
    cancellation_reason: reasonLabel,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", profile.id);

  if (updateError) {
    console.error("❌ Profile update error:", updateError);
  }

  // ============================================
  // STEP 4: Log subscription event
  // ============================================

  await logSubscriptionEvent(supabase, {
    user_id: profile.id,
    event_type: "cancel_scheduled",
    old_plan: profile.account_type,
    new_plan: "cancelled", // 🔥 CHANGED: No free tier, just cancelled
    reason: reasonLabel,
    scheduled_at: profile.subscription_expires_at,
    metadata: {
      whop_membership_id: profile.whop_membership_id,
      cancelled_at: new Date().toISOString(),
      reason_id: reasonId,
      has_feedback: !!feedbackText,
    },
  });

  // Format expiration date
  const expiresDate = profile.subscription_expires_at 
    ? new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })
    : 'the end of your billing period';

  return new Response(
    JSON.stringify({
      success: true,
      message: `Your subscription has been cancelled. You'll continue to have ${profile.account_type} access until ${expiresDate}. After that, you'll need to subscribe again to continue using Finotaur.`,
      subscription: {
        plan: profile.account_type,
        status: "active",
        cancelAtPeriodEnd: true,
        expiresAt: profile.subscription_expires_at,
        pendingDowngrade: null, // 🔥 No downgrade, just cancellation
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// UNDO CANCEL HANDLER
// ============================================

async function handleUndoCancel(
  supabase: any,
  profile: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Validate
  if (!profile.subscription_cancel_at_period_end) {
    return new Response(
      JSON.stringify({ error: "No pending cancellation to undo" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!profile.whop_membership_id) {
    return new Response(
      JSON.stringify({ error: "No Whop membership found" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Reactivate via Whop API
  const reactivateResult = await reactivateWhopMembership(profile.whop_membership_id);

  if (!reactivateResult.success) {
    return new Response(
      JSON.stringify({ error: reactivateResult.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_cancel_at_period_end: false,
      pending_downgrade_plan: null,
      cancellation_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    console.error("❌ Profile update error:", updateError);
  }

  // Log event
  await logSubscriptionEvent(supabase, {
    user_id: profile.id,
    event_type: "reactivated",
    old_plan: "cancelling",
    new_plan: profile.account_type,
    metadata: {
      whop_membership_id: profile.whop_membership_id,
      reactivated_at: new Date().toISOString(),
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: "Your subscription has been reactivated!",
      subscription: {
        plan: profile.account_type,
        status: "active",
        cancelAtPeriodEnd: false,
        expiresAt: profile.subscription_expires_at,
        pendingDowngrade: null,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// DOWNGRADE HANDLER - 🔥 UPDATED: Only Premium → Basic
// ============================================

async function handleDowngrade(
  supabase: any,
  profile: any,
  request: DowngradeRequest,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { targetPlan } = request;

  // 🔥 UPDATED: Only valid downgrade is Premium → Basic
  if (targetPlan !== 'basic') {
    return new Response(
      JSON.stringify({ error: "Invalid downgrade target. Only 'basic' is supported." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (profile.account_type !== 'premium') {
    return new Response(
      JSON.stringify({ error: "Downgrade is only available for Premium users" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if already pending downgrade
  if (profile.subscription_cancel_at_period_end && profile.pending_downgrade_plan) {
    return new Response(
      JSON.stringify({ 
        error: `Subscription is already scheduled to downgrade to ${profile.pending_downgrade_plan}`,
        expiresAt: profile.subscription_expires_at
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Cancel current Premium subscription at period end
  if (profile.whop_membership_id) {
    const cancelResult = await cancelWhopMembership(
      profile.whop_membership_id,
      "at_period_end"
    );

    if (!cancelResult.success) {
      return new Response(
        JSON.stringify({ error: cancelResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Update profile - mark pending downgrade to Basic
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_cancel_at_period_end: true,
      pending_downgrade_plan: "basic",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    console.error("❌ Profile update error:", updateError);
  }

  // Log event
  await logSubscriptionEvent(supabase, {
    user_id: profile.id,
    event_type: "downgrade_scheduled",
    old_plan: "premium",
    new_plan: "basic",
    scheduled_at: profile.subscription_expires_at,
    metadata: { whop_membership_id: profile.whop_membership_id },
  });

  const expiresDate = profile.subscription_expires_at 
    ? new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })
    : 'the end of your billing period';

  return new Response(
    JSON.stringify({
      success: true,
      message: `Your Premium subscription will end on ${expiresDate}. You'll need to subscribe to Basic after that date to continue with that plan.`,
      subscription: {
        plan: profile.account_type,
        status: "active",
        cancelAtPeriodEnd: true,
        pendingDowngrade: "basic",
        expiresAt: profile.subscription_expires_at,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}