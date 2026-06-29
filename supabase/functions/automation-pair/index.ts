// supabase/functions/automation-pair/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Redeem a one-time pairing code for a long-lived device
//          token. Called once by the desktop agent (NinjaScript) on
//          first launch after the user generates a code in the UI.
//
// Auth: none (pairing code IS the proof). verify_jwt:false in config.toml.
//
// IMPORTANT: device token never logged; only SHA-256 hash persisted.
//
// Flow:
//   1. Agent POSTs { pairing_code, device_name?, agent_version? }.
//   2. Server generates 32 random bytes → base64url = raw device token.
//   3. SHA-256(raw token) hex → stored via automation_redeem_pairing_code RPC.
//   4. Raw token returned to agent exactly once. Never stored server-side.
//   5. All future requests use the raw token as a Bearer credential;
//      automation-agent verifies it by hashing and doing a DB lookup.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sha256Hex } from '../_shared/hash.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

/** Generate a 32-byte cryptographically random token, base64url-encoded (no padding). */
function generateDeviceToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let body: { pairing_code?: string; device_name?: string; agent_version?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { pairing_code, device_name, agent_version } = body;

  if (!pairing_code || typeof pairing_code !== 'string' || pairing_code.trim() === '') {
    return new Response(
      JSON.stringify({ error: 'missing_pairing_code' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Generate the raw token — this is the ONLY moment the raw bytes exist server-side.
  // It will be returned to the agent and then discarded from memory; only the hash persists.
  const rawToken = generateDeviceToken();
  const tokenHash = await sha256Hex(rawToken);

  // Redeem the pairing code: verify it exists, is not expired, mark it used,
  // and persist the hashed device token. The RPC returns TABLE(device_id uuid, user_id uuid).
  const { data: rows, error: rpcError } = await supabaseAdmin.rpc(
    'automation_redeem_pairing_code',
    {
      p_code:        pairing_code.trim().toUpperCase(),
      p_token_hash:  tokenHash,
      p_device_name: device_name ?? null,
      p_version:     agent_version ?? null,
    },
  );

  if (rpcError) {
    // Always return the same opaque error code regardless of the internal
    // RPC failure reason — avoids leaking whether the code exists, is expired,
    // or is already redeemed. Internal detail stays in the Supabase function logs only.
    return new Response(
      JSON.stringify({ error: 'invalid_or_expired_code' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // supabase-js returns RETURNS TABLE results as an array; read the first row.
  const firstRow = Array.isArray(rows) ? (rows[0] as { device_id: string; user_id: string } | undefined) : undefined;
  if (!firstRow?.device_id) {
    // RPC succeeded but returned no row — code was already redeemed or not found.
    return new Response(
      JSON.stringify({ error: 'invalid_or_expired_code' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Return the raw token to the agent exactly once.
  // The hash is already persisted in the DB; the raw token is never stored server-side.
  return new Response(
    JSON.stringify({
      device_token: rawToken,
      device_id:    firstRow.device_id,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
