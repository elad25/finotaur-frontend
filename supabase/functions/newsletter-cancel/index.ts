// =====================================================
// FINOTAUR NEWSLETTER (WAR ZONE) CANCEL - v1.0.0
// =====================================================
// Edge Function for managing War Zone subscriptions
// 
// Actions:
// - cancel: Cancel subscription at period end
// - undo_cancel: Reactivate pending cancellation
// - status: Get current subscription status
// 
// Deploy: supabase functions deploy newsletter-cancel
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// CONFIGURATION
// ============================================

const WHOP_API_KEY = Deno.env.get("WHOP_API_KEY") || Deno.env.get("WHOP_BEARER_TOKEN") || "";
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
  reason?: string;
  reason_id?: string;
  reason_label?: string;
  feedback?: string;
}

interface UndoCancelRequest {
  action: "undo_cancel";
}

interface StatusRequest {
  action: "status";
}

type RequestBody = CancelRequest | UndoCancelRequest | StatusRequest;

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
  membershipId: string
): Promise<{ success: boolean; data?: WhopMembership; error?: string }> {
  try {
    console.log(`🔄 Canceling newsletter membership ${membershipId} at period end`);

    const response = await fetch(`${WHOP_API_URL}/memberships/${membershipId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        cancel_at_period_end: true 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Whop API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Whop API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`✅ Newsletter membership scheduled for cancellation:`, data);
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
    console.log(`🔄 Reactivating newsletter membership ${membershipId}`);

    const response = await fetch(`${WHOP_API_URL}/memberships/${membershipId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        cancel_at_period_end: false 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Whop API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Whop API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`✅ Newsletter membership reactivated:`, data);
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
      return { success: false, error: `Whop API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
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
    await supabase.from("subscription_events").insert(eventData);
  } catch (err) {
    console.warn("Failed to log subscription event:", err);
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

    // Create Supabase client
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

    // Get user's newsletter subscription info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id, 
        email, 
        newsletter_enabled,
        newsletter_status,
        newsletter_whop_membership_id,
        newsletter_started_at,
        newsletter_expires_at,
        newsletter_trial_ends_at,
        newsletter_cancel_at_period_end
      `)
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

    console.log(`📨 Newsletter request:`, { action: body.action, userId: user.id });

    // Route to appropriate handler
    switch (body.action) {
      case "status":
        return handleStatus(profile, corsHeaders);

      case "cancel":
        return handleCancel(supabase, profile, body as CancelRequest, corsHeaders);

      case "undo_cancel":
        return handleUndoCancel(supabase, profile, corsHeaders);

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

function handleStatus(
  profile: any,
  corsHeaders: Record<string, string>
): Response {
  const isActive = profile.newsletter_enabled && 
    ['active', 'trial'].includes(profile.newsletter_status || '');

  const isInTrial = profile.newsletter_status === 'trial';
  
  let daysRemaining: number | null = null;
  if (profile.newsletter_expires_at) {
    const expiresAt = new Date(profile.newsletter_expires_at);
    const now = new Date();
    daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  let trialDaysRemaining: number | null = null;
  if (profile.newsletter_trial_ends_at && isInTrial) {
    const trialEndsAt = new Date(profile.newsletter_trial_ends_at);
    const now = new Date();
    trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return new Response(
    JSON.stringify({
      success: true,
      subscription: {
        enabled: profile.newsletter_enabled || false,
        status: profile.newsletter_status || 'inactive',
        isActive,
        isInTrial,
        expiresAt: profile.newsletter_expires_at,
        trialEndsAt: profile.newsletter_trial_ends_at,
        cancelAtPeriodEnd: profile.newsletter_cancel_at_period_end || false,
        hasMembership: !!profile.newsletter_whop_membership_id,
        daysRemaining,
        trialDaysRemaining,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// CANCEL HANDLER
// ============================================

async function handleCancel(
  supabase: any,
  profile: any,
  request: CancelRequest,
  corsHeaders: Record<string, string>
): Promise<Response> {
  
  // Check if user has active newsletter subscription
  const isActive = profile.newsletter_enabled && 
    ['active', 'trial'].includes(profile.newsletter_status || '');

  if (!isActive) {
    return new Response(
      JSON.stringify({ error: "No active War Zone subscription to cancel" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if already pending cancellation
  if (profile.newsletter_cancel_at_period_end) {
    return new Response(
      JSON.stringify({ 
        error: "Subscription is already scheduled for cancellation",
        expiresAt: profile.newsletter_expires_at
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const membershipId = profile.newsletter_whop_membership_id;
  const isInTrial = profile.newsletter_status === 'trial';

  // ============================================
  // STEP 1: Cancel via Whop API (if has membership)
  // ============================================
  
  if (membershipId && WHOP_API_KEY) {
    console.log(`🔄 Canceling Whop membership: ${membershipId}`);
    
    const cancelResult = await cancelWhopMembership(membershipId);

    if (!cancelResult.success) {
      console.error(`❌ Whop cancellation failed: ${cancelResult.error}`);
      // Continue anyway - we'll update DB
    } else {
      console.log(`✅ Whop membership scheduled for cancellation`);
    }
  } else {
    console.log(`⚠️ No Whop membership ID - updating DB only`);
  }

  // ============================================
  // STEP 2: Update profile in database
  // ============================================

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      newsletter_cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    console.error("❌ Profile update error:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to update subscription status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // STEP 3: Log subscription event
  // ============================================

  await logSubscriptionEvent(supabase, {
    user_id: profile.id,
    event_type: "cancel_scheduled",
    old_plan: "newsletter",
    new_plan: "none",
    reason: request.reason_label || request.reason || "User requested cancellation",
    scheduled_at: profile.newsletter_expires_at,
    metadata: {
      whop_membership_id: membershipId,
      cancelled_at: new Date().toISOString(),
      was_in_trial: isInTrial,
      reason_id: request.reason_id,
      feedback: request.feedback,
      subscription_type: 'newsletter',
    },
  });

  // ============================================
  // STEP 4: Return success response
  // ============================================

  // Format expiration date
  const expiresDate = profile.newsletter_expires_at 
    ? new Date(profile.newsletter_expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })
    : 'the end of your billing period';

  const trialMessage = isInTrial 
    ? "Your free trial has been cancelled. You won't be charged."
    : `Your War Zone subscription will be cancelled at the end of your billing period. You'll continue to have access until ${expiresDate}.`;

  return new Response(
    JSON.stringify({
      success: true,
      message: trialMessage,
      subscription: {
        status: profile.newsletter_status,
        cancelAtPeriodEnd: true,
        expiresAt: profile.newsletter_expires_at,
        wasInTrial: isInTrial,
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
  
  // Check if there's a pending cancellation
  if (!profile.newsletter_cancel_at_period_end) {
    return new Response(
      JSON.stringify({ error: "No pending cancellation to undo" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const membershipId = profile.newsletter_whop_membership_id;

  // ============================================
  // STEP 1: Reactivate via Whop API (if has membership)
  // ============================================

  if (membershipId && WHOP_API_KEY) {
    console.log(`🔄 Reactivating Whop membership: ${membershipId}`);
    
    const reactivateResult = await reactivateWhopMembership(membershipId);

    if (!reactivateResult.success) {
      console.error(`❌ Whop reactivation failed: ${reactivateResult.error}`);
      // Continue anyway - we'll update DB
    } else {
      console.log(`✅ Whop membership reactivated`);
    }
  }

  // ============================================
  // STEP 2: Update profile
  // ============================================

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      newsletter_cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    console.error("❌ Profile update error:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to update subscription status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ============================================
  // STEP 3: Log event
  // ============================================

  await logSubscriptionEvent(supabase, {
    user_id: profile.id,
    event_type: "reactivated",
    old_plan: "cancelling",
    new_plan: "newsletter",
    metadata: {
      whop_membership_id: membershipId,
      reactivated_at: new Date().toISOString(),
      subscription_type: 'newsletter',
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: "Your War Zone subscription has been reactivated!",
      subscription: {
        status: profile.newsletter_status,
        cancelAtPeriodEnd: false,
        expiresAt: profile.newsletter_expires_at,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}