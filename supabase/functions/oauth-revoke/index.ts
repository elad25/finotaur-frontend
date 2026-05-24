// supabase/functions/oauth-revoke/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: User-initiated OAuth revoke for a broker connection.
//
// Flow:
//   1. User clicks "Disconnect Tradovate" in the journal UI.
//   2. Frontend POSTs { connection_id } with the user's JWT.
//   3. We verify ownership and OAuth method, then atomically:
//        - Delete the vault secret entry holding the tokens.
//        - Mark broker_connections.status = 'disconnected'.
//   4. Return { success: true }.
//
// Auth: User JWT required. Cron path explicitly rejected — revoke is
//       user-initiated only.
// verify_jwt: false at gateway — dualAuth handles auth internally.
//
// NOTE: This does NOT call the Tradovate /oauth/revoke endpoint.
//       Tokens are invalidated client-side only (deleted from our Vault).
//       Server-side revoke at the provider can be added in S4 if needed.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticate } from '../_shared/dualAuth.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Authenticate — user JWT only (cron is rejected for revoke)
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.message }),
      { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (auth.isCron) {
    return new Response(
      JSON.stringify({ error: 'oauth-revoke requires a user JWT, not a cron token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const userId = auth.userId;

  // Parse body
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

  // Atomic revoke via SECURITY DEFINER RPC (validates ownership server-side too)
  const { data: revoked, error: rpcError } = await supabaseAdmin.rpc('oauth_vault_revoke_atomic', {
    p_connection_id: connection_id,
    p_user_id: userId,
  });

  if (rpcError) {
    console.error('[oauth-revoke] RPC failed:', rpcError.message);
    return new Response(
      JSON.stringify({ error: 'revoke failed', detail: rpcError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (revoked !== true) {
    // RPC returned false — either connection not found or ownership mismatch.
    // Don't leak which one to the caller.
    return new Response(
      JSON.stringify({ error: 'connection not found or access denied' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  console.log('[oauth-revoke] connection revoked', { connectionId: connection_id, userId });

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
