// supabase/functions/_shared/retryQueue.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Silent retry queue for broker_connections auth/API failures.
//
// Decouples Tradovate auth/API failures from is_active. Instead of flipping
// is_active=false on token errors, the system schedules retries using
// exponential backoff and transitions status through 'renewing' → 'degraded'.
//
// is_active is now EXCLUSIVELY owned by whop-webhook (subscription state).
// These functions NEVER touch is_active or disconnected_at.
//
// 2026-05-19 (α.5): two-axis status decision. Most Tradovate auth/sync
// failures are infrastructure noise (Vault read race, network blip, brief
// 5xx from Tradovate). The previous policy flipped to 'degraded' after
// 3 failures, which surfaced a "Reconnect now" banner to paying users
// during transient hiccups that auto-resolved within a couple cron ticks.
// New policy: classify by error string. Transient errors stay 'renewing'
// indefinitely until they recover OR we hit a safety cap. Only real
// credential-level errors (wrong password, refresh token denied) escalate
// to 'degraded' after DEGRADED_THRESHOLD attempts.
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Backoff schedule in seconds: attempt 0→60s, 1→5min, 2→15min, 3→1h, 4→6h, 5→24h
const BACKOFF_SECONDS = [60, 300, 900, 3600, 21600, 86400];

// 2026-05-19 (α.5): how many consecutive failures before we flip status to
// 'degraded' (= banner appears + user is asked to reconnect). Was 3. Real-
// world data showed that most "Cannot read from Vault" errors recover
// within a couple of cron ticks — raising the threshold to 10 lets the
// silent-retry mechanism work without bothering the user. At 5-min cron
// cadence, 10 attempts = ~50 min of silent retries before showing the
// banner. Tradovate refresh tokens last days, so this is well within
// the recovery window.
const DEGRADED_THRESHOLD = 10;

// 2026-05-19 (α.5): safety cap for TRANSIENT errors. If even after this
// many attempts the connection still fails with a transient-looking error,
// something is genuinely broken (e.g., vault row truly deleted with no
// auto-recovery available) and the user needs to know via the Reconnect
// banner. ~2.5h of silent retry at 5-min cron cadence. Beyond this, even
// transient classification flips to 'degraded'.
const TRANSIENT_SAFETY_CAP = 30;

// 2026-05-19 (α.5): errors that indicate a transient infra issue (Vault
// race, network blip, brief 5xx, DB connection churn) rather than a
// credential problem. When the error matches one of these patterns, the
// connection stays in 'renewing' regardless of attempt count up to
// TRANSIENT_SAFETY_CAP. Only credential-level errors flip to 'degraded'
// at DEGRADED_THRESHOLD.
const TRANSIENT_ERROR_PATTERNS = [
  'CANNOT_READ_VAULT_AFTER_RETRY',  // getAccessToken raised after 3 retries
  'Cannot read from Vault',          // direct vault read failure (often auto-recovers)
  'vault_creds_missing',             // vault row missing — auto-recovery from backup possible
  'No vault_secret_id',              // race during reconnect — usually resolves on next tick
  'vault read returned null',
  'NetworkError',
  'fetch failed',
  'connection terminated',
  'timeout',
  '502',
  '503',
  '504',
] as const;

function isTransientError(errorMsg: string): boolean {
  const lower = errorMsg.toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

// 2026-05-19 (α.5): translate internal error strings to user-readable
// messages. These land in `broker_connections.last_error` and are read by
// the frontend banner. Internal/technical details still go to console logs
// for debugging — only the customer-facing text is rewritten here.
function userFriendlyError(errorMsg: string): string {
  const lower = errorMsg.toLowerCase();
  if (lower.includes('cannot_read_vault_after_retry')
      || lower.includes('cannot read from vault')
      || lower.includes('vault read returned null')) {
    return 'Reconnecting to broker — usually resolves on its own.';
  }
  if (lower.includes('vault_creds_missing')
      || lower.includes('no vault_secret_id')
      || lower.includes('requires_credentials')) {
    return 'Sign-in needed — your saved credentials are no longer valid.';
  }
  if (lower.includes('token_expired') || lower.includes('token expired')) {
    return 'Session expired. We are refreshing it automatically.';
  }
  if (lower.includes('networkerror')
      || lower.includes('fetch failed')
      || lower.includes('timeout')
      || lower.includes('connection terminated')) {
    return 'Broker temporarily unreachable. Retrying in a moment.';
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return 'Broker rate limit reached. Retrying with backoff.';
  }
  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized')) {
    return 'Sign-in needed — broker rejected the saved session.';
  }
  // Fallback: truncate the raw message. Customers shouldn't normally see
  // these — they signal an unclassified error worth investigating.
  return errorMsg.slice(0, 200);
}

/**
 * Schedule a retry for a failed broker_connections row.
 *
 * Status decision (α.5):
 * - Transient error (Vault race, network blip, 5xx) AND attempt < TRANSIENT_SAFETY_CAP (30)
 *   → 'renewing' (silent retry, no user-visible banner)
 * - Transient error AND attempt ≥ TRANSIENT_SAFETY_CAP
 *   → 'degraded' (something is genuinely stuck, user needs to act)
 * - Credential-level error AND attempt < DEGRADED_THRESHOLD (10)
 *   → 'renewing'
 * - Credential-level error AND attempt ≥ DEGRADED_THRESHOLD
 *   → 'degraded'
 *
 * Never touches is_active or disconnected_at.
 */
export async function scheduleRetry(
  admin: SupabaseClient,
  connectionId: string,
  errorMsg: string,
): Promise<void> {
  const { data } = await admin
    .from('broker_connections')
    .select('retry_attempt_count, status, broker, environment, user_id')
    .eq('id', connectionId)
    .single();

  const attempt = (data?.retry_attempt_count ?? 0) as number;
  const nextAttempt = attempt + 1;
  const backoffIndex = Math.min(attempt, BACKOFF_SECONDS.length - 1);
  const backoffSec = BACKOFF_SECONDS[backoffIndex];
  const nextRetryAt = new Date(Date.now() + backoffSec * 1000).toISOString();

  const transient = isTransientError(errorMsg);
  const threshold = transient ? TRANSIENT_SAFETY_CAP : DEGRADED_THRESHOLD;
  const newStatus = nextAttempt < threshold ? 'renewing' : 'degraded';

  await admin.from('broker_connections').update({
    status:               newStatus,
    retry_attempt_count:  nextAttempt,
    next_retry_at:        nextRetryAt,
    last_error:           userFriendlyError(errorMsg),
    last_error_at:        new Date().toISOString(),
  }).eq('id', connectionId);

  // OQ-59: notify customer when connection transitions to 'degraded' or 'canceled'
  const prevStatus = (data?.status ?? null) as string | null;
  const transitioned = prevStatus !== newStatus && (newStatus === 'degraded' || newStatus === 'canceled');

  if (transitioned) {
    void admin.functions.invoke('broker-state-change-notify', {
      body: {
        connection_id: connectionId,
        user_id:       data?.user_id,
        broker:        data?.broker,
        environment:   data?.environment,
        new_status:    newStatus,
        last_error:    errorMsg.slice(0, 200),  // raw error for internal notification
      },
    }).catch((err: unknown) => {
      console.error('[retryQueue] notify dispatch failed:', String(err).slice(0, 200));
    });
  }

  console.warn(
    `[retryQueue] scheduleRetry: connectionId=${connectionId}` +
    ` attempt=${nextAttempt} status=${newStatus}` +
    ` transient=${transient} threshold=${threshold} backoff=${backoffSec}s`,
  );
}

/**
 * Clear retry state after a successful sync or reconnect.
 * Resets retry_attempt_count=0, next_retry_at=NULL, status='connected',
 * and clears last_error/last_error_at.
 */
export async function clearRetry(
  admin: SupabaseClient,
  connectionId: string,
): Promise<void> {
  await admin.from('broker_connections').update({
    retry_attempt_count: 0,
    next_retry_at:       null,
    status:              'connected',
    last_error:          null,
    last_error_at:       null,
  }).eq('id', connectionId);
}
