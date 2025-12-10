// =============================================
// EDGE FUNCTION: paypal-webhook
// Handles PayPal webhook notifications for payout status updates
// =============================================
// Version: 2.0.0 - Security Hardened
// 
// ✅ Fixes Applied:
// - FIX-001: Signature verification ENFORCED in production
// - FIX-002: Rate limiting added
// - FIX-003: Better error handling
// - FIX-004: Audit logging
// =============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// =============================================
// CORS Headers
// =============================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // PayPal needs to reach this endpoint
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================
// Environment
// =============================================
const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com'
const PAYPAL_LIVE_URL = 'https://api-m.paypal.com'
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'production'

// =============================================
// 🔒 FIX-002: Rate Limiting
// =============================================
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(identifier: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  entry.count++;
  return entry.count <= limit;
}

// =============================================
// 🔒 FIX-001: Signature Verification (ENFORCED)
// =============================================
interface VerificationResult {
  verified: boolean;
  error?: string;
  skipped?: boolean;
}

async function verifyWebhookSignature(
  headers: Headers,
  body: string
): Promise<VerificationResult> {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID')
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
  const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox'
  
  // 🔒 FIX-001: In production, credentials are REQUIRED
  if (!webhookId || !clientId || !clientSecret) {
    if (ENVIRONMENT === 'production') {
      console.error('❌ CRITICAL: PayPal webhook credentials not configured in production!')
      console.error('   Required: PAYPAL_WEBHOOK_ID, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET')
      return { 
        verified: false, 
        error: 'Webhook credentials not configured' 
      }
    }
    
    // Only skip in development
    console.warn('⚠️ [DEV] Skipping PayPal signature verification - credentials not set')
    return { verified: true, skipped: true }
  }
  
  // Validate required headers from PayPal
  const requiredHeaders = [
    'paypal-auth-algo',
    'paypal-cert-url',
    'paypal-transmission-id',
    'paypal-transmission-sig',
    'paypal-transmission-time'
  ]
  
  for (const header of requiredHeaders) {
    if (!headers.get(header)) {
      console.error(`❌ Missing required PayPal header: ${header}`)
      return { 
        verified: false, 
        error: `Missing header: ${header}` 
      }
    }
  }
  
  const baseUrl = mode === 'live' ? PAYPAL_LIVE_URL : PAYPAL_SANDBOX_URL
  
  try {
    // Get access token
    const auth = btoa(`${clientId}:${clientSecret}`)
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Failed to get PayPal access token:', errorText)
      return { 
        verified: false, 
        error: 'Failed to authenticate with PayPal' 
      }
    }
    
    const { access_token } = await tokenResponse.json()
    
    // Verify webhook signature
    const verifyPayload = {
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(body)
    }
    
    const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    })
    
    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text()
      console.error('❌ Webhook verification request failed:', errorText)
      return { 
        verified: false, 
        error: 'Verification request failed' 
      }
    }
    
    const verifyResult = await verifyResponse.json()
    const isVerified = verifyResult.verification_status === 'SUCCESS'
    
    if (!isVerified) {
      console.error('❌ Webhook signature verification failed:', verifyResult)
    }
    
    return { 
      verified: isVerified,
      error: isVerified ? undefined : 'Invalid signature'
    }
    
  } catch (error: any) {
    console.error('❌ Error during webhook verification:', error.message)
    return { 
      verified: false, 
      error: error.message 
    }
  }
}

// =============================================
// 🔒 FIX-004: Audit Logging
// =============================================
async function logWebhookEvent(
  supabase: any,
  eventType: string,
  eventId: string,
  status: 'received' | 'processed' | 'failed',
  details?: any
) {
  try {
    // You can create an audit_logs table if you want to track webhook events
    console.log(`📝 [AUDIT] PayPal Webhook: ${eventType} | ID: ${eventId} | Status: ${status}`)
    if (details) {
      console.log(`   Details:`, JSON.stringify(details, null, 2))
    }
  } catch (e) {
    // Don't fail on logging errors
    console.error('Failed to log webhook event:', e)
  }
}

// =============================================
// MAIN HANDLER
// =============================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 🔒 Rate limiting by IP
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
  if (!checkRateLimit(clientIP, 100, 60000)) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${clientIP}`)
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.text()
    
    // 🔒 FIX-001: Verify webhook signature (ENFORCED)
    const verification = await verifyWebhookSignature(req.headers, body)
    
    if (!verification.verified) {
      console.error('❌ Invalid webhook signature:', verification.error)
      return new Response(
        JSON.stringify({ error: 'Invalid signature', details: verification.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (verification.skipped) {
      console.warn('⚠️ Signature verification skipped (development mode)')
    }
    
    const event = JSON.parse(body)
    const eventType = event.event_type
    const eventId = event.id || 'unknown'
    
    console.log('✅ Received verified PayPal webhook:', eventType, '| ID:', eventId)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Log received event
    await logWebhookEvent(supabase, eventType, eventId, 'received')
    
    // Handle different event types
    try {
      switch (eventType) {
        // =============================================
        // PAYOUT BATCH EVENTS
        // =============================================
        case 'PAYMENT.PAYOUTSBATCH.PROCESSING':
          console.log('📦 Payout batch processing:', event.resource?.batch_header?.payout_batch_id)
          break
          
        case 'PAYMENT.PAYOUTSBATCH.SUCCESS':
          console.log('✅ Payout batch succeeded:', event.resource?.batch_header?.payout_batch_id)
          break
          
        case 'PAYMENT.PAYOUTSBATCH.DENIED':
          const deniedBatchId = event.resource?.batch_header?.payout_batch_id
          console.log('❌ Payout batch denied:', deniedBatchId)
          
          if (deniedBatchId) {
            const { error } = await supabase
              .from('affiliate_payouts')
              .update({
                status: 'failed',
                failure_reason: 'PayPal batch denied',
                failed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('paypal_batch_id', deniedBatchId)
            
            if (error) {
              console.error('❌ Error updating denied batch:', error)
            }
          }
          break
          
        // =============================================
        // INDIVIDUAL PAYOUT ITEM EVENTS
        // =============================================
        case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED':
          const successItem = event.resource
          console.log('✅ Payout item succeeded:', successItem?.payout_batch_id)
          
          if (successItem?.payout_batch_id) {
            const { error } = await supabase
              .from('affiliate_payouts')
              .update({
                status: 'completed',
                paypal_transaction_status: 'SUCCESS',
                paypal_transaction_id: successItem.transaction_id,
                paypal_payout_item_id: successItem.payout_item_id,
                paypal_fee_usd: successItem.payout_item_fee?.value 
                  ? parseFloat(successItem.payout_item_fee.value) 
                  : null,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('paypal_batch_id', successItem.payout_batch_id)
            
            if (error) {
              console.error('❌ Error updating payout:', error)
            } else {
              // Get payout details to update affiliate totals
              const { data: payout } = await supabase
                .from('affiliate_payouts')
                .select('affiliate_id, total_amount_usd')
                .eq('paypal_batch_id', successItem.payout_batch_id)
                .single()
              
              if (payout) {
                // Mark commissions as paid
                await supabase
                  .from('affiliate_commissions')
                  .update({ 
                    status: 'paid',
                    updated_at: new Date().toISOString()
                  })
                  .eq('affiliate_id', payout.affiliate_id)
                  .eq('status', 'confirmed')
                  .is('payout_id', null)
                
                // Update affiliate totals using RPC
                await supabase.rpc('update_affiliate_totals', {
                  p_affiliate_id: payout.affiliate_id
                })
                
                console.log('✅ Updated affiliate totals for:', payout.affiliate_id)
              }
            }
          }
          break
          
        case 'PAYMENT.PAYOUTS-ITEM.BLOCKED':
        case 'PAYMENT.PAYOUTS-ITEM.FAILED':
        case 'PAYMENT.PAYOUTS-ITEM.REFUNDED':
        case 'PAYMENT.PAYOUTS-ITEM.RETURNED':
        case 'PAYMENT.PAYOUTS-ITEM.CANCELED':
          const failedItem = event.resource
          const failReason = eventType.replace('PAYMENT.PAYOUTS-ITEM.', '')
          console.log('❌ Payout item failed:', failedItem?.payout_batch_id, '|', failReason)
          
          if (failedItem?.payout_batch_id) {
            const { error } = await supabase
              .from('affiliate_payouts')
              .update({
                status: 'failed',
                paypal_transaction_status: failReason,
                paypal_payout_item_id: failedItem.payout_item_id,
                failure_reason: `PayPal: ${failReason}${failedItem.errors?.[0]?.message ? ' - ' + failedItem.errors[0].message : ''}`,
                failed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('paypal_batch_id', failedItem.payout_batch_id)
            
            if (error) {
              console.error('❌ Error updating failed payout:', error)
            }
          }
          break
          
        case 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED':
          const unclaimedItem = event.resource
          console.log('⏳ Payout item unclaimed:', unclaimedItem?.payout_batch_id)
          
          if (unclaimedItem?.payout_batch_id) {
            const { error } = await supabase
              .from('affiliate_payouts')
              .update({
                paypal_transaction_status: 'UNCLAIMED',
                paypal_payout_item_id: unclaimedItem.payout_item_id,
                failure_reason: 'Recipient has not claimed payment. Will auto-return after 30 days.',
                updated_at: new Date().toISOString()
              })
              .eq('paypal_batch_id', unclaimedItem.payout_batch_id)
            
            if (error) {
              console.error('❌ Error updating unclaimed payout:', error)
            }
          }
          break
          
        default:
          console.log('ℹ️ Unhandled webhook event:', eventType)
      }
      
      // Log successful processing
      await logWebhookEvent(supabase, eventType, eventId, 'processed')
      
    } catch (processingError: any) {
      console.error('❌ Error processing webhook:', processingError)
      await logWebhookEvent(supabase, eventType, eventId, 'failed', { 
        error: processingError.message 
      })
      // Don't throw - we still want to return 200 to PayPal
    }
    
    // Always respond with 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ received: true, event_id: eventId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error: any) {
    console.error('❌ Webhook error:', error.message)
    
    // Still return 200 to prevent PayPal from retrying indefinitely
    // But log the error for investigation
    return new Response(
      JSON.stringify({ received: true, error: 'Processing error logged' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})