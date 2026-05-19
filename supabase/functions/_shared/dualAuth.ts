// supabase/functions/_shared/dualAuth.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Authenticate Edge Function callers when verify_jwt=false.
//
// Background — OQ-37+38 (resolved 2026-05-09):
//   The legacy service_role JWT was disabled for security (OQ-28).
//   Modern `sb_secret_*` keys are NOT JWT format and were rejected by the
//   Supabase Edge Function gateway when `verify_jwt: true`. Result: every
//   cron-triggered call to `tradovate-sync` / `tradovate-auth` returned
//   `401 UNAUTHORIZED_INVALID_JWT_FORMAT`. Cron silently failed for 25h+.
//
// This helper sets `verify_jwt: false` at the gateway and re-authenticates
// inside the function, accepting EITHER:
//   1. CRON path  — Bearer matches `vault.decrypted_secrets.secret_api_key`
//   2. USER path  — Bearer is a valid Supabase user JWT
//
// Pattern mirrors `whop-webhook` (verify_jwt:false + in-function HMAC).
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Module-scope cache. Edge Functions are stateless across cold starts (~5-10
// min), so this re-fetches periodically without per-request cost.
let _cachedCronSecret: string | null = null;

// UUID of the vault.secrets row whose name='secret_api_key'. Stable identifier
// per project (created once; the row's decrypted value can rotate freely).
// Reading via the SECURITY DEFINER RPC tradovate_vault_read(text) bypasses
// PostgREST's schema-exposure layer — when 'vault' is not in db-schemas,
// supabase-js's .schema('vault').from(...) silently 404s and dualAuth path 1a
// never matches the cron Bearer. The RPC path works regardless of PostgREST
// config. Fix for the 2026-05-18 cron 401 incident.
const SECRET_API_KEY_VAULT_ID = 'f8d7c335-e2fe-405d-a722-54a0161ebfd4';

async function getCronSecret(admin: SupabaseClient): Promise<string | null> {
  if (_cachedCronSecret !== null) return _cachedCronSecret;
  const { data, error } = await admin.rpc('tradovate_vault_read', {
    p_secret_id: SECRET_API_KEY_VAULT_ID,
  });
  if (error || !data) {
    console.error(
      '[dualAuth] vault.secret_api_key fetch failed:',
      error?.message ?? 'not found',
    );
    return null;
  }
  _cachedCronSecret = data as string;
  return _cachedCronSecret;
}

// Constant-time string compare to avoid timing oracles.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export type AuthResult =
  | { ok: true; isCron: true }
  | { ok: true; isCron: false; userId: string }
  | { ok: false; status: number; message: string };

/**
 * Authenticate an incoming Edge Function request.
 *
 * @param req     The incoming Request.
 * @param admin   A Supabase client with service-role credentials (used for
 *                vault.decrypted_secrets read + auth.getUser JWT validation).
 * @returns       An AuthResult; either `ok: true` with cron/user metadata
 *                OR `ok: false` with status + message ready to return as 401.
 *
 * USAGE PATTERN at the top of Deno.serve handler:
 *   const auth = await authenticate(req, supabaseAdmin);
 *   if (!auth.ok) {
 *     return new Response(
 *       JSON.stringify({ error: auth.message }),
 *       { status: auth.status, headers: { 'Content-Type': 'application/json' } },
 *     );
 *   }
 *   // proceed; auth.isCron tells you which path
 */
export async function authenticate(
  req: Request,
  admin: SupabaseClient,
): Promise<AuthResult> {
  const header = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return { ok: false, status: 401, message: 'Missing Bearer token' };
  }
  const token = header.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, message: 'Empty Bearer token' };
  }

  // 1a. Try Vault `secret_api_key` (this is what pg_cron sends per the
  //     cron.alter_job command set up in the broker-session-resilience sprint
  //     2026-05-08).
  const cronSecret = await getCronSecret(admin);
  if (cronSecret && timingSafeEqual(token, cronSecret)) {
    return { ok: true, isCron: true };
  }

  // 1b. Try `SUPABASE_SERVICE_ROLE_KEY` env var (this is what the auto-injected
  //     env carries inside Edge Functions — used by internal function-to-function
  //     fetches such as the fire-and-forget refresh in tradovate-sync). In a
  //     correctly-provisioned project this value equals `secret_api_key`, but
  //     check separately for robustness against rotation drift.
  const internalSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (internalSecret && timingSafeEqual(token, internalSecret)) {
    return { ok: true, isCron: true };
  }

  // 2. Fall through to Supabase user JWT validation (round-trip to /auth/v1/user).
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return { ok: false, status: 401, message: 'Invalid token' };
    }
    return { ok: true, isCron: false, userId: data.user.id };
  } catch (e) {
    console.error('[dualAuth] auth.getUser threw:', (e as Error).message);
    return { ok: false, status: 401, message: 'Token verification failed' };
  }
}
