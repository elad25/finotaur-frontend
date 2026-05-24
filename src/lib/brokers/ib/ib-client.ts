// src/lib/brokers/ib/ib-client.ts
// Thin client for the IB OAuth server endpoints mounted at /api/brokers/ib.
// Pure functions — no React. Callers do not pass JWT; it is obtained internally.
// All fetches use relative paths so the Vite dev-server proxy forwards /api → server.

import { supabase } from '@/lib/supabase';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the Supabase session access token.
 * Throws if no session is active (user not logged in).
 */
async function getJwt(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('Not authenticated');
  }
  return token;
}

/**
 * Fetches a JSON endpoint with the IB Bearer token attached.
 * Throws with a descriptive message for non-2xx responses.
 */
async function ibApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getJwt();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let message = `IB API error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // response body not JSON — use status text
      message = res.statusText || message;
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts the IB OAuth flow.
 *
 * 1. Obtains the JWT internally.
 * 2. Calls GET /api/brokers/ib/authorize with Accept: application/json so the
 *    server returns { authUrl, expiresAt } instead of a 302 redirect.
 * 3. Redirects window.location.href to the IB consent page.
 *
 * Guard: typeof window !== 'undefined' keeps this SSR-safe (Vite SSR not
 * currently used, but defensive per project rules).
 */
export async function startIBOAuth(returnTo?: string): Promise<void> {
  const token = await getJwt();
  const destination = returnTo ?? '/app/ai/copilot';
  const url = `/api/brokers/ib/authorize?returnTo=${encodeURIComponent(destination)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    let message = `IB authorize error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      message = res.statusText || message;
    }
    throw new Error(message);
  }

  const { authUrl } = (await res.json()) as { authUrl: string; expiresAt: string };

  if (typeof window !== 'undefined') {
    window.location.href = authUrl;
  }
}

/**
 * Triggers a manual trade sync.
 * Returns the parsed sync result body or an error envelope.
 */
export async function syncIBNow(): Promise<{
  ok: boolean;
  tradesInserted?: number;
  error?: string;
}> {
  try {
    const body = await ibApi<{ ok?: boolean; tradesInserted?: number }>('/api/brokers/ib/sync', {
      method: 'POST',
    });
    return { ok: true, tradesInserted: body.tradesInserted ?? 0 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return { ok: false, error: message };
  }
}

/**
 * Proactively refreshes the stored IB access token (or confirms it is valid).
 * Returns the updated expiry or an error envelope.
 */
export async function refreshIBToken(): Promise<{
  ok: boolean;
  expires_at?: string;
  error?: string;
}> {
  try {
    const body = await ibApi<{ ok: boolean; expires_at?: string }>('/api/brokers/ib/refresh', {
      method: 'POST',
    });
    return body;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    return { ok: false, error: message };
  }
}

/**
 * Soft-disconnects the IB integration (server marks the row inactive).
 */
export async function disconnectIB(): Promise<{ ok: boolean; error?: string }> {
  try {
    const body = await ibApi<{ ok: boolean }>('/api/brokers/ib/connection', {
      method: 'DELETE',
    });
    return body;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Disconnect failed';
    return { ok: false, error: message };
  }
}
