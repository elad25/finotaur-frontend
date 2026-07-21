// supabase/functions/exchange-connect/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Validate a read-only API key against the exchange and store
//   the credentials securely in Supabase Vault.
//
// SECURITY INVARIANTS:
//   - apiKey and apiSecret are NEVER stored plaintext.
//   - apiKey and apiSecret are NEVER returned to the caller.
//   - apiKey and apiSecret are NEVER logged (not even partially).
//   - connection_data stored in broker_connections contains ONLY
//     vault_secret_id + symbols — never the raw credentials.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticate } from '../_shared/dualAuth.ts';
import { getExchangeAdapter, isExchangeSupported } from '../_shared/exchanges/registry.ts';
import { storeExchangeCredentials } from '../_shared/exchanges/vault-credentials.ts';

// ─── Module-level service-role client ────────────────────────
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// ─── CORS headers (matches corsHeaders from _shared/cors.ts) ──
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Helper: normalize symbols input ─────────────────────────
// Accepts either a string array or a comma/space-separated string.
// Returns an uppercased, deduplicated, non-empty array.
function normalizeSymbols(raw: unknown): string[] | null {
  let items: string[] = [];

  if (Array.isArray(raw)) {
    items = (raw as unknown[]).map((s) => String(s).trim().toUpperCase()).filter(Boolean);
  } else if (typeof raw === 'string') {
    items = raw.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  }

  return items.length > 0 ? items : null;
}

// ─── Trial anti-abuse: broker-account fingerprint ──────────────
// SHA-256 hash of `${brokerKind}:${externalId}` — fed into
// claim_trial_broker_fingerprint() so the same broker account can't power
// more than one journal trial. No-ops server-side for non-trial users.
// The API key is hashed only — the raw key is never persisted or logged.
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Main handler ──────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require a valid user JWT — cron callers cannot connect brokers on behalf
  // of users. authenticate() validates both cron secrets and user JWTs;
  // we reject cron callers explicitly after auth succeeds.
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Unauthorized' }),
      {
        status: auth.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }

  if (auth.isCron) {
    // Cron callers are authenticated but not permitted to connect brokers.
    return new Response(
      JSON.stringify({ ok: false, error: 'This endpoint requires a user session' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }

  const userId = auth.userId;

  // Free-tier lockdown: FREE-plan users may not connect a broker. Checked
  // before parsing the request body / validating credentials against the
  // exchange, so a free-plan attempt never spends an external API call.
  // Fail-open on a lookup error — a transient profiles read hiccup must not
  // lock out paying users.
  {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('account_type')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) {
      console.error('[exchange-connect] profile lookup failed:', profileError.message);
    } else if (profile?.account_type === 'free') {
      return new Response(
        JSON.stringify({ ok: false, error: 'upgrade_required', message: 'Broker connections require a paid plan.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Request body must be valid JSON' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    const broker = typeof body.broker === 'string' ? body.broker : 'binance';
    const environment =
      typeof body.environment === 'string' ? body.environment : 'live';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const apiSecret = typeof body.apiSecret === 'string' ? body.apiSecret.trim() : '';
    const rawSymbols = body.symbols;

    // ── Input validation ────────────────────────────────────
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'apiKey is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    if (!apiSecret) {
      return new Response(
        JSON.stringify({ ok: false, error: 'apiSecret is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    const symbols = normalizeSymbols(rawSymbols);
    if (!symbols) {
      return new Response(
        JSON.stringify({ ok: false, error: 'symbols is required and must be a non-empty list' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // ── Exchange support guard ───────────────────────────────
    if (!isExchangeSupported(broker)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Exchange "${broker}" is not supported. Supported exchanges: binance`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // ── Validate credentials against the exchange ────────────
    const adapter = getExchangeAdapter(broker);
    const check = await adapter.validateCredentials({
      apiKey,
      apiSecret,
      environment: environment as 'live' | 'testnet',
    });

    if (!check.ok) {
      // Pass check.error through as it is an exchange error string (not secret
      // material), but cap length for safety.
      const errMsg = check.error
        ? check.error.slice(0, 300)
        : 'Could not validate API key. Ensure it is read-only with Reading enabled.';
      return new Response(
        JSON.stringify({ ok: false, error: errMsg }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // ── Trial anti-abuse: block an API key already claimed by a different
    // journal trial. Fingerprint = hash of exchange + API key (the raw key
    // is never persisted or logged — only its hash). Fails open on RPC
    // error/timeout — a transient lookup hiccup must not lock out a
    // legitimate connect. No-ops for non-trial users (RPC returns
    // {allowed:true, reason:'not_trial'}).
    {
      try {
        const fingerprint = await sha256Hex(`${broker}:${apiKey}`);
        const { data: claim, error: claimError } = await supabaseAdmin.rpc('claim_trial_broker_fingerprint', {
          p_user_id: userId,
          p_broker_kind: broker,
          p_fingerprint: fingerprint,
        });
        if (claimError) {
          console.warn('[trial-fingerprint] claim RPC error — failing open:', claimError.message);
        } else if ((claim as { allowed?: boolean } | null)?.allowed === false) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: 'trial_broker_limit',
              message: 'This broker account was already used in another FINOTAUR trial. Upgrade to a paid plan to connect it.',
            }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          );
        }
      } catch (fpErr) {
        console.warn('[trial-fingerprint] unexpected error — failing open:', String(fpErr).slice(0, 300));
      }
    }

    // ── Store credentials in Vault (never plaintext) ─────────
    // Vault name convention: exchange_<broker>_<userId>_<environment>
    const vaultName = `exchange_${broker}_${userId}_${environment}`;
    const vaultSecretId = await storeExchangeCredentials(supabaseAdmin, vaultName, {
      apiKey,
      apiSecret,
      environment: environment as 'live' | 'testnet',
    });

    // ── Upsert broker_connections ────────────────────────────
    // Check for an existing row (same user_id + broker). UPDATE if found, else INSERT.
    // connection_data contains ONLY vault_secret_id + symbols — never raw credentials.
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('broker_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('broker', broker)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`broker_connections lookup failed: ${lookupError.message}`);
    }

    const connectionFields = {
      user_id: userId,
      broker,
      status: 'connected',
      environment,
      purpose: 'journal',
      is_active: true,
      connected_at: new Date().toISOString(),
      account_name: check.accountLabel ?? 'Binance',
      connection_data: {
        vault_secret_id: vaultSecretId,
        symbols,
        // apiKey and apiSecret are intentionally absent from connection_data.
      },
    };

    let connectionId: string;

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from('broker_connections')
        .update(connectionFields)
        .eq('id', existing.id);

      if (updateError) {
        throw new Error(`broker_connections update failed: ${updateError.message}`);
      }

      connectionId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('broker_connections')
        .insert(connectionFields)
        .select('id')
        .single();

      if (insertError || !inserted) {
        throw new Error(
          `broker_connections insert failed: ${insertError?.message ?? 'no data returned'}`,
        );
      }

      connectionId = inserted.id;
    }

    // ── Return success — credentials never included in response ─
    return new Response(
      JSON.stringify({
        ok: true,
        connectionId,
        accountLabel: check.accountLabel ?? null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (err: unknown) {
    // Generic error response — never include secret values in the message.
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[exchange-connect] internal error:', msg);

    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }
});
