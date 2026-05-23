// supabase/functions/oauth-refresh/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Refresh an OAuth access_token for a single broker connection.
//
// Flow:
//   1. Caller (cron or user) POSTs { connection_id }.
//   2. Fetch connection row from broker_connections.
//   3. If user JWT, verify ownership (connection.user_id === authenticated userId).
//   4. Guard: must be oauth auth_method and not disconnected/canceled.
//   5. Read current token payload from Vault.
//   6. Call adapter.refreshAccessToken → new token.
//   7. Atomically persist via oauth_vault_upsert_atomic.
//   8. Return { success: true, expires_at }.
//
// Auth: dualAuth — accepts cron shared secret OR user JWT.
//       Cron path: userId is not available (isCron=true); ownership check skipped.
// verify_jwt: false — dualAuth handles auth internally.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticate } from '../_shared/dualAuth.ts';
import { getBrokerAuthAdapter } from '../_shared/broker-auth/registry.ts';
import type { BrokerName, BrokerEnvironment } from '../_shared/broker-auth/interface.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// Shape of the broker_connections row we select
interface BrokerConnectionRow {
  id: string;
  user_id: string;
  broker: BrokerName;
  environment: BrokerEnvironment;
  status: string;
  auth_method: string | null;
  connection_data: { vault_secret_id?: string } | null;
}

// Shape of the token payload stored in Vault
interface VaultTokenPayload {
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scope: string | null;
  provider_user_id: string | null;
}

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

  // Authenticate — accepts cron OR user JWT
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.message }),
      { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Parse and validate body
  let body: { connection_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'connection_id required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { connection_id } = body;
  if (!connection_id) {
    return new Response(
      JSON.stringify({ error: 'connection_id required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Fetch connection row
  const { data: conn, error: fetchError } = await supabaseAdmin
    .from('broker_connections')
    .select('id, user_id, broker, environment, status, auth_method, connection_data')
    .eq('id', connection_id)
    .maybeSingle();

  if (fetchError) {
    console.error('[oauth-refresh] DB fetch error:', fetchError.message);
    return new Response(
      JSON.stringify({ error: 'database error', detail: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!conn) {
    return new Response(
      JSON.stringify({ error: 'connection not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const connection = conn as BrokerConnectionRow;

  // Ownership check — skip for cron callers
  if (!auth.isCron && auth.userId !== connection.user_id) {
    return new Response(
      JSON.stringify({ error: 'access denied' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Guard: disconnected/canceled connections cannot be refreshed
  if (connection.status === 'disconnected' || connection.status === 'canceled') {
    return new Response(
      JSON.stringify({ error: 'cannot refresh disconnected connection' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Guard: must be an OAuth connection
  if (connection.auth_method !== 'oauth') {
    return new Response(
      JSON.stringify({ error: 'connection is not OAuth-based' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Read current token from Vault
  const vaultSecretId = connection.connection_data?.vault_secret_id;
  if (!vaultSecretId) {
    console.error('[oauth-refresh] no vault_secret_id for connection:', connection_id);
    return new Response(
      JSON.stringify({ error: 'vault secret reference missing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { data: rawPayload, error: vaultError } = await supabaseAdmin.rpc(
    'tradovate_vault_read',
    { p_secret_id: vaultSecretId },
  );

  if (vaultError || !rawPayload) {
    console.error('[oauth-refresh] vault read failed:', vaultError?.message ?? 'null payload');
    return new Response(
      JSON.stringify({ error: 'vault read failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let currentTokens: VaultTokenPayload;
  try {
    currentTokens = JSON.parse(rawPayload as string) as VaultTokenPayload;
  } catch {
    console.error('[oauth-refresh] vault payload is not valid JSON for connection:', connection_id);
    return new Response(
      JSON.stringify({ error: 'vault payload corrupted' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Mark connection as 'renewing' before attempting refresh
  await supabaseAdmin
    .from('broker_connections')
    .update({ status: 'renewing' })
    .eq('id', connection_id);

  // Perform token refresh via broker adapter
  let adapter;
  try {
    adapter = getBrokerAuthAdapter(connection.broker);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[oauth-refresh] adapter lookup failed:', msg);
    // Revert status to degraded since we cannot refresh
    await supabaseAdmin
      .from('broker_connections')
      .update({
        status: 'degraded',
        last_error: msg,
        last_error_at: new Date().toISOString(),
      })
      .eq('id', connection_id);
    return new Response(
      JSON.stringify({ error: 'refresh failed', detail: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const newTokens = await adapter.refreshAccessToken({
      currentAccessToken: currentTokens.access_token,
      refreshToken: currentTokens.refresh_token,
      environment: connection.environment,
    });

    // Build updated vault payload — preserve provider_user_id and scope from existing
    const updatedPayload = JSON.stringify({
      access_token: newTokens.accessToken,
      refresh_token: newTokens.refreshToken ?? currentTokens.refresh_token ?? null,
      expires_at: newTokens.expiresAt,
      scope: newTokens.scope ?? currentTokens.scope ?? null,
      provider_user_id: currentTokens.provider_user_id ?? null,
    });

    const secretName = `oauth_${connection.broker}_${connection.user_id}_${connection.environment}`;

    // Atomically persist refreshed token via SECURITY DEFINER RPC
    const { error: rpcError } = await supabaseAdmin.rpc('oauth_vault_upsert_atomic', {
      p_connection_id: connection_id,
      p_user_id: connection.user_id,
      p_broker: connection.broker,
      p_environment: connection.environment,
      p_secret_name: secretName,
      p_secret_payload: updatedPayload,
      p_token_expires_at: newTokens.expiresAt,
      p_oauth_scope: newTokens.scope ?? currentTokens.scope ?? null,
      p_oauth_provider_user_id: currentTokens.provider_user_id ?? null,
      // Preserve existing account info — do not pass null to overwrite
      p_account_id: null,
      p_account_name: null,
      p_connection_name: null,
      p_is_prop_firm: null,
    });

    if (rpcError) {
      throw new Error(`oauth_vault_upsert_atomic failed: ${rpcError.message}`);
    }

    console.log('[oauth-refresh] token refreshed successfully', {
      connectionId: connection_id,
      broker: connection.broker,
      environment: connection.environment,
      expiresAt: newTokens.expiresAt,
    });

    return new Response(
      JSON.stringify({ success: true, expires_at: newTokens.expiresAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[oauth-refresh] refresh failed for connection:', connection_id, msg);

    // Mark connection degraded on failure
    await supabaseAdmin
      .from('broker_connections')
      .update({
        status: 'degraded',
        last_error: msg.slice(0, 500),
        last_error_at: new Date().toISOString(),
      })
      .eq('id', connection_id);

    return new Response(
      JSON.stringify({ error: 'refresh failed', detail: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
