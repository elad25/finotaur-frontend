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
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Backoff schedule in seconds: attempt 0→60s, 1→5min, 2→15min, 3→1h, 4→6h, 5→24h
const BACKOFF_SECONDS = [60, 300, 900, 3600, 21600, 86400];

/**
 * Schedule a retry for a failed broker_connections row.
 * Computes next_retry_at from current retry_attempt_count, updates status
 * to 'renewing' (attempts 0-2) or 'degraded' (attempts 3+).
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
  const backoffIndex = Math.min(attempt, BACKOFF_SECONDS.length - 1);
  const backoffSec = BACKOFF_SECONDS[backoffIndex];
  const nextRetryAt = new Date(Date.now() + backoffSec * 1000).toISOString();
  const newStatus = attempt < 3 ? 'renewing' : 'degraded';

  await admin.from('broker_connections').update({
    status:               newStatus,
    retry_attempt_count:  attempt + 1,
    next_retry_at:        nextRetryAt,
    last_error:           errorMsg.slice(0, 500),
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
        last_error:    errorMsg.slice(0, 200),
      },
    }).catch((err: unknown) => {
      console.error('[retryQueue] notify dispatch failed:', String(err).slice(0, 200));
    });
  }

  console.warn(
    `[retryQueue] scheduleRetry: connectionId=${connectionId}` +
    ` attempt=${attempt + 1} status=${newStatus} backoff=${backoffSec}s`,
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
