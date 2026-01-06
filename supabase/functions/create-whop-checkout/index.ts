// =====================================================
// FINOTAUR CREATE WHOP CHECKOUT - v1.2.0
// =====================================================
// 
// 🔥 v1.2.0 CHANGES:
// - ADDED: Email prefill in checkout form
// - ADDED: finotaur_email in metadata (always uses original email)
// - Even if user changes email in checkout, Finotaur account gets the sub
// 
// 🔥 v1.1.0 CHANGES:
// - Changed from v5 to v2 API endpoint
// 
// Deploy: supabase functions deploy create-whop-checkout
// 
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// CONFIGURATION
// ============================================

const WHOP_API_KEY = Deno.env.get("WHOP_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

// Base redirect URL
const BASE_REDIRECT_URL = "https://www.finotaur.com";

// 🔥 CORRECT V2 API ENDPOINT
const WHOP_API_URL = "https://api.whop.com/api/v2/checkout_sessions";

// ============================================
// CORS HEADERS
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================
// TYPES
// ============================================

interface CheckoutRequest {
  plan_id: string;
  affiliate_code?: string;
  click_id?: string;
  redirect_url?: string;
  subscription_category?: string;
  email?: string;       // 🔥 v1.2: Email for prefill
  user_id?: string;     // 🔥 v1.2: User ID from client (backup)
}

interface WhopCheckoutResponse {
  id: string;
  purchase_url: string;  // 🔥 V2 returns purchase_url, not checkout_url
  redirect_url?: string;
  affiliate_code?: string;
  metadata?: Record<string, any>;
  plan_id?: string;
}

// ============================================
// PLAN CONFIGURATION
// ============================================

const PLAN_REDIRECT_PATHS: Record<string, string> = {
  // Journal plans
  'plan_2hIXaJbGP1tYN': '/app/journal/pricing?payment=success&source=whop',
  'plan_x0jTFLe9qNv8i': '/app/journal/pricing?payment=success&source=whop',
  'plan_v7QKxkvKIZooe': '/app/journal/pricing?payment=success&source=whop',
  'plan_gBG436aeJxaHU': '/app/journal/pricing?payment=success&source=whop',
  // Newsletter
  'plan_LCBG5yJpoNtW3': '/app/all-markets/warzone?payment=success&source=whop',
  // Top Secret
  'plan_9VxdBaa2Z5KQy': '/app/top-secret?payment=success&source=whop',
  'plan_YoeD6wWBxss7Q': '/app/top-secret?payment=success&source=whop',
};

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ============================================
    // 1. AUTHENTICATE USER
    // ============================================
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Authenticated user:", user.id, user.email);

    // ============================================
    // 2. PARSE REQUEST
    // ============================================

    const body: CheckoutRequest = await req.json();
    const { 
      plan_id, 
      affiliate_code, 
      click_id, 
      redirect_url,
      subscription_category,
      email: clientEmail,  // 🔥 v1.2: Email from client (backup)
    } = body;

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: "Missing plan_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔥 v1.2: Use authenticated user's email (most reliable), fallback to client email
    const finotaurEmail = user.email || clientEmail;

    console.log("📦 Checkout request:", {
      plan_id,
      user_id: user.id,
      user_email: user.email,
      client_email: clientEmail,
      finotaur_email: finotaurEmail,
      affiliate_code,
      click_id,
      subscription_category,
    });

    // ============================================
    // 3. VALIDATE WHOP API KEY
    // ============================================

    if (!WHOP_API_KEY) {
      console.error("❌ Missing WHOP_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 4. BUILD METADATA
    // 🔥 v1.2: finotaur_email ensures we ALWAYS know which 
    //          Finotaur account should get the subscription,
    //          even if user changes email in checkout!
    // ============================================

    const metadata: Record<string, string> = {
      finotaur_user_id: user.id,
      finotaur_email: finotaurEmail || '',  // 🔥 CRITICAL: Original email for webhook
    };

    if (click_id) {
      metadata.click_id = click_id;
    }

    if (subscription_category) {
      metadata.subscription_category = subscription_category;
    }

    // Keep expected_email for backwards compatibility
    if (finotaurEmail) {
      metadata.expected_email = finotaurEmail;
    }

    // ============================================
    // 5. DETERMINE REDIRECT URL
    // ============================================

    let finalRedirectUrl = redirect_url;
    
    if (!finalRedirectUrl) {
      const planPath = PLAN_REDIRECT_PATHS[plan_id] || '/app/journal/settings?payment=success&source=whop';
      finalRedirectUrl = `${BASE_REDIRECT_URL}${planPath}`;
    }

    // Add user_id to redirect URL for client-side verification
    const redirectUrlObj = new URL(finalRedirectUrl);
    redirectUrlObj.searchParams.set('uid', user.id);
    finalRedirectUrl = redirectUrlObj.toString();

    // ============================================
    // 6. CREATE WHOP CHECKOUT SESSION (V2 API)
    // 🔥 v1.2: Added email field for prefill
    // ============================================

    console.log("🛒 Creating Whop checkout session (V2 API)...");

    // 🔥 V2 API format with email prefill
    const whopRequestBody: Record<string, any> = {
      plan_id: plan_id,
      metadata: metadata,
      redirect_url: finalRedirectUrl,
    };

    // 🔥 v1.2: Add email for prefill in checkout form
    if (finotaurEmail) {
      whopRequestBody.email = finotaurEmail;
    }

    // Add affiliate code if provided
    if (affiliate_code) {
      whopRequestBody.affiliate_code = affiliate_code;
    }

    console.log("📤 Whop API request:", JSON.stringify(whopRequestBody, null, 2));
    console.log("📤 Whop API URL:", WHOP_API_URL);

    const whopResponse = await fetch(WHOP_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(whopRequestBody),
    });

    const responseText = await whopResponse.text();
    console.log("📥 Whop API response status:", whopResponse.status);
    console.log("📥 Whop API response:", responseText);

    if (!whopResponse.ok) {
      console.error("❌ Whop API error:", responseText);
      
      let errorMessage = "Failed to create checkout session";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Keep default error message
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: responseText,
          status: whopResponse.status 
        }),
        { status: whopResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutData: WhopCheckoutResponse = JSON.parse(responseText);

    // 🔥 V2 API returns purchase_url
    const checkoutUrl = checkoutData.purchase_url;

    console.log("✅ Checkout session created:", {
      id: checkoutData.id,
      purchase_url: checkoutUrl,
      metadata: checkoutData.metadata,
      prefilled_email: finotaurEmail,
    });

    // ============================================
    // 7. RETURN CHECKOUT URL
    // ============================================

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,  // 🔥 Map purchase_url to checkout_url for consistency
        checkout_id: checkoutData.id,
        metadata: metadata,
        prefilled_email: finotaurEmail,  // 🔥 v1.2: Return for debugging
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});