// =====================================================
// Supabase Edge Function: newsletter-cron
// =====================================================
// This function is called by the Node.js CRON scheduler
// It generates the newsletter content and sends emails
// =====================================================
// Deploy: supabase functions deploy newsletter-cron --no-verify-jwt
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// CONFIGURATION
// ============================================
const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = 'Finotaur <newsletter@finotaur.com>'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // ============================================
    // 1. VERIFY AUTHORIZATION
    // ============================================
    const url = new URL(req.url)
    const secretParam = url.searchParams.get('secret')
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    const authHeader = req.headers.get('Authorization')
    const hasValidSecret = secretParam === cronSecret
    const hasServiceRole = authHeader?.includes(supabaseKey)
    
    if (!hasValidSecret && !hasServiceRole) {
      console.log('⚠️ Unauthorized cron attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Authorization verified')

    // ============================================
    // 2. CHECK IF WEEKEND (NY TIME)
    // ============================================
    const nyTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const day = nyTime.getDay()
    
    if (day === 0 || day === 6) {
      console.log('⏰ Skipping - Weekend (day ' + day + ')')
      return new Response(
        JSON.stringify({ success: true, message: 'Skipped - Weekend', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`⏰ Newsletter cron triggered at ${nyTime.toLocaleString()} NY time`)

    // ============================================
    // 3. GET ELIGIBLE RECIPIENTS
    // ============================================
    const { data: inclusionConfig } = await supabase.rpc('get_newsletter_inclusion_status')
    const config = inclusionConfig?.[0] || {}
    const premiumIncluded = config.premium_included || false
    const basicIncluded = config.basic_included || false

    console.log(`📊 Config: premium=${premiumIncluded}, basic=${basicIncluded}`)

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, display_name, account_type, subscription_status, newsletter_status, newsletter_enabled')
      .not('email', 'is', null)

    if (usersError) {
      throw new Error('Failed to fetch users: ' + usersError.message)
    }

    const recipients: Array<{id: string, email: string, name: string}> = []
    
    for (const user of users || []) {
      // Newsletter subscribers always included
      if (user.newsletter_status === 'active' || user.newsletter_status === 'trial') {
        recipients.push({ id: user.id, email: user.email, name: user.display_name || '' })
        continue
      }
      // Premium perk
      if (user.account_type === 'premium' && user.subscription_status === 'active' && premiumIncluded && user.newsletter_enabled !== false) {
        recipients.push({ id: user.id, email: user.email, name: user.display_name || '' })
        continue
      }
      // Basic perk
      if (user.account_type === 'basic' && user.subscription_status === 'active' && basicIncluded && user.newsletter_enabled !== false) {
        recipients.push({ id: user.id, email: user.email, name: user.display_name || '' })
      }
    }

    console.log(`📬 Found ${recipients.length} eligible recipients`)

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 4. GENERATE NEWSLETTER CONTENT
    // ============================================
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const today = nyTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    console.log('🤖 Generating newsletter content...')

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are Finotaur's market intelligence analyst. Write a professional daily market briefing.
            
Format the response as JSON with this structure:
{
  "subject": "Brief, compelling email subject (max 60 chars)",
  "preheader": "Preview text for email (max 100 chars)",
  "summary": "2-3 sentence executive summary",
  "marketOverview": "3-4 paragraphs on current market conditions",
  "keyLevels": "Important support/resistance levels for major indices",
  "watchList": "3-5 stocks/sectors to watch today with brief reasoning",
  "riskFactors": "Key risks traders should be aware of",
  "bottomLine": "1-2 sentence actionable takeaway"
}`
          },
          {
            role: 'user',
            content: `Generate the Finotaur War Zone daily intelligence briefing for ${today}. Focus on actionable insights for active traders.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error('OpenAI API error: ' + errorText)
    }

    const openaiData = await openaiResponse.json()
    const contentText = openaiData.choices?.[0]?.message?.content || ''
    
    // Parse JSON from response
    let newsletter
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = contentText.match(/```json\s*([\s\S]*?)\s*```/) || 
                        contentText.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, contentText]
      newsletter = JSON.parse(jsonMatch[1] || contentText)
    } catch (e) {
      console.error('Failed to parse OpenAI response:', contentText)
      throw new Error('Failed to parse newsletter content')
    }

    console.log(`✅ Content generated: "${newsletter.subject}"`)

    // ============================================
    // 5. BUILD HTML EMAIL
    // ============================================
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${newsletter.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    
    <!-- Header -->
    <div style="text-align:center;padding:30px 20px;background:linear-gradient(135deg,#1a1a2e 0%,#0a0a0f 100%);border-radius:12px 12px 0 0;border:1px solid #C9A646;">
      <h1 style="margin:0;color:#C9A646;font-size:28px;font-weight:bold;">⚔️ FINOTAUR WAR ZONE</h1>
      <p style="margin:10px 0 0;color:#888;font-size:14px;">${today}</p>
    </div>
    
    <!-- Content -->
    <div style="background:#111;padding:30px;border-left:1px solid #333;border-right:1px solid #333;">
      
      <!-- Summary -->
      <div style="background:#1a1a2e;padding:20px;border-radius:8px;margin-bottom:25px;border-left:3px solid #C9A646;">
        <p style="margin:0;color:#fff;font-size:16px;line-height:1.6;">${newsletter.summary}</p>
      </div>
      
      <!-- Market Overview -->
      <h2 style="color:#C9A646;font-size:18px;margin:0 0 15px;border-bottom:1px solid #333;padding-bottom:10px;">📊 Market Overview</h2>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 25px;">${newsletter.marketOverview}</p>
      
      <!-- Key Levels -->
      <h2 style="color:#C9A646;font-size:18px;margin:0 0 15px;border-bottom:1px solid #333;padding-bottom:10px;">🎯 Key Levels</h2>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 25px;">${newsletter.keyLevels}</p>
      
      <!-- Watch List -->
      <h2 style="color:#C9A646;font-size:18px;margin:0 0 15px;border-bottom:1px solid #333;padding-bottom:10px;">👀 Today's Watch List</h2>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 25px;">${newsletter.watchList}</p>
      
      <!-- Risk Factors -->
      <h2 style="color:#C9A646;font-size:18px;margin:0 0 15px;border-bottom:1px solid #333;padding-bottom:10px;">⚠️ Risk Factors</h2>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 25px;">${newsletter.riskFactors}</p>
      
      <!-- Bottom Line -->
      <div style="background:linear-gradient(135deg,#C9A646 0%,#9a7a35 100%);padding:20px;border-radius:8px;margin-top:25px;">
        <h3 style="margin:0 0 10px;color:#000;font-size:16px;">📋 THE BOTTOM LINE</h3>
        <p style="margin:0;color:#000;font-size:15px;font-weight:500;">${newsletter.bottomLine}</p>
      </div>
      
    </div>
    
    <!-- Footer -->
    <div style="background:#0a0a0f;padding:25px;text-align:center;border:1px solid #333;border-top:none;border-radius:0 0 12px 12px;">
      <p style="margin:0 0 10px;color:#666;font-size:12px;">
        This is for informational purposes only. Not financial advice.
      </p>
      <p style="margin:0;color:#666;font-size:12px;">
        © ${new Date().getFullYear()} Finotaur. All rights reserved.
      </p>
    </div>
    
  </div>
</body>
</html>`

// ============================================
    // 5.5 SAVE REPORT TO DATABASE
    // ============================================
    const reportDate = nyTime.toISOString().split('T')[0]; // YYYY-MM-DD

    const { error: saveError } = await supabase
      .from('newsletter_reports')
      .upsert({
        report_date: reportDate,
        subject: newsletter.subject,
        preheader: newsletter.preheader || '',
        content: newsletter,
        html_content: html,
        recipient_count: recipients.length,
        sent_count: 0,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'report_date'
      });

    if (saveError) {
      console.error('⚠️ Failed to save report to DB:', saveError.message);
    } else {
      console.log(`✅ Report saved to DB for ${reportDate}`);
    }

    // ============================================
    // 6. SEND EMAILS VIA RESEND
    // ============================================
    const resendKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    console.log(`📨 Sending to ${recipients.length} recipients...`)

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Send in batches of 10 to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      const sendPromises = batch.map(async (recipient) => {
        try {
          const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [recipient.email],
              subject: newsletter.subject,
              html: html,
              headers: {
                'X-Entity-Ref-ID': `newsletter-${Date.now()}-${recipient.id}`,
              },
            }),
          })

          if (response.ok) {
            sentCount++
          } else {
            const errorData = await response.text()
            failedCount++
            errors.push(`${recipient.email}: ${errorData}`)
          }
        } catch (e) {
          failedCount++
          errors.push(`${recipient.email}: ${e.message}`)
        }
      })

      await Promise.all(sendPromises)
      
      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    const duration = Date.now() - startTime

    console.log(`✅ Newsletter sent: ${sentCount} success, ${failedCount} failed`)
    if (errors.length > 0) {
      console.log('Errors:', errors.slice(0, 5))
    }
// Update sent_count in report
    await supabase
      .from('newsletter_reports')
      .update({ 
        sent_count: sentCount,
        updated_at: new Date().toISOString()
      })
      .eq('report_date', reportDate);
    // ============================================
    // 7. LOG TO DATABASE
    // ============================================
    await supabase.from('newsletter_send_logs').insert({
      sent_at: new Date().toISOString(),
      recipient_count: recipients.length,
      subject: newsletter.subject,
      segments: ['newsletter_cron'],
    })

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        subject: newsletter.subject,
        duration_ms: duration,
        qaScore: 85, // Placeholder - implement real QA if needed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Cron error:', error)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        duration_ms: duration,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})