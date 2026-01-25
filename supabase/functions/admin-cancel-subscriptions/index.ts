// supabase/functions/admin-cancel-subscriptions/index.ts
// =====================================================
// ADMIN CANCEL SUBSCRIPTIONS - Edge Function
// =====================================================
// מבטל את כל המנויים של משתמשים (Journal, Newsletter, Top Secret)
// כולל קריאה ל-Whop API לביטול ב-Whop
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHOP_API_KEY = Deno.env.get("WHOP_API_KEY") || "";
const WHOP_API_URL = "https://api.whop.com/api/v2";

// Cancel membership in Whop
async function cancelWhopMembership(membershipId: string): Promise<boolean> {
  if (!membershipId || !WHOP_API_KEY) {
    console.log(`⚠️ Skipping Whop cancellation: ${!membershipId ? 'no membership ID' : 'no API key'}`);
    return false;
  }

  try {
    const response = await fetch(`${WHOP_API_URL}/memberships/${membershipId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cancel_at_period_end: false, // Immediate cancellation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Whop API error for ${membershipId}: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`✅ Cancelled Whop membership: ${membershipId}`);
    return true;
  } catch (err) {
    console.error(`Whop API exception for ${membershipId}:`, err);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client for checking admin status
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !adminProfile || !["admin", "super_admin"].includes(adminProfile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get request body
    const { user_ids } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      throw new Error("user_ids array is required");
    }

    const results = {
      processed: [] as string[],
      failed: [] as { id: string; error: string }[],
      whop_cancelled: [] as string[],
    };

    for (const userId of user_ids) {
      try {
        // Get user's subscription info
        const { data: profile, error: fetchError } = await supabaseAdmin
          .from("profiles")
          .select(`
            email,
            whop_membership_id,
            newsletter_whop_membership_id,
            top_secret_whop_membership_id,
            platform_whop_membership_id,
            account_type,
            subscription_status,
            newsletter_status,
            top_secret_status,
            platform_subscription_status
          `)
          .eq("id", userId)
          .single();

        if (fetchError || !profile) {
          results.failed.push({ id: userId, error: "User not found" });
          continue;
        }

        // Cancel Whop memberships
        const membershipIds = [
          profile.whop_membership_id,
          profile.newsletter_whop_membership_id,
          profile.top_secret_whop_membership_id,
          profile.platform_whop_membership_id,
        ].filter(Boolean);

        for (const membershipId of membershipIds) {
          if (membershipId) {
            const cancelled = await cancelWhopMembership(membershipId);
            if (cancelled) {
              results.whop_cancelled.push(membershipId);
            }
          }
        }

        // Update profile - cancel all subscriptions locally
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            // Journal
            account_type: "free",
            subscription_status: "cancelled",
            subscription_cancel_at_period_end: false,
            whop_membership_id: null,
            whop_product_id: null,
            
            // Newsletter
            newsletter_enabled: false,
            newsletter_status: "cancelled",
            newsletter_cancel_at_period_end: false,
            newsletter_whop_membership_id: null,
            newsletter_unsubscribed_at: new Date().toISOString(),
            
            // Top Secret
            top_secret_enabled: false,
            top_secret_status: "cancelled",
            top_secret_cancel_at_period_end: false,
            top_secret_whop_membership_id: null,
            top_secret_unsubscribed_at: new Date().toISOString(),
            
            // Platform
            platform_plan: "free",
            platform_subscription_status: "cancelled",
            platform_cancel_at_period_end: false,
            platform_whop_membership_id: null,
            platform_cancelled_at: new Date().toISOString(),
            
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        // Log subscription event
        await supabaseAdmin.from("subscription_events").insert({
          user_id: userId,
          event_type: "cancelled",
          old_plan: profile.account_type || "unknown",
          new_plan: "free",
          reason: "Admin cancelled all subscriptions",
          processed_at: new Date().toISOString(),
          metadata: {
            cancelled_by_admin: user.id,
            previous_status: {
              journal: profile.subscription_status,
              newsletter: profile.newsletter_status,
              top_secret: profile.top_secret_status,
              platform: profile.platform_subscription_status,
            },
            whop_memberships_cancelled: membershipIds,
          },
        });

        results.processed.push(userId);
        console.log(`✅ Cancelled all subscriptions for: ${profile.email}`);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        results.failed.push({ id: userId, error: errorMessage });
        console.error(`❌ Failed to cancel subscriptions for ${userId}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: results.processed.length,
        failed_count: results.failed.length,
        whop_cancelled_count: results.whop_cancelled.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 400,
      }
    );
  }
});