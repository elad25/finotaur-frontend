// supabase/functions/oauth-start/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Initiate the OAuth 2.0 authorization flow for a broker.
//
// Flow:
//   1. User clicks "Connect to Tradovate" in the UI.
//   2. Frontend POSTs { broker, environment } to this endpoint.
//   3. We generate a signed CSRF state token, persist it, and
//      return the broker's authorization URL.
//   4. Frontend redirects the user to that URL.
//
// Auth: User JWT required (not cron). authenticate() extracts userId.
// verify_jwt: false at gateway — dualAuth handles auth internally.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticate } from '../_shared/dualAuth.ts';
import { generateStateToken } from '../_shared/oauth-state.ts';
import { getBrokerAuthAdapter, isOAuthSupported } from '../_shared/broker-auth/registry.ts';
import type { BrokerName, BrokerEnvironment } from '../_shared/broker-auth/interface.ts';

const FRONTEND_BASE_URL = 'https://www.finotaur.com';
const DEFAULT_REDIRECT_URI = `${FRONTEND_BASE_URL}/api/brokers/tradovate/callback`;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Authenticate — user JWT required (not cron path)
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.message }),
      { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (auth.isCron) {
    return new Response(
      JSON.stringify({ error: 'oauth-start requires a user JWT, not a cron token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const userId = auth.userId;

  // Parse and validate body
  let body: { broker?: string; environment?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'broker and environment required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { broker, environment } = body;
  if (!broker || !environment) {
    return new Response(
      JSON.stringify({ error: 'broker and environment required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!isOAuthSupported(broker)) {
    return new Response(
      JSON.stringify({ error: `OAuth not supported for broker: ${broker}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const validEnvironments: BrokerEnvironment[] = ['live', 'demo', 'sandbox'];
  if (!validEnvironments.includes(environment as BrokerEnvironment)) {
    return new Response(
      JSON.stringify({ error: `Invalid environment: ${environment}. Must be live, demo, or sandbox` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const redirectUri =
      Deno.env.get('oauth_redirect_uri_Journal') ?? DEFAULT_REDIRECT_URI;

    // Generate HMAC-signed state token and persist to oauth_state_tokens
    const state = await generateStateToken({
      userId,
      broker: broker as BrokerName,
      environment: environment as BrokerEnvironment,
      redirectUri,
      supabaseAdmin,
    });

    // Build broker authorize URL
    const adapter = getBrokerAuthAdapter(broker as BrokerName);
    const authorizeUrl = adapter.buildAuthorizeUrl({
      state,
      redirectUri,
      environment: environment as BrokerEnvironment,
    });

    console.log('[oauth-start] generated authorize URL', {
      userId,
      broker,
      environment,
    });

    return new Response(
      JSON.stringify({ authorize_url: authorizeUrl, state }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes('misconfigured') || msg.includes('must be set')) {
      console.error('[oauth-start] env misconfiguration:', msg);
      return new Response(
        JSON.stringify({ error: `OAuth misconfigured: ${msg}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.error('[oauth-start] unexpected error:', msg);
    return new Response(
      JSON.stringify({ error: 'oauth-start failed', detail: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
