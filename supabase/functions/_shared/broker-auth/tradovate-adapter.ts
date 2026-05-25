// supabase/functions/_shared/broker-auth/tradovate-adapter.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Tradovate implementation of BrokerAuthAdapter.
//
// Endpoints (from Tradovate docs):
//   Authorize:   https://trader.tradovate.com/oauth
//   Token exchange (live): https://live.tradovateapi.com/auth/oauthtoken
//   Token renew (live):    https://live.tradovateapi.com/v1/auth/renewaccesstoken
//   User info:             https://live.tradovateapi.com/auth/me
//
// Tradovate-specific quirks:
//   - Token exchange uses application/x-www-form-urlencoded (not JSON)
//   - access_token TTL: 90 min (expires_in: 5400)
//   - No refresh_token in response — renewal uses GET with current Bearer token
//   - Prop firm detection: account name contains known firm keywords
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

interface TradovateConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  renewUrl: string;
  userInfoUrl: string;
  accountListUrl: string;
  defaultScope: string;
}

const PROP_FIRM_KEYWORDS = [
  'APEX',
  'TOPSTEP',
  'MFFU',
  'EARN2TRADE',
  'BULENOX',
  'TRADEDAY',
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

      const resp = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Tradovate token exchange failed: ${resp.status} ${text}`);
      }

      const data = (await resp.json()) as Record<string, unknown>;
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
      };
    },

    async refreshAccessToken({
      currentAccessToken,
      refreshToken: _refreshToken,
      environment: _environment,
    }: OAuthRefreshParams): Promise<OAuthTokenResponse> {
      // Tradovate renewal: GET with current Bearer token — no refresh_token involved.
      const resp = await fetch(config.renewUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${currentAccessToken}`,
          Accept: 'application/json',
        },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Tradovate token renewal failed: ${resp.status} ${text}`);
      }

      const data = (await resp.json()) as Record<string, unknown>;
      const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 5400;
      const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

      // Tradovate renew endpoint returns accessToken (camelCase) or access_token.
      const rawToken = data.accessToken ?? data.access_token;

      return {
        accessToken: rawToken as string,
        refreshToken: null,
        expiresAt,
        scope: typeof data.scope === 'string' ? data.scope : null,
        tokenType: 'Bearer',
        providerUserId: null,
        raw: data,
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

      // STEP 1: Fetch /auth/me first to get the userId.
      // /auth/me provides identity (userId, fullName, email, organizationName).
      const meResp = await fetch(config.userInfoUrl, {
        method: 'GET',
        headers: authHeaders,
      });

      if (!meResp.ok) {
        const text = await meResp.text();
        throw new Error(`Tradovate user info failed: ${meResp.status} ${text}`);
      }

      const data = (await meResp.json()) as Record<string, unknown>;
      const userId = data.userId ?? data.id;

      // STEP 2: Fetch /account/list?userId={providerUserId}.
      // CRITICAL: empirically verified 2026-05-24 — OAuth Vendor tokens (CID 13543,
      // scope=trading_read) return [] from /v1/account/list WITHOUT the userId query
      // param, but DO return prop firm (APEX/TOPSTEP/MFFU/etc) accounts WITH it.
      // The userId filter exposes accounts that the user has trading permission for
      // (sponsored by the prop firm, owned by a different master user).
      // Without this param the journal never sees Apex accounts via OAuth — see
      // memory file: tradovate-ecosystem-oauth-pending.md.
      let rawAccounts: TradovateRawAccount[] = [];
      if (userId !== undefined && userId !== null && userId !== '') {
        const accountsUrl = `${config.accountListUrl}?userId=${encodeURIComponent(String(userId))}`;
        const accountsResp = await fetch(accountsUrl, {
          method: 'GET',
          headers: authHeaders,
        });

        if (accountsResp.ok) {
          const accountsData = await accountsResp.json();
          if (Array.isArray(accountsData)) {
            rawAccounts = (accountsData as TradovateRawAccount[]).filter(
              (acc) => acc.active !== false,
            );
          }
        } else {
          const errText = await accountsResp.text();
          console.warn(
            `[tradovate-adapter] /account/list?userId=${userId} failed: ${accountsResp.status} ${errText}`,
          );
        }
      } else {
        console.warn('[tradovate-adapter] /auth/me missing userId — skipping /account/list lookup');
      }

      return {
        providerUserId: typeof userId === 'string' ? userId : String(userId ?? ''),
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

  return {
    clientId,
    clientSecret,
    authorizeUrl:
      Deno.env.get('oauth_tradovate_authorize_url') ??
      'https://trader.tradovate.com/oauth',
    tokenUrl:
      Deno.env.get('oauth_tradovate_token_url') ??
      'https://live.tradovateapi.com/auth/oauthtoken',
    renewUrl:
      Deno.env.get('oauth_tradovate_renew_url') ??
      'https://live.tradovateapi.com/v1/auth/renewaccesstoken',
    userInfoUrl:
      Deno.env.get('oauth_tradovate_userinfo_url') ??
      'https://live.tradovateapi.com/auth/me',
    accountListUrl:
      Deno.env.get('oauth_tradovate_account_list_url') ??
      'https://live.tradovateapi.com/v1/account/list',
    defaultScope:
      Deno.env.get('oauth_tradovate_default_scope') ?? 'trading_read',
  };
}
