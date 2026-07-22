// supabase/functions/broker-state-change-notify/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: OQ-59 — Send a transactional email (via Resend HTTP API)
// when a customer's broker connection transitions to 'degraded' or 'canceled'.
//
// Design invariants:
// • NEVER throws to caller — any error returns ok:false JSON.
// • Fire-and-forget friendly — caller uses void + .catch.
// • No Resend SDK — raw fetch only.
// • kill-switch: BROKER_ALERT_DISABLED=true → no-op 200.
// • Missing RESEND_API_KEY → no-op 200 (don't break upstream callers).
// • Requires service-role key in Authorization header.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ─── CORS headers (POST + OPTIONS only) ──────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Request body shape ───────────────────────────────────────
interface NotifyBody {
  connection_id: string;
  user_id:       string;
  broker:        string;
  environment:   string;
  new_status:    'degraded' | 'canceled';
  last_error?:   string | null;
}

// ─── Email templates ──────────────────────────────────────────
function buildEmail(
  broker: string,
  environment: string,
  newStatus: 'degraded' | 'canceled',
): { subject: string; text: string; html: string } {
  const brokerLabel = broker.charAt(0).toUpperCase() + broker.slice(1);
  const envLabel    = environment === 'live' ? 'Live' : 'Demo';
  const reconnectUrl = 'https://finotaur.com/app/journal';

  const subject = newStatus === 'degraded'
    ? 'Your Tradovate connection needs attention'
    : 'Your Tradovate connection was disconnected: action required';

  const bodyLine = newStatus === 'degraded'
    ? `Your ${brokerLabel} (${envLabel}) connection failed multiple sync attempts and needs to be reauthenticated.`
    : `Your ${brokerLabel} (${envLabel}) connection was disconnected and requires your action.`;

  const actionLine = `To restore your connection, log in to ${reconnectUrl} and click "Reconnect" on the broker tile.`;
  const footerLine = 'If you didn\'t expect this email, please reply to support@finotaur.com.';

  const text = [
    `Hi,`,
    ``,
    bodyLine,
    ``,
    actionLine,
    ``,
    footerLine,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#b45309;">${subject}</h2>
  <p>${bodyLine}</p>
  <p>${actionLine}</p>
  <p><a href="${reconnectUrl}" style="background:#b45309;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Go to Journal</a></p>
  <hr style="margin-top:32px;border:none;border-top:1px solid #eee;">
  <p style="font-size:12px;color:#888;">${footerLine}</p>
</body>
</html>`.trim();

  return { subject, text, html };
}

// ─── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  // OPTIONS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  try {
    // ── Kill-switch ──────────────────────────────────────────
    if (Deno.env.get('BROKER_ALERT_DISABLED') === 'true') {
      return jsonResponse({ ok: true, skipped: 'disabled' });
    }

    // ── Authentication: require service-role key ─────────────
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader     = req.headers.get('Authorization') ?? '';
    const bearerToken    = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!serviceRoleKey || bearerToken !== serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
    }

    // ── Resend key check ─────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('[broker-state-change-notify] RESEND_API_KEY not set — skipping email');
      return jsonResponse({ ok: true, skipped: 'no_resend_key' });
    }

    // ── Parse body ────────────────────────────────────────────
    const body = (await req.json()) as NotifyBody;
    const { connection_id, user_id, broker, environment, new_status } = body;

    if (!connection_id || !user_id || !broker || !environment || !new_status) {
      return jsonResponse({ ok: false, error: 'missing_required_fields' }, 400);
    }
    if (new_status !== 'degraded' && new_status !== 'canceled') {
      return jsonResponse({ ok: false, error: 'invalid_new_status' }, 400);
    }

    // ── Look up user email via admin client ───────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey,
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(user_id);
    if (userErr || !user?.email) {
      console.warn(
        '[broker-state-change-notify] user email lookup failed:',
        userErr?.message ?? 'no email on user',
        { user_id },
      );
      return jsonResponse({ ok: true, skipped: 'no_email' });
    }

    const toEmail = user.email;

    // ── Build email content ────────────────────────────────────
    const fromEmail = Deno.env.get('BROKER_ALERT_FROM_EMAIL') ?? 'Finotaur Alerts <alerts@finotaur.com>';
    // 2026-05-19: ops visibility — every broker state alert also reaches the
    // platform admin so production issues surface in one inbox without each
    // user reporting them. Comma-separated; empty = no BCC, preserves prior
    // behavior.
    const adminBcc = (Deno.env.get('BROKER_ALERT_ADMIN_BCC') ?? '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const { subject, text, html } = buildEmail(broker, environment, new_status);

    // ── POST to Resend ─────────────────────────────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:    fromEmail,
        to:      [toEmail],
        ...(adminBcc.length > 0 ? { bcc: adminBcc } : {}),
        subject: `[${new_status.toUpperCase()}] ${subject}`,
        html,
        text,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => '(unreadable)');
      console.error(
        '[broker-state-change-notify] Resend API error:',
        resendRes.status,
        errText.slice(0, 300),
        { connection_id, user_id },
      );
      return jsonResponse({ ok: false, error: 'resend_failed' }, 500);
    }

    const resendData = await resendRes.json() as { id?: string };
    console.info(
      '[broker-state-change-notify] email sent:',
      { connection_id, user_id, new_status, message_id: resendData.id },
    );

    return jsonResponse({ ok: true, message_id: resendData.id });

  } catch (err: unknown) {
    console.error('[broker-state-change-notify] unhandled error:', String(err).slice(0, 300));
    // Never throw to caller
    return new Response(
      JSON.stringify({ ok: false, error: 'internal_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }
});
