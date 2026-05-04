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
// Calls public.tradovate_vault_upsert(p_name TEXT, p_secret TEXT) → UUID
// That wrapper function calls vault.create_secret / UPDATE vault.secrets internally.
async function storeInVault(
  userId: string,
  environment: string,
  username: string,
  password: string,
  accessToken: string
): Promise<string> {
  const payload    = JSON.stringify({ username, password, accessToken });
  const secretName = `tradovate_${userId}_${environment}`;

  const { data, error } = await supabaseAdmin.rpc('tradovate_vault_upsert', {
    p_name:   secretName,
    p_secret: payload,
  });

  if (error || !data) {
    console.error('[tradovate-auth] vault upsert failed:', error?.message);
    // Fallback: reuse existing vault_secret_id to avoid losing the reference
    const { data: existing } = await supabaseAdmin
      .from('tradovate_credentials')
      .select('vault_secret_id')
      .eq('user_id', userId)
      .eq('environment', environment)
      .maybeSingle();
    return existing?.vault_secret_id ?? crypto.randomUUID();
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
      // Find credentials whose token expires within RENEW_AHEAD_MS
      const { data: connected } = await supabaseAdmin
        .from('tradovate_credentials')
        .select('id, user_id, environment, vault_secret_id, account_id')
        .in('status', ['connected', 'expired'])
        .lt('token_expires_at', new Date(Date.now() + RENEW_AHEAD_MS).toISOString());

      let refreshed = 0;

      for (const cred of connected ?? []) {
        try {
          // Read stored credentials from Vault
          const secret = await readFromVault(cred.vault_secret_id);
          if (!secret) {
            console.warn(`[tradovate-auth] no vault secret for cred ${cred.id}`);
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

          // Update vault with refreshed token
          const newVaultId = await storeInVault(
            cred.user_id, cred.environment, username, password, newToken
          );

          await supabaseAdmin.from('tradovate_credentials').update({
            vault_secret_id:    newVaultId,
            access_token_hash:  newToken.slice(0, 8),
            token_expires_at:   new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
            status:             'connected',
            sync_error_count:   0,
            sync_error_message: null,
          }).eq('id', cred.id);

          refreshed++;
        } catch (err) {
          console.error(`[tradovate-auth] refresh failed for cred ${cred.id}:`, err);
          await supabaseAdmin.from('tradovate_credentials').update({
            status:             'expired',
            sync_error_message: String(err).slice(0, 200),
          }).eq('id', cred.id);
        }
      }

      return json({ refreshed });
    }

    // ══════════════════════════════════════════════════════════
    // mode: reconnect — re-login for a specific credential using stored vault creds
    // ══════════════════════════════════════════════════════════
    if (mode === 'reconnect') {
      const { credentialId } = body;
      if (!credentialId) return json({ error: 'Missing credentialId' }, 400);

      const { data: cred } = await supabaseAdmin
        .from('tradovate_credentials')
        .select('id, user_id, environment, vault_secret_id, account_id, connection_label, account_name, account_spec')
        .eq('id', credentialId)
        .single();

      if (!cred) return json({ error: 'Credential not found' }, 404);

      const secret = await readFromVault(cred.vault_secret_id);
      if (!secret) return json({ error: 'No vault secret found for this credential' }, 400);

      const { username, password } = JSON.parse(secret);
      const env = cred.environment as 'live' | 'demo';

      // Full re-login with stored credentials
      const { accessToken, accounts } = await tradovateLogin(env, username, password);

      const newVaultId = await storeInVault(cred.user_id, env, username, password, accessToken);

      await supabaseAdmin.from('tradovate_credentials').update({
        vault_secret_id:    newVaultId,
        access_token_hash:  accessToken.slice(0, 8),
        token_expires_at:   new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
        status:             'connected',
        sync_error_count:   0,
        sync_error_message: null,
      }).eq('id', cred.id);

      // Kick off sync
      supabaseAdmin.functions.invoke('tradovate-sync', {
        body: { userId: cred.user_id, environment: env, mode: 'initial' },
      }).catch(() => {});

      return json({ success: true });
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
    console.log('[tradovate-auth] storing in vault...');
    const vaultId = await storeInVault(userId, env, username, password, accessToken);
    console.log('[tradovate-auth] vault stored:', vaultId);

    // 3. Primary account = first active, else first in list
    const primaryAccount = accounts.find(a => a.active) ?? accounts[0];
    console.log('[tradovate-auth] accounts:', accounts.length, 'primary:', primaryAccount?.id);
    if (!primaryAccount) {
      throw new Error('No accounts returned from Tradovate — check credentials and account status');
    }

    // 4. Upsert credential row (metadata only — never store tokens in plain columns)
    console.log('[tradovate-auth] upserting credential row...');
// Get existing credential ID if reconnecting (to preserve references)
    const { data: existingCred } = await supabaseAdmin
      .from('tradovate_credentials')
      .select('id')
      .eq('user_id', userId)
      .eq('environment', env)
      .eq('account_id', primaryAccount.id)
      .maybeSingle();

    const credentialId = existingCred?.id ?? crypto.randomUUID();

    const { error: upsertError } = await supabaseAdmin.from('tradovate_credentials').upsert({
      id:                 credentialId,
      user_id:            userId,
      connection_label:   body.connectionLabel ?? `${env} – ${primaryAccount.name}`,
      environment:        env,
      vault_secret_id:    vaultId,
      account_id:         primaryAccount.id,
      account_name:       primaryAccount.name,
      account_spec:       `${primaryAccount.name}${primaryAccount.id}`,
      status:             'connected',
      token_expires_at:   new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      access_token_hash:  accessToken.slice(0, 8),
      sync_error_count:   0,
      sync_error_message: null,
    }, { onConflict: 'user_id,environment,account_id' });

    console.log('[tradovate-auth] upsert result:', upsertError ? `ERROR: ${upsertError.message} code:${upsertError.code}` : 'OK');
    if (upsertError) throw new Error(`Credential upsert failed: ${upsertError.message}`);

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
// REQUIRED SQL — run once in Supabase SQL Editor before deploying
// (add to WHOP_DB or a dedicated migration file)
// ═══════════════════════════════════════════════════════════════
/*

-- Upsert a secret by name. Returns the secret UUID.
-- Uses vault.create_secret for new secrets, UPDATE for existing ones.
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
  -- Update if name already exists
  UPDATE vault.secrets
  SET secret = p_secret::bytea
  WHERE name = p_name
  RETURNING id INTO v_id;

  -- Insert if not found
  IF v_id IS NULL THEN
    SELECT vault.create_secret(p_secret, p_name) INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tradovate_vault_upsert(TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.tradovate_vault_upsert(TEXT, TEXT) FROM authenticated, anon;
COMMENT ON FUNCTION public.tradovate_vault_upsert IS
'Upserts a Tradovate credential into Supabase Vault. service_role only.';


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