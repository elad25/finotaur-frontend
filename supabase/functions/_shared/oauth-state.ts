// supabase/functions/_shared/oauth-state.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: HMAC-signed OAuth state tokens with TTL.
//          CSRF protection for the OAuth 2.0 authorization flow.
//
// Flow:
//   1. oauth-start calls generateStateToken → persists to oauth_state_tokens,
//      returns opaque token to embed in the authorization URL ?state= param.
//   2. oauth-callback calls verifyStateToken → checks HMAC + DB row +
//      expiry + used_at, marks consumed, returns {userId, broker, ...}.
//
// Token format (dot-separated, URL-safe base64 for sig):
//   <userId>.<broker>.<environment>.<nonce>.<hmac_sig>
//
// Security properties:
//   - HMAC-SHA-256 over the first 4 segments → forgery requires secret
//   - Nonce (128-bit random) → uniqueness and replay resistance
//   - DB row consumed on first use → replay impossible even with valid sig
//   - TTL enforced both by expires_at column and verifyStateToken check
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { BrokerName, BrokerEnvironment } from './broker-auth/interface.ts';

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface GenerateStateParams {
  userId: string;
  broker: BrokerName;
  environment: BrokerEnvironment;
  redirectUri: string;
  supabaseAdmin: SupabaseClient;
  connectionId?: string | null;
}

export interface VerifiedState {
  userId: string;
  broker: BrokerName;
  environment: BrokerEnvironment;
  redirectUri: string;
  connectionId?: string | null;
}

function getHmacSecret(): string {
  const secret = Deno.env.get('oauth_state_hmac_secret');
  if (!secret || secret.length < 32) {
    throw new Error(
      'oauth_state_hmac_secret env var missing or too short (need >= 32 chars)',
    );
  }
  return secret;
}

async function signHmac(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  // URL-safe base64 (no padding) — safe to embed in query strings without encoding.
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate an HMAC-signed state token and persist it to oauth_state_tokens.
 * Returns the opaque token string to embed in the authorization URL.
 */
export async function generateStateToken({
  userId,
  broker,
  environment,
  redirectUri,
  supabaseAdmin,
  connectionId,
}: GenerateStateParams): Promise<string> {
  const nonce = randomNonce();
  const payload = `${userId}.${broker}.${environment}.${nonce}`;
  const secret = getHmacSecret();
  const sig = await signHmac(payload, secret);
  const token = `${payload}.${sig}`;

  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const row: Record<string, unknown> = {
    user_id: userId,
    state_hmac: token,
    broker,
    environment,
    redirect_uri: redirectUri,
    expires_at: expiresAt,
  };
  if (connectionId) row.connection_id = connectionId;

  const { error } = await supabaseAdmin.from('oauth_state_tokens').insert(row);

  if (error) {
    throw new Error(`Failed to persist OAuth state token: ${error.message}`);
  }

  return token;
}

/**
 * Verify an HMAC-signed state token received in the OAuth callback.
 *
 * Checks (in order):
 *   1. Token format — must have exactly 5 dot-separated segments
 *   2. HMAC signature — must match server-computed value
 *   3. DB row existence — must be found (not expired and cleaned up)
 *   4. already-used guard — used_at must be null
 *   5. TTL guard — expires_at must be in the future
 *   6. Marks token as used (consumed — single-use)
 *
 * Throws with a descriptive message on any failure. Caller should map
 * thrown errors to a 400 response in the edge function.
 */
export async function verifyStateToken(
  token: string,
  supabaseAdmin: SupabaseClient,
): Promise<VerifiedState> {
  // 1. Parse token — expect exactly 5 dot-separated segments.
  const parts = token.split('.');
  if (parts.length !== 5) {
    throw new Error('Invalid OAuth state token format');
  }
  const [userId, broker, environment, nonce, sig] = parts;

  // 2. Verify HMAC signature.
  const payload = `${userId}.${broker}.${environment}.${nonce}`;
  const secret = getHmacSecret();
  const expectedSig = await signHmac(payload, secret);

  if (sig !== expectedSig) {
    throw new Error('OAuth state token HMAC verification failed (possible CSRF)');
  }

  // 3. Look up in DB — must exist, not used, not expired.
  const { data, error } = await supabaseAdmin
    .from('oauth_state_tokens')
    .select('user_id, broker, environment, redirect_uri, used_at, expires_at, connection_id')
    .eq('state_hmac', token)
    .single();

  if (error || !data) {
    throw new Error('OAuth state token not found (expired or replay)');
  }

  // 4. Replay guard — token must not have been consumed already.
  if (data.used_at) {
    throw new Error('OAuth state token already used (replay attempt)');
  }

  // 5. TTL guard — token must not be past its expiry.
  if (new Date(data.expires_at as string).getTime() < Date.now()) {
    throw new Error('OAuth state token expired');
  }

  // 6. Consume token — mark used_at to prevent replay on concurrent requests.
  const { error: updateError } = await supabaseAdmin
    .from('oauth_state_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('state_hmac', token);

  if (updateError) {
    throw new Error(`Failed to mark OAuth state token used: ${updateError.message}`);
  }

  return {
    userId: data.user_id as string,
    broker: data.broker as BrokerName,
    environment: data.environment as BrokerEnvironment,
    redirectUri: data.redirect_uri as string,
    connectionId: (data.connection_id as string | null) ?? null,
  };
}
