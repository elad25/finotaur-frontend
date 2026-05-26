-- ============================================================================
-- Migration: lifecycle_04_archive_cron_schedule
-- Date: 2026-05-26
-- Session: account-cancellation-flow (P1 Step 1)
--
-- Purpose: Schedule the existing archive_soft_deleted_users() RPC to run
--          daily at 03:00 UTC. Without this cron, soft-deleted users sit
--          in profiles indefinitely.
--
-- Why: The Explore-agent audit (and Lesson 21 about ledger-vs-reality)
--      found that archive_soft_deleted_users() exists in the schema (line
--      3116 of CURRENT_SCHEMA.sql) but no cron.schedule call references it.
--      The promised "30-day grace period" was never enforced.
--
-- Schedule choice: 03:00 UTC = 06:00 IST = lowest traffic window.
--                  Daily cadence — archive is monotonic, no risk of
--                  re-archiving the same row.
--
-- Rollback (manual):
--   SELECT cron.unschedule('lifecycle-archive-soft-deleted');
-- ============================================================================

-- Defensive: unschedule any prior registration with the same name
-- (wrapped in DO block because unschedule errors if name does not exist)
DO $$
BEGIN
  PERFORM cron.unschedule('lifecycle-archive-soft-deleted');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No prior schedule for lifecycle-archive-soft-deleted (this is expected on first run)';
END $$;

SELECT cron.schedule(
  'lifecycle-archive-soft-deleted',
  '0 3 * * *',
  $$
    WITH archive_result AS (
      SELECT * FROM public.archive_soft_deleted_users()
    )
    INSERT INTO public.cron_heartbeat (job_name, last_status, last_payload, last_run_at)
    SELECT
      'lifecycle-archive-soft-deleted',
      'ok',
      jsonb_build_object('archived_count', archived_count, 'archived_user_ids', archived_user_ids),
      NOW()
    FROM archive_result
    ON CONFLICT (job_name) DO UPDATE SET
      last_status  = EXCLUDED.last_status,
      last_payload = EXCLUDED.last_payload,
      last_run_at  = EXCLUDED.last_run_at;
  $$
);

-- Sanity check (writes to a NOTICE — visible in apply output):
DO $$
DECLARE
  v_job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_job_count
  FROM cron.job
  WHERE jobname = 'lifecycle-archive-soft-deleted';

  IF v_job_count = 1 THEN
    RAISE NOTICE '✅ lifecycle-archive-soft-deleted scheduled for daily 03:00 UTC';
  ELSE
    RAISE WARNING '❌ Schedule registration verification failed (job_count=%)', v_job_count;
  END IF;
END $$;
