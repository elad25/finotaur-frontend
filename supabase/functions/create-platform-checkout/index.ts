// =====================================================
// FINOTAUR CREATE PLATFORM CHECKOUT - v1.0.0
// =====================================================
// 
// 🔥 PLATFORM SUBSCRIPTIONS ONLY
// Creates Whop checkout sessions for Core/Pro/Enterprise
// 
// Product IDs:
// - Core Monthly: prod_HDYzeNp6WOJwh ($39/mo, 7-day trial)
// - Core Yearly: prod_YAdXQrHtt72Gd ($349/yr, NO trial)
// - Pro Monthly: prod_lhe19l7l48lKW ($69/mo, 14-day ONE-TIME trial)
// - Pro Yearly: prod_3AyUOETP3CoK6 ($619/yr, NO trial)
// 
// Deploy: supabase functions deploy create-platform-checkout
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// CONFIGURATION
// ============================================

const WHOP_API_KEY = Deno.env.get("WHOP_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const BASE_REDIRECT_URL = "https://www.finotaur.com";
const WHOP_API_URL = "https://api.whop.com/api/v2/checkout_sessions";

// 🔥 Platform Product IDs
const PLATFORM_PRODUCTS = {
  core_monthly: 'prod_HDYzeNp6WOJwh',
  core_yearly: 'prod_YAdXQrHtt72Gd',
  pro_monthly: 'prod_lhe19l7l48lKW',
  pro_yearly: 'prod_3AyUOETP3CoK6',
} as const;

// Redirect paths by product
const PLAN_REDIRECT_PATHS: Record<string, string> = {
  'prod_HDYzeNp6WOJwh': '/platform-pricing?payment=success&source=whop&plan=core',
  'prod_YAdXQrHtt72Gd': '/platform-pricing?payment=success&source=whop&plan=core',
  'prod_lhe19l7l48lKW': '/platform-pricing?payment=success&source=whop&plan=pro',
  'prod_3AyUOETP3CoK6': '/platform-pricing?payment=success&source=whop&plan=pro',
};

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
  plan_id: string;  // Product ID (e.g., prod_HDYzeNp6WOJwh)
  affiliate_code?: string;
  click_id?: string;
  redirect_url?: string;
  newsletter_choice?: string;  // For PRO users to select newsletter
}

interface WhopCheckoutResponse {
  id: string;
  purchase_url: string;
  redirect_url?: string;
  affiliate_code?: string;
  metadata?: Record<string, any>;
  plan_id?: string;
}

// ============================================
// HELPER: Check Pro trial eligibility
// ============================================

async function checkProTrialEligibility(
  supabase: any,
  userId: string
): Promise<{ eligible: boolean; reason?: string }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('platform_pro_trial_used_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('⚠️ Could not check trial eligibility:', error);
    return { eligible: true };  // Allow if we can't check
  }

  if (profile?.platform_pro_trial_used_at) {
    return { 
      eligible: false, 
      reason: 'Pro trial already used' 
    };
  }

  return { eligible: true };
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
    const { plan_id, affiliate_code, click_id, redirect_url, newsletter_choice } = body;

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: "Missing plan_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate it's a Platform product
    const isPlatformProduct = Object.values(PLATFORM_PRODUCTS).includes(plan_id as any);
    if (!isPlatformProduct) {
      return new Response(
        JSON.stringify({ error: "Invalid Platform product ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📦 Platform checkout request:", {
      plan_id,
      user_id: user.id,
      user_email: user.email,
      affiliate_code,
      click_id,
      newsletter_choice,
    });

    // ============================================
    // 3. CHECK PRO TRIAL ELIGIBILITY
    // ============================================

    const isProPlan = plan_id === PLATFORM_PRODUCTS.pro_monthly || 
                      plan_id === PLATFORM_PRODUCTS.pro_yearly;
    
    if (isProPlan && plan_id === PLATFORM_PRODUCTS.pro_monthly) {
      const trialCheck = await checkProTrialEligibility(supabase, user.id);
      if (!trialCheck.eligible) {
        console.warn(`⚠️ User ${user.id} not eligible for Pro trial: ${trialCheck.reason}`);
        // Don't block - Whop will handle trial logic, but we log it
      }
    }

    // ============================================
    // 4. VALIDATE WHOP API KEY
    // ============================================

    if (!WHOP_API_KEY) {
      console.error("❌ Missing WHOP_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 5. BUILD METADATA
    // ============================================

    const metadata: Record<string, string> = {
      finotaur_user_id: user.id,
      subscription_category: 'platform',
    };

    if (click_id) {
      metadata.click_id = click_id;
    }

    if (user.email) {
      metadata.expected_email = user.email;
    }

    // 🔥 For PRO plans, include newsletter choice
    if (isProPlan && newsletter_choice) {
      metadata.newsletter_choice = newsletter_choice;
    }

    // ============================================
    // 6. DETERMINE REDIRECT URL
    // ============================================

    let finalRedirectUrl = redirect_url;
    
    if (!finalRedirectUrl) {
      const planPath = PLAN_REDIRECT_PATHS[plan_id] || '/platform-pricing?payment=success&source=whop';
      finalRedirectUrl = `${BASE_REDIRECT_URL}${planPath}`;
    }

    // Add user_id to redirect URL for client-side verification
    const redirectUrlObj = new URL(finalRedirectUrl);
    redirectUrlObj.searchParams.set('uid', user.id);
    finalRedirectUrl = redirectUrlObj.toString();

    // ============================================
    // 7. CREATE WHOP CHECKOUT SESSION
    // ============================================

    console.log("🛒 Creating Platform Whop checkout session...");

    const whopRequestBody: Record<string, any> = {
      plan_id: plan_id,
      metadata: metadata,
      redirect_url: finalRedirectUrl,
    };

    // Add affiliate code if provided
    if (affiliate_code) {
      whopRequestBody.affiliate_code = affiliate_code;
    }

    console.log("📤 Whop API request:", JSON.stringify(whopRequestBody, null, 2));

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
    const checkoutUrl = checkoutData.purchase_url;

    console.log("✅ Platform checkout session created:", {
      id: checkoutData.id,
      purchase_url: checkoutUrl,
      metadata: checkoutData.metadata,
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
        plan_type: isProPlan ? 'pro' : 'core',
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