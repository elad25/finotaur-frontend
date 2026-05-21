-- ════════════════════════════════════════════════════════════════════════════
-- Perf P1 — record_sync_completion RPC (B6)
-- Session: perf-optimization-P1-scale-100k (2026-05-21)
--
-- Replaces 4 sequential trailing round-trips at the end of syncCredential():
--   1. UPSERT tradovate_sync_state          (cursor advance)
--   2. UPDATE broker_connections             (metadata: last_sync_at, error_count)
--   3. UPDATE broker_connections AGAIN       (clearRetry — only when errors=0)
--   4. INSERT  broker_sync_logs              (observability row)
--
-- After: ONE RPC call → 3 writes (sync_state UPSERT + 1 conn UPDATE + 1 log INSERT)
-- in one transaction. Error path (errors>0) still chains scheduleRetry separately
-- because its backoff math + notification dispatch don't fit cleanly in plpgsql.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_sync_completion(
  p_connection_id        uuid,
  p_user_id              uuid,
  p_account_id           integer,
  p_environment          text,
  p_max_fill_id          bigint,          -- NULL = no-fills path (skip sync_state upsert)
  p_prev_fills_processed integer,
  p_inserted             integer,
  p_errors               integer,
  p_fills_fetched        integer,
  p_sync_mode            text,
  p_sync_started_at      timestamptz,
  p_log_details          jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_at timestamptz := now();
  v_log_status   text;
  v_duration_ms  integer;
BEGIN
  -- Log status mirrors the JS path:
  --   errors=0           → 'success'
  --   errors>0 + any ok  → 'partial'
  --   errors>0 + no ok   → 'failed'
  IF p_errors = 0 THEN
    v_log_status := 'success';
  ELSIF p_inserted > 0 THEN
    v_log_status := 'partial';
  ELSE
    v_log_status := 'failed';
  END IF;

  v_duration_ms := (EXTRACT(epoch FROM (v_completed_at - p_sync_started_at)) * 1000)::integer;

  -- 1. Advance sync cursor (only when fills were processed)
  IF p_max_fill_id IS NOT NULL THEN
    INSERT INTO public.tradovate_sync_state
      (user_id, environment, account_id, last_fill_id, last_sync_at, fills_processed)
    VALUES
      (p_user_id, p_environment, p_account_id, p_max_fill_id, v_completed_at,
       COALESCE(p_prev_fills_processed, 0) + COALESCE(p_inserted, 0))
    ON CONFLICT (user_id, environment, account_id)
    DO UPDATE SET
      last_fill_id    = EXCLUDED.last_fill_id,
      last_sync_at    = EXCLUDED.last_sync_at,
      fills_processed = EXCLUDED.fills_processed;
  END IF;

  -- 2. Update broker_connections metadata.
  --    Success path → also clear retry state in the same UPDATE (merges old clearRetry).
  --    Error path → only metadata; scheduleRetry runs after this RPC and handles
  --    status/retry_attempt_count/next_retry_at/last_error with proper backoff math.
  IF p_errors = 0 THEN
    UPDATE public.broker_connections SET
      last_sync_at            = v_completed_at,
      last_successful_sync_at = v_completed_at,
      error_count             = 0,
      retry_attempt_count     = 0,
      next_retry_at           = NULL,
      status                  = 'connected',
      last_error              = NULL,
      last_error_at           = NULL
    WHERE id = p_connection_id;
  ELSE
    UPDATE public.broker_connections SET
      last_sync_at = v_completed_at,
      error_count  = p_errors
    WHERE id = p_connection_id;
  END IF;

  -- 3. Observability log row. Wrapped in BEGIN/EXCEPTION so a log-table
  --    schema drift never breaks the sync (mirrors the JS try/catch).
  BEGIN
    INSERT INTO public.broker_sync_logs (
      connection_id, account_id, user_id,
      sync_type, sync_trigger, status,
      records_fetched, records_created, records_updated, records_skipped, records_failed,
      error_message,
      started_at, completed_at, duration_ms,
      sync_details
    ) VALUES (
      p_connection_id, NULL, p_user_id,
      'fills', p_sync_mode, v_log_status,
      COALESCE(p_fills_fetched, 0),
      COALESCE(p_inserted, 0),
      0,
      GREATEST(COALESCE(p_fills_fetched, 0) - COALESCE(p_inserted, 0) - COALESCE(p_errors, 0), 0),
      COALESCE(p_errors, 0),
      CASE WHEN p_errors > 0 THEN format('%s fills failed to insert', p_errors) ELSE NULL END,
      p_sync_started_at, v_completed_at, v_duration_ms,
      COALESCE(p_log_details, '{}'::jsonb)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'broker_sync_logs insert failed: %', SQLERRM;
  END;
END;
$$;

COMMENT ON FUNCTION public.record_sync_completion(
  uuid, uuid, integer, text, bigint, integer, integer, integer, integer, text, timestamptz, jsonb
) IS
'B6 perf fix — consolidates the 4 trailing writes at end of tradovate-sync syncCredential() into one transaction.';

REVOKE ALL ON FUNCTION public.record_sync_completion(
  uuid, uuid, integer, text, bigint, integer, integer, integer, integer, text, timestamptz, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_sync_completion(
  uuid, uuid, integer, text, bigint, integer, integer, integer, integer, text, timestamptz, jsonb
) TO service_role;
