// supabase/functions/create-whop-promo/index.ts
// ============================================
// 🎯 יוצר קופון ב-Whop אחרי שהאדמין מאשר אפילייט
// ============================================
// 🔥 v2.1 FIX: Fixed stock limit issue
//
// FLOW:
// 1. Admin approves affiliate application in the dashboard
// 2. Frontend calls this Edge Function with affiliate details
// 3. Edge Function creates promo code in Whop API
// 4. Updates affiliate record with whop_promo_id
//
// SETUP - Add these secrets in Supabase Dashboard:
// - WHOP_API_KEY: Your Whop API key from dashboard
// - WHOP_COMPANY_ID: Your company ID (biz_xxxxxx)
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// TYPES
// ============================================

interface CreatePromoRequest {
  affiliate_id: string       // UUID של האפילייט ב-DB
  coupon_code: string        // הקוד שהאדמין אישר
  discount_percent: number   // 10 או 15
  affiliate_name?: string    // שם האפילייט (optional, for metadata)
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
// WHOP API FUNCTION
// ============================================

async function createWhopPromoCode(
  apiKey: string,
  companyId: string,
  code: string,
  discountPercent: number,
  affiliateId: string,
  affiliateName?: string
): Promise<WhopPromoResponse> {
  
  console.log(`[Whop API] Creating promo code: ${code} with ${discountPercent}% discount`)
  console.log(`[Whop API] Company ID: ${companyId}`)
  
  // 🔥 v2.1 FIX: Use high stock number instead of 0
  const requestBody = {
    code: code.toUpperCase(),           // Whop codes are case-insensitive
    amount_off: discountPercent,        // אחוז ההנחה
    base_currency: 'usd',
    promo_type: 'percentage',           // אחוזים, לא סכום קבוע
    new_users_only: true,               // רק למשתמשים חדשים
    stock: 999999,                      // 🔥 FIX: High number instead of 0!
    unlimited_stock: true,              // ללא הגבלת שימושים
    number_of_intervals: 0,             // 0 = forever (לא מוגבל בזמן)
  };

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
      errorMessage = errorData.message || errorData.error || errorMessage
    } catch {
      errorMessage = responseText || errorMessage
    }
    throw new Error(errorMessage)
  }

  return JSON.parse(responseText) as WhopPromoResponse
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
    // 1. VALIDATE AUTHORIZATION
    // ============================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
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
    const body: CreatePromoRequest = await req.json()
    const { affiliate_id, coupon_code, discount_percent, affiliate_name } = body

    if (!affiliate_id || !coupon_code) {
      throw new Error('Missing required fields: affiliate_id, coupon_code')
    }

    // Validate discount percent (only 10 or 15 allowed)
    const validDiscounts = [10, 15]
    const discount = validDiscounts.includes(discount_percent) ? discount_percent : 10

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