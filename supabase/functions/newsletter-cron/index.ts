// =====================================================
// Supabase Edge Function: newsletter-cron
// =====================================================
// Deploy: supabase functions deploy newsletter-cron
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Verify authorization
    const url = new URL(req.url)
    const secretParam = url.searchParams.get('secret')
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    // Check for valid secret or internal call
    const authHeader = req.headers.get('Authorization')
    const hasValidSecret = secretParam === cronSecret
    const isInternalCall = authHeader?.includes('Bearer')
    
    if (!hasValidSecret && !isInternalCall) {
      console.log('⚠️ Unauthorized cron attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if weekend (NY time)
    const nyTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const day = nyTime.getDay()
    
    if (day === 0 || day === 6) {
      console.log('⏰ Skipping - Weekend')
      
      await supabase.from('newsletter_cron_logs').insert({
        status: 'skipped',
        error_message: 'Weekend - day ' + day,
        triggered_at: new Date().toISOString(),
      })

      return new Response(
        JSON.stringify({ success: true, message: 'Skipped - Weekend' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`⏰ Newsletter cron triggered at ${nyTime.toLocaleString()} NY time`)

    // Get API URL from environment
    const apiUrl = Deno.env.get('NEWSLETTER_API_URL')
    
    if (!apiUrl) {
      throw new Error('NEWSLETTER_API_URL not configured')
    }

    console.log(`📨 Calling: ${apiUrl}/api/newsletter/cron`)

    // Call the newsletter API
    const response = await fetch(`${apiUrl}/api/newsletter/cron?secret=${cronSecret}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const result = await response.json()
    const duration = Date.now() - startTime

    if (!response.ok) {
      console.error('❌ Newsletter API error:', result)
      
      await supabase.from('newsletter_cron_logs').insert({
        status: 'failed',
        error_message: result.error || 'API returned ' + response.status,
        http_status: response.status,
        response_body: result,
        triggered_at: new Date().toISOString(),
        duration_ms: duration,
      })

      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Newsletter sent successfully:', result)

    // Log success
    await supabase.from('newsletter_cron_logs').insert({
      status: 'success',
      newsletter_id: result.data?.newsletterId,
      recipient_count: result.data?.recipientCount,
      sent_count: result.data?.sentCount,
      failed_count: result.data?.failedCount,
      http_status: response.status,
      response_body: result,
      triggered_at: new Date().toISOString(),
      duration_ms: duration,
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Newsletter sent',
        data: result.data,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Cron error:', error)
    
    await supabase.from('newsletter_cron_logs').insert({
      status: 'failed',
      error_message: error.message,
      triggered_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    })
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})