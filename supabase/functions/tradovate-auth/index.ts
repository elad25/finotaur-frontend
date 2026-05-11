// supabase/functions/tradovate-auth/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   1. mode="login"   — authenticate user, store vault_secret_id, sync accounts→portfolios
//   2. mode="refresh" — renew tokens for all connected users (cron every 75min)
//
// TRADOVATE API NOTES (per official docs):
//   • Live URL : https://live.tradovateapi.com/v1
//   • Demo URL : https://demo.tradovateapi.com/v1
//   • Token TTL: 90 minutes from creation
//   • Renewal  : GET /auth/renewaccesstoken (extend existing token — no new session)
//   • Sessions : max 2 concurrent — prefer renewaccesstoken over new accesstokenrequest
//
// SUPABASE VAULT NOTES:
//   • vault.create_secret / vault.decrypted_secrets are in the 'vault' schema
//   • PostgREST only exposes the 'public' schema via .rpc()
//   • Solution: wrapper SQL functions in public schema (tradovate_vault_upsert / tradovate_vault_read)
//   • These must exist in DB before deploying this function (see SQL block at bottom of file)
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticate } from '../_shared/dualAuth.ts';
import { scheduleRetry, clearRetry } from '../_shared/retryQueue.ts';

// ─── Tradovate official REST API base URLs ────────────────────
const TRADOVATE_URLS = {
  live: 'https://live.tradovateapi.com/v1',
  demo: 'https://demo.tradovateapi.com/v1',
};

// Token lifetime per Tradovate docs: 90 minutes
// We renew at 75 minutes (15 min before expiry) as recommended
const TOKEN_TTL_MS   = 90 * 60 * 1000;
const RENEW_AHEAD_MS = 15 * 60 * 1000;

const APP_ID      = 'FINOTAUR';
const APP_VERSION = '1.0';
const CID         = 11045;
const SEC         = Deno.env.get('TRADOVATE_SECRET') ?? '';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

// ─── Types ────────────────────────────────────────────────────
interface TradovateAccount {
  id: number;
  name: string;
  accountType: string;
  active: boolean;
}

interface LoginResult {
  accessToken: string;
  expirationTime: string | null; // ISO date returned by Tradovate
  userId: number;
  accounts: TradovateAccount[];
}

// ─── Full login (new session) ─────────────────────────────────
// Use only on first connect or when renewal has failed.
// Per Tradovate docs: limited to 2 concurrent sessions.
async function tradovateLogin(
  environment: 'live' | 'demo',
  username: string,
  password: string
): Promise<LoginResult> {
  const base = TRADOVATE_URLS[environment];

  const res = await fetch(`${base}/auth/accesstokenrequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:       username,
      password,
      appId:      APP_ID,
      appVersion: APP_VERSION,
      cid:        CID,
      sec:        SEC,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tradovate auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // DEBUG — הסר אחרי בדיקה
  console.log('[tradovate-auth] Tradovate raw response:', JSON.stringify(data).slice(0, 300));

  // Tradovate returns errorText on HTTP 200 for invalid credentials
  if (data.errorText) {
    throw new Error(`Tradovate auth error: ${data.errorText}`);
  }
  if (!data.accessToken) {
    throw new Error('No accessToken in Tradovate response');
  }

  // Fetch account list with the new token
  const accountsRes = await fetch(`${base}/account/list`, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });
  const accounts: TradovateAccount[] = accountsRes.ok
    ? await accountsRes.json()
    : [];

  return {
    accessToken:    data.accessToken,
    expirationTime: data.expirationTime ?? null,
    userId:         data.userId,
    accounts,
  };
}

// ─── Token renewal (extends existing session, no new session) ─
// Per Tradovate docs: prefer this over accesstokenrequest to stay within
// the 2-concurrent-session limit.
async function renewTradovateToken(
  environment: 'live' | 'demo',
  currentToken: string
): Promise<string | null> {
  const base = TRADOVATE_URLS[environment];

  try {
    const res = await fetch(`${base}/auth/renewaccesstoken`, {
      method: 'GET',
      headers: {
        'Content-Type':  'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

// ─── Vault: store/update secret (via public wrapper RPC) ──────
// Calls public.tradovate_vault_upsert_atomic(p_connection_id UUID, p_name TEXT, p_secret TEXT) → UUID
// Atomically mutates vault.secrets AND realigns broker_connections.connection_data.vault_secret_id
// in one PL/pgSQL transaction. Uses vault.update_secret() for true in-place update (same UUID
// across refreshes). Pass connectionId=null only on the first-connect path (login) where the
// broker_connections row does not yet exist; the caller then upserts the row with the returned id.
// Fixes OQ-VAULT-DRIFT (2026-05-11).
async function storeInVault(
  userId: string,
  environment: string,
  username: string,
  password: string,
  accessToken: string,
  connectionId: string | null = null
): Promise<string> {
  const payload    = JSON.stringify({ username, password, accessToken });
  const secretName = `tradovate_${userId}_${environment}`;

  const { data, error } = await supabaseAdmin.rpc('tradovate_vault_upsert_atomic', {
    p_connection_id: connectionId,
    p_name:          secretName,
    p_secret:        payload,
  });

  if (error || !data) {
    console.error('[tradovate-auth] vault upsert failed:', error?.message);
    // Fallback: reuse existing vault_secret_id from broker_connections.connection_data
    const { data: existing } = await supabaseAdmin
      .from('broker_connections')
      .select('connection_data')
      .eq('user_id', userId)
      .eq('broker', 'tradovate')
      .eq('environment', environment)
      .maybeSingle();
    const existingVaultId = (existing?.connection_data as { vault_secret_id?: string } | null)?.vault_secret_id;
    return existingVaultId ?? crypto.randomUUID();
  }

  return data as string;
}

// ─── Vault: read secret (via public wrapper RPC) ──────────────
// Calls public.tradovate_vault_read(p_secret_id UUID) → TEXT
async function readFromVault(secretId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('tradovate_vault_read', {
    p_secret_id: secretId,
  });

  if (error || !data) {
    console.error('[tradovate-auth] vault read failed:', error?.message);
    return null;
  }
  return data as string;
}

// ─── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // OQ-37+38: dual-auth (cron shared-secret OR user JWT). verify_jwt:false at
  // gateway means the Edge Function itself must reject unauthorized callers.
  const auth = await authenticate(req, supabaseAdmin);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.message }),
      {
        status: auth.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  try {
    const body = await req.json();
    const mode: string = body.mode ?? 'login';

    // ══════════════════════════════════════════════════════════
    // mode: refresh — called by pg_cron every 75 minutes
    // Renews tokens expiring within the next 15 minutes.
    // Uses renewaccesstoken (no new session) → falls back to
    // full re-login only if renewal fails.
    // ══════════════════════════════════════════════════════════
    if (mode === 'refresh') {
      const refreshStart = Date.now();
      // Find active broker_connections whose token expires within RENEW_AHEAD_MS
      const { data: connected } = await supabaseAdmin
        .from('broker_connections')
        .select('id, user_id, environment, connection_data, account_id')
        .eq('broker', 'tradovate')
        .eq('is_active', true)
        .lt('token_expires_at', new Date(Date.now() + RENEW_AHEAD_MS).toISOString());

      let refreshed = 0;
      let refreshProcessed = 0;
      let refreshSucceeded = 0;
      let refreshFailed = 0;

      for (const cred of connected ?? []) {
        refreshProcessed++;
        try {
          // Read stored credentials from Vault — vault_secret_id lives in connection_data jsonb.
          // F1.A note: rows backfilled from tradovate_credentials have empty connection_data
          // (vault_secret_id intentionally NOT migrated). Those rows are is_active=false and
          // appear under "Re-authenticate Required" in the Modal — refresh skips them by design.
          const cdata = (cred.connection_data ?? {}) as { vault_secret_id?: string };
          if (!cdata.vault_secret_id) {
            console.log(
              `[tradovate-auth] skip refresh for connection ${cred.id}: no vault_secret_id ` +
              `in connection_data (likely an F1.A backfill row — user must re-auth via Modal).`
            );
            continue;
          }
          const secret = await readFromVault(cdata.vault_secret_id);
          if (!secret) {
            console.warn(`[tradovate-auth] vault read returned null for connection ${cred.id}`);
            continue;
          }

          const { username, password, accessToken: oldToken } = JSON.parse(secret);
          const env = cred.environment as 'live' | 'demo';

          // ① Try renewal first (preferred — keeps same session)
          let newToken = await renewTradovateToken(env, oldToken);

          // ② Fall back to full re-login if renewal failed
          if (!newToken) {
            console.log(`[tradovate-auth] renewal failed for ${cred.id} — re-logging in`);
            const result = await tradovateLogin(env, username, password);
            newToken = result.accessToken;
          }

          // Update vault AND realign broker_connections.vault_secret_id atomically (single txn).
          // OQ-VAULT-DRIFT fix: the RPC writes both vault.secrets and the pointer; no drift window.
          const newVaultId = await storeInVault(
            cred.user_id, cred.environment, username, password, newToken, cred.id
          );

          // Post-RPC metadata update. Re-read connection_data so the pointer just written by
          // the atomic RPC isn't clobbered by a stale `cdata` snapshot from before the RPC.
          const { data: freshConn } = await supabaseAdmin
            .from('broker_connections')
            .select('connection_data')
            .eq('id', cred.id)
            .maybeSingle();
          const freshCdata = (freshConn?.connection_data ?? {}) as Record<string, unknown>;

          await supabaseAdmin.from('broker_connections').update({
            connection_data: {
              ...freshCdata,
              access_token_hash: newToken.slice(0, 8),
            },
            token_expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
            error_count:      0,
          }).eq('id', cred.id);
          // Clear retry state — token refresh succeeded (sets status='connected')
          await clearRetry(supabaseAdmin, cred.id);

          refreshed++;
          refreshSucceeded++;
        } catch (err) {
          console.error(`[tradovate-auth] refresh failed for connection ${cred.id}:`, err);
          // Schedule silent retry — never flip is_active (owned by whop-webhook)
          await scheduleRetry(supabaseAdmin, cred.id, String(err).slice(0, 500));
          refreshFailed++;
        }
      }

      // Cron heartbeat for token refresh job.
      const refreshDurationMs = Date.now() - refreshStart;
      const heartbeatStatus = refreshFailed === 0 ? 'ok' : (refreshSucceeded > 0 ? 'partial' : 'failed');
      try {
        await supabaseAdmin.from('cron_heartbeat').upsert({
          job_name: 'tradovate-token-refresh',
          last_run_at: new Date().toISOString(),
          last_status: heartbeatStatus,
          last_duration_ms: refreshDurationMs,
          last_payload: {
            processed: refreshProcessed,
            succeeded: refreshSucceeded,
            failed: refreshFailed,
          },
        }, { onConflict: 'job_name' });
      } catch (hbErr) {
        console.error('[tradovate-auth][refresh] heartbeat upsert failed:', String(hbErr).slice(0, 300));
      }

      return json({ refreshed });
    }

    // ══════════════════════════════════════════════════════════
    // mode: reconnect — re-login for a specific credential using stored vault creds.
    // source: 'user_click' (default) | 'whop_resume' (called by whop-webhook on sub resume)
    // ══════════════════════════════════════════════════════════
    if (mode === 'reconnect') {
      const { credentialId, source = 'user_click' } = body as {
        credentialId?: string;
        source?: 'user_click' | 'whop_resume';
      };
      if (!credentialId) return json({ error: 'Missing credentialId' }, 400);

      if (source === 'whop_resume') {
        console.info('[tradovate-auth] reconnect via whop_resume', { credentialId });
      }

      const { data: cred } = await supabaseAdmin
        .from('broker_connections')
        .select('id, user_id, environment, account_id, connection_name, account_name, connection_data')
        .eq('id', credentialId)
        .eq('broker', 'tradovate')
        .single();

      if (!cred) return json({ ok: false, source, status: 'not_found', error: 'Connection not found' }, 404);

      const cdata = (cred.connection_data ?? {}) as { vault_secret_id?: string; account_spec?: string; access_token_hash?: string };

      // Vault read failure — not transient, do not scheduleRetry
      if (!cdata.vault_secret_id) {
        console.error('[tradovate-auth] reconnect: no vault_secret_id in connection_data', { credentialId, source });
        await supabaseAdmin.from('broker_connections').update({
          last_error: 'vault_creds_missing',
          status:     'canceled',
        }).eq('id', cred.id);
        // OQ-59: notify customer of broker disconnection
        void supabaseAdmin.functions.invoke('broker-state-change-notify', {
          body: {
            connection_id: cred.id,
            user_id:       cred.user_id,
            broker:        cred.broker ?? 'tradovate',
            environment:   cred.environment ?? 'unknown',
            new_status:    'canceled',
            last_error:    'vault_creds_missing',
          },
        }).catch((err: unknown) => {
          console.error('[tradovate-auth] cancel notify dispatch failed:', String(err).slice(0, 200));
        });
        return json({ ok: false, source, status: 'canceled', error: 'vault_creds_missing' }, 400);
      }

      const secret = await readFromVault(cdata.vault_secret_id);
      if (!secret) {
        console.error('[tradovate-auth] reconnect: vault read returned null', { credentialId, source });
        await supabaseAdmin.from('broker_connections').update({
          last_error: 'vault_creds_missing',
          status:     'canceled',
        }).eq('id', cred.id);
        // OQ-59: notify customer of broker disconnection
        void supabaseAdmin.functions.invoke('broker-state-change-notify', {
          body: {
            connection_id: cred.id,
            user_id:       cred.user_id,
            broker:        cred.broker ?? 'tradovate',
            environment:   cred.environment ?? 'unknown',
            new_status:    'canceled',
            last_error:    'vault_creds_missing',
          },
        }).catch((err: unknown) => {
          console.error('[tradovate-auth] cancel notify dispatch failed:', String(err).slice(0, 200));
        });
        return json({ ok: false, source, status: 'canceled', error: 'vault_creds_missing' }, 400);
      }

      const { username, password } = JSON.parse(secret);
      const env = cred.environment as 'live' | 'demo';

      // Full re-login with stored credentials
      const { accessToken } = await tradovateLogin(env, username, password);

      // OQ-VAULT-DRIFT fix: atomic vault + pointer alignment via the RPC (single txn).
      await storeInVault(cred.user_id, env, username, password, accessToken, cred.id);

      // Re-read fresh connection_data so the pointer just written by the atomic RPC
      // isn't clobbered by the stale `cdata` snapshot.
      const { data: freshConn } = await supabaseAdmin
        .from('broker_connections')
        .select('connection_data')
        .eq('id', cred.id)
        .maybeSingle();
      const freshCdata = (freshConn?.connection_data ?? {}) as Record<string, unknown>;

      // is_active=true: this is the ONE place where is_active is re-enabled
      // (Whop subscription just resumed, or user explicitly clicked Reconnect).
      await supabaseAdmin.from('broker_connections').update({
        connection_data: {
          ...freshCdata,
          access_token_hash: accessToken.slice(0, 8),
        },
        token_expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
        is_active:        true,
        error_count:      0,
        connected_at:     new Date().toISOString(),
      }).eq('id', cred.id);
      // Clear any retry backoff state — reconnect succeeded (sets status='connected')
      await clearRetry(supabaseAdmin, cred.id);

      if (source === 'whop_resume') {
        console.info('[tradovate-auth] reconnect via whop_resume succeeded', { credentialId });
      }

      // Kick off sync
      supabaseAdmin.functions.invoke('tradovate-sync', {
        body: { userId: cred.user_id, environment: env, mode: 'initial' },
      }).catch(() => {});

      return json({ ok: true, source, status: 'connected' });
    }

    // ══════════════════════════════════════════════════════════
    // mode: login — user connects a Tradovate account
    // ══════════════════════════════════════════════════════════
    const { userId, environment, username, password } = body;
    if (!userId || !environment || !username || !password) {
      return json({ error: 'Missing required fields: userId, environment, username, password' }, 400);
    }

    const env = environment as 'live' | 'demo';

    // DEBUG — הסר אחרי בדיקה
    console.log('[tradovate-auth] login attempt:', {
      username,
      passwordLength: password?.length,
      env,
      cid: CID,
      secLength: SEC?.length,
    });

    // 1. Authenticate with Tradovate (full login)
    const { accessToken, accounts } = await tradovateLogin(env, username, password);

    // 2. Persist credentials in Vault (encrypted)
    // First-connect path: broker_connections row doesn't exist yet → pass null for
    // p_connection_id (the upsert below sets vault_secret_id atomically with the rest).
    console.log('[tradovate-auth] storing in vault...');
    const vaultId = await storeInVault(userId, env, username, password, accessToken, null);
    console.log('[tradovate-auth] vault stored:', vaultId);

    // 3. Primary account = first active, else first in list
    const primaryAccount = accounts.find(a => a.active) ?? accounts[0];
    console.log('[tradovate-auth] accounts:', accounts.length, 'primary:', primaryAccount?.id);
    if (!primaryAccount) {
      throw new Error('No accounts returned from Tradovate — check credentials and account status');
    }

    // 4. Upsert broker_connections row (metadata + jsonb only — tokens live in Vault)
    console.log('[tradovate-auth] upserting broker_connections row...');
    // Get existing connection ID + connection_data if reconnecting (to preserve PK + FK refs
    // AND to avoid wiping out other jsonb fields a future feature may have added).
    // Match the new UNIQUE constraint: (user_id, broker, account_id)
    const { data: existingConn } = await supabaseAdmin
      .from('broker_connections')
      .select('id, connection_data')
      .eq('user_id', userId)
      .eq('broker', 'tradovate')
      .eq('account_id', String(primaryAccount.id))
      .maybeSingle();

    const credentialId = existingConn?.id ?? crypto.randomUUID();
    const existingCData = (existingConn?.connection_data ?? {}) as Record<string, unknown>;

    const { error: upsertError } = await supabaseAdmin.from('broker_connections').upsert({
      id:               credentialId,
      user_id:          userId,
      broker:           'tradovate',
      status:           'connected',
      is_active:        true,
      account_id:       String(primaryAccount.id),
      account_name:     primaryAccount.name,
      environment:      env,
      connection_name:  body.connectionLabel ?? `${env} – ${primaryAccount.name}`,
      token_expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      connected_at:     new Date().toISOString(),
      error_count:      0,
      last_error:       null,
      // Merge with existing jsonb so future feature-added keys aren't wiped on re-auth.
      // Vault flow: vault_secret_id is the lookup; the actual token bytes live in Vault.
      // The dedicated bytea columns (access_token_encrypted, refresh_token_encrypted) belong
      // to a different "in-DB encryption" pattern (designed for IBKR per OQ-14) — Tradovate
      // stays on the Vault pattern in F1.A. Convergence is a future decision.
      connection_data: {
        ...existingCData,
        vault_secret_id:   vaultId,
        account_spec:      `${primaryAccount.name}${primaryAccount.id}`,
        access_token_hash: accessToken.slice(0, 8),
      },
    }, { onConflict: 'user_id,broker,account_id' });

    console.log('[tradovate-auth] upsert result:', upsertError ? `ERROR: ${upsertError.message} code:${upsertError.code}` : 'OK');
    if (upsertError) throw new Error(`broker_connections upsert failed: ${upsertError.message}`);

    // 5. Create a portfolio row for every account under this login
    for (const acc of accounts) {
      await supabaseAdmin.rpc('upsert_portfolio_from_tradovate', {
        p_user_id:              userId,
        p_tradovate_account_id: acc.id,
        p_account_spec:         `${acc.name}${acc.id}`,
        p_account_name:         acc.name,
        p_environment:          env,
        p_credential_id:        credentialId,
        p_connection_label:     body.connectionLabel ?? null,
      });
    }

    // 6. Mark connected in user_settings
    await supabaseAdmin.from('user_settings').upsert({
      user_id: userId,
      [`tradovate_${env}_connected`]: true,
    }, { onConflict: 'user_id' });

    // 7. Kick off immediate sync (non-blocking — don't await failure)
    supabaseAdmin.functions.invoke('tradovate-sync', {
      body: { userId, environment: env, mode: 'initial' },
    }).catch((e: unknown) => console.warn('[tradovate-auth] initial sync invoke error:', e));

    return json({
      success:   true,
      accountId: primaryAccount.id,
      accounts:  accounts.length,
    });

  } catch (err: unknown) {
    console.error('[tradovate-auth]', err);
    return json({ error: String(err) }, 500);
  }
});

// ─── Response helper ──────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// REQUIRED SQL — applied via Supabase migration
//   • Live RPC used by this function: public.tradovate_vault_upsert_atomic
//     (see supabase/migrations/2026-05-11_vault_drift_fix_atomic_upsert.sql)
//   • Legacy RPC public.tradovate_vault_upsert: still defined in DB, no longer
//     called by this edge function. To be dropped in a follow-up migration.
//   • Reader: public.tradovate_vault_read (unchanged).
// ═══════════════════════════════════════════════════════════════
/*

-- NEW (live as of 2026-05-11) — atomic vault upsert + pointer alignment.
-- See migration file for the canonical definition.
CREATE OR REPLACE FUNCTION public.tradovate_vault_upsert_atomic(
  p_connection_id UUID,
  p_name          TEXT,
  p_secret        TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = p_name LIMIT 1;

  IF v_id IS NULL THEN
    SELECT vault.create_secret(p_secret, p_name) INTO v_id;
  ELSE
    PERFORM vault.update_secret(v_id, p_secret, NULL, NULL, NULL);
  END IF;

  IF p_connection_id IS NOT NULL THEN
    UPDATE broker_connections
    SET connection_data = jsonb_set(
      COALESCE(connection_data, '{}'::jsonb),
      '{vault_secret_id}',
      to_jsonb(v_id::text),
      true
    )
    WHERE id = p_connection_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tradovate_vault_upsert_atomic(UUID, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.tradovate_vault_upsert_atomic(UUID, TEXT, TEXT) FROM authenticated, anon;


-- LEGACY (still defined, no longer called by this edge function).
-- Kept for backwards-compat during transition; safe to DROP after 1 cron cycle confirms
-- the atomic RPC is exercised exclusively.
CREATE OR REPLACE FUNCTION public.tradovate_vault_upsert(
  p_name   TEXT,
  p_secret TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_id UUID;
BEGIN
  UPDATE vault.secrets SET secret = p_secret::bytea WHERE name = p_name RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT vault.create_secret(p_secret, p_name) INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tradovate_vault_upsert(TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.tradovate_vault_upsert(TEXT, TEXT) FROM authenticated, anon;
COMMENT ON FUNCTION public.tradovate_vault_upsert IS
'LEGACY: Upserts a Tradovate credential into Supabase Vault. service_role only. Replaced by tradovate_vault_upsert_atomic (2026-05-11).';


-- Read a secret by its UUID. Returns decrypted text or NULL.
CREATE OR REPLACE FUNCTION public.tradovate_vault_read(
  p_secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret
  INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = p_secret_id;

  RETURN v_secret;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tradovate_vault_read(UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION public.tradovate_vault_read(UUID) FROM authenticated, anon;
COMMENT ON FUNCTION public.tradovate_vault_read IS
'Reads a Tradovate credential from Supabase Vault by secret UUID. service_role only.';

*/