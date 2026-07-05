// supabase/functions/payment-failed-notify/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Sprint W.1 — Send a transactional dunning email (via Resend
// HTTP API) when Whop reports `payment.failed` for a customer. The email
// tells the user to update their card before the membership lapses to
// went_invalid.
//
// Design invariants (mirrors broker-state-change-notify):
// • NEVER throws to caller — any error returns ok:false JSON.
// • Fire-and-forget friendly — caller uses void + .catch.
// • No Resend SDK — raw fetch only.
// • kill-switch: PAYMENT_ALERT_DISABLED=true → no-op 200.
// • Missing RESEND_API_KEY → no-op 200 (don't break the webhook).
// • Requires service-role key in Authorization header.
// • Idempotency: caller (whop-webhook) already deduplicates Whop events
//   via whop_webhook_log; we trust that and do NOT re-check here.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ─── CORS headers (POST + OPTIONS only) ──────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Request body shape ───────────────────────────────────────
// user_id is the finotaur (Supabase auth) user UUID. Email is looked up
// via supabase.auth.admin.getUserById, mirroring broker-state-change-notify.
// finotaur_email is accepted as an override when the caller already has it
// (avoids an extra round-trip from inside whop-webhook).
interface NotifyBody {
  user_id:         string;
  finotaur_email?: string | null;
  product_name?:   string | null;  // e.g. "Finotaur Monthly" — for body copy
  amount_cents?:   number | null;  // e.g. 8900 for $89.00
  currency?:       string | null;  // ISO 4217, default 'USD'
  whop_membership_id?: string | null;  // for logs only
}

// ─── Email template ───────────────────────────────────────────
function buildEmail(productName: string, amountStr: string): {
  subject: string; text: string; html: string;
} {
  const billingPortalUrl = 'https://finotaur.com/app/journal/settings';
  const supportEmail     = 'support@finotaur.com';

  const subject = 'Your Finotaur payment didn\'t go through';

  const intro = productName
    ? `We tried to charge ${amountStr} for your ${productName} subscription, but the payment didn't go through.`
    : `We tried to charge your card for your Finotaur subscription, but the payment didn't go through.`;

  const action  = 'Please update your payment method to keep your subscription active. Whop will retry the charge over the next few days — if all retries fail, your subscription will be paused.';
  const cta     = 'Update payment method';
  const footer  = `If you have any questions, reply to this email or contact ${supportEmail}.`;

  const text = [
    `Hi,`,
    ``,
    intro,
    ``,
    action,
    ``,
    `${cta}: ${billingPortalUrl}`,
    ``,
    footer,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;background:#fafafa;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="color:#b45309;margin:0 0 16px;font-size:22px;">${subject}</h2>
    <p style="line-height:1.6;margin:0 0 16px;">${intro}</p>
    <p style="line-height:1.6;margin:0 0 24px;">${action}</p>
    <p style="margin:0 0 24px;">
      <a href="${billingPortalUrl}" style="background:#b45309;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">${cta}</a>
    </p>
    <hr style="margin:32px 0 16px;border:none;border-top:1px solid #eee;">
    <p style="font-size:13px;color:#888;margin:0;">${footer}</p>
  </div>
</body>
</html>`.trim();

  return { subject, text, html };
}

function formatAmount(amountCents: number | null | undefined, currency: string | null | undefined): string {
  if (!amountCents || amountCents <= 0) return '';
  const code = (currency || 'USD').toUpperCase();
  const dollars = (amountCents / 100).toFixed(2);
  const symbol = code === 'USD' ? '$' : code === 'EUR' ? '€' : code === 'GBP' ? '£' : '';
  return symbol ? `${symbol}${dollars}` : `${dollars} ${code}`;
}

// ─── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
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
    if (Deno.env.get('PAYMENT_ALERT_DISABLED') === 'true') {
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
      console.warn('[payment-failed-notify] RESEND_API_KEY not set — skipping email');
      return jsonResponse({ ok: true, skipped: 'no_resend_key' });
    }

    // ── Parse body ────────────────────────────────────────────
    const body = (await req.json()) as NotifyBody;
    const { user_id, finotaur_email, product_name, amount_cents, currency, whop_membership_id } = body;

    if (!user_id) {
      return jsonResponse({ ok: false, error: 'missing_user_id' }, 400);
    }

    // ── Resolve recipient email ───────────────────────────────
    // Prefer caller-supplied email; fall back to auth.admin.getUserById.
    let toEmail = (finotaur_email ?? '').trim();
    if (!toEmail) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        serviceRoleKey,
        { auth: { persistSession: false } },
      );
      const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(user_id);
      if (userErr || !user?.email) {
        console.warn(
          '[payment-failed-notify] user email lookup failed:',
          userErr?.message ?? 'no email on user',
          { user_id, whop_membership_id },
        );
        return jsonResponse({ ok: true, skipped: 'no_email' });
      }
      toEmail = user.email;
    }

    // ── Build email content ───────────────────────────────────
    const fromEmail   = Deno.env.get('PAYMENT_ALERT_FROM_EMAIL') ?? 'Finotaur Billing <billing@finotaur.com>';
    const amountStr   = formatAmount(amount_cents, currency);
    const productLabel = (product_name ?? '').trim() || 'subscription';
    const { subject, text, html } = buildEmail(productLabel, amountStr);

    // ── POST to Resend ────────────────────────────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:    fromEmail,
        to:      [toEmail],
        subject,
        html,
        text,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => '(unreadable)');
      console.error(
        '[payment-failed-notify] Resend API error:',
        resendRes.status,
        errText.slice(0, 300),
        { user_id, whop_membership_id },
      );
      return jsonResponse({ ok: false, error: 'resend_failed' }, 500);
    }

    const resendData = await resendRes.json() as { id?: string };
    console.info(
      '[payment-failed-notify] email sent:',
      { user_id, whop_membership_id, message_id: resendData.id },
    );

    return jsonResponse({ ok: true, message_id: resendData.id });

  } catch (err: unknown) {
    console.error('[payment-failed-notify] unhandled error:', String(err).slice(0, 300));
    // Never throw to caller — fire-and-forget pattern
    return new Response(
      JSON.stringify({ ok: false, error: 'internal_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }
});
