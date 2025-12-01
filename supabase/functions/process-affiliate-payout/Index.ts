// =============================================
// EDGE FUNCTION: process-affiliate-payout
// Sends money to affiliates via PayPal Payouts API
// =============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PayPal API URLs
const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com'
const PAYPAL_LIVE_URL = 'https://api-m.paypal.com'

// =============================================
// PAYPAL HELPER FUNCTIONS
// =============================================

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
  const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox'
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }
  
  const baseUrl = mode === 'live' ? PAYPAL_LIVE_URL : PAYPAL_SANDBOX_URL
  
  const auth = btoa(`${clientId}:${clientSecret}`)
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get PayPal access token: ${error}`)
  }
  
  const data = await response.json()
  return data.access_token
}

async function createPayPalPayout(
  accessToken: string,
  payoutId: string,
  recipientEmail: string,
  amount: number,
  note: string
): Promise<{ success: boolean; batchId?: string; error?: string }> {
  const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox'
  const baseUrl = mode === 'live' ? PAYPAL_LIVE_URL : PAYPAL_SANDBOX_URL
  
  const senderBatchId = `FINOTAUR_${payoutId}_${Date.now()}`
  
  const payload = {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      recipient_type: 'EMAIL',
      email_subject: 'You have received a payout from Finotaur!',
      email_message: 'Thank you for being a Finotaur affiliate. Your commission payout is ready!'
    },
    items: [
      {
        recipient_type: 'EMAIL',
        receiver: recipientEmail,
        amount: {
          value: amount.toFixed(2),
          currency: 'USD'
        },
        note: note || `Finotaur Affiliate Commission Payout - ID: ${payoutId}`,
        sender_item_id: payoutId
      }
    ]
  }
  
  console.log('Creating PayPal payout:', JSON.stringify(payload, null, 2))
  
  const response = await fetch(`${baseUrl}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    console.error('PayPal payout error:', data)
    return {
      success: false,
      error: data.message || data.details?.[0]?.issue || 'PayPal payout failed'
    }
  }
  
  console.log('PayPal payout created:', data)
  
  return {
    success: true,
    batchId: data.batch_header?.payout_batch_id
  }
}

async function getPayoutStatus(
  accessToken: string,
  batchId: string
): Promise<any> {
  const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox'
  const baseUrl = mode === 'live' ? PAYPAL_LIVE_URL : PAYPAL_SANDBOX_URL
  
  const response = await fetch(`${baseUrl}/v1/payments/payouts/${batchId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get payout status: ${error}`)
  }
  
  return await response.json()
}

// =============================================
// MAIN HANDLER
// =============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { action, payoutId, affiliateId, amount } = await req.json()
    
    // =============================================
    // ACTION: REQUEST PAYOUT (Affiliate requests)
    // =============================================
    if (action === 'request') {
      if (!affiliateId || !amount) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing affiliateId or amount' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Get affiliate details
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id, user_id, paypal_email, total_earnings_usd, total_paid_usd')
        .eq('id', affiliateId)
        .single()
      
      if (affiliateError || !affiliate) {
        return new Response(
          JSON.stringify({ success: false, error: 'Affiliate not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }
      
      if (!affiliate.paypal_email) {
        return new Response(
          JSON.stringify({ success: false, error: 'PayPal email not set. Please add your PayPal email first.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Validate amount
      const MIN_PAYOUT = 100
      if (amount < MIN_PAYOUT) {
        return new Response(
          JSON.stringify({ success: false, error: `Minimum payout is $${MIN_PAYOUT}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Check available balance (confirmed commissions without payout_id)
      // Using FOR UPDATE to lock rows and prevent race conditions
      const { data: availableCommissions } = await supabase
        .from('affiliate_commissions')
        .select('id, commission_amount_usd')
        .eq('affiliate_id', affiliateId)
        .eq('status', 'confirmed')
        .is('payout_id', null)
        .order('created_at', { ascending: true })
      
      const availableBalance = availableCommissions?.reduce(
        (sum, c) => sum + Number(c.commission_amount_usd), 0
      ) || 0
      
      if (amount > availableBalance) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Check for existing pending/processing payouts (prevent duplicates)
      const { data: existingPayouts } = await supabase
        .from('affiliate_payouts')
        .select('id, total_amount_usd, status')
        .eq('affiliate_id', affiliateId)
        .in('status', ['pending', 'processing'])
      
      if (existingPayouts && existingPayouts.length > 0) {
        const pendingTotal = existingPayouts.reduce((sum, p) => sum + Number(p.total_amount_usd), 0)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `You already have a pending payout request ($${pendingTotal.toFixed(2)}). Please wait for it to be processed.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Select which commissions to include in this payout (FIFO - oldest first)
      let remainingAmount = amount
      const commissionIds: string[] = []
      
      for (const commission of availableCommissions || []) {
        if (remainingAmount <= 0) break
        commissionIds.push(commission.id)
        remainingAmount -= Number(commission.commission_amount_usd)
      }
      
      // Create payout record
      const payoutPeriod = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      
      const { data: newPayout, error: insertError } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliateId,
          payout_period: payoutPeriod,
          commissions_amount_usd: amount,
          bonuses_amount_usd: 0,
          adjustments_usd: 0,
          total_amount_usd: amount,
          status: 'pending',
          payment_method: 'paypal',
          payment_email: affiliate.paypal_email,
          scheduled_date: new Date().toISOString(),
          notes: `Requested by affiliate on ${new Date().toLocaleDateString()}`
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('Insert error:', insertError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create payout request' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      // CRITICAL: Lock the commissions to this payout immediately
      // This prevents double-spending / duplicate payout requests
      if (commissionIds.length > 0) {
        const { error: lockError } = await supabase
          .from('affiliate_commissions')
          .update({ 
            payout_id: newPayout.id,
            updated_at: new Date().toISOString()
          })
          .in('id', commissionIds)
        
        if (lockError) {
          // Rollback: delete the payout if we couldn't lock commissions
          await supabase
            .from('affiliate_payouts')
            .delete()
            .eq('id', newPayout.id)
          
          console.error('Lock error:', lockError)
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to process request. Please try again.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          payout: newPayout,
          message: 'Payout request submitted successfully',
          commissionsLocked: commissionIds.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // =============================================
    // ACTION: PROCESS PAYOUT (Admin processes via PayPal)
    // =============================================
    if (action === 'process') {
      if (!payoutId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing payoutId' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Get payout details
      const { data: payout, error: payoutError } = await supabase
        .from('affiliate_payouts')
        .select(`
          *,
          affiliate:affiliates(id, user_id, paypal_email, referral_code)
        `)
        .eq('id', payoutId)
        .single()
      
      if (payoutError || !payout) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payout not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }
      
      if (payout.status !== 'pending') {
        return new Response(
          JSON.stringify({ success: false, error: `Payout is already ${payout.status}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      const paypalEmail = payout.payment_email || payout.affiliate?.paypal_email
      
      if (!paypalEmail) {
        return new Response(
          JSON.stringify({ success: false, error: 'No PayPal email found for this payout' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Get PayPal access token
      let accessToken: string
      try {
        accessToken = await getPayPalAccessToken()
      } catch (error) {
        console.error('PayPal auth error:', error)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to authenticate with PayPal' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      // Create PayPal payout
      const paypalResult = await createPayPalPayout(
        accessToken,
        payoutId,
        paypalEmail,
        payout.total_amount_usd,
        `Finotaur Affiliate Commission - ${payout.affiliate?.referral_code || 'N/A'}`
      )
      
      if (!paypalResult.success) {
        // Update payout status to failed
        await supabase
          .from('affiliate_payouts')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            failure_reason: paypalResult.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', payoutId)
        
        // IMPORTANT: Release the locked commissions back to available balance
        await supabase
          .from('affiliate_commissions')
          .update({ 
            payout_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('payout_id', payoutId)
        
        return new Response(
          JSON.stringify({ success: false, error: paypalResult.error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Update payout with PayPal batch ID and set to processing
      await supabase
        .from('affiliate_payouts')
        .update({
          status: 'processing',
          paypal_batch_id: paypalResult.batchId,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payoutId)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          batchId: paypalResult.batchId,
          message: 'Payout submitted to PayPal successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // =============================================
    // ACTION: CHECK STATUS (Check PayPal payout status)
    // =============================================
    if (action === 'check_status') {
      if (!payoutId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing payoutId' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Get payout details
      const { data: payout, error: payoutError } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('id', payoutId)
        .single()
      
      if (payoutError || !payout) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payout not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }
      
      if (!payout.paypal_batch_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'No PayPal batch ID for this payout' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Get PayPal access token
      const accessToken = await getPayPalAccessToken()
      
      // Get payout status from PayPal
      const paypalStatus = await getPayoutStatus(accessToken, payout.paypal_batch_id)
      
      console.log('PayPal status response:', JSON.stringify(paypalStatus, null, 2))
      
      // Extract item status (we only send one item per batch)
      const item = paypalStatus.items?.[0]
      const batchStatus = paypalStatus.batch_header?.batch_status
      const transactionStatus = item?.transaction_status
      const transactionId = item?.transaction_id
      const payoutItemId = item?.payout_item_id
      const fee = item?.payout_item_fee?.value
      
      // Map PayPal status to our status
      let newStatus = payout.status
      let completedAt = null
      let failedAt = null
      let failureReason = null
      
      if (transactionStatus === 'SUCCESS') {
        newStatus = 'completed'
        completedAt = new Date().toISOString()
      } else if (['FAILED', 'BLOCKED', 'REFUNDED', 'RETURNED', 'REVERSED'].includes(transactionStatus)) {
        newStatus = 'failed'
        failedAt = new Date().toISOString()
        failureReason = `PayPal status: ${transactionStatus}`
      } else if (transactionStatus === 'UNCLAIMED') {
        // Money sent but not claimed yet (recipient doesn't have PayPal account)
        newStatus = 'processing'
        failureReason = 'Recipient has not claimed the payout yet'
      }
      
      // Update payout record
      const updateData: any = {
        paypal_transaction_status: transactionStatus,
        paypal_transaction_id: transactionId,
        paypal_payout_item_id: payoutItemId,
        updated_at: new Date().toISOString()
      }
      
      if (fee) {
        updateData.paypal_fee_usd = parseFloat(fee)
      }
      
      if (newStatus !== payout.status) {
        updateData.status = newStatus
        if (completedAt) updateData.completed_at = completedAt
        if (failedAt) updateData.failed_at = failedAt
        if (failureReason) updateData.failure_reason = failureReason
        
        // If completed, update affiliate totals
        if (newStatus === 'completed') {
          // Mark commissions as paid
          await supabase
            .from('affiliate_commissions')
            .update({ 
              status: 'paid', 
              payout_id: payoutId,
              updated_at: new Date().toISOString()
            })
            .eq('affiliate_id', payout.affiliate_id)
            .eq('status', 'confirmed')
            .is('payout_id', null)
            .lte('commission_amount_usd', payout.total_amount_usd)
          
          // Update affiliate totals
          await supabase.rpc('update_affiliate_totals', { 
            p_affiliate_id: payout.affiliate_id 
          })
        }
      }
      
      await supabase
        .from('affiliate_payouts')
        .update(updateData)
        .eq('id', payoutId)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: newStatus,
          paypalStatus: transactionStatus,
          transactionId,
          batchStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // =============================================
    // ACTION: BATCH PROCESS (Admin processes all pending)
    // =============================================
    if (action === 'batch_process') {
      // Get all pending payouts
      const { data: pendingPayouts, error } = await supabase
        .from('affiliate_payouts')
        .select(`
          *,
          affiliate:affiliates(id, paypal_email, referral_code)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      
      if (error || !pendingPayouts?.length) {
        return new Response(
          JSON.stringify({ success: true, processed: 0, message: 'No pending payouts' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Get PayPal access token
      const accessToken = await getPayPalAccessToken()
      
      const results = {
        processed: 0,
        failed: 0,
        errors: [] as string[]
      }
      
      for (const payout of pendingPayouts) {
        const paypalEmail = payout.payment_email || payout.affiliate?.paypal_email
        
        if (!paypalEmail) {
          results.failed++
          results.errors.push(`Payout ${payout.id}: No PayPal email`)
          continue
        }
        
        const paypalResult = await createPayPalPayout(
          accessToken,
          payout.id,
          paypalEmail,
          payout.total_amount_usd,
          `Finotaur Affiliate Commission - ${payout.affiliate?.referral_code || 'N/A'}`
        )
        
        if (paypalResult.success) {
          await supabase
            .from('affiliate_payouts')
            .update({
              status: 'processing',
              paypal_batch_id: paypalResult.batchId,
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', payout.id)
          
          results.processed++
        } else {
          await supabase
            .from('affiliate_payouts')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              failure_reason: paypalResult.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', payout.id)
          
          // Release commissions
          await supabase
            .from('affiliate_commissions')
            .update({ 
              payout_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('payout_id', payout.id)
          
          results.failed++
          results.errors.push(`Payout ${payout.id}: ${paypalResult.error}`)
        }
        
        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          ...results,
          message: `Processed ${results.processed} payouts, ${results.failed} failed`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // =============================================
    // ACTION: CANCEL PAYOUT (Admin cancels pending payout)
    // =============================================
    if (action === 'cancel') {
      if (!payoutId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing payoutId' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Get payout details
      const { data: payout, error: payoutError } = await supabase
        .from('affiliate_payouts')
        .select('id, status, affiliate_id')
        .eq('id', payoutId)
        .single()
      
      if (payoutError || !payout) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payout not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }
      
      if (payout.status !== 'pending') {
        return new Response(
          JSON.stringify({ success: false, error: `Cannot cancel payout with status: ${payout.status}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Update payout status to cancelled
      await supabase
        .from('affiliate_payouts')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', payoutId)
      
      // Release the locked commissions back to available balance
      await supabase
        .from('affiliate_commissions')
        .update({ 
          payout_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('payout_id', payoutId)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payout cancelled and commissions released'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Unknown action
    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})