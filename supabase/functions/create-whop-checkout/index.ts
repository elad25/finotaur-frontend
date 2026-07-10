// =====================================================
// FINOTAUR CREATE WHOP CHECKOUT - v1.5.0
// =====================================================
//
// 🔥 v1.5.0 CHANGES:
// - ADDED: affiliate_code now also written into checkout metadata
//   (member-referral attribution fallback for the webhook)
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

// 🔥 v5.0.0: Bundle Plan IDs (repriced 2026-07 — new Whop plans, $109→$89)
const BUNDLE_PLAN_IDS = new Set([
  'plan_AgWVNrqc0eSMK',   // Bundle Monthly - $89/month
  'plan_0uYhhF6fX5IKh',   // Bundle Yearly - $890/year
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
  discount_code?: string; // 🔥 v1.8.0: Welcome offer / promo code from client
  acknowledge_forfeit?: boolean; // yearly-downgrade forfeit confirmation (was used untyped)
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
  // Journal plans — legacy IDs (pre 2026-06-17)
  'plan_2hIXaJbGP1tYN': '/app/journal/overview?payment=success&source=whop',
  'plan_x0jTFLe9qNv8i': '/app/journal/overview?payment=success&source=whop',
  'plan_v7QKxkvKIZooe': '/app/journal/overview?payment=success&source=whop',
  'plan_gBG436aeJxaHU': '/app/journal/overview?payment=success&source=whop',
  // Journal plans — current IDs (2026-06-17, synced with src/lib/whop-config.ts)
  'plan_H0VDCb6iD1dYQ': '/app/journal/overview?payment=success&source=whop',  // Basic Monthly ($24.99)
  'plan_80ZhPpre3iRU2': '/app/journal/overview?payment=success&source=whop',  // Basic Yearly ($229)
  'plan_N33S1p5Y3dHrK': '/app/journal/overview?payment=success&source=whop',  // Premium Monthly ($44.99)
  'plan_WrjUcvrRhwWPL': '/app/journal/overview?payment=success&source=whop',  // Premium Yearly ($409)
  // Intro Offer — hidden Trader plan (30% off first month). Placeholder plan ID.
  'plan_u6VqqKZlb0axR': '/app/journal/overview?payment=success&source=whop',
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
  // Repriced 2026-07: $109→$89 plans — new IDs replace old for checkout creation.
  // ═══════════════════════════════════════════
  'plan_AgWVNrqc0eSMK': '/app/all-markets/warzone?payment=success&source=whop&bundle=true',  // $89 plan (2026-07) — Bundle Monthly
  'plan_0uYhhF6fX5IKh': '/app/settings?tab=billing&upgrade=bundle_yearly_success',  // $89 plan (2026-07) — Bundle Yearly - upgrade redirect
  'plan_ICooR8aqtdXad': '/app/all-markets/warzone?payment=success&source=whop&bundle=true',  // legacy $109 plan — kept for in-flight checkouts
  'plan_M2zS1EoNXJF10': '/app/settings?tab=billing&upgrade=bundle_yearly_success',  // legacy $109 plan — kept for in-flight checkouts
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
      discount_code,
      acknowledge_forfeit,
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

    // ============================================
    // 🛡️ JOURNAL MID-CYCLE DOWNGRADE GUARD
    // Block switching to a LOWER journal tier while a higher tier is still
    // paid/active. Prevents (a) losing paid time on the higher plan and
    // (b) a second membership overlapping the old one = double charge.
    // The customer keeps their current plan until it renews, then switches.
    // ============================================
    if (subscription_category === 'journal') {
      const JOURNAL_PLAN_TIER: Record<string, number> = {
        // Basic (tier 1) — current + legacy IDs
        'plan_H0VDCb6iD1dYQ': 1, 'plan_80ZhPpre3iRU2': 1, 'plan_2hIXaJbGP1tYN': 1, 'plan_x0jTFLe9qNv8i': 1,
        // Premium (tier 2) — current + legacy IDs
        'plan_N33S1p5Y3dHrK': 2, 'plan_WrjUcvrRhwWPL': 2, 'plan_v7QKxkvKIZooe': 2, 'plan_gBG436aeJxaHU': 2,
        // Intro Offer — hidden Trader plan, treated as Premium tier. Placeholder plan ID.
        'plan_u6VqqKZlb0axR': 2,
      };
      const requestedTier = JOURNAL_PLAN_TIER[plan_id] ?? 0;
      if (requestedTier > 0) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('account_type, subscription_status, subscription_interval, subscription_expires_at')
          .eq('id', user.id)
          .maybeSingle();
        const currentTier = currentProfile?.account_type === 'premium' ? 2
          : currentProfile?.account_type === 'basic' ? 1 : 0;
        const isActive = ['active', 'trialing', 'trial'].includes(currentProfile?.subscription_status || '');
        const notExpired = currentProfile?.subscription_expires_at
          ? new Date(currentProfile.subscription_expires_at) > new Date()
          : false;
        if (isActive && notExpired && currentTier > requestedTier) {
          const renewsOn = new Date(currentProfile!.subscription_expires_at as string)
            .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          const currentName = currentProfile?.account_type === 'premium' ? 'Premium' : 'Basic';
          console.log(`🛡️ Journal downgrade blocked: ${currentProfile?.account_type} (tier ${currentTier}) → requested tier ${requestedTier}, paid through ${renewsOn}`);
          return new Response(
            JSON.stringify({
              blocked: true,
              code: 'DOWNGRADE_BLOCKED',
              current_plan: currentProfile?.account_type,
              expires_at: currentProfile?.subscription_expires_at,
              message: `You're on the ${currentName} plan, paid through ${renewsOn}. You'll keep it until then — you can switch to a lower plan when your current period ends. No action needed now.`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // (b) UPGRADE FROM AN ACTIVE YEARLY PLAN — warn & confirm. Switching to a
        // higher tier forfeits the prepaid annual time (Whop has no cross-membership
        // proration). Require an explicit acknowledgement before proceeding.
        if (isActive && notExpired && currentTier > 0 && requestedTier > currentTier
            && currentProfile?.subscription_interval === 'yearly' && !acknowledge_forfeit) {
          const renewsOn = new Date(currentProfile.subscription_expires_at as string)
            .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          const daysLeft = Math.max(0, Math.ceil(
            (new Date(currentProfile.subscription_expires_at as string).getTime() - Date.now()) / 86400000));
          console.log(`🛡️ Yearly upgrade forfeit warning: ${daysLeft} days left, paid through ${renewsOn}`);
          return new Response(
            JSON.stringify({
              requires_confirmation: true,
              code: 'CONFIRM_YEARLY_FORFEIT',
              expires_at: currentProfile.subscription_expires_at,
              days_left: daysLeft,
              message: `You have ${daysLeft} days left on your annual plan (paid through ${renewsOn}). Upgrading now starts a new plan and that prepaid time won't carry over. Continue?`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
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

    // 🔥 v1.5.0: Also write affiliate_code into metadata — fallback attribution
    // source for the webhook when no promo code was applied at payment time.
    if (affiliate_code) {
      metadata.affiliate_code = affiliate_code;
    }

    metadata.expected_email = finotaurEmail;

    // ============================================
    // 5. DETERMINE REDIRECT URL
    // ============================================

    let finalRedirectUrl = redirect_url;
    
    if (!finalRedirectUrl) {
      // Journal purchases always return to the journal; only fall back to
      // billing settings for unmapped non-journal products. This guards
      // against plan-ID drift (new plan IDs not yet in PLAN_REDIRECT_PATHS).
      const fallbackPath = subscription_category === 'journal'
        ? '/app/journal/overview?payment=success&source=whop'
        : '/app/settings?tab=billing&payment=success&source=whop';
      const planPath = PLAN_REDIRECT_PATHS[plan_id] || fallbackPath;
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

    // 🔥 v1.6.0: Skip trial if user already used ANY platform trial (Core or Finotaur)
    // Prevents 14+14 = 28 days free when upgrading Core → Finotaur
    if (!whopRequestBody.skip_trial && user?.id) {
      const { data: trialProfile } = await supabase
        .from('profiles')
        .select('platform_core_trial_used_at, platform_finotaur_trial_used_at')
        .eq('id', user.id)
        .single();
      
      if (trialProfile) {
        const hasUsedAnyPlatformTrial = 
          trialProfile.platform_core_trial_used_at || 
          trialProfile.platform_finotaur_trial_used_at;
        
        // Check if this is a platform plan
        const isPlatformPlan = [
          'plan_M4ig2ZhYd2RUE',  // Core Monthly
          'plan_6w5KTZsSGp7Ss',  // Core Yearly
          'plan_AgWVNrqc0eSMK',  // Finotaur/Bundle Monthly — $89 plan (2026-07)
          'plan_0uYhhF6fX5IKh',  // Finotaur/Bundle Yearly — $89 plan (2026-07)
          'plan_ICooR8aqtdXad',  // Finotaur/Bundle Monthly — legacy $109 plan, active members remain until migrated
          'plan_M2zS1EoNXJF10',  // Finotaur/Bundle Yearly — legacy $109 plan, active members remain until migrated
          'plan_nHveClWPmjJNT',  // Enterprise Monthly
        ].includes(plan_id);
        
        if (isPlatformPlan && hasUsedAnyPlatformTrial) {
          whopRequestBody.skip_trial = true;
          console.log("✅ User already used a platform trial - skipping trial for new plan", {
            core_trial_used: trialProfile.platform_core_trial_used_at,
            finotaur_trial_used: trialProfile.platform_finotaur_trial_used_at,
          });
        }
      }
    }

    // 🔥 v1.9.0: Always pass affiliate_code to API body when present
    // affiliate_code in body = Whop username for commission attribution (separate from 'd' URL param)
    if (affiliate_code) {
      whopRequestBody.affiliate_code = affiliate_code;
    }

    // 🔥 v1.7.0: Store promo code to apply via URL (separate from affiliate)
    const promoCodeToApply = applyIntroDiscount ? INTRO_DISCOUNT_COUPON : affiliate_code || null;

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
        // 🔥 v1.7.0: Also apply welcome promo codes via 'd' parameter
        // 🔥 v1.8.0: Support client-sent discount_code (Welcome Offer)
        if (applyIntroDiscount) {
          urlObj.searchParams.set('d', INTRO_DISCOUNT_COUPON);
          console.log(`✅ Intro discount coupon '${INTRO_DISCOUNT_COUPON}' added to checkout URL`);
        } else if (discount_code) {
          urlObj.searchParams.set('d', discount_code);
          console.log(`✅ Client discount code '${discount_code}' added to checkout URL`);
        } else if (affiliate_code) {
          urlObj.searchParams.set('d', affiliate_code);
          console.log(`✅ Promo/affiliate code '${affiliate_code}' added to checkout URL`);
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