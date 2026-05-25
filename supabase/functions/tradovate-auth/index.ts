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
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';

// Local wrapper preserving the existing call sites — the canonical retry
// logic lives in `_shared/fetchWithRetry.ts`. Handles Tradovate's 429
// (p-time + p-ticket) and 5xx with fixed-delay backoff. 401 still bubbles
// up to the caller (renewal path or scheduleRetry).
//
// Observability (Phase 1A.2): every 429 is fire-and-forget INSERTed into
// `public.tradovate_api_call_log` via the `admin` option. Per-user/connection
// attribution is deferred to Phase 1B.
function tradovateFetch(url: string, init: RequestInit): Promise<Response> {
  return fetchWithRetry(url, init, { label: 'tradovate-auth', admin: supabaseAdmin });
}

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

// ─── Per-purpose Tradovate app credentials ───────────────────────
//
// CANONICAL ARCHITECTURE — see
// `finotaur/.claude/architecture/tradovate-copier-api-key-architecture.md`
//
// Two completely separate auth mechanisms:
//
//   JOURNAL purpose — Vendor/Ecosystem OAuth app (FINOTAUR-held)
//     env: oauth_cid_Journal + secret_oauth_journal (CID 13543)
//     Used for: read-only journal sync (fills → trades table)
//
//   COPIER purpose — Per-user API Key (CUSTOMER-supplied)
//     Each customer generates their own API Key in
//     Tradovate Web Trader → Application Settings → API Access.
//     They paste cid+sec into FINOTAUR's ConnectCopierModal.
//     We pass those values straight through to accesstokenrequest.
//     NEVER store a copier-purpose cid/sec in env — it would force
//     all customers' trades into one account.
//
// 🚨 OAuth is FORBIDDEN for copier per the Tradovate / NinjaTrader
//    Vendor agreement (signed 2026-05-25). Do not re-introduce
//    copier_cid / copier_sec / tradovate_cid env vars.
const JOURNAL_CID = parseInt(Deno.env.get('oauth_cid_Journal') ?? '0', 10);
const JOURNAL_SEC = Deno.env.get('secret_oauth_journal') ?? '';


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
/**
 * Resolve the cid/sec pair for an accesstokenrequest.
 *
 *   purpose='journal' → always env-based (vendor OAuth app for journal sync)
 *   purpose='copier'  → MUST come from `userApiKey` (customer-supplied);
 *                        env vars are never used for copier — see compliance
 *                        doc in .claude/architecture/.
 */
function resolveCreds(
  purpose: 'journal' | 'copier',
  userApiKey?: { cid: number; sec: string },
): { cid: number; sec: string } {
  if (purpose === 'copier') {
    if (!userApiKey || !userApiKey.cid || !userApiKey.sec) {
      throw new Error(
        "Tradovate auth error: copier-purpose login requires customer-supplied API Key (cid + sec). " +
        "Generate one at Tradovate Web Trader → Application Settings → API Access."
      );
    }
    return { cid: userApiKey.cid, sec: userApiKey.sec };
  }
  return { cid: JOURNAL_CID, sec: JOURNAL_SEC };
}

async function tradovateLogin(
  environment: 'live' | 'demo',
  username: string,
  password: string,
  purpose: 'journal' | 'copier' = 'journal',
  userApiKey?: { cid: number; sec: string },
): Promise<LoginResult> {
  const base = TRADOVATE_URLS[environment];
  const { cid, sec } = resolveCreds(purpose, userApiKey);

  const res = await tradovateFetch(`${base}/auth/accesstokenrequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:       username,
      password,
      appId:      APP_ID,
      appVersion: APP_VERSION,
      cid,
      sec,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tradovate auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // DEBUG — remove after testing
  console.log('[tradovate-auth] Tradovate raw response:', JSON.stringify(data).slice(0, 300));

  // Tradovate returns errorText on HTTP 200 for invalid credentials
  if (data.errorText) {
    // DEBUG 2026-05-25 — include cid + env + purpose in the error message so the
    // frontend surfaces them in the toast. For copier-purpose the cid is the
    // customer's own (echoed back so they can verify they typed it correctly).
    throw new Error(`Tradovate auth error: ${data.errorText} [DEBUG cid=${cid} env=${environment} purpose=${purpose}]`);
  }
  if (!data.accessToken) {
    throw new Error('No accessToken in Tradovate response');
  }

  // Fetch account list with the new token
  const accountsRes = await tradovateFetch(`${base}/account/list`, {
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
    const res = await tradovateFetch(`${base}/auth/renewaccesstoken`, {
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
  connectionId: string | null = null,
  userApiKey?: { cid: number; sec: string },
): Promise<string> {
  // Vault payload shape:
  //   - journal connections: { username, password, accessToken }  (3 fields)
  //   - copier connections:  { username, password, accessToken, cid, sec }  (5 fields)
  // cid+sec are stored so the refresh path can re-authenticate without
  // asking the customer to re-paste their API Key every 90 minutes.
  const payloadObj: Record<string, unknown> = { username, password, accessToken };
  if (userApiKey?.cid && userApiKey?.sec) {
    payloadObj.cid = userApiKey.cid;
    payloadObj.sec = userApiKey.sec;
  }
  const payload    = JSON.stringify(payloadObj);
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
      .in('broker', ['tradovate', 'ninja_trader'])
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
      // Find active broker_connections whose token expires within RENEW_AHEAD_MS.
      // Includes both 'tradovate' and 'ninja_trader' since NT Web accounts run
      // on the same Tradovate cloud and need identical token-refresh handling.
      const { data: connected } = await supabaseAdmin
        .from('broker_connections')
        .select('id, user_id, environment, connection_data, account_id, purpose')
        .in('broker', ['tradovate', 'ninja_trader'])
        .eq('is_active', true)
        .lt('token_expires_at', new Date(Date.now() + RENEW_AHEAD_MS).toISOString());

      let refreshed = 0;
      let refreshProcessed = 0;
      let refreshSucceeded = 0;
      let refreshFailed = 0;

      // Phase 1A.3 (2026-05-12): batched parallel refresh.
      //
      // Previously this loop was sequential — at 1000 connections the
      // refresh tick could exceed 10 minutes (1000 × ~600ms each), which
      // approaches edge-function timeout limits and stalls retries.
      //
      // Now: process REFRESH_BATCH_SIZE connections in parallel via
      // Promise.allSettled, with REFRESH_STAGGER_MS between batches to
      // smooth the burst against Tradovate's per-IP 80 req/min limit.
      // At 1000 connections + BATCH_SIZE=10 + STAGGER=500ms:
      //   100 batches × ~600ms parallel = ~60s plus 100×500ms stagger = ~110s total.
      // At 10K connections: ~1000 batches → ~18 min worst case. Still inside
      // Tradovate's per-IP limit (10 parallel × 60 sec/min = 600 req/min spread).
      const REFRESH_BATCH_SIZE = 10;
      const REFRESH_STAGGER_MS = 500;

      type ConnRow = {
        id: string;
        user_id: string;
        environment: string;
        connection_data: { vault_secret_id?: string } | null;
        account_id: string;
        purpose: 'journal' | 'copier' | null;
      };

      const refreshOne = async (cred: ConnRow) => {
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
            return { status: 'skipped' as const };
          }
          const secret = await readFromVault(cdata.vault_secret_id);
          if (!secret) {
            console.warn(`[tradovate-auth] vault read returned null for connection ${cred.id}`);
            return { status: 'skipped' as const };
          }

          // Vault payload shape:
          //   journal: { username, password, accessToken }
          //   copier:  { username, password, accessToken, cid, sec }
          const parsed = JSON.parse(secret) as {
            username: string;
            password: string;
            accessToken: string;
            cid?: number;
            sec?: string;
          };
          const { username, password, accessToken: oldToken } = parsed;
          const env = cred.environment as 'live' | 'demo';
          const purposeForLogin = (cred.purpose ?? 'journal') as 'journal' | 'copier';
          const storedApiKey = (purposeForLogin === 'copier' && parsed.cid && parsed.sec)
            ? { cid: parsed.cid, sec: parsed.sec }
            : undefined;

          // ① Try renewal first (preferred — keeps same session)
          let newToken = await renewTradovateToken(env, oldToken);

          // ② Fall back to full re-login if renewal failed
          if (!newToken) {
            console.log(`[tradovate-auth] renewal failed for ${cred.id} — re-logging in`);
            const result = await tradovateLogin(env, username, password, purposeForLogin, storedApiKey);
            newToken = result.accessToken;
          }

          // Update vault AND realign broker_connections.vault_secret_id atomically (single txn).
          // OQ-VAULT-DRIFT fix: the RPC writes both vault.secrets and the pointer; no drift window.
          // Re-pass storedApiKey so the cid+sec stay in the vault payload for the next refresh.
          await storeInVault(
            cred.user_id, cred.environment, username, password, newToken, cred.id, storedApiKey,
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

          return { status: 'succeeded' as const };
        } catch (err) {
          console.error(`[tradovate-auth] refresh failed for connection ${cred.id}:`, err);
          // Schedule silent retry — never flip is_active (owned by whop-webhook)
          await scheduleRetry(supabaseAdmin, cred.id, String(err).slice(0, 500));
          return { status: 'failed' as const };
        }
      };

      const allCreds = connected ?? [];
      for (let i = 0; i < allCreds.length; i += REFRESH_BATCH_SIZE) {
        const batch = allCreds.slice(i, i + REFRESH_BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(refreshOne));

        for (const result of results) {
          refreshProcessed++;
          if (result.status === 'fulfilled') {
            switch (result.value.status) {
              case 'succeeded':
                refreshed++;
                refreshSucceeded++;
                break;
              case 'failed':
                refreshFailed++;
                break;
              // 'skipped' contributes to processed only
            }
          } else {
            // Should not happen — refreshOne catches its own errors — but be defensive.
            console.error('[tradovate-auth] refresh batch rejection:', result.reason);
            refreshFailed++;
          }
        }

        if (i + REFRESH_BATCH_SIZE < allCreds.length) {
          await new Promise(r => setTimeout(r, REFRESH_STAGGER_MS));
        }
      }

      // Cron heartbeat for token refresh job.
      // Only write 'ok' or 'partial'. On total failure, SKIP the heartbeat entirely so
      // cron-health's staleness check (not the brittle 'failed' status) drives alerting.
      // Prevents UptimeRobot flapping on a single transient cron tick.
      const refreshDurationMs = Date.now() - refreshStart;
      const heartbeatStatus: 'ok' | 'partial' | null =
        refreshFailed === 0 ? 'ok' : (refreshSucceeded > 0 ? 'partial' : null);
      if (heartbeatStatus !== null) {
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
      } else {
        console.warn('[tradovate-auth][refresh] total failure — skipping heartbeat write to let staleness alert');
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
        .select('id, user_id, broker, environment, account_id, connection_name, account_name, connection_data, purpose')
        .eq('id', credentialId)
        .in('broker', ['tradovate', 'ninja_trader'])
        .single();

      if (!cred) return json({ ok: false, source, status: 'not_found', error: 'Connection not found' }, 404);

      const cdata = (cred.connection_data ?? {}) as { vault_secret_id?: string; account_spec?: string; access_token_hash?: string };

      // ─── Vault recovery path (OQ-87) ──────────────────────────────────────
      // When the vault entry is missing or unreadable, the prior behavior was
      // to mark the connection as `canceled` and notify — leaving the user
      // with no in-app recovery short of "+ Add new connection". We now keep
      // the connection in `degraded` and signal `requires_credentials: true`
      // so the frontend can prompt for fresh credentials and call mode='login'
      // (which upserts on the existing row via the `user_id+broker+account_id`
      // unique constraint, repopulating vault atomically via tradovate_vault_upsert_atomic).
      //
      // For `whop_resume`-sourced reconnect attempts there is no human at the
      // keyboard, so we still treat vault-miss as terminal: mark canceled +
      // notify, exactly as before. The user_click path is the one we widen.
      const handleVaultMiss = async (reason: 'no_vault_secret_id' | 'vault_read_null') => {
        console.warn(`[tradovate-auth] reconnect: ${reason}`, { credentialId, source });
        if (source === 'whop_resume') {
          // No human in the loop — preserve the historical "mark canceled +
          // notify" behavior so the cron-driven retry queue knows to stop.
          await supabaseAdmin.from('broker_connections').update({
            last_error: 'vault_creds_missing',
            status:     'canceled',
          }).eq('id', cred.id);
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
        // user_click: keep the row in `degraded` (do NOT mark canceled, do NOT
        // notify) and ask the frontend to prompt for fresh credentials.
        await supabaseAdmin.from('broker_connections').update({
          last_error: 'vault_creds_missing',
          status:     'degraded',
        }).eq('id', cred.id);
        return json({
          ok: false,
          source,
          status: 'degraded',
          error: 'vault_creds_missing',
          requires_credentials: true,
          environment: cred.environment ?? null,
        }, 200);
      };

      if (!cdata.vault_secret_id) {
        return await handleVaultMiss('no_vault_secret_id');
      }

      const secret = await readFromVault(cdata.vault_secret_id);
      if (!secret) {
        return await handleVaultMiss('vault_read_null');
      }

      // Vault payload shape:
      //   journal: { username, password, accessToken }
      //   copier:  { username, password, accessToken, cid, sec }
      const parsedReconnect = JSON.parse(secret) as {
        username: string;
        password: string;
        accessToken?: string;
        cid?: number;
        sec?: string;
      };
      const { username, password } = parsedReconnect;
      const env = cred.environment as 'live' | 'demo';

      // Full re-login with stored credentials — purpose-scoped.
      const reconnectPurpose = ((cred as { purpose?: string }).purpose === 'copier' ? 'copier' : 'journal') as 'journal' | 'copier';
      const reconnectApiKey = (reconnectPurpose === 'copier' && parsedReconnect.cid && parsedReconnect.sec)
        ? { cid: parsedReconnect.cid, sec: parsedReconnect.sec }
        : undefined;
      const { accessToken } = await tradovateLogin(env, username, password, reconnectPurpose, reconnectApiKey);

      // OQ-VAULT-DRIFT fix: atomic vault + pointer alignment via the RPC (single txn).
      // Re-pass reconnectApiKey so the cid+sec stay in the vault payload.
      await storeInVault(cred.user_id, env, username, password, accessToken, cred.id, reconnectApiKey);

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
    //
    // `broker` distinguishes the brand the user picked in the UI:
    //   - 'tradovate'    → Tradovate tile
    //   - 'ninja_trader' → NinjaTrader tile (NT Web accounts run on
    //                      Tradovate cloud post-2022 acquisition, so
    //                      the auth flow is identical, only the
    //                      broker_connections.broker value differs)
    // Default 'tradovate' preserves behavior for legacy callers that
    // don't yet send the field.
    // ══════════════════════════════════════════════════════════
    const { userId, environment, username, password } = body;
    if (!userId || !environment || !username || !password) {
      return json({ error: 'Missing required fields: userId, environment, username, password' }, 400);
    }

    const purpose: 'journal' | 'copier' = body.purpose === 'copier' ? 'copier' : 'journal';
    if (body.purpose !== undefined && body.purpose !== 'journal' && body.purpose !== 'copier') {
      return json({ error: `Invalid purpose '${body.purpose}': must be 'journal' or 'copier'`, code: 'bad_request' }, 400);
    }

    const env = environment as 'live' | 'demo';
    const brokerName: 'tradovate' | 'ninja_trader' =
      body.broker === 'ninja_trader' ? 'ninja_trader' : 'tradovate';

    // Copier purpose: customer-supplied API Key (cid + sec) must accompany the login.
    // Journal purpose: cid+sec come from env (vendor OAuth app).
    // See .claude/architecture/tradovate-copier-api-key-architecture.md for rationale.
    let userApiKey: { cid: number; sec: string } | undefined;
    if (purpose === 'copier') {
      const rawCid = body.cid ?? body.apiKeyCid;
      const rawSec = body.sec ?? body.apiKeySec;
      const cidNum = typeof rawCid === 'string' ? parseInt(rawCid, 10) : rawCid;
      if (!cidNum || !Number.isFinite(cidNum) || !rawSec || typeof rawSec !== 'string') {
        return json({
          error:
            "Copier connections require your Tradovate API Key (cid + sec). " +
            "Generate one at Web Trader → Application Settings → API Access, then paste the values here.",
          code: 'copier_api_key_required',
        }, 400);
      }
      userApiKey = { cid: cidNum, sec: rawSec };
    }

    const debugCid = purpose === 'copier' ? userApiKey!.cid : JOURNAL_CID;
    const debugSecLen = purpose === 'copier' ? userApiKey!.sec.length : JOURNAL_SEC.length;
    // DEBUG — remove after testing
    console.log('[tradovate-auth] login attempt:', {
      username,
      passwordLength: password?.length,
      env,
      purpose,
      cid: debugCid,
      secLength: debugSecLen,
      source: purpose === 'copier' ? 'customer-api-key' : 'vendor-env',
    });

    // 1. Authenticate with Tradovate (full login)
    //    - copier → customer's own API Key cid+sec (from body)
    //    - journal → vendor OAuth env cid+sec
    const { accessToken, accounts } = await tradovateLogin(env, username, password, purpose, userApiKey);

    // 2. Persist credentials in Vault (encrypted)
    // First-connect path: broker_connections row doesn't exist yet → pass null for
    // p_connection_id (the upsert below sets vault_secret_id atomically with the rest).
    // For copier connections we also store cid+sec so the refresh path can renew
    // without re-prompting the customer.
    console.log('[tradovate-auth] storing in vault...');
    const vaultId = await storeInVault(userId, env, username, password, accessToken, null, userApiKey);
    console.log('[tradovate-auth] vault stored:', vaultId);

    // 3. Primary account = first active, else first in list
    const primaryAccount = accounts.find(a => a.active) ?? accounts[0];
    console.log('[tradovate-auth] accounts:', accounts.length, 'primary:', primaryAccount?.id);
    if (!primaryAccount) {
      throw new Error('No accounts returned from Tradovate — check credentials and account status');
    }

    // 4. Upsert broker_connections row (metadata + jsonb only — tokens live in Vault)
    console.log('[tradovate-auth] login purpose:', purpose, 'broker:', brokerName, 'account:', primaryAccount.id);
    console.log('[tradovate-auth] upserting broker_connections row...');
    // Get existing connection ID + connection_data if reconnecting (to preserve PK + FK refs
    // AND to avoid wiping out other jsonb fields a future feature may have added).
    // Match the new UNIQUE constraint: (user_id, broker, account_id, purpose)
    const { data: existingConn } = await supabaseAdmin
      .from('broker_connections')
      .select('id, connection_data')
      .eq('user_id', userId)
      .eq('broker', brokerName)
      .eq('account_id', String(primaryAccount.id))
      .eq('purpose', purpose)   // NEW: scoped to same purpose only
      .maybeSingle();

    const credentialId = existingConn?.id ?? crypto.randomUUID();
    const existingCData = (existingConn?.connection_data ?? {}) as Record<string, unknown>;

    const { error: upsertError } = await supabaseAdmin.from('broker_connections').upsert({
      id:               credentialId,
      user_id:          userId,
      broker:           brokerName,
      status:           'connected',
      is_active:        true,
      purpose:          purpose,
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
    }, { onConflict: 'user_id,broker,account_id,purpose' });

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
    const msg = String(err);
    // Categorize the failure so the frontend can render a meaningful toast
    // (and ops can grep). The raw message stays in `error`; the `code` is
    // a stable handle for branching.
    let code = 'internal_error';
    let status = 500;
    if (/app is not registered/i.test(msg)) {
      // Tradovate refuses the CID on this environment. Almost always means
      // the user picked the wrong env in the UI: prop-firm accounts (Apex
      // Eval/Trial/PA, Topstep, etc.) live on the LIVE Tradovate API even
      // when they're "simulated money" — Apex pays for live-API access and
      // provisions accounts there. Tradovate Demo is a separate environment
      // and our CID isn't registered for it. Hint surfaces in the toast.
      code = 'app_env_mismatch';
      status = 401;
    } else if (/Tradovate auth error/i.test(msg)) {
      // Tradovate returned HTTP 200 with errorText — bad credentials, locked
      // account, MFA required, account inactive, etc.
      code = 'invalid_credentials';
      status = 401;
    } else if (/No accounts returned/i.test(msg)) {
      // Login succeeded but /account/list came back empty — account exists
      // but has no trading accounts attached yet (rare).
      code = 'no_accounts';
      status = 422;
    } else if (/Tradovate auth failed \(\d+\)/i.test(msg)) {
      // Non-2xx from the Tradovate API itself (5xx, 429, network).
      code = 'tradovate_api_error';
      status = 502;
    } else if (/Missing required fields/i.test(msg)) {
      code = 'bad_request';
      status = 400;
    } else if (/copier-purpose login requires customer-supplied API Key/i.test(msg)) {
      code = 'copier_api_key_required';
      status = 400;
    } else if (/broker_connections upsert failed/i.test(msg)) {
      code = 'db_error';
      status = 500;
    }
    // Debug payload — journal env values only; copier values are per-customer
    // (echoed back inside the [DEBUG cid=...] suffix on the error string itself).
    return json({
      error: msg,
      code,
      debug: {
        journal_cid: JOURNAL_CID,
        journal_secLength: JOURNAL_SEC?.length ?? 0,
      },
    }, status);
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