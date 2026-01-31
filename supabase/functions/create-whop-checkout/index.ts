// =====================================================
// FINOTAUR CREATE WHOP CHECKOUT - v1.4.0
// =====================================================
// 
// 🔥 v1.4.0 CHANGES:
// - ADDED: Auto-apply FINOTAUR50 coupon for Top Secret & War Zone
// - 50% off first 2 payments for intro discount plans
// - Coupon applied via 'd' URL parameter
// 
// 🔥 v1.3.0 CHANGES:
// - FIXED: Email prefill now works via URL parameter
// - Whop V2 API doesn't prefill email in body - must append to URL
// - Added email validation
// - Enhanced logging for debugging
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

// 🔥 v1.4.0: Intro discount coupon code
const INTRO_DISCOUNT_COUPON = "FINOTAUR50";

// 🔥 v1.5.0: Plans that get the intro discount coupon (FINOTAUR50)
// Synced with whop-config.ts v4.4.0
const INTRO_DISCOUNT_PLAN_IDS = new Set([
  // Top Secret - Regular plans
  'plan_tUvQbCrEQ4197',   // Top Secret Monthly ($89.99/mo)
  'plan_PxxbBlSdkyeo7',   // Top Secret Yearly ($899/yr)
  // War Zone Newsletter - Regular plans  
  'plan_U6lF2eO5y9469',   // War Zone Monthly ($69.99/mo)
  'plan_bp2QTGuwfpj0A',   // War Zone Yearly ($699/yr)
  // 🔥 v5.0.0: Bundle does NOT get intro discount (already best value)
]);

// 🔥 v5.0.0: Bundle Plan IDs
const BUNDLE_PLAN_IDS = new Set([
  'plan_ICooR8aqtdXad',   // Bundle Monthly - $109/month
  'plan_M2zS1EoNXJF10',   // Bundle Yearly - $1090/year
]);

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
  email?: string;       // Email for prefill
  user_id?: string;     // User ID from client (backup)
}

interface WhopCheckoutResponse {
  id: string;
  purchase_url: string;  // V2 returns purchase_url
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
  // Newsletter (War Zone) - ALL PLAN IDS
   'plan_U6lF2eO5y9469': '/app/all-markets/warzone?payment=success&source=whop',  // War Zone Monthly ($69.99)
  'plan_bp2QTGuwfpj0A': '/app/settings?tab=billing&upgrade=newsletter_yearly_success',  // War Zone Yearly ($699) - upgrade redirect
  'plan_BPJdT6Tyjmzcx': '/app/all-markets/warzone?payment=success&source=whop',  // War Zone Monthly for Top Secret Members ($30)
// ═══════════════════════════════════════════
  // Top Secret - Synced with whop-config.ts v4.4.0
  // ═══════════════════════════════════════════
  'plan_tUvQbCrEQ4197': '/app/top-secret?payment=success&source=whop',  // Top Secret Monthly ($89.99)
  'plan_PxxbBlSdkyeo7': '/app/settings?tab=billing&upgrade=top_secret_yearly_success',  // Top Secret Yearly ($899) - upgrade redirect
  'plan_7VQxCZ5Kpw6f0': '/app/top-secret?payment=success&source=whop',  // Top Secret for War Zone Members ($50)
  
  // ═══════════════════════════════════════════
  // 🔥 v5.0.0: Bundle - War Zone + Top Secret
  // ═══════════════════════════════════════════
  'plan_ICooR8aqtdXad': '/app/all-markets/warzone?payment=success&source=whop&bundle=true',  // Bundle Monthly ($109)
  'plan_M2zS1EoNXJF10': '/app/all-markets/warzone?payment=success&source=whop&bundle=true',  // Bundle Yearly ($1090)
};

// ============================================
// HELPER: Validate email format
// ============================================

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================
// 🔥 v1.4.0: Check if plan should get intro discount
// ============================================

function shouldApplyIntroDiscount(planId: string): boolean {
  return INTRO_DISCOUNT_PLAN_IDS.has(planId);
}

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
      email: clientEmail,
    } = body;

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: "Missing plan_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    }

    // 🔥 v1.3: Use authenticated user's email (most reliable), fallback to client email
    const finotaurEmail = user.email || clientEmail || '';

    // Validate email
    if (!finotaurEmail || !isValidEmail(finotaurEmail)) {
      console.error("❌ Invalid or missing email:", finotaurEmail);
      return new Response(
        JSON.stringify({ error: "Valid email is required for checkout" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔥 v1.4.0: Check if this plan should get intro discount
    const applyIntroDiscount = shouldApplyIntroDiscount(plan_id);

    console.log("📦 Checkout request:", {
      plan_id,
      user_id: user.id,
      user_email: user.email,
      client_email: clientEmail,
      finotaur_email: finotaurEmail,
      affiliate_code,
      click_id,
      subscription_category,
      apply_intro_discount: applyIntroDiscount,  // 🔥 v1.4.0
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
    // ============================================

    const metadata: Record<string, string> = {
      finotaur_user_id: user.id,
      finotaur_email: finotaurEmail,
    };

    if (click_id) {
      metadata.click_id = click_id;
    }

    if (subscription_category) {
      metadata.subscription_category = subscription_category;
    }

    metadata.expected_email = finotaurEmail;

    // ============================================
    // 5. DETERMINE REDIRECT URL
    // ============================================

    let finalRedirectUrl = redirect_url;
    
    if (!finalRedirectUrl) {
      const planPath = PLAN_REDIRECT_PATHS[plan_id] || '/app/settings?tab=billing&payment=success&source=whop';
      finalRedirectUrl = `${BASE_REDIRECT_URL}${planPath}`;
    }

    const redirectUrlObj = new URL(finalRedirectUrl);
    redirectUrlObj.searchParams.set('uid', user.id);
    finalRedirectUrl = redirectUrlObj.toString();

    // ============================================
    // 6. CREATE WHOP CHECKOUT SESSION (V2 API)
    // ============================================

    console.log("🛒 Creating Whop checkout session (V2 API)...");

const whopRequestBody: Record<string, any> = {
      plan_id: plan_id,
      metadata: metadata,
      redirect_url: finalRedirectUrl,
    };

    // 🔥 v1.5.0: Skip trial for upgrade flows (yearly plans from existing subscribers)
    const isUpgradeFlow = finalRedirectUrl.includes('upgrade=');
    if (isUpgradeFlow) {
      whopRequestBody.skip_trial = true;
      console.log("✅ Upgrade flow detected - skipping trial");
    }

    // 🔥 v1.4.0: Only add affiliate code if NOT applying intro discount
    // (they use the same 'd' parameter in the URL)
    if (!applyIntroDiscount && affiliate_code) {
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

    // ============================================
    // 7. 🔥 v1.4.0: BUILD FINAL CHECKOUT URL
    // - Add email prefill
    // - Add intro discount coupon if applicable
    // ============================================

    let checkoutUrl = checkoutData.purchase_url;

    if (checkoutUrl) {
      try {
        const urlObj = new URL(checkoutUrl);
        
        // Add email prefill
        if (finotaurEmail) {
          urlObj.searchParams.set('email', finotaurEmail);
          console.log("✅ Email prefill added to checkout URL");
        }
        
        // 🔥 v1.4.0: Add intro discount coupon
        if (applyIntroDiscount) {
          urlObj.searchParams.set('d', INTRO_DISCOUNT_COUPON);
          console.log(`✅ Intro discount coupon '${INTRO_DISCOUNT_COUPON}' added to checkout URL`);
        }
        
        checkoutUrl = urlObj.toString();
      } catch (urlError) {
        console.warn("⚠️ Failed to modify checkout URL:", urlError);
        // Continue with original URL if parsing fails
      }
    }

    console.log("✅ Checkout session created:", {
      id: checkoutData.id,
      original_url: checkoutData.purchase_url,
      final_url: checkoutUrl,
      metadata: metadata,
      prefilled_email: finotaurEmail,
      intro_discount_applied: applyIntroDiscount,  // 🔥 v1.4.0
      coupon_code: applyIntroDiscount ? INTRO_DISCOUNT_COUPON : null,  // 🔥 v1.4.0
    });

    // ============================================
    // 8. RETURN CHECKOUT URL
    // ============================================

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        checkout_id: checkoutData.id,
        metadata: metadata,
        prefilled_email: finotaurEmail,
        intro_discount_applied: applyIntroDiscount,  // 🔥 v1.4.0
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