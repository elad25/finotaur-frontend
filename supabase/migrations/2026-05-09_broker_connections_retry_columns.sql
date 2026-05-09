-- Sub-Session E — Permanent Broker Session
-- Adds retry-queue columns and expands broker_connections.status enum to
-- include silent-retry states ('renewing', 'degraded') and the Whop-driven
-- terminal state ('canceled'). Existing 'disconnected' / 'error' values are
-- preserved for legacy rows; new code writes only the four-value enum
-- {connected, renewing, degraded, canceled} plus 'pending' during initial
-- connect.
--
-- Backfill policy: NONE. Existing rows keep their current status. The
-- frontend's brokerStatusBadge falls through to a neutral color for legacy
-- values, so no UI breakage.

ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS next_retry_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_attempt_count  INTEGER NOT NULL DEFAULT 0;

-- Drop any existing CHECK on status (name varies across environments)
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.broker_connections'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.broker_connections DROP CONSTRAINT %I', c.conname);
  END LOOP;
END
$$;

ALTER TABLE public.broker_connections
  ADD CONSTRAINT broker_connections_status_check
  CHECK (status IN (
    'connected',     -- token valid, fully operational
    'renewing',      -- transient retry, silent to user (attempts 0-2)
    'degraded',      -- prolonged retry, yellow dot (attempts 3+)
    'disconnected',  -- LEGACY: pre-Sub-Session-E disconnects, kept for backfill
    'canceled',      -- Whop subscription canceled — the ONLY new is_active=false trigger
    'error',         -- LEGACY: pre-Sub-Session-E generic error
    'pending'        -- initial connect flow, before first successful sync
  ));

-- Cron filter index: tradovate-sync skips rows where next_retry_at is in the
-- future. Partial index keeps it small — most rows have NULL next_retry_at.
CREATE INDEX IF NOT EXISTS idx_broker_connections_next_retry_at
  ON public.broker_connections (next_retry_at)
  WHERE next_retry_at IS NOT NULL;

COMMENT ON COLUMN public.broker_connections.next_retry_at IS
  'Sub-Session E: when set, tradovate-sync skips this row until NOW() >= next_retry_at. Reset on successful sync.';

COMMENT ON COLUMN public.broker_connections.retry_attempt_count IS
  'Sub-Session E: consecutive sync failures. Drives backoff schedule [60s, 5m, 15m, 1h, 6h, 24h]. Reset on success.';
