// supabase/functions/send-support-email/index.ts
// ============================================
// Finotaur Support Email System
// Premium trading journal platform
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL = 'finotaur.site@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200 });
  }

  try {
    console.log('📧 Webhook received');
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const payload = await req.json();
    const webhookType = payload.type; // INSERT, UPDATE, DELETE
    const record = payload.record;
    const oldRecord = payload.old_record;
    
    console.log('🔍 Type:', webhookType);
    console.log('🔍 Record ID:', record?.id);

    // ============================================
    // HANDLE NEW TICKET (INSERT)
    // ============================================
    if (webhookType === 'INSERT') {
      console.log('🆕 New ticket created');
      
      const customerMessage = record.messages?.[0]?.content || record.message || 'No message';
      
      // 1. Send email to ADMIN
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Finotaur Support <support@finotaur.com>',
          to: [ADMIN_EMAIL],
          subject: `🆕 New Support Request: ${record.subject}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 0; border-radius: 12px; overflow: hidden; border: 1px solid #1a1a1a;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 32px; border-bottom: 2px solid #C9A646;">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px;">
                  <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                    📬
                  </div>
                  <div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #fff; letter-spacing: -0.5px;">New Support Request</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #888; font-weight: 500;">Finotaur Trading Journal</p>
                  </div>
                </div>
              </div>
              
              <!-- Customer Info -->
              <div style="padding: 24px 32px; background: #0d0d0d; border-bottom: 1px solid #1a1a1a;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">Customer</p>
                    <p style="margin: 0; font-size: 15px; color: #C9A646; font-weight: 600;">${record.user_name}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">Email</p>
                    <p style="margin: 0; font-size: 15px; color: #fff;">${record.user_email}</p>
                  </div>
                </div>
              </div>
              
              <!-- Subject -->
              <div style="padding: 24px 32px; background: #0a0a0a;">
                <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">Subject</p>
                <p style="margin: 0; font-size: 18px; color: #fff; font-weight: 600; line-height: 1.4;">${record.subject}</p>
              </div>
              
              <!-- Message -->
              <div style="padding: 24px 32px; background: #0d0d0d;">
                <p style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">Message</p>
                <div style="background: #1a1a1a; border-left: 3px solid #C9A646; padding: 20px; border-radius: 8px;">
                  <p style="margin: 0; color: #e5e5e5; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${customerMessage}</p>
                </div>
              </div>
              
              <!-- Action Button -->
              <div style="padding: 32px; text-align: center; background: #0a0a0a;">
                <a href="https://finotaur.com/app/admin/support" 
                   style="display: inline-block; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); color: #000; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(201, 166, 70, 0.3);">
                  View in Admin Panel →
                </a>
              </div>
              
              <!-- Footer -->
              <div style="padding: 20px 32px; background: #0d0d0d; border-top: 1px solid #1a1a1a; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #666;">
                  <strong style="color: #C9A646;">Finotaur</strong> • Premium Trading Intelligence Platform
                </p>
              </div>
            </div>
          `
        })
      });
      
      console.log('✅ Admin email sent');
      
      // 2. Send CONFIRMATION to CUSTOMER
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Finotaur Support <support@finotaur.com>',
          to: [record.user_email],
          subject: `✅ We received your message: ${record.subject}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 0; border-radius: 12px; overflow: hidden; border: 1px solid #1a1a1a;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 32px; text-align: center; border-bottom: 2px solid #C9A646;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px;">
                  ✅
                </div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px;">Message Received</h1>
                <p style="margin: 8px 0 0 0; font-size: 15px; color: #888;">We'll get back to you shortly</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <p style="margin: 0 0 24px 0; font-size: 16px; color: #e5e5e5; line-height: 1.6;">
                  Hi <strong style="color: #C9A646;">${record.user_name}</strong>,
                </p>
                
                <p style="margin: 0 0 24px 0; font-size: 16px; color: #ccc; line-height: 1.6;">
                  Thank you for reaching out to Finotaur Support. Your message has been received and our team will respond within a few hours.
                </p>
                
                <!-- Ticket Info -->
                <div style="background: #0d0d0d; border: 1px solid #1a1a1a; border-left: 3px solid #C9A646; padding: 20px; border-radius: 8px; margin: 24px 0;">
                  <p style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">Your Request</p>
                  <p style="margin: 0 0 8px 0; color: #e5e5e5; font-size: 15px;">
                    <span style="color: #888;">Subject:</span> <strong style="color: #fff;">${record.subject}</strong>
                  </p>
                  <p style="margin: 0; color: #e5e5e5; font-size: 15px;">
                    <span style="color: #888;">Ticket ID:</span> <strong style="color: #C9A646;">#${record.id.slice(0, 8)}</strong>
                  </p>
                </div>

                <!-- Info Box -->
                <div style="background: rgba(201, 166, 70, 0.1); border: 1px solid rgba(201, 166, 70, 0.3); padding: 16px; border-radius: 8px; margin: 24px 0;">
                  <p style="margin: 0; font-size: 14px; color: #C9A646; line-height: 1.6;">
                    <strong>💡 Need to add more information?</strong><br>
                    <span style="color: #aaa;">You can continue the conversation in your dashboard or reply to this email.</span>
                  </p>
                </div>
                
                <!-- Dashboard Link -->
                <div style="text-align: center; margin-top: 32px;">
                  <a href="https://finotaur.com/app" 
                     style="display: inline-block; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); color: #000; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(201, 166, 70, 0.3);">
                    Open Dashboard →
                  </a>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="padding: 24px 32px; background: #0d0d0d; border-top: 1px solid #1a1a1a; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #C9A646; font-weight: 600;">Finotaur Support Team</p>
                <p style="margin: 0; font-size: 12px; color: #666;">Premium Trading Intelligence Platform</p>
              </div>
            </div>
          `
        })
      });
      
      console.log('✅ Customer confirmation sent');
    }
    
    // ============================================
    // HANDLE ADMIN RESPONSE (UPDATE)
    // ============================================
    else if (webhookType === 'UPDATE' && oldRecord) {
      const oldMsgCount = oldRecord.messages?.length || 0;
      const newMsgCount = record.messages?.length || 0;
      
      // Check if new message was added
      if (newMsgCount > oldMsgCount) {
        const lastMsg = record.messages?.[newMsgCount - 1];
        
        // If admin responded, send email to customer
        if (lastMsg?.type === 'admin') {
          console.log('💬 Admin response - sending to customer');
          
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Finotaur Support <support@finotaur.com>',
              to: [record.user_email],
              subject: `💬 Response from Finotaur Support: ${record.subject}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 0; border-radius: 12px; overflow: hidden; border: 1px solid #1a1a1a;">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 32px; text-align: center; border-bottom: 2px solid #C9A646;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px;">
                      💬
                    </div>
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px;">Support Team Response</h1>
                    <p style="margin: 8px 0 0 0; font-size: 15px; color: #888;">We've reviewed your request</p>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 32px;">
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: #e5e5e5; line-height: 1.6;">
                      Hi <strong style="color: #C9A646;">${record.user_name}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: #ccc; line-height: 1.6;">
                      Our support team has reviewed your request and sent you a response:
                    </p>
                    
                    <!-- Support Response -->
                    <div style="background: rgba(201, 166, 70, 0.1); border-left: 3px solid #C9A646; padding: 24px; margin: 24px 0; border-radius: 8px;">
                      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(201, 166, 70, 0.2);">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                          ✨
                        </div>
                        <div>
                          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #C9A646;">Finotaur Support Team</p>
                          <p style="margin: 0; font-size: 12px; color: #888;">Premium Support</p>
                        </div>
                      </div>
                      <div style="color: #e5e5e5; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${lastMsg.content}</div>
                    </div>

                    <!-- Ticket Info -->
                    <div style="background: #0d0d0d; border: 1px solid #1a1a1a; padding: 16px; border-radius: 8px; margin: 24px 0;">
                      <p style="margin: 0; font-size: 13px; color: #888;">
                        <strong style="color: #C9A646;">Ticket:</strong> ${record.subject} • <strong style="color: #C9A646;">ID:</strong> #${record.id.slice(0, 8)}
                      </p>
                    </div>

                    <!-- Action Box -->
                    <div style="background: rgba(201, 166, 70, 0.1); border: 1px solid rgba(201, 166, 70, 0.3); padding: 16px; border-radius: 8px; margin: 24px 0;">
                      <p style="margin: 0; font-size: 14px; color: #C9A646; line-height: 1.6;">
                        <strong>💬 Need more help?</strong><br>
                        <span style="color: #aaa;">Reply to this email or continue the conversation in your support chat.</span>
                      </p>
                    </div>
                    
                    <!-- Dashboard Link -->
                    <div style="text-align: center; margin-top: 32px;">
                      <a href="https://finotaur.com/app" 
                         style="display: inline-block; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); color: #000; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(201, 166, 70, 0.3);">
                        Open Dashboard →
                      </a>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="padding: 24px 32px; background: #0d0d0d; border-top: 1px solid #1a1a1a; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #C9A646; font-weight: 600;">Finotaur Support Team</p>
                    <p style="margin: 0; font-size: 12px; color: #666;">Premium Trading Intelligence Platform</p>
                  </div>
                </div>
              `
            })
          });
          
          console.log('✅ Admin response email sent to customer');
        }
        // If customer sent follow-up message - NO EMAIL (per your request)
        else if (lastMsg?.type === 'customer') {
          console.log('💬 Customer follow-up message - no email sent');
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        type: webhookType,
        processed: true
      }), 
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});