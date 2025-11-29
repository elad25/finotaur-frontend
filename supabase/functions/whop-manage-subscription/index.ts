// =====================================================
// FINOTAUR WHOP SUBSCRIPTION MANAGEMENT - v1.0.0
// =====================================================
// Edge Function for managing Whop subscriptions
// 
// Endpoints:
// - POST /cancel - Cancel subscription (at_period_end or immediate)
// - POST /downgrade - Schedule downgrade to lower plan
// - GET /status - Get current subscription status
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

interface CancelRequest {
  action: "cancel";
  mode: "at_period_end" | "immediate";
  reason?: string;
}

interface DowngradeRequest {
  action: "downgrade";
  targetPlan: "basic" | "free";
}

interface StatusRequest {
  action: "status";
}

type RequestBody = CancelRequest | DowngradeRequest | StatusRequest;

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

    // Create Supabase client with user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current user
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
      .select("id, email, account_type, subscription_status, whop_membership_id, subscription_expires_at, subscription_cancel_at_period_end, pending_downgrade_plan")
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
// CANCEL HANDLER
// ============================================
// 🔥 ביטול תמיד at_period_end - המשתמש ממשיך ליהנות עד סוף הסייקל
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

  if (profile.account_type === "free") {
    return new Response(
      JSON.stringify({ error: "Cannot cancel free plan" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

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

  // 🔥 Always cancel at_period_end - user keeps access until cycle ends
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

  // Update profile - mark as pending cancellation but KEEP current plan
  const updateData: Record<string, any> = {
    subscription_cancel_at_period_end: true,
    pending_downgrade_plan: "free",
    cancellation_reason: request.reason || null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", profile.id);

  if (updateError) {
    console.error("❌ Profile update error:", updateError);
    // Don't fail - Whop cancellation succeeded
  }

  // Log the action
  await supabase
    .from("subscription_events")
    .insert({
      user_id: profile.id,
      event_type: "cancel_scheduled",
      old_plan: profile.account_type,
      new_plan: "free",
      reason: request.reason,
      scheduled_at: profile.subscription_expires_at,
      metadata: {
        whop_membership_id: profile.whop_membership_id,
        cancelled_at: new Date().toISOString(),
      },
    })
    .catch((err: any) => console.warn("Failed to log event:", err));

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
      message: `Your subscription has been cancelled. You'll continue to have ${profile.account_type} access until ${expiresDate}.`,
      subscription: {
        plan: profile.account_type, // 🔥 Keep current plan
        status: "active", // 🔥 Still active until period ends
        cancelAtPeriodEnd: true,
        expiresAt: profile.subscription_expires_at,
        pendingDowngrade: "free",
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// DOWNGRADE HANDLER
// ============================================
// 🔥 Downgrade תמיד at_period_end - המשתמש ממשיך ליהנות עד סוף הסייקל
// ============================================

async function handleDowngrade(
  supabase: any,
  profile: any,
  request: DowngradeRequest,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { targetPlan } = request;

  // Validate downgrade path
  const planTiers: Record<string, number> = {
    free: 0,
    basic: 1,
    premium: 2,
  };

  const currentTier = planTiers[profile.account_type] ?? 0;
  const targetTier = planTiers[targetPlan] ?? 0;

  if (targetTier >= currentTier) {
    return new Response(
      JSON.stringify({ error: "Can only downgrade to a lower plan" }),
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

  // For downgrade to Free - cancel subscription at period end
  if (targetPlan === "free") {
    if (!profile.whop_membership_id) {
      // No Whop membership - just update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          pending_downgrade_plan: "free",
          subscription_cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to schedule downgrade" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Downgrade to Free has been scheduled.",
          subscription: { 
            plan: profile.account_type, 
            status: "active",
            cancelAtPeriodEnd: true,
            pendingDowngrade: "free",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel Whop membership at period end
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

    // Update profile - keep current plan, mark pending downgrade
    await supabase
      .from("profiles")
      .update({
        subscription_cancel_at_period_end: true,
        pending_downgrade_plan: "free",
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    // Log event
    await supabase
      .from("subscription_events")
      .insert({
        user_id: profile.id,
        event_type: "downgrade_scheduled",
        old_plan: profile.account_type,
        new_plan: "free",
        scheduled_at: profile.subscription_expires_at,
        metadata: { whop_membership_id: profile.whop_membership_id },
      })
      .catch((err: any) => console.warn("Failed to log event:", err));

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
        message: `Your subscription will downgrade to Free on ${expiresDate}. You'll continue to have ${profile.account_type} access until then.`,
        subscription: {
          plan: profile.account_type, // 🔥 Keep current plan
          status: "active",
          cancelAtPeriodEnd: true,
          pendingDowngrade: "free",
          expiresAt: profile.subscription_expires_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // For downgrade to Basic (from Premium)
  if (targetPlan === "basic" && profile.account_type === "premium") {
    // Cancel current subscription at period end
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

    // Update profile - keep Premium, mark pending downgrade to Basic
    await supabase
      .from("profiles")
      .update({
        subscription_cancel_at_period_end: true,
        pending_downgrade_plan: "basic",
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    // Log event
    await supabase
      .from("subscription_events")
      .insert({
        user_id: profile.id,
        event_type: "downgrade_scheduled",
        old_plan: "premium",
        new_plan: "basic",
        scheduled_at: profile.subscription_expires_at,
        metadata: { whop_membership_id: profile.whop_membership_id },
      })
      .catch((err: any) => console.warn("Failed to log event:", err));

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
          plan: profile.account_type, // 🔥 Keep Premium
          status: "active",
          cancelAtPeriodEnd: true,
          pendingDowngrade: "basic",
          expiresAt: profile.subscription_expires_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Invalid downgrade path" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}