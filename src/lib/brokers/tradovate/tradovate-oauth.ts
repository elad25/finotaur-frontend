// src/lib/brokers/tradovate/tradovate-oauth.ts
// Tradovate OAuth 2.0 — frontend entry point.
//
// Unlike IB (ib-oauth.ts), the authorize URL is built server-side by the
// `oauth-start` edge function. The frontend only POSTs the broker/environment
// (with the user's JWT), receives a signed authorize_url, and navigates to it.
// HMAC state generation and client_secret stay server-side (Supabase secrets).

import { supabase } from '@/lib/supabase';

export type TradovateEnvironment = 'live' | 'demo' | 'sandbox';

interface OAuthStartResponse {
  authorize_url: string;
  state: string;
}

/**
 * Calls the oauth-start edge function with the current user's JWT and returns
 * the Tradovate authorize URL the browser should navigate to.
 *
 * Throws if the user is not authenticated or the edge function returns an error.
 */
export async function getTradovateAuthorizationUrl(
  environment: TradovateEnvironment = 'sandbox',
  connectionId?: string | null,
): Promise<string> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    throw new Error(`Auth session error: ${sessionErr.message}`);
  }
  const session = sessionData.session;
  if (!session) {
    throw new Error('Not authenticated — please sign in before connecting a broker.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not configured in this build.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/oauth-start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ broker: 'tradovate', environment, ...(connectionId ? { connection_id: connectionId } : {}) }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      // Body wasn't JSON — keep statusText
    }
    throw new Error(`oauth-start failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as OAuthStartResponse;
  if (!payload.authorize_url) {
    throw new Error('oauth-start returned no authorize_url');
  }
  return payload.authorize_url;
}
