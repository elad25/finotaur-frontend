-- Cron heartbeat table — tracks last successful run of each scheduled job.
-- Used by /functions/v1/cron-health endpoint for external monitoring (UptimeRobot etc.).

CREATE TABLE IF NOT EXISTS public.cron_heartbeat (
  job_name          TEXT PRIMARY KEY,
  last_run_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_status       TEXT NOT NULL CHECK (last_status IN ('ok', 'partial', 'failed')),
  last_duration_ms  INTEGER,
  last_payload      JSONB,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cron_heartbeat ENABLE ROW LEVEL SECURITY;

-- Public read (anon role) so cron-health endpoint can query without service role token.
-- Write is service-role only (no policy = denied for anon/authenticated).
CREATE POLICY "cron_heartbeat_anon_read"
  ON public.cron_heartbeat
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Trigger to bump updated_at on every UPSERT.
CREATE OR REPLACE FUNCTION public.cron_heartbeat_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cron_heartbeat_updated_at_trigger ON public.cron_heartbeat;
CREATE TRIGGER cron_heartbeat_updated_at_trigger
  BEFORE INSERT OR UPDATE ON public.cron_heartbeat
  FOR EACH ROW EXECUTE FUNCTION public.cron_heartbeat_set_updated_at();

COMMENT ON TABLE public.cron_heartbeat IS
  'Last successful run timestamp per scheduled job. Read by /functions/v1/cron-health for external monitoring.';
