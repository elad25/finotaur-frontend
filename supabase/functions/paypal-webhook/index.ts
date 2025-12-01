// =============================================
// EDGE FUNCTION: paypal-webhook
// Handles PayPal webhook notifications for payout status updates
// =============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PayPal API URLs for webhook verification
const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com'
const PAYPAL_LIVE_URL = 'https://api-m.paypal.com'

/**
 * Verify PayPal webhook signature
 * https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/
 */
async function verifyWebhookSignature(
  headers: Headers,
  body: string
): Promise<boolean> {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID')
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
  const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox'
  
  if (!webhookId || !clientId || !clientSecret) {
    console.warn('PayPal webhook verification credentials not configured')
    // In development, you might want to skip verification
    return true
  }
  
  const baseUrl = mode === 'live' ? PAYPAL_LIVE_URL : PAYPAL_SANDBOX_URL
  
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
    console.error('Failed to get PayPal access token for verification')
    return false
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
    console.error('Webhook signature verification failed')
    return false
  }
  
  const verifyResult = await verifyResponse.json()
  return verifyResult.verification_status === 'SUCCESS'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    
    // Verify webhook signature (in production)
    const isVerified = await verifyWebhookSignature(req.headers, body)
    if (!isVerified) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const event = JSON.parse(body)
    console.log('Received PayPal webhook:', event.event_type)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Handle different event types
    switch (event.event_type) {
      // =============================================
      // PAYOUT BATCH EVENTS
      // =============================================
      case 'PAYMENT.PAYOUTSBATCH.PROCESSING':
        // Batch is being processed - no action needed
        console.log('Payout batch processing:', event.resource?.batch_header?.payout_batch_id)
        break
        
      case 'PAYMENT.PAYOUTSBATCH.SUCCESS':
        // Entire batch succeeded
        console.log('Payout batch succeeded:', event.resource?.batch_header?.payout_batch_id)
        // Individual items will have their own events
        break
        
      case 'PAYMENT.PAYOUTSBATCH.DENIED':
        // Entire batch was denied
        const deniedBatchId = event.resource?.batch_header?.payout_batch_id
        console.log('Payout batch denied:', deniedBatchId)
        
        if (deniedBatchId) {
          await supabase
            .from('affiliate_payouts')
            .update({
              status: 'failed',
              failure_reason: 'PayPal batch denied',
              failed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('paypal_batch_id', deniedBatchId)
        }
        break
        
      // =============================================
      // INDIVIDUAL PAYOUT ITEM EVENTS
      // =============================================
      case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED':
        // Individual payout succeeded
        const successItem = event.resource
        console.log('Payout item succeeded:', successItem)
        
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
            console.error('Error updating payout:', error)
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
            }
          }
        }
        break
        
      case 'PAYMENT.PAYOUTS-ITEM.BLOCKED':
      case 'PAYMENT.PAYOUTS-ITEM.FAILED':
      case 'PAYMENT.PAYOUTS-ITEM.REFUNDED':
      case 'PAYMENT.PAYOUTS-ITEM.RETURNED':
      case 'PAYMENT.PAYOUTS-ITEM.CANCELED':
        // Payout item failed/blocked/returned
        const failedItem = event.resource
        const failReason = event.event_type.replace('PAYMENT.PAYOUTS-ITEM.', '')
        console.log('Payout item failed:', failedItem, failReason)
        
        if (failedItem?.payout_batch_id) {
          await supabase
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
        }
        break
        
      case 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED':
        // Recipient hasn't claimed the payment yet
        const unclaimedItem = event.resource
        console.log('Payout item unclaimed:', unclaimedItem)
        
        if (unclaimedItem?.payout_batch_id) {
          await supabase
            .from('affiliate_payouts')
            .update({
              paypal_transaction_status: 'UNCLAIMED',
              paypal_payout_item_id: unclaimedItem.payout_item_id,
              failure_reason: 'Recipient has not claimed payment. Will auto-return after 30 days.',
              updated_at: new Date().toISOString()
            })
            .eq('paypal_batch_id', unclaimedItem.payout_batch_id)
        }
        break
        
      default:
        console.log('Unhandled webhook event:', event.event_type)
    }
    
    // Always respond with 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Webhook error:', error)
    // Still return 200 to prevent PayPal from retrying
    return new Response(
      JSON.stringify({ received: true, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})