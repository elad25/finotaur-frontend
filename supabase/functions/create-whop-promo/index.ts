// supabase/functions/create-whop-promo/index.ts
// ============================================
// 🎯 Creates a Whop percentage promo code
// ============================================
// 🔥 v3.0.0 — Phase 1 member-refers-friend:
//  - discount_percent now accepts any integer 1-100 (previously admin-only 10/15)
//  - NEW auth path: service-role bearer (whop-webhook -> function), body { mode:'member', user_id }
//  - NEW auth path: self-service member JWT, body { mode:'member' } (provisions own coupon only,
//    user_id always taken from the verified JWT — any body.user_id is ignored)
//  - Both member paths call ensure_member_affiliate() RPC, are idempotent on
//    affiliates.whop_promo_id, and record promo_provision_error/promo_provision_attempts
//    on Whop API failure instead of throwing.
//
// 🔥 v3.1.0 — "Referral beats intro": member personal codes now beat the
//  organic intro offer.
//  - Member promo default discount 20% -> 30%, number_of_intervals 1 -> 2
//    (with the initial-fee discount this yields 3 discounted months, one
//    more than the organic TRADER30 promo's 2 discounted months).
//  - Member promos are now restricted to the hidden Trader plan
//    (plan_ids: [MEMBER_REFERRAL_PLAN_ID]) — admin promos are UNCHANGED
//    (still number_of_intervals: 1, no plan restriction).
//  - createWhopPromoCode() takes an options bag (numberOfIntervals, planIds)
//    instead of a hardcoded interval, so admin vs member behavior diverges
//    without duplicating the function.
//  - Member path now accepts an optional `requested_code` in the request
//    body — lets a member choose their own code (before their affiliates
//    row exists). Validated server-side (format + reserved list) and again
//    by ensure_member_affiliate() (format + reserved list + uniqueness).
//    Ignored once the member already has a code (idempotency unchanged).
//
// FLOW (admin path — unchanged):
// 1. Admin approves affiliate application in the dashboard
// 2. Frontend calls this Edge Function with affiliate details
// 3. Edge Function creates promo code in Whop API
// 4. Updates affiliate record with whop_promo_id
//
// FLOW (member path — new):
// 1. A paying member requests their own referral coupon (self-service), OR
//    whop-webhook fires this after a member's first payment (service-role, mode='member')
// 2. Edge Function calls ensure_member_affiliate(user_id) RPC — creates/loads
//    the member's affiliates row (idempotent, enforces the member_referral kill-switch
//    and the "must be a paying member" check)
// 3. If affiliates.whop_promo_id is already set -> return it (idempotent success)
// 4. Else create a percentage promo code in Whop API using the affiliate's coupon_code,
//    defaulting the discount from affiliate_config.member_referral.friend_discount_percent
// 5. On success: UPDATE affiliates.whop_promo_id (+ clear promo_provision_error)
//    On Whop API failure: UPDATE affiliates.promo_provision_error / promo_provision_attempts,
//    return 502 — never throws into the caller (webhook / self-service UI)
//
// SETUP - Add these secrets in Supabase Dashboard:
// - WHOP_API_KEY: Your Whop API key from dashboard
// - WHOP_COMPANY_ID: Your company ID (biz_xxxxxx)
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Plans a referral/affiliate promo applies to. MONTHLY tiers only — yearly is
// intentionally excluded to avoid stacking discounts on the already-discounted
// annual price (protects LTGP / price integrity). Trader + Investor + Finotaur + the
// hidden Welcome-Offer intro plan (checkout overrides the code with FINOTAUR50 there).
// Plain renewal plans (initial_price = 0 in Whop) ONLY, so number_of_intervals == months.
// Includes BOTH Trader products: the regular Trader AND the Welcome-Offer Trader
// (plan_Bud5AtSREdawA — 14-day trial, no initial fee, replaced the old plan_u6VqqKZlb0axR
// which had a $44.99 initial fee that made 3 intervals = 4 months). The old Welcome-Offer
// plan is NOT included. Affiliate = 30% for exactly 3 months on every plan here.
const PROMO_APPLICABLE_PLAN_IDS = [
  'plan_N33S1p5Y3dHrK', // Trader (Premium) monthly $44.99 — initial_price 0
  'plan_Bud5AtSREdawA', // Trader — Welcome Offer (14-day trial, $44.99/mo) — initial_price 0
  'plan_icd76C8REp0LQ', // Investor (Top Secret) monthly — initial_price 0
  'plan_AgWVNrqc0eSMK', // Finotaur (platform) monthly $89 — initial_price 0
]

// Billing cycles the referral discount applies for. Every applicable plan above is
// initial_price = 0 (no separate initial charge), so the signup charge is renewal #1
// and number_of_intervals == discounted months: 3 = 30% off for 3 months (months 1-3),
// full price from month 4. Matches affiliate_config.member_referral.friend_discount_cycles.
const FRIEND_DISCOUNT_CYCLES = 3

// Reserved codes a member may not self-select as their personal referral
// code — mirrors the frontend/DB copy of this list (keep all three in sync).
const RESERVED_CODES = new Set([
  'TRADER30', 'INTRO30', 'FINOTAUR50', 'WELCOMEBACK', 'WELCOME',
  'FINOTAUR', 'TRADER', 'INTRO', 'ADMIN', 'TEST',
])

const CUSTOM_CODE_PATTERN = /^[A-Z0-9]{4,15}$/

type RequestedCodeValidation =
  | { ok: true; code: string }
  | { ok: false; error: 'invalid_code' | 'reserved_code' }

function validateRequestedCode(raw: string): RequestedCodeValidation {
  const code = raw.trim().toUpperCase()
  if (!CUSTOM_CODE_PATTERN.test(code)) {
    return { ok: false, error: 'invalid_code' }
  }
  if (RESERVED_CODES.has(code)) {
    return { ok: false, error: 'reserved_code' }
  }
  return { ok: true, code }
}

// ============================================
// TYPES
// ============================================

interface CreatePromoRequest {
  // Admin path (unchanged)
  affiliate_id?: string       // UUID of the affiliate row in the DB
  coupon_code?: string        // Code approved by the admin
  discount_percent?: number   // Any integer 1-100
  affiliate_name?: string     // Affiliate display name (optional, for metadata)
  // Member path (new, Phase 1)
  mode?: 'member' | 'reprovision' | 'inspect' | 'create_offer_promo'
  user_id?: string             // Only honored on the service-role auth path
  requested_code?: string      // Member path only — optional self-chosen code (v3.1.0)
  // Reprovision path (new, v3.2.0) — service-role only. Either affiliate_id
  // or coupon_code identifies the affiliate row to delete+recreate the promo for.
  // Inspect path (new, read-only diagnostics) — service-role/admin-key only.
  promo_id?: string             // Whop promo_codes id to fetch
  plan_ids_to_inspect?: string[] // Whop plan ids to fetch
  // create_offer_promo path (new) — service-role/admin-key only. Creates a
  // standalone offer promo code, NOT tied to any affiliate row.
  offer_code?: string           // Code to create in Whop
  intervals?: number            // number_of_intervals for the offer promo
  offer_plan_ids?: string[]     // Whop plan ids the offer promo is scoped to
}

interface WhopPromoResponse {
  id: string                 // promo_xxxxxxxxxxxx
  code: string
  amount_off: number
  promo_type: string
  status: 'active' | 'inactive' | 'archived'
  currency: string
}

// ============================================
// HELPER: constant-time secret comparison (avoids timing oracle on the
// service-role bearer check below — mirrors whop-webhook's timingSafeEqual)
// ============================================

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// ============================================
// WHOP API FUNCTION
// ============================================

interface CreateWhopPromoOptions {
  // Whop's number_of_intervals: how many billing cycles the discount applies
  // to. Admin path default = 1 (first payment only — locked pricing rule:
  // list price fixed, promos are a first-payment acquisition lever, same
  // semantics as WELCOME). Member path (v3.1.0) uses 2, which combined with
  // the initial-fee discount yields 3 discounted months.
  numberOfIntervals?: number
  // Optional plan restriction override. Defaults to PROMO_APPLICABLE_PLAN_IDS
  // (v3.2.0 — every created promo is scoped to the paid monthly plans + the
  // hidden Welcome-Offer plan; previously admin promos set no plan_ids at all,
  // which made Whop silently scope them to a single default plan). Member
  // personal codes (v3.1.0) override this to the hidden Trader plan only.
  planIds?: string[]
}

async function createWhopPromoCode(
  apiKey: string,
  companyId: string,
  code: string,
  discountPercent: number,
  affiliateId: string,
  affiliateName?: string,
  options: CreateWhopPromoOptions = {}
): Promise<WhopPromoResponse> {
  const { numberOfIntervals = 1, planIds } = options

  console.log(`[Whop API] Creating promo code: ${code} with ${discountPercent}% discount`)
  console.log(`[Whop API] Company ID: ${companyId}`)

  // 🔥 v2.1 FIX: Use high stock number instead of 0
  const requestBody: Record<string, unknown> = {
    code: code.toUpperCase(),           // Whop codes are case-insensitive
    amount_off: discountPercent,        // discount percent
    base_currency: 'usd',
    promo_type: 'percentage',           // percentage, not fixed amount
    new_users_only: true,               // new users only
    stock: 999999,                      // 🔥 FIX: High number instead of 0!
    unlimited_stock: true,              // unlimited usage
    number_of_intervals: numberOfIntervals,
    plan_ids: PROMO_APPLICABLE_PLAN_IDS, // 🔥 v3.2.0 FIX: default plan scope — without this Whop scoped the promo to a single default plan (coupons only worked on the popup/Welcome-Offer product)
  };

  if (planIds && planIds.length > 0) {
    requestBody.plan_ids = planIds
  }

  console.log(`[Whop API] Request body:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch('https://api.whop.com/api/v2/promo_codes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const responseText = await response.text()
  console.log(`[Whop API] Response status: ${response.status}`)
  console.log(`[Whop API] Response body: ${responseText}`)

  if (!response.ok) {
    console.error('[Whop API] Error:', responseText)
    let errorMessage = `Whop API Error: ${response.status}`
    try {
      const errorData = JSON.parse(responseText)
      const msg = (typeof errorData.message === 'string' && errorData.message)
        || (typeof errorData.error === 'string' && errorData.error)
      errorMessage = msg || responseText || errorMessage
    } catch {
      errorMessage = responseText || errorMessage
    }
    throw new Error(errorMessage)
  }

  return JSON.parse(responseText) as WhopPromoResponse
}

// ============================================
// MEMBER PATH HANDLER (shared by service-role + self-service auth)
// ============================================

async function handleMemberPromo(
  supabase: SupabaseClient,
  userId: string,
  requestedCode?: string
): Promise<Response> {
  const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  // ============================================
  // 1. KILL-SWITCH CHECK
  // ============================================
  const { data: configRow } = await supabase
    .from('affiliate_config')
    .select('config_value')
    .eq('config_key', 'member_referral')
    .single()

  const config = (configRow?.config_value ?? {}) as { enabled?: boolean; friend_discount_percent?: number }

  if (config.enabled !== true) {
    return jsonResponse({ ok: false, error: 'member_referral_disabled' }, 403)
  }

  const discountPercent = Number.isInteger(config.friend_discount_percent)
    ? (config.friend_discount_percent as number)
    : 30

  // ============================================
  // 1b. OPTIONAL SELF-CHOSEN CODE — validate BEFORE calling the RPC.
  // Ignored (server-side, via the RPC) once the member already has a code —
  // that idempotency check lives inside ensure_member_affiliate().
  // ============================================
  let validatedRequestedCode: string | undefined
  if (typeof requestedCode === 'string' && requestedCode.trim().length > 0) {
    const validation = validateRequestedCode(requestedCode)
    if (!validation.ok) {
      return jsonResponse({ error: validation.error }, 400)
    }
    validatedRequestedCode = validation.code
  }

  // ============================================
  // 2. ENSURE THE MEMBER'S AFFILIATE ROW EXISTS (idempotent)
  // ============================================
  const { data: ensureResult, error: ensureError } = await supabase.rpc('ensure_member_affiliate', {
    p_user_id: userId,
    p_requested_code: validatedRequestedCode ?? null,
  })

  if (ensureError) {
    console.error('[create-whop-promo] ensure_member_affiliate RPC error:', ensureError)
    const rpcMessage = ensureError.message ?? ''
    if (rpcMessage.includes('code_taken')) {
      return jsonResponse({ error: 'code_taken' }, 409)
    }
    if (rpcMessage.includes('reserved_code')) {
      return jsonResponse({ error: 'reserved_code' }, 400)
    }
    if (rpcMessage.includes('invalid_code')) {
      return jsonResponse({ error: 'invalid_code' }, 400)
    }
    return jsonResponse({ ok: false, error: ensureError.message }, 403)
  }

  if (!ensureResult?.ok) {
    return jsonResponse({ ok: false, error: ensureResult?.reason ?? 'ensure_member_affiliate_failed' }, 403)
  }

  // ============================================
  // 3. IDEMPOTENT: promo already provisioned by a prior call
  // ============================================
  if (ensureResult.whop_promo_id) {
    return jsonResponse({
      ok: true,
      coupon_code: ensureResult.coupon_code,
      whop_promo_id: ensureResult.whop_promo_id,
      discount_percent: discountPercent,
    }, 200)
  }

  // Re-fetch the affiliate row: ensure_member_affiliate() only returns a JSON
  // summary, but we need the row id (+ latest whop_promo_id, to catch a
  // concurrent provisioning race) for the UPDATE below.
  const { data: affiliateRow, error: affiliateFetchError } = await supabase
    .from('affiliates')
    .select('id, coupon_code, whop_promo_id, display_name, promo_provision_attempts')
    .eq('user_id', userId)
    .single()

  if (affiliateFetchError || !affiliateRow) {
    console.error('[create-whop-promo] affiliate row fetch failed:', affiliateFetchError)
    return jsonResponse({ ok: false, error: 'affiliate_row_not_found' }, 500)
  }

  if (affiliateRow.whop_promo_id) {
    // Race: another concurrent call already provisioned it.
    return jsonResponse({
      ok: true,
      coupon_code: affiliateRow.coupon_code,
      whop_promo_id: affiliateRow.whop_promo_id,
      discount_percent: discountPercent,
    }, 200)
  }

  // ============================================
  // 4. WHOP CREDENTIALS
  // ============================================
  const whopApiKey = Deno.env.get('WHOP_API_KEY')
  const whopCompanyId = Deno.env.get('WHOP_COMPANY_ID')

  if (!whopApiKey || !whopCompanyId) {
    return jsonResponse({ ok: false, error: 'whop_credentials_not_configured' }, 500)
  }

  // ============================================
  // 5. CREATE THE PROMO IN WHOP
  // ============================================
  try {
    const whopPromo = await createWhopPromoCode(
      whopApiKey,
      whopCompanyId,
      affiliateRow.coupon_code,
      discountPercent,
      affiliateRow.id,
      affiliateRow.display_name,
      { numberOfIntervals: FRIEND_DISCOUNT_CYCLES, planIds: PROMO_APPLICABLE_PLAN_IDS }
    )

    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        whop_promo_id: whopPromo.id,
        promo_provision_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliateRow.id)

    if (updateError) {
      console.error('[create-whop-promo] Warning: Failed to update member affiliate record:', updateError)
      // Don't fail the request — the promo was created successfully in Whop.
    }

    return jsonResponse({
      ok: true,
      coupon_code: affiliateRow.coupon_code,
      whop_promo_id: whopPromo.id,
      discount_percent: discountPercent,
    }, 200)
  } catch (whopError) {
    const message = whopError instanceof Error ? whopError.message : String(whopError)
    console.error('[create-whop-promo] Whop API failure for member promo:', message)

    const { error: failureUpdateError } = await supabase
      .from('affiliates')
      .update({
        promo_provision_error: message,
        promo_provision_attempts: (affiliateRow.promo_provision_attempts ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliateRow.id)

    if (failureUpdateError) {
      console.error('[create-whop-promo] Warning: Failed to record promo_provision_error:', failureUpdateError)
    }

    return jsonResponse({ ok: false, error: message }, 502)
  }
}

// ============================================
// REPROVISION HANDLER (service-role only, v3.2.0)
// ============================================
// Whop has no endpoint to update a promo's plan_ids in place, so fixing an
// already-created coupon (e.g. one provisioned before PROMO_APPLICABLE_PLAN_IDS
// existed) means: delete the old Whop promo, then create a fresh one with the
// same coupon_code so any already-shared link keeps working.

async function handleReprovision(
  supabase: SupabaseClient,
  body: CreatePromoRequest
): Promise<Response> {
  const jsonResponse = (respBody: unknown, status: number) =>
    new Response(JSON.stringify(respBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  try {
    const { affiliate_id, coupon_code, discount_percent } = body

    if (!affiliate_id && !coupon_code) {
      return jsonResponse({ success: false, error: 'Missing required field: affiliate_id or coupon_code' }, 400)
    }

    // ============================================
    // 1. LOAD THE AFFILIATE ROW
    // ============================================
    const affiliateQuery = supabase
      .from('affiliates')
      .select('id, coupon_code, whop_promo_id, affiliate_type')

    const { data: affiliate, error: affiliateError } = affiliate_id
      ? await affiliateQuery.eq('id', affiliate_id).single()
      : await affiliateQuery.eq('coupon_code', coupon_code).single()

    if (affiliateError || !affiliate) {
      return jsonResponse({ success: false, error: 'Affiliate not found' }, 404)
    }

    // ============================================
    // 2. WHOP CREDENTIALS
    // ============================================
    const whopApiKey = Deno.env.get('WHOP_API_KEY')
    const whopCompanyId = Deno.env.get('WHOP_COMPANY_ID')

    if (!whopApiKey || !whopCompanyId) {
      return jsonResponse({ success: false, error: 'Whop API credentials not configured' }, 500)
    }

    const oldPromoId: string | null = affiliate.whop_promo_id ?? null

    // ============================================
    // 3. DELETE THE OLD PROMO (if one exists)
    // ============================================
    if (oldPromoId) {
      const deleteResponse = await fetch(`https://api.whop.com/api/v2/promo_codes/${oldPromoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${whopApiKey}` },
      })

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const deleteErrorText = await deleteResponse.text()
        console.error('[create-whop-promo] reprovision: Whop delete failed:', deleteErrorText)
        return jsonResponse({
          success: false,
          error: `Whop delete failed: ${deleteResponse.status} ${deleteErrorText}`,
        }, 502)
      }
      // 404 on delete = promo already gone in Whop — treat as OK, proceed to recreate.
    }

    // ============================================
    // 4. DETERMINE DISCOUNT PERCENT
    // ============================================
    let discountPercent: number
    if (Number.isInteger(discount_percent) && (discount_percent as number) >= 1 && (discount_percent as number) <= 100) {
      discountPercent = discount_percent as number
    } else {
      const { data: configRow } = await supabase
        .from('affiliate_config')
        .select('config_value')
        .eq('config_key', 'member_referral')
        .single()

      const config = (configRow?.config_value ?? {}) as { friend_discount_percent?: number }
      discountPercent = Number.isInteger(config.friend_discount_percent)
        ? (config.friend_discount_percent as number)
        : 30
    }

    // ============================================
    // 5. CREATE THE NEW PROMO (same code, now scoped via PROMO_APPLICABLE_PLAN_IDS
    // from Change 1 — no planIds override passed, so createWhopPromoCode uses
    // its default plan scope)
    // ============================================
    let newPromoId: string
    try {
      const whopPromo = await createWhopPromoCode(
        whopApiKey,
        whopCompanyId,
        affiliate.coupon_code,
        discountPercent,
        affiliate.id,
        undefined,
        { numberOfIntervals: FRIEND_DISCOUNT_CYCLES }
      )
      newPromoId = whopPromo.id
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : String(createError)
      console.error('[create-whop-promo] reprovision: Whop create failed after delete:', message)

      // The old promo is gone from Whop but the new one failed — never leave
      // the DB pointing at a deleted promo. Null it out and record the error.
      await supabase
        .from('affiliates')
        .update({
          whop_promo_id: null,
          promo_provision_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', affiliate.id)

      return jsonResponse({ success: false, error: `Whop create failed after delete: ${message}` }, 502)
    }

    // ============================================
    // 6. UPDATE THE AFFILIATE RECORD
    // ============================================
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        whop_promo_id: newPromoId,
        promo_provision_error: null,
        promo_provision_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliate.id)

    if (updateError) {
      console.error('[create-whop-promo] reprovision: Warning: Failed to update affiliate record:', updateError)
      // Don't fail the request — the new promo was created successfully in Whop.
    }

    return jsonResponse({
      success: true,
      affiliate_id: affiliate.id,
      code: affiliate.coupon_code,
      old_promo_id: oldPromoId,
      new_promo_id: newPromoId,
      plan_ids: PROMO_APPLICABLE_PLAN_IDS,
    }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[create-whop-promo] reprovision: unexpected error:', message)
    return jsonResponse({ success: false, error: message }, 500)
  }
}

// ============================================
// INSPECT HANDLER (service-role / admin-key only, read-only)
// ============================================
// Diagnostic-only: fetches a promo code and/or one or more plans straight
// from Whop so their billing structure (number_of_intervals, initial_price,
// renewal_price, billing_period, base_currency, etc.) can be inspected.
// GET requests only — no mutation of Whop or the DB.

async function handleInspect(
  req: Request,
  body: CreatePromoRequest
): Promise<Response> {
  const jsonResponse = (respBody: unknown, status: number) =>
    new Response(JSON.stringify(respBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  const whopApiKey = Deno.env.get('WHOP_API_KEY')

  if (!whopApiKey) {
    return jsonResponse({ error: 'whop_credentials_not_configured' }, 500)
  }

  try {
    let promo: unknown = null
    if (body.promo_id) {
      const promoResponse = await fetch(`https://api.whop.com/api/v2/promo_codes/${body.promo_id}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${whopApiKey}` },
      })
      const promoText = await promoResponse.text()
      if (!promoResponse.ok) {
        return jsonResponse({
          success: false,
          error: `Whop promo fetch failed: ${promoResponse.status} ${promoText}`,
        }, 502)
      }
      promo = JSON.parse(promoText)
    }

    const plans: unknown[] = []
    if (Array.isArray(body.plan_ids_to_inspect)) {
      for (const planId of body.plan_ids_to_inspect) {
        const planResponse = await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${whopApiKey}` },
        })
        const planText = await planResponse.text()
        if (!planResponse.ok) {
          return jsonResponse({
            success: false,
            error: `Whop plan fetch failed for ${planId}: ${planResponse.status} ${planText}`,
          }, 502)
        }
        plans.push(JSON.parse(planText))
      }
    }

    return jsonResponse({ success: true, promo, plans }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[create-whop-promo] inspect: unexpected error:', message)
    return jsonResponse({ success: false, error: message }, 502)
  }
}

// ============================================
// HELPER: find a Whop promo code's id by its code (case-insensitive).
// Used by handleCreateOfferPromo to recover from Whop's 400 "already been
// taken" conflict — Whop's list endpoint has no code= filter, so this walks
// pages until the code is found or pages are exhausted.
// ============================================

async function findWhopPromoIdByCode(apiKey: string, code: string): Promise<string | null> {
  const targetCode = code.toUpperCase()
  let page = 1
  let totalPages = 1

  do {
    const response = await fetch(`https://api.whop.com/api/v2/promo_codes?page=${page}&per=50`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    const responseText = await response.text()
    if (!response.ok) {
      throw new Error(`Whop promo list failed: ${response.status} ${responseText}`)
    }

    const parsed = JSON.parse(responseText) as {
      data?: Array<{ id: string; code: string }>
      pagination?: { total_page?: number }
    }

    const match = (parsed.data ?? []).find((p) => p.code?.toUpperCase() === targetCode)
    if (match) {
      return match.id
    }

    totalPages = parsed.pagination?.total_page ?? 1
    page += 1
  } while (page <= totalPages)

  return null
}

// ============================================
// CREATE OFFER PROMO HANDLER (service-role / admin-key only)
// ============================================
// Creates a STANDALONE offer promo code in Whop — NOT tied to any affiliate
// row. Read-only on our DB (no affiliates table writes).
//
// Idempotent (v3.3.0): if the requested code already exists in Whop, the
// existing promo is deleted and recreated with the requested config, so the
// offer code always ends up scoped/configured exactly as requested instead
// of failing with "This code has already been taken by another promo code."

async function handleCreateOfferPromo(body: CreatePromoRequest): Promise<Response> {
  const jsonResponse = (respBody: unknown, status: number) =>
    new Response(JSON.stringify(respBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  const whopApiKey = Deno.env.get('WHOP_API_KEY')
  const whopCompanyId = Deno.env.get('WHOP_COMPANY_ID')

  if (!whopApiKey || !whopCompanyId) {
    return jsonResponse({ error: 'whop_credentials_not_configured' }, 500)
  }

  const { offer_code, discount_percent, intervals, offer_plan_ids } = body

  if (typeof offer_code !== 'string' || offer_code.trim().length === 0) {
    return jsonResponse({ error: 'Missing or invalid required field: offer_code' }, 400)
  }

  if (!Number.isInteger(discount_percent) || (discount_percent as number) < 1 || (discount_percent as number) > 100) {
    return jsonResponse({ error: 'Missing or invalid required field: discount_percent (must be an integer 1-100)' }, 400)
  }

  if (!Number.isInteger(intervals) || (intervals as number) < 1) {
    return jsonResponse({ error: 'Missing or invalid required field: intervals (must be an integer >= 1)' }, 400)
  }

  if (!Array.isArray(offer_plan_ids) || offer_plan_ids.length === 0 || !offer_plan_ids.every((id) => typeof id === 'string' && id.length > 0)) {
    return jsonResponse({ error: 'Missing or invalid required field: offer_plan_ids (must be a non-empty string array)' }, 400)
  }

  const attemptCreate = () =>
    createWhopPromoCode(
      whopApiKey,
      whopCompanyId,
      offer_code,
      discount_percent as number,
      `offer:${offer_code}`,
      offer_code,
      { numberOfIntervals: intervals as number, planIds: offer_plan_ids }
    )

  let oldPromoId: string | null = null

  try {
    let whopPromo: WhopPromoResponse
    try {
      whopPromo = await attemptCreate()
    } catch (createError) {
      const createMessage = createError instanceof Error ? createError.message : String(createError)

      if (!createMessage.toLowerCase().includes('already been taken')) {
        throw createError
      }

      // Idempotency (v3.3.0): the code already exists in Whop — delete it
      // and recreate with the requested config so the offer always ends up
      // scoped/configured exactly as requested.
      console.log(`[create-whop-promo] create_offer_promo: code "${offer_code}" already exists in Whop — locating it to replace`)
      const existingId = await findWhopPromoIdByCode(whopApiKey, offer_code)

      if (!existingId) {
        return jsonResponse({
          success: false,
          error: `Whop reports code "${offer_code}" is already taken but it could not be located to replace it`,
        }, 502)
      }

      oldPromoId = existingId

      const deleteResponse = await fetch(`https://api.whop.com/api/v2/promo_codes/${existingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${whopApiKey}` },
      })

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const deleteErrorText = await deleteResponse.text()
        console.error('[create-whop-promo] create_offer_promo: Whop delete failed:', deleteErrorText)
        return jsonResponse({
          success: false,
          error: `Whop delete failed: ${deleteResponse.status} ${deleteErrorText}`,
        }, 502)
      }
      // 404 on delete = promo already gone in Whop — treat as OK, proceed to recreate.

      whopPromo = await attemptCreate()
    }

    return jsonResponse({
      success: true,
      offer_code,
      promo_id: whopPromo.id,
      plan_ids: offer_plan_ids,
      intervals,
      discount_percent,
      replaced: oldPromoId !== null,
      old_promo_id: oldPromoId,
    }, 200)
  } catch (whopError) {
    const message = whopError instanceof Error ? whopError.message : String(whopError)
    console.error('[create-whop-promo] create_offer_promo: Whop API failure:', message)
    return jsonResponse({ success: false, error: message }, 502)
  }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ============================================
    // 1. VALIDATE AUTHORIZATION HEADER PRESENCE
    // ============================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const body: CreatePromoRequest = await req.json()

    // ============================================
    // AUTH PATH R — Reprovision (v3.2.0): delete + recreate an existing promo so it
    // picks up the current plan scope. Admin-only: callable by the service-role bearer
    // OR a dedicated REPROVISION_KEY admin header. Never callable by a normal user JWT —
    // checked BEFORE the other modes.
    // ============================================
    if (body.mode === 'reprovision') {
      const reprovisionKey = Deno.env.get('REPROVISION_KEY') || ''
      const providedKey = req.headers.get('x-reprovision-key') || ''
      const isServiceRole = !!supabaseServiceKey && timingSafeEqual(token, supabaseServiceKey)
      const isAdminToken = reprovisionKey.length > 0 && providedKey.length > 0 && timingSafeEqual(providedKey, reprovisionKey)
      if (!isServiceRole && !isAdminToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: service-role or reprovision key required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
      return await handleReprovision(supabase, body)
    }

    // ============================================
    // AUTH PATH I — Inspect (read-only diagnostics): fetches promo/plan
    // structure straight from Whop. Admin-only, same gate as reprovision —
    // callable by the service-role bearer OR the dedicated REPROVISION_KEY
    // admin header. Never callable by a normal user JWT.
    // ============================================
    if (body.mode === 'inspect') {
      const reprovisionKey = Deno.env.get('REPROVISION_KEY') || ''
      const providedKey = req.headers.get('x-reprovision-key') || ''
      const isServiceRole = !!supabaseServiceKey && timingSafeEqual(token, supabaseServiceKey)
      const isAdminToken = reprovisionKey.length > 0 && providedKey.length > 0 && timingSafeEqual(providedKey, reprovisionKey)
      if (!isServiceRole && !isAdminToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: service-role or reprovision key required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
      return await handleInspect(req, body)
    }

    // ============================================
    // AUTH PATH O — Create Offer Promo: creates a standalone offer promo code
    // in Whop, not tied to any affiliate row. Admin-only, same gate as
    // reprovision/inspect — callable by the service-role bearer OR the
    // dedicated REPROVISION_KEY admin header. Never callable by a normal
    // user JWT.
    // ============================================
    if (body.mode === 'create_offer_promo') {
      const reprovisionKey = Deno.env.get('REPROVISION_KEY') || ''
      const providedKey = req.headers.get('x-reprovision-key') || ''
      const isServiceRole = !!supabaseServiceKey && timingSafeEqual(token, supabaseServiceKey)
      const isAdminToken = reprovisionKey.length > 0 && providedKey.length > 0 && timingSafeEqual(providedKey, reprovisionKey)
      if (!isServiceRole && !isAdminToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: service-role or reprovision key required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
      return await handleCreateOfferPromo(body)
    }

    // ============================================
    // AUTH PATH A — Service role (whop-webhook -> this function, mode='member')
    // ============================================
    if (body.mode === 'member' && supabaseServiceKey && timingSafeEqual(token, supabaseServiceKey)) {
      if (!body.user_id) {
        throw new Error('Missing required field: user_id')
      }
      return await handleMemberPromo(supabase, body.user_id, body.requested_code)
    }

    // ============================================
    // AUTH PATH B — Self-service member (own JWT, mode='member')
    // Provisions ONLY the caller's own coupon — user_id always comes from the
    // verified JWT, any body.user_id is ignored.
    // ============================================
    if (body.mode === 'member') {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        throw new Error('Unauthorized: Invalid token')
      }
      return await handleMemberPromo(supabase, user.id, body.requested_code)
    }

    // ============================================
    // AUTH PATH C — Admin (existing behavior, unchanged)
    // ============================================
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    // ============================================
    // 2. PARSE REQUEST
    // ============================================
    const { affiliate_id, coupon_code, discount_percent, affiliate_name } = body

    if (!affiliate_id || !coupon_code) {
      throw new Error('Missing required fields: affiliate_id, coupon_code')
    }

    // 🔥 v3.0.0: Accept any integer percent 1-100 (previously locked to 10 or 15)
    const discount = Number.isInteger(discount_percent) && (discount_percent as number) >= 1 && (discount_percent as number) <= 100
      ? (discount_percent as number)
      : 10

    console.log(`[create-whop-promo] Creating promo for affiliate ${affiliate_id}`)
    console.log(`[create-whop-promo] Code: ${coupon_code}, Discount: ${discount}%`)

    // ============================================
    // 3. GET WHOP CREDENTIALS
    // ============================================
    const whopApiKey = Deno.env.get('WHOP_API_KEY')
    const whopCompanyId = Deno.env.get('WHOP_COMPANY_ID')

    console.log(`[create-whop-promo] API Key exists: ${!!whopApiKey}`)
    console.log(`[create-whop-promo] Company ID: ${whopCompanyId}`)

    if (!whopApiKey || !whopCompanyId) {
      throw new Error('Whop API credentials not configured. Add WHOP_API_KEY and WHOP_COMPANY_ID to Supabase secrets.')
    }

    // ============================================
    // 4. CREATE PROMO CODE IN WHOP
    // ============================================
    const whopPromo = await createWhopPromoCode(
      whopApiKey,
      whopCompanyId,
      coupon_code,
      discount,
      affiliate_id,
      affiliate_name
    )

    console.log(`[create-whop-promo] ✅ Whop promo created: ${whopPromo.id}`)

    // ============================================
    // 5. UPDATE AFFILIATE RECORD
    // ============================================
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        whop_promo_id: whopPromo.id,
        coupon_code: coupon_code.toUpperCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliate_id)

    if (updateError) {
      console.error('[create-whop-promo] Warning: Failed to update affiliate record:', updateError)
      // Don't throw - the promo was created successfully in Whop
    }

    // ============================================
    // 6. RETURN SUCCESS
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        whop_promo_id: whopPromo.id,
        code: whopPromo.code,
        discount: whopPromo.amount_off,
        status: whopPromo.status,
        message: `Promo code "${whopPromo.code}" created in Whop with ${discount}% discount`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[create-whop-promo] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
