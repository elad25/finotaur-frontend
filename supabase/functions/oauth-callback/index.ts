// supabase/functions/oauth-callback/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Handle the OAuth 2.0 callback from the broker.
//
// Flow:
//   1. Tradovate redirects user to this endpoint (via proxy) with
//      ?code=...&state=... query parameters.
//   2. We verify the CSRF state token (HMAC + DB lookup + TTL).
//   3. Exchange the code for an access_token via the broker adapter.
//   4. Fetch user info + accounts (prop firm detection).
//   5. Atomically persist tokens to Vault via oauth_vault_upsert_atomic.
//   6. Redirect the user to the journal with oauth_status param.
//
// Auth: NO user JWT — the state token is the auth mechanism.
// verify_jwt: false — dualAuth not called; verifyStateToken handles it.
//
// IMPORTANT: tokens are NEVER logged. They go directly into Vault via RPC.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyStateToken } from '../_shared/oauth-state.ts';
import { getBrokerAuthAdapter } from '../_shared/broker-auth/registry.ts';
import type { BrokerName, BrokerEnvironment } from '../_shared/broker-auth/interface.ts';

const FRONTEND_BASE_URL = 'https://www.finotaur.com';
const JOURNAL_PATH = '/app/journal/overview';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

function redirectTo(path: string): Response {
  return Response.redirect(`${FRONTEND_BASE_URL}${JOURNAL_PATH}${path}`, 302);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Broker declined or user denied — redirect immediately
  if (oauthError) {
    const desc = errorDescription ?? oauthError;
    console.log('[oauth-callback] broker returned error:', oauthError);
    return redirectTo(`?oauth_error=${encodeURIComponent(desc)}`);
  }

  // Both code and state are required
  if (!code || !state) {
    console.error('[oauth-callback] missing code or state params');
    return redirectTo('?oauth_error=missing_params');
  }

  // Verify state token — this is the auth gate (HMAC + DB + TTL + consumed flag)
  let verifiedState: { userId: string; broker: BrokerName; environment: BrokerEnvironment; redirectUri: string; connectionId?: string | null };
  try {
    verifiedState = await verifyStateToken(state, supabaseAdmin);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[oauth-callback] state verification failed:', msg);
    return redirectTo('?oauth_error=invalid_state');
  }

  const { userId, broker, environment, redirectUri, connectionId: stateConnectionId } = verifiedState;

  // Free-tier lockdown (defense-in-depth): oauth-start already blocks FREE-plan
  // users before this callback is ever reached, but a bypassed/replayed state
  // token must not be allowed to create a broker_connections row either.
  // Checked before the token exchange to avoid wasting the broker API call.
  {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('account_type')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) {
      console.error('[oauth-callback] profile lookup failed:', profileError.message);
    } else if (profile?.account_type === 'free') {
      console.warn('[oauth-callback] blocked free-plan connection attempt', { userId, broker });
      return redirectTo('?oauth_error=upgrade_required');
    }
  }

  let adapter;
  try {
    adapter = getBrokerAuthAdapter(broker);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[oauth-callback] adapter lookup failed:', msg);
    return redirectTo('?oauth_error=broker_not_supported');
  }

  // Exchange authorization code for tokens
  let tokens;
  try {
    tokens = await adapter.exchangeCodeForToken(code, redirectUri, environment);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[oauth-callback] token exchange failed:', msg);
    return redirectTo('?oauth_error=token_exchange_failed');
  }

  // Fetch user info and accounts (needed for account_id, prop firm detection)
  let userInfo;
  try {
    userInfo = await adapter.getUserInfo(tokens.accessToken, environment);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[oauth-callback] user info fetch failed:', msg);
    return redirectTo('?oauth_error=token_exchange_failed');
  }

  const isPropFirm = userInfo.accounts.some((a) => a.isPropFirm);

  // Build vault secret payload — tokens stored here ONLY, never in logs
  const secretPayload = JSON.stringify({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? null,
    expires_at: tokens.expiresAt,
    scope: tokens.scope ?? null,
    provider_user_id: tokens.providerUserId ?? userInfo.providerUserId,
  });

  const secretName = `oauth_${broker}_${userId}_${environment}`;

  // Resolve which broker_connection to update.
  // Priority 1: connectionId encoded in the state token (set when user reconnects
  //             a specific existing connection — avoids the multi-connection ambiguity
  //             where order-by-created_at would pick the wrong row).
  // Priority 2: fall back to newest OAuth connection for this broker+environment,
  //             for first-connect flows where no connectionId was known up-front.
  let connectionId: string | null = stateConnectionId ?? null;
  if (!connectionId) {
    const { data: existingConn } = await supabaseAdmin
      .from('broker_connections')
      .select('id, connection_name')
      .eq('user_id', userId)
      .eq('broker', broker)
      .eq('environment', environment)
      .eq('auth_method', 'oauth')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    connectionId = existingConn?.id ?? null;
  }

  // Primary account
  const primaryAccount = userInfo.accounts[0] ?? null;

  // Atomically upsert vault + broker_connections via the SECURITY DEFINER RPC
  try {
    const { error: rpcError } = await supabaseAdmin.rpc('oauth_vault_upsert_atomic', {
      p_connection_id: connectionId,
      p_user_id: userId,
      p_broker: broker,
      p_environment: environment,
      p_secret_name: secretName,
      p_secret_payload: secretPayload,
      p_token_expires_at: tokens.expiresAt,
      p_oauth_scope: tokens.scope ?? null,
      p_oauth_provider_user_id: tokens.providerUserId ?? userInfo.providerUserId,
      p_account_id: primaryAccount?.id ?? null,
      p_account_name: primaryAccount?.name ?? null,
      // When updating an existing connection, pass null so COALESCE in the RPC
      // preserves the existing name. Only set the name on first connect.
      p_connection_name: connectionId ? null : `${environment} – ${primaryAccount?.name ?? broker}`,
      p_is_prop_firm: isPropFirm,
    });

    if (rpcError) {
      console.error('[oauth-callback] oauth_vault_upsert_atomic failed:', rpcError.message);
      return redirectTo('?oauth_error=storage_failed');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[oauth-callback] RPC call threw:', msg);
    return redirectTo('?oauth_error=storage_failed');
  }

  // Fire-and-forget: trigger immediate trade sync after OAuth connect/reconnect.
  // tradovate-sync is idempotent; it discovers accounts, upserts portfolios,
  // and imports trades. We do NOT await it — the user should not wait for sync.
  {
    const syncUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/tradovate-sync`;
    fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    }).catch((e: unknown) => {
      console.warn('[oauth-callback] sync trigger failed:', String(e).slice(0, 200));
    });
  }

  console.log('[oauth-callback] OAuth flow completed', {
    userId,
    broker,
    environment,
    isPropFirm,
    accountCount: userInfo.accounts.length,
  });

  // Prop firm accounts (Apex/Topstep/MFFU) are supported via Tradovate OAuth
  // (validated empirically: TradeZella supports Apex through the same flow).
  // is_prop_firm flag is informational only — frontend may show a badge.
  return redirectTo(
    `?oauth_status=connected&broker=${encodeURIComponent(broker)}&is_prop_firm=${isPropFirm}`,
  );
});
