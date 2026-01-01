// =====================================================
// FINOTAUR PLATFORM WHOP WEBHOOK HANDLER - v1.0.0
// =====================================================
// 
// 🔥 PLATFORM SUBSCRIPTIONS ONLY
// Handles: Core, Pro, Enterprise
// Separate from Journal webhook!
// 
// Product IDs:
// - Core Monthly: prod_HDYzeNp6WOJwh ($39/mo, 7-day trial)
// - Core Yearly: prod_YAdXQrHtt72Gd ($349/yr, NO trial)
// - Pro Monthly: prod_lhe19l7l48lKW ($69/mo, 14-day ONE-TIME trial)
// - Pro Yearly: prod_3AyUOETP3CoK6 ($619/yr, NO trial)
// - Enterprise: prod_PLATFORM_ENTERPRISE (custom)
// 
// Deploy: supabase functions deploy platform-whop-webhook
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

// ============================================
// CONFIGURATION
// ============================================

const WHOP_WEBHOOK_SECRET = Deno.env.get("WHOP_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 🔥 PLATFORM PRODUCT IDs ONLY
const PLATFORM_PRODUCT_IDS = new Set([
  'prod_HDYzeNp6WOJwh',  // Core Monthly
  'prod_YAdXQrHtt72Gd',  // Core Yearly
  'prod_lhe19l7l48lKW',  // Pro Monthly
  'prod_3AyUOETP3CoK6',  // Pro Yearly
  'prod_PLATFORM_ENTERPRISE',  // Enterprise
]);

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

interface WhopMetadata {
  finotaur_user_id?: string;
  subscription_category?: string;
  newsletter_choice?: string;
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
// HELPER: Check if Platform product
// ============================================

function isPlatformProduct(productId: string | undefined): boolean {
  if (!productId) return false;
  return PLATFORM_PRODUCT_IDS.has(productId);
}

// ============================================
// HELPER: Extract metadata
// ============================================

function extractMetadata(data: WhopPaymentData | WhopMembershipData): WhopMetadata {
  return {
    finotaur_user_id: data.metadata?.finotaur_user_id || 
                       data.checkout_session?.metadata?.finotaur_user_id || 
                       data.custom_metadata?.finotaur_user_id,
    newsletter_choice: data.metadata?.newsletter_choice || 
                       data.checkout_session?.metadata?.newsletter_choice || 
                       data.custom_metadata?.newsletter_choice,
    click_id: data.metadata?.click_id || 
              data.checkout_session?.metadata?.click_id || 
              data.custom_metadata?.click_id,
  };
}

// ============================================
// HELPER: Find user
// ============================================

async function findUser(
  supabase: SupabaseClient,
  finotaurUserId: string | null | undefined,
  whopEmail: string | undefined
): Promise<{ id: string; email: string } | null> {
  
  // Try finotaur_user_id first
  if (finotaurUserId) {
    const { data: userById } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", finotaurUserId)
      .maybeSingle();

    if (userById) {
      console.log("✅ Found user by finotaur_user_id:", userById.id);
      return userById;
    }
  }

  // Try email
  if (whopEmail) {
    const { data: userByEmail } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", whopEmail)
      .maybeSingle();

    if (userByEmail) {
      console.log("✅ Found user by email:", userByEmail.id);
      return userByEmail;
    }
  }

  // Retry with delay
  if (finotaurUserId || whopEmail) {
    console.log('⏳ User not found, retrying in 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (finotaurUserId) {
      const { data: userById } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("id", finotaurUserId)
        .maybeSingle();
      if (userById) return userById;
    }
    
    if (whopEmail) {
      const { data: userByEmail } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", whopEmail)
        .maybeSingle();
      if (userByEmail) return userByEmail;
    }
  }

  console.warn(`⚠️ User not found: finotaur_user_id=${finotaurUserId}, email=${whopEmail}`);
  return null;
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

    // 🔥 FILTER: Only process Platform products
    if (!isPlatformProduct(productId)) {
      console.log(`⏭️ Skipping non-Platform product: ${productId}`);
      return new Response(
        JSON.stringify({ success: true, message: "Not a Platform product, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metadata = extractMetadata(payload.data);

    console.log("📨 Platform Webhook received:", {
      eventType,
      eventId,
      timestamp: payload.timestamp,
      productId,
      finotaurUserId: metadata.finotaur_user_id,
      whopEmail: payload.data.user?.email,
      newsletterChoice: metadata.newsletter_choice,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Check for duplicates
    const { data: existingEvent } = await supabase
      .from("platform_webhook_log")
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

    // Log webhook
    const { data: logEntry } = await supabase
      .from("platform_webhook_log")
      .insert({
        event_id: eventId,
        event_type: eventType,
        whop_user_id: whopUserId,
        whop_membership_id: whopMembershipId,
        whop_product_id: whopProductId,
        payload: payload,
        processed: false,
        metadata: {
          finotaur_user_id: metadata.finotaur_user_id,
          newsletter_choice: metadata.newsletter_choice,
        },
      })
      .select()
      .single();

    let result: { success: boolean; message: string };

    switch (eventType) {
      case "payment.succeeded":
        result = await handlePaymentSucceeded(supabase, payload, metadata);
        break;
        
      case "membership.activated":
      case "membership.went_valid":
        result = await handleMembershipActivated(supabase, payload, metadata);
        break;

      case "membership.deactivated":
      case "membership.went_invalid":
      case "membership.canceled":
        result = await handleMembershipDeactivated(supabase, payload, metadata);
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
        .from("platform_webhook_log")
        .update({
          processed: result.success,
          processing_result: result.message,
          error_message: result.success ? null : result.message,
          processed_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Platform Webhook processed in ${duration}ms:`, result);

    return new Response(
      JSON.stringify({ ...result, duration_ms: duration }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Platform Webhook error:", error);
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
// PAYMENT SUCCEEDED
// ============================================

async function handlePaymentSucceeded(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  metadata: WhopMetadata
): Promise<{ success: boolean; message: string }> {
  try {
    const data = payload.data as WhopPaymentData;
    
    const userEmail = data.user?.email || '';
    const whopUserId = data.user?.id || '';
    const productId = data.product?.id || '';
    const membershipId = data.membership?.id || '';
    const planId = data.plan?.id || '';
    const isFirstPayment = data.billing_reason === "subscription_create";
    
    let paymentAmount = data.subtotal || data.total || data.usd_total || 0;
    if (paymentAmount > 1000) {
      paymentAmount = paymentAmount / 100;
    }

    console.log("💰 Processing Platform payment.succeeded:", {
      finotaurUserId: metadata.finotaur_user_id,
      email: userEmail,
      productId,
      membershipId,
      amount: paymentAmount,
      billingReason: data.billing_reason,
      isFirstPayment,
      newsletterChoice: metadata.newsletter_choice,
    });

    if (!productId) {
      return { success: false, message: "No product ID in payment data" };
    }

    if (isFirstPayment) {
      // ═══════════════════════════════════════════════
      // FIRST PAYMENT - Activate subscription
      // ═══════════════════════════════════════════════
      
      console.log("🆕 Calling activate_platform_subscription RPC...");
      
      const { data: result, error } = await supabase.rpc('activate_platform_subscription', {
        p_user_email: userEmail,
        p_whop_user_id: whopUserId,
        p_whop_membership_id: membershipId,
        p_whop_product_id: productId,
        p_whop_plan_id: planId,
        p_finotaur_user_id: metadata.finotaur_user_id || null,
        p_newsletter_choice: metadata.newsletter_choice || null,
      });

      if (error) {
        console.error("❌ activate_platform_subscription RPC error:", error);
        return { success: false, message: `Platform activation failed: ${error.message}` };
      }

      console.log("✅ activate_platform_subscription RPC result:", result);

      return { 
        success: result?.success ?? true, 
        message: `Platform ${result?.plan || 'subscription'} activated for ${userEmail}` 
      };

    } else {
      // ═══════════════════════════════════════════════
      // RECURRING PAYMENT - Process payment
      // ═══════════════════════════════════════════════
      
      console.log("🔄 Calling handle_platform_payment RPC...");
      
      const { data: result, error } = await supabase.rpc('handle_platform_payment', {
        p_whop_membership_id: membershipId,
        p_payment_amount: paymentAmount,
      });

      if (error) {
        console.error("❌ handle_platform_payment RPC error:", error);
        return { success: false, message: `Platform payment failed: ${error.message}` };
      }

      console.log("✅ handle_platform_payment RPC result:", result);

      return { 
        success: result?.success ?? true, 
        message: result?.message || `Platform payment processed for ${userEmail}` 
      };
    }

  } catch (error) {
    console.error("❌ handlePaymentSucceeded error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================
// MEMBERSHIP ACTIVATED
// ============================================

async function handleMembershipActivated(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  metadata: WhopMetadata
): Promise<{ success: boolean; message: string }> {
  const data = payload.data as WhopMembershipData;
  const membershipId = data.id;
  const userEmail = data.user?.email;
  const productId = data.product?.id;

  console.log("🎫 Processing Platform membership.activated:", {
    membershipId,
    userEmail,
    productId,
    finotaurUserId: metadata.finotaur_user_id,
  });

  // Check if already processed by payment.succeeded
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email, platform_subscription_status")
    .eq("platform_whop_membership_id", membershipId)
    .maybeSingle();

  if (existingProfile && existingProfile.platform_subscription_status === "active") {
    return { success: true, message: `Platform membership already active for ${existingProfile.email}` };
  }

  return { success: true, message: `Platform membership activated event received for ${membershipId}` };
}

// ============================================
// MEMBERSHIP DEACTIVATED
// ============================================

async function handleMembershipDeactivated(
  supabase: SupabaseClient,
  payload: WhopWebhookPayload,
  metadata: WhopMetadata
): Promise<{ success: boolean; message: string }> {
  const data = payload.data as WhopMembershipData;
  const membershipId = data.id;
  const userEmail = data.user?.email || '';

  console.log("❌ Processing Platform membership.deactivated:", {
    membershipId,
    userEmail,
    finotaurUserId: metadata.finotaur_user_id,
  });

  console.log("📦 Calling deactivate_platform_subscription RPC...");
  
  const { data: result, error } = await supabase.rpc('deactivate_platform_subscription', {
    p_whop_membership_id: membershipId,
  });

  if (error) {
    console.error("❌ deactivate_platform_subscription RPC error:", error);
    return { success: false, message: `Platform deactivation failed: ${error.message}` };
  }

  console.log("✅ deactivate_platform_subscription RPC result:", result);

  return { 
    success: result?.success ?? true, 
    message: `Platform subscription deactivated: ${result?.email || userEmail}` 
  };
}