// supabase/functions/_shared/fetchWithRetry.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Tradovate-aware retry wrapper around fetch().
//
// Tradovate API rate-limit semantics (per official forum + FAQ):
//   On 429, the response carries:
//     p-time:    seconds the client should wait before the next attempt
//     p-ticket:  opaque token the client MUST include in the retry request
//                (without it, the next request is rejected as 429 again)
//   Both headers are sometimes absent — fall back to a fixed-delay schedule.
//
// 401 → caller handles token expiry (do NOT retry; signal to refresher).
// Other 4xx → client error, no retry.
// 5xx → retry with fixed-delay backoff.
//
// Edge-function context: each retry blocks the function instance, so we
// cap waits at MAX_RATE_LIMIT_WAIT_MS. Beyond that, bubble the 429 up
// to the scheduler (silent retry queue with exponential backoff handles
// the longer wait at the broker_connection layer).
//
// Observability: every 429 logs {url, attempt, p-time, p-ticket presence}.
// Phase 1A: this is the canonical Tradovate fetch wrapper for both
// tradovate-sync and tradovate-auth edge functions.
// ═══════════════════════════════════════════════════════════════

export const MAX_RATE_LIMIT_WAIT_MS = 60_000;
const FIXED_BACKOFF_DELAYS_MS = [1000, 2000, 4000];

/**
 * Minimal interface for the Supabase admin client we need — typed as `any`
 * so this shared util doesn't import the SDK types directly (keeps the file
 * portable across edge functions that may use different SDK versions).
 */
// deno-lint-ignore no-explicit-any
type SupabaseAdminLike = any;

export interface FetchWithRetryOpts {
  maxAttempts?: number;
  /** Logger label so 429 lines can be attributed to the calling function. */
  label?: string;
  /**
   * Observability wiring (Phase 1A.2). When `admin` is provided, every 429
   * (and optionally other non-2xx) is fire-and-forget INSERTed into
   * `public.tradovate_api_call_log`. Errors are swallowed — logging never
   * blocks the sync.
   */
  admin?: SupabaseAdminLike;
  userId?: string;
  connectionId?: string;
  /** When true, also log 5xx responses (default: false — 429 only). */
  logServerErrors?: boolean;
}

async function logApiCall(
  admin: SupabaseAdminLike | undefined,
  row: {
    endpoint: string;
    http_status: number;
    attempt: number;
    duration_ms: number;
    p_time_sec?: number | null;
    p_ticket_present?: boolean;
    user_id?: string | null;
    connection_id?: string | null;
    label?: string | null;
    error_msg?: string | null;
  },
): Promise<void> {
  if (!admin) return;
  try {
    await admin.from('tradovate_api_call_log').insert(row);
  } catch (err) {
    // Observability is best-effort. Log to console but never block the caller.
    console.error('[fetchWithRetry] tradovate_api_call_log insert failed:', String(err).slice(0, 200));
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: FetchWithRetryOpts,
): Promise<Response> {
  const max = opts?.maxAttempts ?? 3;
  const label = opts?.label ?? 'fetchWithRetry';
  const admin = opts?.admin;
  const userId = opts?.userId ?? null;
  const connectionId = opts?.connectionId ?? null;
  const logServerErrors = opts?.logServerErrors ?? false;
  let lastErr: unknown;
  let pTicket: string | null = null;

  for (let attempt = 1; attempt <= max; attempt++) {
    const attemptStart = Date.now();
    try {
      // Inject p-ticket from a previous 429 (if any) into THIS retry's headers.
      // Without p-ticket, Tradovate will reject the retry as 429 again.
      const requestInit: RequestInit = pTicket
        ? {
            ...init,
            headers: { ...(init.headers ?? {}), 'p-ticket': pTicket },
          }
        : init;

      const res = await fetch(url, requestInit);
      const duration = Date.now() - attemptStart;

      // 401 → caller handles token expiry. No retry.
      if (res.status === 401) return res;

      // 4xx other than 401/429 → client error. No retry.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return res;

      // 429 → Tradovate-compliant backoff.
      if (res.status === 429) {
        const pTimeRaw = res.headers.get('p-time');
        pTicket = res.headers.get('p-ticket');
        const pTimeSec = pTimeRaw ? parseFloat(pTimeRaw) : NaN;
        const pTimeValid = Number.isFinite(pTimeSec) && pTimeSec > 0;

        // Observability: every 429 attempt logged to DB (fire-and-forget).
        void logApiCall(admin, {
          endpoint: url,
          http_status: 429,
          attempt,
          duration_ms: duration,
          p_time_sec: pTimeValid ? pTimeSec : null,
          p_ticket_present: pTicket !== null,
          user_id: userId,
          connection_id: connectionId,
          label,
          error_msg: null,
        });

        if (attempt === max) {
          console.warn(`[${label}] 429_exhausted: url=${url} attempt=${attempt}/${max}`);
          return res;
        }

        let waitMs: number;
        let waitSource: string;
        if (pTimeValid) {
          waitMs = pTimeSec * 1000;
          waitSource = `p-time=${pTimeSec}s`;
        } else {
          waitMs = FIXED_BACKOFF_DELAYS_MS[attempt - 1] ?? 4000;
          waitSource = `fixed=${waitMs}ms (p-time header absent)`;
        }

        console.warn(
          `[${label}] 429_backoff: url=${url} attempt=${attempt}/${max} ` +
          `wait=${waitMs}ms (${waitSource}) p-ticket=${pTicket ? 'present' : 'absent'}`,
        );

        if (waitMs > MAX_RATE_LIMIT_WAIT_MS) {
          // Tradovate is asking for a long wait — bubble up so the caller's
          // scheduler (e.g. broker_connections.next_retry_at backoff queue)
          // takes over rather than blocking the edge function instance.
          console.warn(`[${label}] 429_overlong: wait ${waitMs}ms exceeds ${MAX_RATE_LIMIT_WAIT_MS}ms cap — bubbling up`);
          return res;
        }
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      // 5xx → fixed-delay backoff.
      if (res.status >= 500) {
        if (logServerErrors) {
          void logApiCall(admin, {
            endpoint: url,
            http_status: res.status,
            attempt,
            duration_ms: duration,
            p_time_sec: null,
            p_ticket_present: false,
            user_id: userId,
            connection_id: connectionId,
            label,
            error_msg: `5xx response`,
          });
        }
        if (attempt === max) return res;
        const delay = FIXED_BACKOFF_DELAYS_MS[attempt - 1] ?? 4000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // 2xx/3xx → success.
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === max) throw err;
      const delay = FIXED_BACKOFF_DELAYS_MS[attempt - 1] ?? 4000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr ?? new Error(`${label}: exhausted attempts`);
}
