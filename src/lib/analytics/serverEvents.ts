/**
 * analytics/serverEvents.ts — Server-side event mirror (AI Strategy Phase 1, Slice 1.1).
 *
 * Fires the same behavioral events the app already sends to GA4/PostHog to our own
 * backend (`POST /api/track`), so server-side AI agents can query user behavior.
 *
 * Privacy contract (identical to GA4/PostHog): nothing is sent unless
 * `hasConsent('analytics') === true`. Fully fire-and-forget — never throws, never
 * blocks the UI, never surfaces a failure to the user.
 *
 * Identity: a persistent `anon_id` (localStorage) gives anonymous continuity; a
 * rolling `session_id` (sessionStorage, 30-min idle reset) groups a visit. When the
 * user is logged in, the Supabase access token is attached so the server stamps user_id.
 */
import { hasConsent } from '@/lib/consent';
import { getApiBase } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const ANON_KEY = 'fino_anon_id';
const SID_KEY = 'fino_session_id';
const SID_TS_KEY = 'fino_session_ts';
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 minutes

function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeGet(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage: Storage | undefined, key: string, val: string): void {
  try {
    storage?.setItem(key, val);
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

function getAnonId(): string {
  const ls = typeof window !== 'undefined' ? window.localStorage : undefined;
  let id = safeGet(ls, ANON_KEY);
  if (!id) {
    id = uuid();
    safeSet(ls, ANON_KEY, id);
  }
  return id;
}

/** Rolling session id: same id within 30 min of activity, new id after idle gap. */
function getSessionId(): string {
  const ss = typeof window !== 'undefined' ? window.sessionStorage : undefined;
  const now = Date.now();
  const lastTs = Number(safeGet(ss, SID_TS_KEY) || 0);
  let id = safeGet(ss, SID_KEY);
  if (!id || now - lastTs > SESSION_IDLE_MS) {
    id = uuid();
    safeSet(ss, SID_KEY, id);
  }
  safeSet(ss, SID_TS_KEY, String(now));
  return id;
}

/**
 * Mirror one event to the backend. Fire-and-forget.
 * @param eventName canonical event name (free-form string; not limited to the GA4 enum)
 * @param props arbitrary structured properties
 * @param pagePath path without query string (defaults to current location)
 */
export function sendServerEvent(
  eventName: string,
  props?: Record<string, unknown>,
  pagePath?: string,
): void {
  if (typeof window === 'undefined') return;
  if (!hasConsent('analytics')) return;

  const path = pagePath ?? window.location.pathname;

  // Resolve token async, then POST. Failures are swallowed.
  void (async () => {
    let token: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token ?? null;
    } catch {
      /* anonymous — no token */
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      await fetch(`${getApiBase()}/track`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_name: eventName,
          props: props ?? {},
          page_path: path,
          session_id: getSessionId(),
          anon_id: getAnonId(),
          source: 'web',
        }),
        keepalive: true, // survive page unloads (e.g. cta_clicked → navigation)
      });
    } catch {
      /* tracking must never surface as an error */
    }
  })();
}
