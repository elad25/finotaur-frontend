// supabase/functions/send-support-email/index.ts
// ============================================
// Finotaur Support Email System v2
// Premium trading journal platform
// ============================================
// Accepted payload types (from frontend):
//   - 'new_ticket'        -> Admin notification + customer confirmation
//   - 'fallback_ticket'   -> Admin only (DB insert failed; preserve message)
//   - 'fallback_reply'    -> Admin only (DB update for follow-up failed)
// Legacy types (DB webhook, kept for forward compat):
//   - 'INSERT'            -> Admin notification + customer confirmation
//   - 'UPDATE'            -> Customer notification when admin responded
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL = 'finotaur.site@gmail.com';
const FROM_ADDRESS = 'Finotaur Support <support@finotaur.com>';

// AI processing endpoint — fire-and-forget call after a new ticket is saved.
// Should be set to e.g. https://api.finotaur.com/api/support/process-ticket
const SUPPORT_AI_ENDPOINT = Deno.env.get('SUPPORT_AI_ENDPOINT');
const SUPPORT_AI_SHARED_SECRET = Deno.env.get('SUPPORT_AI_SHARED_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// -------------------- helpers --------------------

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractCustomerMessage(record: any): string {
  if (!record) return 'No message';
  if (typeof record.message === 'string' && record.message.trim()) return record.message;
  const msgs = record.messages;
  if (Array.isArray(msgs) && msgs.length > 0) {
    const first = msgs[0];
    if (first && typeof first.content === 'string') return first.content;
  }
  return 'No message';
}

function shortId(id: unknown): string {
  if (typeof id !== 'string' || id.length === 0) return 'n/a';
  return id.slice(0, 8);
}

function renderAttachments(record: any): string {
  const msgs = Array.isArray(record?.messages) ? record.messages : [];
  const urls: string[] = [];
  for (const m of msgs) {
    if (Array.isArray(m?.attachments)) {
      for (const u of m.attachments) {
        if (typeof u === 'string') urls.push(u);
      }
    }
  }
  if (urls.length === 0) return '';
  const items = urls
    .map(
      (u) =>
        `<li style="margin: 4px 0;"><a href="${escapeHtml(u)}" style="color:#C9A646;" target="_blank" rel="noopener">${escapeHtml(u)}</a></li>`
    )
    .join('');
  return `
    <div style="padding: 16px 32px; background: #0d0d0d;">
      <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">Attachments</p>
      <ul style="margin: 0; padding-left: 18px; color: #e5e5e5; font-size: 13px;">${items}</ul>
    </div>
  `;
}

function renderMetaRow(label: string, value: string): string {
  return `
    <div>
      <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">${escapeHtml(label)}</p>
      <p style="margin: 0; font-size: 14px; color: #fff;">${escapeHtml(value)}</p>
    </div>
  `;
}

function buildAdminEmailHtml(opts: {
  headerTitle: string;
  headerEmoji: string;
  alertBanner?: string;
  record: any;
  customerMessage: string;
  dbFailed: boolean;
}): string {
  const { headerTitle, headerEmoji, alertBanner, record, customerMessage, dbFailed } = opts;
  const userName = escapeHtml(record?.user_name ?? 'Unknown');
  const userEmail = escapeHtml(record?.user_email ?? 'unknown@unknown');
  const subject = escapeHtml(record?.subject ?? 'Support Request');
  const ticketId = record?.id ? `#${escapeHtml(shortId(record.id))}` : '— (no DB record)';
  const userId = record?.user_id ? escapeHtml(record.user_id) : '— (guest or unknown)';
  const category = record?.category ? escapeHtml(record.category) : '—';
  const createdAt = new Date().toISOString();
  const attachmentsHtml = renderAttachments(record);
  const dbStatusColor = dbFailed ? '#FF5252' : '#4CAF50';
  const dbStatusLabel = dbFailed ? '⚠️ DB INSERT FAILED — Email is sole record' : '✅ Saved to support_tickets table';
  const banner = alertBanner
    ? `<div style="padding: 16px 32px; background: #2A1010; border-left: 4px solid #FF5252; color: #FFB4B4; font-size: 14px;">${escapeHtml(alertBanner)}</div>`
    : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 0; border-radius: 12px; overflow: hidden; border: 1px solid #1a1a1a;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 28px 32px; border-bottom: 2px solid #C9A646;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">${headerEmoji}</div>
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.5px;">${escapeHtml(headerTitle)}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #888;">Finotaur Trading Journal — Internal Notification</p>
          </div>
        </div>
      </div>

      ${banner}

      <!-- Customer + ticket meta -->
      <div style="padding: 24px 32px; background: #0d0d0d; border-bottom: 1px solid #1a1a1a;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          ${renderMetaRow('Customer', userName)}
          ${renderMetaRow('Email', userEmail)}
          ${renderMetaRow('User ID', userId)}
          ${renderMetaRow('Ticket ID', ticketId)}
          ${renderMetaRow('Category', category)}
          ${renderMetaRow('Received At (UTC)', createdAt)}
        </div>
      </div>

      <!-- DB status -->
      <div style="padding: 12px 32px; background: #0a0a0a; border-bottom: 1px solid #1a1a1a;">
        <p style="margin: 0; font-size: 13px; color: ${dbStatusColor}; font-weight: 600;">${dbStatusLabel}</p>
      </div>

      <!-- Subject -->
      <div style="padding: 20px 32px; background: #0a0a0a;">
        <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">Subject</p>
        <p style="margin: 0; font-size: 17px; color: #fff; font-weight: 600; line-height: 1.4;">${subject}</p>
      </div>

      <!-- Message -->
      <div style="padding: 20px 32px; background: #0d0d0d;">
        <p style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">Message</p>
        <div style="background: #1a1a1a; border-left: 3px solid #C9A646; padding: 18px; border-radius: 8px;">
          <p style="margin: 0; color: #e5e5e5; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(customerMessage)}</p>
        </div>
      </div>

      ${attachmentsHtml}

      <!-- Action -->
      <div style="padding: 28px; text-align: center; background: #0a0a0a;">
        <a href="https://finotaur.com/app/admin/support" style="display: inline-block; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); color: #000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(201, 166, 70, 0.3);">View in Admin Panel →</a>
      </div>

      <!-- Footer -->
      <div style="padding: 16px 32px; background: #0d0d0d; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #666;"><strong style="color: #C9A646;">Finotaur</strong> • Premium Trading Intelligence Platform</p>
      </div>
    </div>
  `;
}

function buildCustomerConfirmationHtml(record: any): string {
  const userName = escapeHtml(record?.user_name ?? 'there');
  const subject = escapeHtml(record?.subject ?? 'Support Request');
  const ticketId = escapeHtml(shortId(record?.id));

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 0; border-radius: 12px; overflow: hidden; border: 1px solid #1a1a1a;">
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 32px; text-align: center; border-bottom: 2px solid #C9A646;">
        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px;">✅</div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -0.5px;">Message Received</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #888;">We'll get back to you shortly</p>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #e5e5e5; line-height: 1.6;">Hi <strong style="color: #C9A646;">${userName}</strong>,</p>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #ccc; line-height: 1.6;">Thank you for reaching out to Finotaur Support. Your message has been received and our team will respond within a few hours.</p>
        <div style="background: #0d0d0d; border: 1px solid #1a1a1a; border-left: 3px solid #C9A646; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600;">Your Request</p>
          <p style="margin: 0 0 6px 0; color: #e5e5e5; font-size: 14px;"><span style="color: #888;">Subject:</span> <strong style="color: #fff;">${subject}</strong></p>
          <p style="margin: 0; color: #e5e5e5; font-size: 14px;"><span style="color: #888;">Ticket ID:</span> <strong style="color: #C9A646;">#${ticketId}</strong></p>
        </div>
        <div style="text-align: center; margin-top: 28px;">
          <a href="https://finotaur.com/app" style="display: inline-block; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); color: #000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px;">Open Dashboard →</a>
        </div>
      </div>
      <div style="padding: 20px 32px; background: #0d0d0d; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 14px; color: #C9A646; font-weight: 600;">Finotaur Support Team</p>
        <p style="margin: 0; font-size: 12px; color: #666;">Premium Trading Intelligence Platform</p>
      </div>
    </div>
  `;
}

function buildAdminResponseToCustomerHtml(record: any, adminContent: string): string {
  const userName = escapeHtml(record?.user_name ?? 'there');
  const subject = escapeHtml(record?.subject ?? 'Support Request');
  const ticketId = escapeHtml(shortId(record?.id));

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 0; border-radius: 12px; overflow: hidden; border: 1px solid #1a1a1a;">
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 32px; text-align: center; border-bottom: 2px solid #C9A646;">
        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px;">💬</div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -0.5px;">Support Team Response</h1>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #e5e5e5; line-height: 1.6;">Hi <strong style="color: #C9A646;">${userName}</strong>,</p>
        <div style="background: rgba(201, 166, 70, 0.1); border-left: 3px solid #C9A646; padding: 22px; margin: 20px 0; border-radius: 8px;">
          <div style="color: #e5e5e5; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(adminContent)}</div>
        </div>
        <div style="background: #0d0d0d; border: 1px solid #1a1a1a; padding: 14px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #888;"><strong style="color: #C9A646;">Ticket:</strong> ${subject} • <strong style="color: #C9A646;">ID:</strong> #${ticketId}</p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://finotaur.com/app" style="display: inline-block; background: linear-gradient(135deg, #C9A646 0%, #F4D03F 100%); color: #000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px;">Open Dashboard →</a>
        </div>
      </div>
      <div style="padding: 20px 32px; background: #0d0d0d; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 14px; color: #C9A646; font-weight: 600;">Finotaur Support Team</p>
        <p style="margin: 0; font-size: 12px; color: #666;">Premium Trading Intelligence Platform</p>
      </div>
    </div>
  `;
}

async function sendResendEmail(to: string[], subject: string, html: string): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

// -------------------- handlers --------------------

// Fire-and-forget call to the server's AI pipeline. Errors are logged but do
// not fail the customer confirmation flow.
async function triggerAiProcessing(ticketId: string | undefined): Promise<void> {
  if (!ticketId || !SUPPORT_AI_ENDPOINT) return;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SUPPORT_AI_SHARED_SECRET) headers['X-Support-Internal-Secret'] = SUPPORT_AI_SHARED_SECRET;
    // Don't await indefinitely — set a soft timeout via AbortController.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25_000);
    const res = await fetch(SUPPORT_AI_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ticket_id: ticketId }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const body = await res.text();
    console.log('🤖 AI processing trigger:', res.status, body.slice(0, 200));
  } catch (err) {
    console.warn('⚠️ AI processing trigger failed (non-fatal):', err instanceof Error ? err.message : String(err));
  }
}

async function handleNewTicket(record: any, dbFailed: boolean) {
  const customerMessage = extractCustomerMessage(record);
  const headerTitle = dbFailed ? 'New Support Request (DB FAILED)' : 'New Support Request';
  const headerEmoji = dbFailed ? '⚠️' : '📬';
  const alertBanner = dbFailed
    ? 'DB INSERT failed — this email is the only persistent record of the customer message. Customer was shown a fallback toast.'
    : undefined;

  // 1. Admin
  const adminHtml = buildAdminEmailHtml({
    headerTitle,
    headerEmoji,
    alertBanner,
    record,
    customerMessage,
    dbFailed,
  });
  const adminSubject = dbFailed
    ? `⚠️ Support Request (DB FAILED): ${record?.subject ?? 'Support Request'}`
    : `🆕 New Support Request: ${record?.subject ?? 'Support Request'}`;
  const adminResult = await sendResendEmail([ADMIN_EMAIL], adminSubject, adminHtml);
  console.log('📧 Admin email:', adminResult.status, adminResult.ok ? 'OK' : adminResult.body);

  // 2. Customer confirmation — only when we have a real ticket id (DB succeeded)
  let customerResult: { ok: boolean; status: number; body: string } | null = null;
  if (!dbFailed && typeof record?.user_email === 'string' && record.user_email.includes('@')) {
    const customerHtml = buildCustomerConfirmationHtml(record);
    customerResult = await sendResendEmail(
      [record.user_email],
      `✅ We received your message: ${record?.subject ?? 'Support Request'}`,
      customerHtml
    );
    console.log('📧 Customer confirmation:', customerResult.status, customerResult.ok ? 'OK' : customerResult.body);
  } else {
    console.log('⏭️ Skipping customer confirmation (db_failed or invalid email)');
  }

  // 3. Trigger AI processing if we have a real DB record (not a fallback case)
  let aiTriggered = false;
  if (!dbFailed && record?.id && SUPPORT_AI_ENDPOINT) {
    triggerAiProcessing(record.id).catch(() => {});
    aiTriggered = true;
  }

  return {
    admin_email_sent: adminResult.ok,
    admin_status: adminResult.status,
    customer_email_sent: customerResult?.ok ?? false,
    customer_status: customerResult?.status ?? null,
    ai_triggered: aiTriggered,
  };
}

async function handleFallbackReply(record: any) {
  // record holds: { id, user_email, user_name, subject, message }
  const customerMessage = typeof record?.message === 'string' ? record.message : 'No message';
  const adminHtml = buildAdminEmailHtml({
    headerTitle: 'Follow-up Reply (DB UPDATE FAILED)',
    headerEmoji: '⚠️',
    alertBanner: 'Customer tried to reply to an existing ticket but the DB UPDATE failed. The reply text below is the only record — please sync it manually.',
    record,
    customerMessage,
    dbFailed: true,
  });
  const adminResult = await sendResendEmail(
    [ADMIN_EMAIL],
    `⚠️ Reply Failed for Ticket #${shortId(record?.id)}: ${record?.subject ?? 'Support Request'}`,
    adminHtml
  );
  console.log('📧 Admin fallback reply email:', adminResult.status, adminResult.ok ? 'OK' : adminResult.body);
  return {
    admin_email_sent: adminResult.ok,
    admin_status: adminResult.status,
  };
}

async function handleAdminResponse(record: any, lastMsgContent: string) {
  if (typeof record?.user_email !== 'string' || !record.user_email.includes('@')) {
    return { customer_email_sent: false, customer_status: null, reason: 'no_valid_email' };
  }
  const html = buildAdminResponseToCustomerHtml(record, lastMsgContent);
  const result = await sendResendEmail(
    [record.user_email],
    `💬 Response from Finotaur Support: ${record?.subject ?? 'Support Request'}`,
    html
  );
  console.log('📧 Admin response -> customer:', result.status, result.ok ? 'OK' : result.body);
  return { customer_email_sent: result.ok, customer_status: result.status };
}

// -------------------- main --------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const payload = await req.json();
    const type: string = payload?.type ?? '';
    const record = payload?.record ?? null;
    const oldRecord = payload?.old_record ?? null;
    const dbFailed: boolean = Boolean(payload?.db_failed);

    console.log('📧 send-support-email v2 — type:', type, 'record.id:', record?.id, 'db_failed:', dbFailed);

    let result: Record<string, unknown> = { handled: false };

    // ---- New (frontend-driven) payload types ----
    if (type === 'new_ticket') {
      result = { handled: true, ...(await handleNewTicket(record, false)) };
    } else if (type === 'fallback_ticket') {
      result = { handled: true, ...(await handleNewTicket(record, true)) };
    } else if (type === 'fallback_reply') {
      result = { handled: true, ...(await handleFallbackReply(record)) };
    }
    // ---- Legacy (DB webhook) payload types, kept for forward compat ----
    else if (type === 'INSERT') {
      result = { handled: true, ...(await handleNewTicket(record, false)) };
    } else if (type === 'UPDATE' && oldRecord) {
      const oldMsgCount = Array.isArray(oldRecord?.messages) ? oldRecord.messages.length : 0;
      const newMsgCount = Array.isArray(record?.messages) ? record.messages.length : 0;
      if (newMsgCount > oldMsgCount) {
        const lastMsg = record.messages[newMsgCount - 1];
        if (lastMsg?.type === 'admin' && typeof lastMsg.content === 'string') {
          result = { handled: true, ...(await handleAdminResponse(record, lastMsg.content)) };
        } else {
          result = { handled: true, skipped: 'customer_followup_no_email' };
        }
      } else {
        result = { handled: true, skipped: 'no_new_message' };
      }
    } else {
      console.warn('⚠️ Unknown payload type:', type);
      result = { handled: false, reason: 'unknown_type', received_type: type };
    }

    return new Response(
      JSON.stringify({ success: true, type, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ send-support-email error:', errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
