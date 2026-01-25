// supabase/functions/admin-delete-users/index.ts
// =====================================================
// ADMIN DELETE USERS - Edge Function
// =====================================================
// מוחק משתמשים לחלוטין מהמערכת
// כולל: auth.users, profiles, וכל הנתונים הקשורים
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Client for checking admin status (uses user's token)
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

    // Prevent admin from deleting themselves
    if (user_ids.includes(user.id)) {
      throw new Error("Cannot delete your own account");
    }

    const results = {
      deleted: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const userId of user_ids) {
      try {
        // 1. Get user email for logging
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, role")
          .eq("id", userId)
          .single();

        // Prevent deleting other admins (only super_admin can)
        if (profile?.role === "admin" && adminProfile.role !== "super_admin") {
          results.failed.push({ id: userId, error: "Cannot delete admin users" });
          continue;
        }

        if (profile?.role === "super_admin") {
          results.failed.push({ id: userId, error: "Cannot delete super_admin users" });
          continue;
        }

        // 2. Delete related data first (due to FK constraints)
        // Trades
        await supabaseAdmin.from("trades").delete().eq("user_id", userId);
        
        // Trade tags
        await supabaseAdmin.from("trade_tags").delete().eq("user_id", userId);
        
        // Watchlist
        await supabaseAdmin.from("watchlist").delete().eq("user_id", userId);
        
        // Notes
        await supabaseAdmin.from("notes").delete().eq("user_id", userId);
        
        // Affiliate referrals (where user was referred)
        await supabaseAdmin.from("affiliate_referrals").delete().eq("referred_user_id", userId);
        
        // Affiliate (if user is an affiliate)
        await supabaseAdmin.from("affiliates").delete().eq("user_id", userId);
        
        // Subscription events
        await supabaseAdmin.from("subscription_events").delete().eq("user_id", userId);

        // 3. Delete profile
        const { error: profileDeleteError } = await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("id", userId);

        if (profileDeleteError) {
          throw new Error(`Profile delete failed: ${profileDeleteError.message}`);
        }

        // 4. Delete from auth.users (using Admin API)
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authDeleteError) {
          throw new Error(`Auth delete failed: ${authDeleteError.message}`);
        }

        results.deleted.push(userId);
        console.log(`✅ Deleted user: ${profile?.email || userId}`);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        results.failed.push({ id: userId, error: errorMessage });
        console.error(`❌ Failed to delete ${userId}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: results.deleted.length,
        failed_count: results.failed.length,
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