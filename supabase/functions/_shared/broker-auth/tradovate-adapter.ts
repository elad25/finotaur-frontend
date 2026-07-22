// supabase/functions/_shared/broker-auth/tradovate-adapter.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Tradovate implementation of BrokerAuthAdapter.
//
// Endpoints (from Tradovate docs):
//   Authorize:   https://trader.tradovate.com/oauth
//   Token exchange (live): https://live.tradovateapi.com/auth/oauthtoken
//   Token exchange (demo): https://demo.tradovateapi.com/auth/oauthtoken
//   Token renew (live):    https://live.tradovateapi.com/v1/auth/renewaccesstoken
//   Token renew (demo):    https://demo.tradovateapi.com/v1/auth/renewaccesstoken
//   User info (live):      https://live.tradovateapi.com/auth/me
//   User info (demo):      https://demo.tradovateapi.com/auth/me
//
// Tradovate-specific quirks:
//   - Token exchange uses application/x-www-form-urlencoded (not JSON)
//   - access_token TTL: 90 min (expires_in: 5400)
//   - No refresh_token in response — renewal uses GET with current Bearer token
//   - Prop firm detection: account name contains known firm keywords
//   - Single authorize portal (trader.tradovate.com) serves both LIVE and DEMO.
//     The user's credentials determine the env. If the wrong env is tried first,
//     Tradovate returns 200 with body { errorText: "This endpoint should be called
//     on <other-env>.tradovateapi.com" }. We auto-detect and retry transparently.
//
// Config object pattern mirrors fetchWithRetry opts (no direct Deno.env reads
// inside the adapter; caller must inject via buildTradovateConfigFromEnv).
// ═══════════════════════════════════════════════════════════════

import type {
  BrokerAuthAdapter,
  BrokerEnvironment,
  OAuthAuthorizeParams,
  OAuthTokenResponse,
  OAuthRefreshParams,
  OAuthUserInfo,
} from './interface.ts';

async function fetchWithTimeout(input: string | URL | Request, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  return await fetch(input, { ...init, signal: (init as any).signal ?? AbortSignal.timeout(timeoutMs) });
}

// These are PUBLIC Tradovate API URLs (documented). No secrets here.
const TRADOVATE_API_URLS = {
  live: {
    token:       'https://live.tradovateapi.com/auth/oauthtoken',
    renew:       'https://live.tradovateapi.com/v1/auth/renewaccesstoken',
    userInfo:    'https://live.tradovateapi.com/auth/me',
    accountList: 'https://live.tradovateapi.com/v1/account/list',
  },
  demo: {
    token:       'https://demo.tradovateapi.com/auth/oauthtoken',
    renew:       'https://demo.tradovateapi.com/v1/auth/renewaccesstoken',
    userInfo:    'https://demo.tradovateapi.com/auth/me',
    accountList: 'https://demo.tradovateapi.com/v1/account/list',
  },
} as const;

type TradovateEnv = 'live' | 'demo';

interface TradovateConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  defaultScope: string;
  /** Initial env guess. Overridden automatically if Tradovate signals a mismatch. */
  defaultEnv: TradovateEnv;
}

const PROP_FIRM_KEYWORDS = [
  'APEX',
  'TOPSTEP',
  'MFFU',
  'EARN2TRADE',
  'BULENOX',
  'TRADEDAY',
  'TAKEPROFIT',
] as const;

function detectPropFirm(accountName: string): boolean {
  const upper = accountName.toUpperCase();
  return PROP_FIRM_KEYWORDS.some((kw) => upper.includes(kw));
}

// Shape of a raw Tradovate /account/list entry.
interface TradovateRawAccount {
  id: string | number;
  name?: string;
  accountName?: string;
  active?: boolean;
}

/**
 * Thrown when /v1/account/list fails after all retry attempts.
 * Callers (e.g. oauth-callback) should catch this and redirect with an
 * explicit error param rather than leaving account_id=null in the DB.
 */
export class TradovateAccountListError extends Error {
  readonly status: number;
  readonly body: string;
  readonly userId: string;
  readonly url: string;
  constructor(args: { status: number; body: string; userId: string; url: string }) {
    super(`Tradovate /account/list failed for userId=${args.userId}: HTTP ${args.status}`);
    this.name = 'TradovateAccountListError';
    this.status = args.status;
    this.body = args.body.slice(0, 500); // truncate to avoid blowing up logs
    this.userId = args.userId;
    this.url = args.url;
  }
}

/**
 * Extract Tradovate userId from access_token JWT.
 * The `sub` claim is always populated immediately upon token issuance,
 * unlike /auth/me which has a propagation delay on freshly-issued tokens.
 * Returns null if the token isn't a parseable JWT or `sub` is missing.
 */
function extractUserIdFromJwt(accessToken: string): string | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64 → decoded JSON
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadB64 + '='.repeat((4 - payloadB64.length % 4) % 4);
    const jsonStr = atob(padded);
    const payload = JSON.parse(jsonStr) as Record<string, unknown>;
    const sub = payload.sub;
    if (sub === undefined || sub === null || sub === '') return null;
    return String(sub);
  } catch {
    return null;
  }
}

/**
 * Parse Tradovate API response body for env-mismatch hints.
 * Tradovate returns 200 with body { errorText: "This endpoint should be called on <env>.tradovateapi.com" }
 * when called on the wrong host. Returns the env hinted by errorText, or null.
 */
function detectEnvFromResponseBody(body: unknown): TradovateEnv | null {
  if (typeof body !== 'object' || body === null) return null;
  const errorText = (body as Record<string, unknown>).errorText;
  if (typeof errorText !== 'string') return null;
  if (errorText.includes('live.tradovateapi.com')) return 'live';
  if (errorText.includes('demo.tradovateapi.com')) return 'demo';
  return null;
}

function oppositeEnv(env: TradovateEnv): TradovateEnv {
  return env === 'live' ? 'demo' : 'live';
}

export function createTradovateAdapter(config: TradovateConfig): BrokerAuthAdapter {
  return {
    broker: 'tradovate',

    buildAuthorizeUrl({ state, redirectUri, environment: _environment }: OAuthAuthorizeParams): string {
      // Tradovate uses one OAuth app for both live and demo (per user research).
      // Environment is informational only at this stage; the user's account determines the env.
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: redirectUri,
        state,
        scope: config.defaultScope,
      });
      return `${config.authorizeUrl}?${params.toString()}`;
    },

    async exchangeCodeForToken(
      code: string,
      redirectUri: string,
      _environment: BrokerEnvironment,
    ): Promise<OAuthTokenResponse> {
      // Tradovate requires x-www-form-urlencoded, not JSON.
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
      });

      // Try defaultEnv first. If Tradovate returns an env-mismatch errorText (200 with
      // errorText body), or a 4xx, retry on the other env. Sequential only — the
      // authorization code is single-use; parallel would burn it on the first attempt.
      const firstEnv = config.defaultEnv;
      const secondEnv = oppositeEnv(firstEnv);

      let firstErrorMsg = '';

      // --- Attempt 1: defaultEnv ---
      let resp1: Response;
      try {
        resp1 = await fetchWithTimeout(TRADOVATE_API_URLS[firstEnv].token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
      } catch (networkErr) {
        firstErrorMsg = `network error on ${firstEnv}: ${String(networkErr)}`;
        resp1 = null as unknown as Response;
      }

      let detectedEnv: TradovateEnv | null = null;

      if (resp1 !== null && resp1.ok) {
        const data = (await resp1.json()) as Record<string, unknown>;
        const envMismatch = detectEnvFromResponseBody(data);
        if (envMismatch === null || envMismatch === firstEnv) {
          // Success on firstEnv (or no mismatch signal)
          const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 5400;
          const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
          return {
            accessToken: data.access_token as string,
            refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : null,
            expiresAt,
            scope: typeof data.scope === 'string' ? data.scope : null,
            tokenType: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
            providerUserId: null, // Populated separately via getUserInfo
            raw: data,
            detectedEnvironment: firstEnv,
          };
        }
        // envMismatch points to secondEnv — fall through to retry
        detectedEnv = envMismatch;
        firstErrorMsg = `env mismatch on ${firstEnv}: errorText pointed to ${envMismatch}`;
        console.log('[tradovate-adapter] env auto-corrected', { hint: firstEnv, detected: envMismatch });
      } else if (resp1 !== null) {
        const text = await resp1.text();
        firstErrorMsg = `HTTP ${resp1.status} on ${firstEnv}: ${text.slice(0, 300)}`;
      }

      // --- Attempt 2: secondEnv ---
      let resp2: Response;
      try {
        resp2 = await fetchWithTimeout(TRADOVATE_API_URLS[secondEnv].token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
      } catch (networkErr) {
        throw new Error(
          `Tradovate token exchange failed on both envs.\n` +
          `  ${firstEnv}: ${firstErrorMsg}\n` +
          `  ${secondEnv}: network error: ${String(networkErr)}`,
        );
      }

      if (!resp2.ok) {
        const text2 = await resp2.text();
        throw new Error(
          `Tradovate token exchange failed on both envs.\n` +
          `  ${firstEnv}: ${firstErrorMsg}\n` +
          `  ${secondEnv}: HTTP ${resp2.status}: ${text2.slice(0, 300)}`,
        );
      }

      const data2 = (await resp2.json()) as Record<string, unknown>;
      const envMismatch2 = detectEnvFromResponseBody(data2);
      if (envMismatch2 !== null && envMismatch2 !== secondEnv) {
        throw new Error(
          `Tradovate token exchange failed on both envs (mismatch loop).\n` +
          `  ${firstEnv}: ${firstErrorMsg}\n` +
          `  ${secondEnv}: errorText pointed back to ${envMismatch2}`,
        );
      }

      const resolvedEnv: TradovateEnv = detectedEnv ?? secondEnv;
      const expiresInSec2 = typeof data2.expires_in === 'number' ? data2.expires_in : 5400;
      const expiresAt2 = new Date(Date.now() + expiresInSec2 * 1000).toISOString();

      return {
        accessToken: data2.access_token as string,
        refreshToken: typeof data2.refresh_token === 'string' ? data2.refresh_token : null,
        expiresAt: expiresAt2,
        scope: typeof data2.scope === 'string' ? data2.scope : null,
        tokenType: typeof data2.token_type === 'string' ? data2.token_type : 'Bearer',
        providerUserId: null,
        raw: data2,
        detectedEnvironment: resolvedEnv,
      };
    },

    async refreshAccessToken({
      currentAccessToken,
      refreshToken: _refreshToken,
      environment: _environment,
    }: OAuthRefreshParams): Promise<OAuthTokenResponse> {
      // Tradovate renewal: GET with current Bearer token — no refresh_token involved.
      // Try defaultEnv first; swap on env-mismatch errorText or HTTP error.
      const firstEnv = config.defaultEnv;
      const secondEnv = oppositeEnv(firstEnv);

      let firstErrorMsg = '';

      const authHeaders = {
        Authorization: `Bearer ${currentAccessToken}`,
        Accept: 'application/json',
      };

      // --- Attempt 1: defaultEnv ---
      let resp1: Response;
      try {
        resp1 = await fetchWithTimeout(TRADOVATE_API_URLS[firstEnv].renew, {
          method: 'GET',
          headers: authHeaders,
        });
      } catch (networkErr) {
        firstErrorMsg = `network error on ${firstEnv}: ${String(networkErr)}`;
        resp1 = null as unknown as Response;
      }

      if (resp1 !== null && resp1.ok) {
        const data = (await resp1.json()) as Record<string, unknown>;
        const envMismatch = detectEnvFromResponseBody(data);
        if (envMismatch === null || envMismatch === firstEnv) {
          const rawToken = data.accessToken ?? data.access_token;
          const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 5400;
          const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
          return {
            accessToken: rawToken as string,
            refreshToken: null,
            expiresAt,
            scope: typeof data.scope === 'string' ? data.scope : null,
            tokenType: 'Bearer',
            providerUserId: null,
            raw: data,
            detectedEnvironment: firstEnv,
          };
        }
        firstErrorMsg = `env mismatch on ${firstEnv}: errorText pointed to ${envMismatch}`;
        console.log('[tradovate-adapter] env auto-corrected (refresh)', { hint: firstEnv, detected: envMismatch });
      } else if (resp1 !== null) {
        const text = await resp1.text();
        firstErrorMsg = `HTTP ${resp1.status} on ${firstEnv}: ${text.slice(0, 300)}`;
      }

      // --- Attempt 2: secondEnv ---
      let resp2: Response;
      try {
        resp2 = await fetchWithTimeout(TRADOVATE_API_URLS[secondEnv].renew, {
          method: 'GET',
          headers: authHeaders,
        });
      } catch (networkErr) {
        throw new Error(
          `Tradovate token renewal failed on both envs.\n` +
          `  ${firstEnv}: ${firstErrorMsg}\n` +
          `  ${secondEnv}: network error: ${String(networkErr)}`,
        );
      }

      if (!resp2.ok) {
        const text2 = await resp2.text();
        throw new Error(
          `Tradovate token renewal failed on both envs.\n` +
          `  ${firstEnv}: ${firstErrorMsg}\n` +
          `  ${secondEnv}: HTTP ${resp2.status}: ${text2.slice(0, 300)}`,
        );
      }

      const data2 = (await resp2.json()) as Record<string, unknown>;
      const rawToken2 = data2.accessToken ?? data2.access_token;
      const expiresInSec2 = typeof data2.expires_in === 'number' ? data2.expires_in : 5400;
      const expiresAt2 = new Date(Date.now() + expiresInSec2 * 1000).toISOString();

      return {
        accessToken: rawToken2 as string,
        refreshToken: null,
        expiresAt: expiresAt2,
        scope: typeof data2.scope === 'string' ? data2.scope : null,
        tokenType: 'Bearer',
        providerUserId: null,
        raw: data2,
        detectedEnvironment: secondEnv,
      };
    },

    async getUserInfo(
      accessToken: string,
      _environment: BrokerEnvironment,
    ): Promise<OAuthUserInfo> {
      const authHeaders = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      };

      // STEP 0: Extract userId from JWT sub claim before any network call.
      // Tradovate's JWT `sub` is always populated immediately on token issuance.
      // /auth/me has a propagation delay on freshly-issued tokens that can
      // cause userId to be absent from the response for ~5 minutes.
      const jwtUserId = extractUserIdFromJwt(accessToken);

      // STEP 1: Fetch /auth/me for email/displayName (identity fields).
      // Try defaultEnv first; auto-detect and swap on env-mismatch errorText.
      // We no longer require userId from this response — JWT sub is the primary
      // source. We still call it because email and displayName are not in the JWT.
      const firstEnv = config.defaultEnv;
      const secondEnv = oppositeEnv(firstEnv);

      let detectedEnv: TradovateEnv = firstEnv;
      let data: Record<string, unknown> = {};
      let meStatus: number = 0;
      let meKeys: string[] = [];
      let meSample: Record<string, unknown> | string = {};

      // --- /auth/me attempt 1: firstEnv ---
      const meResp1 = await fetchWithTimeout(TRADOVATE_API_URLS[firstEnv].userInfo, {
        method: 'GET',
        headers: authHeaders,
      });

      meStatus = meResp1.status;

      if (meResp1.ok) {
        const meText = await meResp1.text();
        try {
          const parsed = JSON.parse(meText) as Record<string, unknown>;
          const envMismatch = detectEnvFromResponseBody(parsed);
          if (envMismatch !== null && envMismatch !== firstEnv) {
            // Tradovate says use the other env — retry /auth/me on secondEnv
            console.log('[tradovate-adapter] env auto-corrected', { hint: firstEnv, detected: envMismatch });
            detectedEnv = envMismatch;

            const meResp2 = await fetchWithTimeout(TRADOVATE_API_URLS[secondEnv].userInfo, {
              method: 'GET',
              headers: authHeaders,
            });
            meStatus = meResp2.status;
            if (meResp2.ok) {
              const meText2 = await meResp2.text();
              try {
                data = JSON.parse(meText2) as Record<string, unknown>;
                meKeys = Object.keys(data);
                const sampleEntries = meKeys.slice(0, 5);
                const sampleObj: Record<string, unknown> = {};
                for (const k of sampleEntries) sampleObj[k] = data[k];
                meSample = sampleObj;
              } catch {
                meSample = meText2.slice(0, 300);
              }
            } else {
              const errText = await meResp2.text();
              meSample = errText.slice(0, 300);
              console.warn(`[tradovate-adapter] /auth/me (${secondEnv}) returned ${meStatus} — continuing with JWT userId`);
            }
          } else {
            // No mismatch — use firstEnv result
            data = parsed;
            meKeys = Object.keys(data);
            const sampleEntries = meKeys.slice(0, 5);
            const sampleObj: Record<string, unknown> = {};
            for (const k of sampleEntries) sampleObj[k] = data[k];
            meSample = sampleObj;
          }
        } catch {
          meSample = meText.slice(0, 300);
        }
      } else {
        // Non-200 from /auth/me — we still continue because jwtUserId may suffice.
        const errText = await meResp1.text();
        meSample = errText.slice(0, 300);
        console.warn(`[tradovate-adapter] /auth/me returned ${meStatus} — continuing with JWT userId`);
      }

      // Merge userId: JWT sub is preferred; /auth/me fields are fallback.
      const userId = jwtUserId ?? data.userId ?? data.id ?? null;
      const mergedUserId = userId !== null ? String(userId) : null;

      // STEP 2: Fetch /account/list?userId={providerUserId}.
      // Use detectedEnv from /auth/me — no need to re-detect on this call.
      // CRITICAL: empirically verified 2026-05-24 — OAuth Vendor tokens (CID 13543,
      // scope=trading_read) return [] from /v1/account/list WITHOUT the userId query
      // param, but DO return prop firm (APEX/TOPSTEP/MFFU/etc) accounts WITH it.
      // The userId filter exposes accounts that the user has trading permission for
      // (sponsored by the prop firm, owned by a different master user).
      // Without this param the journal never sees Apex accounts via OAuth — see
      // memory file: tradovate-ecosystem-oauth-pending.md.
      let rawAccounts: TradovateRawAccount[] = [];
      if (mergedUserId !== null && mergedUserId !== '') {
        const userIdStr = mergedUserId;
        const accountListBase = TRADOVATE_API_URLS[detectedEnv].accountList;
        const accountsUrl = `${accountListBase}?userId=${encodeURIComponent(userIdStr)}`;

        // Retry policy: 3 attempts, backoff 0ms / 500ms / 2000ms.
        // Retry only on HTTP 5xx, 429, and network errors. 4xx (except 429) are
        // real client errors — no point retrying.
        const RETRY_DELAYS_MS = [0, 500, 2000];
        let lastStatus = 0;
        let lastBody = '';
        let succeeded = false;

        for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
          }

          let accountsResp: Response;
          try {
            accountsResp = await fetchWithTimeout(accountsUrl, {
              method: 'GET',
              headers: authHeaders,
            });
          } catch (networkErr) {
            // Network-level error (DNS, TCP reset, etc.) — retry.
            lastStatus = 0;
            lastBody = String(networkErr);
            continue;
          }

          if (accountsResp.ok) {
            const accountsData = await accountsResp.json();
            if (Array.isArray(accountsData)) {
              rawAccounts = (accountsData as TradovateRawAccount[]).filter(
                (acc) => acc.active !== false,
              );
            }
            succeeded = true;
            break;
          }

          lastStatus = accountsResp.status;
          lastBody = await accountsResp.text();

          // Do not retry on 4xx (except 429) — these are real client errors.
          const isRetryable = lastStatus === 429 || lastStatus >= 500;
          if (!isRetryable) {
            break;
          }
        }

        if (!succeeded) {
          throw new TradovateAccountListError({
            status: lastStatus,
            body: lastBody,
            userId: userIdStr,
            url: accountsUrl,
          });
        }

        // SECOND-PASS UNION: if the ?userId=X call succeeded but returned [],
        // also try the plain /account/list (no query param) once with no retry.
        // Some Tradovate session configs expose accounts only without the userId
        // filter. Deduplicate by account id. On any non-200 — silently ignore.
        if (rawAccounts.length === 0) {
          try {
            const plainResp = await fetchWithTimeout(accountListBase, {
              method: 'GET',
              headers: authHeaders,
            });
            if (plainResp.ok) {
              const plainData = await plainResp.json();
              if (Array.isArray(plainData)) {
                const plainAccounts = (plainData as TradovateRawAccount[]).filter(
                  (acc) => acc.active !== false,
                );
                // Union: deduplicate by id (rawAccounts is [] here, so just assign).
                const seenIds = new Set(rawAccounts.map((a) => String(a.id)));
                for (const acc of plainAccounts) {
                  if (!seenIds.has(String(acc.id))) {
                    rawAccounts.push(acc);
                    seenIds.add(String(acc.id));
                  }
                }
              }
            }
            // Non-200 from second pass: silently ignore — opportunistic only.
          } catch {
            // Network error on second pass: silently ignore.
          }
        }
      } else {
        console.warn('[tradovate-adapter] no userId from JWT or /auth/me — skipping /account/list lookup');
      }

      return {
        providerUserId: mergedUserId ?? '',
        email: typeof data.email === 'string' ? data.email : null,
        displayName: typeof data.name === 'string'
          ? data.name
          : typeof data.fullName === 'string'
          ? data.fullName
          : null,
        accounts: rawAccounts.map((acc) => {
          const name = acc.name ?? acc.accountName ?? '';
          return {
            id: String(acc.id),
            name,
            isPropFirm: detectPropFirm(name),
          };
        }),
        detectedEnvironment: detectedEnv,
        _debugMe: {
          status: meStatus,
          keys: meKeys,
          sample: meSample,
          jwtUserId,
          mergedUserId,
          detectedEnv,
        },
      };
    },
  };
}

/**
 * Build a TradovateConfig from Deno environment variables.
 * Throws immediately if required secrets are absent — prevents silent misconfig.
 */
export function buildTradovateConfigFromEnv(): TradovateConfig {
  const clientId = Deno.env.get('oauth_cid_Journal');
  const clientSecret = Deno.env.get('secret_oauth_journal');

  if (!clientId || !clientSecret) {
    throw new Error(
      'Tradovate OAuth misconfigured: oauth_cid_Journal and secret_oauth_journal must be set in environment',
    );
  }

  const rawDefaultEnv = Deno.env.get('oauth_tradovate_env');
  const defaultEnv: TradovateEnv =
    rawDefaultEnv === 'demo' ? 'demo' : 'live';

  return {
    clientId,
    clientSecret,
    authorizeUrl:
      Deno.env.get('oauth_tradovate_authorize_url') ??
      'https://trader.tradovate.com/oauth',
    defaultScope:
      Deno.env.get('oauth_tradovate_default_scope') ?? 'trading_read',
    defaultEnv,
  };
}
