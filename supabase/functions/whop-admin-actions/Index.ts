// =====================================================
// FINOTAUR WHOP ADMIN ACTIONS - v1.0.0
// =====================================================
// Edge Function for admin management of subscriptions
// 
// Actions supported:
// - list: Get all memberships for a product
// - get: Get single membership details
// - cancel: Cancel subscription (immediate or at period end)
// - resume: Resume cancelled subscription
// - extend: Add free days / extend trial
// - ban: Ban a user
// - unban: Unban a user
// - transfer: Generate transfer link
//
// Deployment:
// supabase functions deploy whop-admin-actions
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

// Product IDs
const PRODUCT_IDS = {
  // War Zone (Newsletter)
  war_zone_monthly: "prod_qlaV5Uu6LZlYn",
  war_zone_yearly: "prod_8b3VWkZdena4B",
  war_zone_topsecret: "prod_u7QrZi90xiCZA",
  // Top Secret
  top_secret: "prod_nl6YXbLp4t5pz",
} as const;

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

type ProductType = "war_zone" | "top_secret";

type AdminAction = 
  | "list"
  | "get"
  | "cancel"
  | "resume"
  | "extend"
  | "ban"
  | "unban"
  | "transfer"
  | "sync";

interface AdminRequest {
  action: AdminAction;
  product?: ProductType;
  membership_id?: string;
  user_id?: string;
  days?: number;
  cancel_mode?: "immediate" | "at_period_end";
  reason?: string;
}

interface WhopMembership {
  id: string;
  product: { id: string; name: string };
  plan: { id: string; plan_type: string; renewal_period: string };
  user: { id: string; email: string; username?: string };
  status: string;
  valid: boolean;
  cancel_at_period_end: boolean;
  license_key?: string;
  created_at: number;
  renewal_period_start?: number;
  renewal_period_end?: number;
  canceled_at?: number;
  manage_url?: string;
  affiliate_page_url?: string;
  checkout_session?: {
    id: string;
    metadata?: Record<string, string>;
  };
  metadata?: Record<string, string>;
}

interface WhopUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  image?: string;
  social_accounts?: Array<{ service: string; username: string }>;
}

interface MembershipWithLocalData extends WhopMembership {
  local_user_id?: string;
  local_email?: string;
  display_name?: string;
  total_payments?: number;
  newsletter_status?: string;
  top_secret_status?: string;
  trial_ends_at?: string;
}

// ============================================
// WHOP API HELPERS
// ============================================

async function whopRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${WHOP_API_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Whop API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Whop API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Whop request error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// LIST MEMBERSHIPS BY PRODUCT
// ============================================

async function listMemberships(
  supabase: ReturnType<typeof createClient>,
  product: ProductType
): Promise<{ success: boolean; data?: MembershipWithLocalData[]; error?: string }> {
  console.log(`📋 Listing memberships for ${product}...`);

  // Get product IDs for this product type
  let productIds: string[] = [];
  if (product === "war_zone") {
    productIds = [
      PRODUCT_IDS.war_zone_monthly,
      PRODUCT_IDS.war_zone_yearly,
      PRODUCT_IDS.war_zone_topsecret,
    ];
  } else if (product === "top_secret") {
    productIds = [PRODUCT_IDS.top_secret];
  }

  // Fetch from Whop API for each product
  const allMemberships: WhopMembership[] = [];

  for (const productId of productIds) {
    const result = await whopRequest<{ data: WhopMembership[] }>(
      `/memberships?product_id=${productId}&per=100`
    );

    if (result.success && result.data?.data) {
      allMemberships.push(...result.data.data);
    }
  }

  console.log(`✅ Found ${allMemberships.length} memberships from Whop`);

  // Enrich with local data
  const enrichedMemberships: MembershipWithLocalData[] = [];

  for (const membership of allMemberships) {
    const enriched: MembershipWithLocalData = { ...membership };

    // Find local user by Whop membership ID or email
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        id, email, display_name,
        newsletter_status, newsletter_whop_membership_id, newsletter_trial_ends_at,
        top_secret_status, top_secret_whop_membership_id, top_secret_expires_at
      `)
      .or(`newsletter_whop_membership_id.eq.${membership.id},top_secret_whop_membership_id.eq.${membership.id},email.ilike.${membership.user?.email || ''}`)
      .maybeSingle();

    if (profile) {
      enriched.local_user_id = profile.id;
      enriched.local_email = profile.email;
      enriched.display_name = profile.display_name;
      
      if (product === "war_zone") {
        enriched.newsletter_status = profile.newsletter_status;
        enriched.trial_ends_at = profile.newsletter_trial_ends_at;
      } else if (product === "top_secret") {
        enriched.top_secret_status = profile.top_secret_status;
        enriched.trial_ends_at = profile.top_secret_expires_at;
      }
    }

    // Get total payments from webhook log
    const { data: payments } = await supabase
      .from("whop_webhook_log")
      .select("payload")
      .eq("whop_membership_id", membership.id)
      .eq("event_type", "payment.succeeded");

    if (payments && payments.length > 0) {
      let total = 0;
      for (const p of payments) {
        const amount = p.payload?.data?.subtotal || p.payload?.data?.total || 0;
        total += amount > 1000 ? amount / 100 : amount;
      }
      enriched.total_payments = total;
    }

    enrichedMemberships.push(enriched);
  }

  // Sort by created_at descending (newest first)
  enrichedMemberships.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  return { success: true, data: enrichedMemberships };
}

// ============================================
// GET SINGLE MEMBERSHIP
// ============================================

async function getMembership(
  membershipId: string
): Promise<{ success: boolean; data?: WhopMembership; error?: string }> {
  console.log(`🔍 Getting membership ${membershipId}...`);
  return await whopRequest<WhopMembership>(`/memberships/${membershipId}`);
}

// ============================================
// CANCEL MEMBERSHIP
// ============================================

async function cancelMembership(
  supabase: ReturnType<typeof createClient>,
  membershipId: string,
  mode: "immediate" | "at_period_end" = "at_period_end",
  reason?: string
): Promise<{ success: boolean; message: string }> {
  console.log(`❌ Cancelling membership ${membershipId} (mode: ${mode})...`);

  const result = await whopRequest<WhopMembership>(
    `/memberships/${membershipId}/cancel`,
    "POST",
    { mode }
  );

  if (!result.success) {
    return { success: false, message: result.error || "Failed to cancel" };
  }

  // Update local DB
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, newsletter_whop_membership_id, top_secret_whop_membership_id")
    .or(`newsletter_whop_membership_id.eq.${membershipId},top_secret_whop_membership_id.eq.${membershipId}`)
    .maybeSingle();

  if (profile) {
    const isNewsletter = profile.newsletter_whop_membership_id === membershipId;
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (mode === "immediate") {
      if (isNewsletter) {
        updateData.newsletter_enabled = false;
        updateData.newsletter_status = "cancelled";
        updateData.newsletter_cancel_at_period_end = false;
        updateData.newsletter_unsubscribed_at = new Date().toISOString();
      } else {
        updateData.top_secret_enabled = false;
        updateData.top_secret_status = "cancelled";
        updateData.top_secret_cancel_at_period_end = false;
        updateData.top_secret_unsubscribed_at = new Date().toISOString();
      }
    } else {
      if (isNewsletter) {
        updateData.newsletter_cancel_at_period_end = true;
      } else {
        updateData.top_secret_cancel_at_period_end = true;
      }
    }

    await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    // Log admin action
    await supabase
      .from("admin_actions_log")
      .insert({
        action_type: "subscription_cancel",
        target_user_id: profile.id,
        target_membership_id: membershipId,
        details: { mode, reason, product: isNewsletter ? "war_zone" : "top_secret" },
      });
  }

  return { 
    success: true, 
    message: mode === "immediate" 
      ? "Subscription cancelled immediately" 
      : "Subscription will cancel at period end"
  };
}

// ============================================
// RESUME MEMBERSHIP
// ============================================

async function resumeMembership(
  supabase: ReturnType<typeof createClient>,
  membershipId: string
): Promise<{ success: boolean; message: string }> {
  console.log(`▶️ Resuming membership ${membershipId}...`);

  const result = await whopRequest<WhopMembership>(
    `/memberships/${membershipId}`,
    "POST",
    { cancel_at_period_end: false }
  );

  if (!result.success) {
    return { success: false, message: result.error || "Failed to resume" };
  }

  // Update local DB
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, newsletter_whop_membership_id, top_secret_whop_membership_id")
    .or(`newsletter_whop_membership_id.eq.${membershipId},top_secret_whop_membership_id.eq.${membershipId}`)
    .maybeSingle();

  if (profile) {
    const isNewsletter = profile.newsletter_whop_membership_id === membershipId;
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (isNewsletter) {
      updateData.newsletter_cancel_at_period_end = false;
    } else {
      updateData.top_secret_cancel_at_period_end = false;
    }

    await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    // Log admin action
    await supabase
      .from("admin_actions_log")
      .insert({
        action_type: "subscription_resume",
        target_user_id: profile.id,
        target_membership_id: membershipId,
        details: { product: isNewsletter ? "war_zone" : "top_secret" },
      });
  }

  return { success: true, message: "Subscription resumed successfully" };
}

// ============================================
// EXTEND / ADD FREE DAYS
// ============================================

async function extendMembership(
  supabase: ReturnType<typeof createClient>,
  membershipId: string,
  days: number
): Promise<{ success: boolean; message: string; new_end_date?: string }> {
  console.log(`📅 Extending membership ${membershipId} by ${days} days...`);

  // Get current membership to calculate new end date
  const membershipResult = await getMembership(membershipId);
  if (!membershipResult.success || !membershipResult.data) {
    return { success: false, message: "Failed to get membership details" };
  }

  const membership = membershipResult.data;
  
  // Calculate new end date
  const currentEnd = membership.renewal_period_end 
    ? new Date(membership.renewal_period_end * 1000)
    : new Date();
  
  const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);
  const newEndTimestamp = Math.floor(newEnd.getTime() / 1000);

  // Update via Whop API - Add free days
  const result = await whopRequest<WhopMembership>(
    `/memberships/${membershipId}`,
    "POST",
    { 
      renewal_period_end: newEndTimestamp,
    }
  );

  if (!result.success) {
    // Try alternative endpoint for adding free time
    const altResult = await whopRequest<WhopMembership>(
      `/memberships/${membershipId}/add_free_days`,
      "POST",
      { days }
    );

    if (!altResult.success) {
      return { success: false, message: result.error || "Failed to extend membership" };
    }
  }

  // Update local DB
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, newsletter_whop_membership_id, top_secret_whop_membership_id")
    .or(`newsletter_whop_membership_id.eq.${membershipId},top_secret_whop_membership_id.eq.${membershipId}`)
    .maybeSingle();

  if (profile) {
    const isNewsletter = profile.newsletter_whop_membership_id === membershipId;
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (isNewsletter) {
      updateData.newsletter_expires_at = newEnd.toISOString();
    } else {
      updateData.top_secret_expires_at = newEnd.toISOString();
    }

    await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    // Log admin action
    await supabase
      .from("admin_actions_log")
      .insert({
        action_type: "subscription_extend",
        target_user_id: profile.id,
        target_membership_id: membershipId,
        details: { 
          days_added: days, 
          new_end_date: newEnd.toISOString(),
          product: isNewsletter ? "war_zone" : "top_secret" 
        },
      });
  }

  return { 
    success: true, 
    message: `Added ${days} free days`,
    new_end_date: newEnd.toISOString()
  };
}

// ============================================
// BAN USER
// ============================================

async function banUser(
  supabase: ReturnType<typeof createClient>,
  membershipId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  console.log(`🚫 Banning user for membership ${membershipId}...`);

  // First cancel the membership immediately
  const cancelResult = await cancelMembership(supabase, membershipId, "immediate", reason);
  
  if (!cancelResult.success) {
    return cancelResult;
  }

  // Get membership to find user
  const membershipResult = await getMembership(membershipId);
  if (!membershipResult.success || !membershipResult.data) {
    return { success: false, message: "Failed to get membership details" };
  }

  const whopUserId = membershipResult.data.user?.id;

  // Update local profile to mark as banned
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, newsletter_whop_membership_id, top_secret_whop_membership_id")
    .or(`newsletter_whop_membership_id.eq.${membershipId},top_secret_whop_membership_id.eq.${membershipId}`)
    .maybeSingle();

  if (profile) {
    await supabase
      .from("profiles")
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: reason || "Banned by admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    // Log admin action
    await supabase
      .from("admin_actions_log")
      .insert({
        action_type: "user_ban",
        target_user_id: profile.id,
        target_membership_id: membershipId,
        details: { reason, whop_user_id: whopUserId },
      });
  }

  return { success: true, message: "User banned and subscription cancelled" };
}

// ============================================
// UNBAN USER
// ============================================

async function unbanUser(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ success: boolean; message: string }> {
  console.log(`✅ Unbanning user ${userId}...`);

  const { error } = await supabase
    .from("profiles")
    .update({
      is_banned: false,
      banned_at: null,
      ban_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { success: false, message: error.message };
  }

  // Log admin action
  await supabase
    .from("admin_actions_log")
    .insert({
      action_type: "user_unban",
      target_user_id: userId,
      details: {},
    });

  return { success: true, message: "User unbanned successfully" };
}

// ============================================
// GENERATE TRANSFER LINK
// ============================================

async function generateTransferLink(
  membershipId: string
): Promise<{ success: boolean; transfer_url?: string; message?: string }> {
  console.log(`🔗 Generating transfer link for ${membershipId}...`);

  const result = await whopRequest<{ transfer_url: string }>(
    `/memberships/${membershipId}/transfer_link`,
    "POST"
  );

  if (!result.success || !result.data?.transfer_url) {
    return { success: false, message: result.error || "Failed to generate transfer link" };
  }

  return { success: true, transfer_url: result.data.transfer_url };
}

// ============================================
// SYNC LOCAL DB WITH WHOP
// ============================================

async function syncWithWhop(
  supabase: ReturnType<typeof createClient>,
  product: ProductType
): Promise<{ success: boolean; message: string; synced_count: number }> {
  console.log(`🔄 Syncing ${product} with Whop...`);

  const listResult = await listMemberships(supabase, product);
  if (!listResult.success || !listResult.data) {
    return { success: false, message: "Failed to fetch memberships", synced_count: 0 };
  }

  let syncedCount = 0;

  for (const membership of listResult.data) {
    if (!membership.local_user_id || !membership.user?.email) continue;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (product === "war_zone") {
      updateData.newsletter_whop_membership_id = membership.id;
      updateData.newsletter_status = membership.status === "active" ? "active" : 
                                     membership.status === "trialing" ? "trial" : 
                                     membership.status;
      updateData.newsletter_enabled = membership.valid;
      updateData.newsletter_cancel_at_period_end = membership.cancel_at_period_end;
      if (membership.renewal_period_end) {
        updateData.newsletter_expires_at = new Date(membership.renewal_period_end * 1000).toISOString();
      }
    } else if (product === "top_secret") {
      updateData.top_secret_whop_membership_id = membership.id;
      updateData.top_secret_status = membership.status === "active" ? "active" : 
                                     membership.status === "trialing" ? "trial" : 
                                     membership.status;
      updateData.top_secret_enabled = membership.valid;
      updateData.top_secret_cancel_at_period_end = membership.cancel_at_period_end;
      if (membership.renewal_period_end) {
        updateData.top_secret_expires_at = new Date(membership.renewal_period_end * 1000).toISOString();
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", membership.local_user_id);

    if (!error) {
      syncedCount++;
    }
  }

  return { 
    success: true, 
    message: `Synced ${syncedCount} memberships`,
    synced_count: syncedCount 
  };
}

// ============================================
// VERIFY ADMIN
// ============================================

async function verifyAdmin(
  supabase: ReturnType<typeof createClient>,
  authHeader: string
): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (error || !user) {
    return { isAdmin: false, error: "Unauthorized" };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true || profile?.role === "admin";

  return { isAdmin, userId: user.id };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin
    const adminCheck = await verifyAdmin(supabase, authHeader);
    if (!adminCheck.isAdmin) {
      console.error("❌ Non-admin access attempt");
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`👤 Admin verified: ${adminCheck.userId}`);

    // Parse request
    const body: AdminRequest = await req.json();
    const { action, product, membership_id, user_id, days, cancel_mode, reason } = body;

    console.log(`📨 Admin action: ${action}`, { product, membership_id, user_id });

    let result: { success: boolean; [key: string]: unknown };

    switch (action) {
      case "list":
        if (!product) {
          return new Response(
            JSON.stringify({ error: "Product type required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await listMemberships(supabase, product);
        break;

      case "get":
        if (!membership_id) {
          return new Response(
            JSON.stringify({ error: "Membership ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await getMembership(membership_id);
        break;

      case "cancel":
        if (!membership_id) {
          return new Response(
            JSON.stringify({ error: "Membership ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await cancelMembership(supabase, membership_id, cancel_mode || "at_period_end", reason);
        break;

      case "resume":
        if (!membership_id) {
          return new Response(
            JSON.stringify({ error: "Membership ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await resumeMembership(supabase, membership_id);
        break;

      case "extend":
        if (!membership_id || !days) {
          return new Response(
            JSON.stringify({ error: "Membership ID and days required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await extendMembership(supabase, membership_id, days);
        break;

      case "ban":
        if (!membership_id) {
          return new Response(
            JSON.stringify({ error: "Membership ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await banUser(supabase, membership_id, reason);
        break;

      case "unban":
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "User ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await unbanUser(supabase, user_id);
        break;

      case "transfer":
        if (!membership_id) {
          return new Response(
            JSON.stringify({ error: "Membership ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await generateTransferLink(membership_id);
        break;

      case "sync":
        if (!product) {
          return new Response(
            JSON.stringify({ error: "Product type required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await syncWithWhop(supabase, product);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`✅ Action ${action} completed:`, result.success);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

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