// supabase/functions/_shared/broker-auth/interface.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: BrokerAuthAdapter — interface for OAuth 2.0 broker integrations.
//
// Implementations live in sibling files (e.g., tradovate-adapter.ts).
// Looked up via registry.ts by broker name.
//
// Brokers targeted:
//   tradovate        — live now
//   ninja_trader     — routes through Tradovate API (per user confirmation)
//   topstepx         — planned later
//   interactive_brokers — planned S4
// ═══════════════════════════════════════════════════════════════

export type BrokerName =
  | 'tradovate'
  | 'ninja_trader'
  | 'topstepx'
  | 'interactive_brokers';

export type BrokerEnvironment = 'live' | 'demo' | 'sandbox';

export interface OAuthAuthorizeParams {
  state: string;           // CSRF token from oauth-state
  redirectUri: string;     // Must match registered URI exactly
  environment: BrokerEnvironment;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;  // Some providers (Tradovate) don't return one
  expiresAt: string;            // ISO timestamp
  scope: string | null;
  tokenType: string;            // Usually "Bearer"
  providerUserId: string | null;
  raw: Record<string, unknown>; // Original response for debugging
}

export interface OAuthRefreshParams {
  currentAccessToken: string;
  refreshToken: string | null;
  environment: BrokerEnvironment;
}

export interface OAuthUserInfo {
  providerUserId: string;
  email: string | null;
  displayName: string | null;
  accounts: Array<{
    id: string;
    name: string;
    isPropFirm: boolean;
  }>;
}

export interface BrokerAuthAdapter {
  readonly broker: BrokerName;

  /**
   * Build the authorization URL the user is redirected to.
   * Must include client_id, redirect_uri, state, response_type, scope.
   */
  buildAuthorizeUrl(params: OAuthAuthorizeParams): string;

  /**
   * Exchange the authorization code for an access token.
   * Called from oauth-callback after user redirects back.
   */
  exchangeCodeForToken(
    code: string,
    redirectUri: string,
    environment: BrokerEnvironment,
  ): Promise<OAuthTokenResponse>;

  /**
   * Refresh an access token before it expires.
   * For providers without refresh_token (Tradovate), uses current access token.
   */
  refreshAccessToken(params: OAuthRefreshParams): Promise<OAuthTokenResponse>;

  /**
   * Fetch user info + accounts after successful auth.
   * Used to populate broker_connections.account_id, account_name, etc.
   */
  getUserInfo(accessToken: string, environment: BrokerEnvironment): Promise<OAuthUserInfo>;

  /**
   * Optional: revoke a token. Not all providers support this.
   * Returns true if revocation succeeded, false if not supported.
   */
  revokeToken?(accessToken: string, environment: BrokerEnvironment): Promise<boolean>;
}
