-- Migration: pg_cron jobs for twice-daily IBKR portfolio snapshot sync
-- Date: 2026-06-02
-- Purpose: Trigger interactive-brokers-sync edge function in cron mode
--          twice per weekday so portfolio snapshots stay current:
--            - Morning run:   ~08:45 ET (pre-market snapshot)
--            - Afternoon run: ~16:45 ET (post-close snapshot — primary daily value)
--
-- Idempotency: unschedule both job names first (silently ignored if absent),
--              then schedule fresh.
--
-- Vault secrets referenced (established by OQ-10 closure 2026-05-06):
--   - 'supabase_url'    → base URL for edge functions
--   - 'secret_api_key'  → service role bearer token for dualAuth cron path
--
-- DST rationale: pg_cron schedules are fixed UTC — there is no per-job TZ.
-- US Eastern shifts between UTC-5 (EST, Nov–Mar) and UTC-4 (EDT, Mar–Nov).
--
-- Morning: 08:45 ET = 13:45 UTC (EDT) / 13:45 UTC (EST — same minute, only
--   clock-hour label differs). A single UTC expression 45 13 * * 1-5 covers
--   both offsets with an ET-hour guard of hour=8 to block misfire if DST
--   boundary falls mid-schedule.
--
-- Afternoon: 16:45 ET = 20:45 UTC (EDT) / 21:45 UTC (EST).
--   These are DIFFERENT UTC minutes, so both UTC hours must be covered.
--   We schedule both 45 20 * * 1-5 and 45 21 * * 1-5, then gate execution
--   with EXTRACT(hour FROM now() AT TIME ZONE 'America/New_York') = 16
--   so that exactly one fires at the correct ET hour regardless of DST.

-- ── Idempotent cleanup ───────────────────────────────────────────────────────

DO $$
BEGIN
  PERFORM cron.unschedule('ibkr-sync-morning');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('ibkr-sync-afternoon-edt');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('ibkr-sync-afternoon-est');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ── Morning job: 08:45 ET weekdays ──────────────────────────────────────────
-- 13:45 UTC covers both EST and EDT (08:45 ET = 13:45 UTC year-round).
-- ET-hour guard (= 8) is a belt-and-suspenders check for any DST edge case.

SELECT cron.schedule(
  'ibkr-sync-morning',
  '45 13 * * 1-5',
  $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
             || '/functions/v1/interactive-brokers-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'secret_api_key')
      ),
      body := jsonb_build_object('mode', 'cron')
    ) AS request_id
    WHERE EXTRACT(hour FROM now() AT TIME ZONE 'America/New_York') = 8;
  $cron$
);

-- ── Afternoon job (EDT slot): 16:45 ET — 20:45 UTC (UTC-4, Mar–Nov) ─────────
-- ET-hour guard (= 16) ensures this only fires when it is actually 16:xx ET.
-- In winter (EST, UTC-5) 20:45 UTC = 15:45 ET → guard blocks the misfire.

SELECT cron.schedule(
  'ibkr-sync-afternoon-edt',
  '45 20 * * 1-5',
  $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
             || '/functions/v1/interactive-brokers-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'secret_api_key')
      ),
      body := jsonb_build_object('mode', 'cron')
    ) AS request_id
    WHERE EXTRACT(hour FROM now() AT TIME ZONE 'America/New_York') = 16;
  $cron$
);

-- ── Afternoon job (EST slot): 16:45 ET — 21:45 UTC (UTC-5, Nov–Mar) ─────────
-- ET-hour guard (= 16) ensures this only fires when it is actually 16:xx ET.
-- In summer (EDT, UTC-4) 21:45 UTC = 17:45 ET → guard blocks the misfire.

SELECT cron.schedule(
  'ibkr-sync-afternoon-est',
  '45 21 * * 1-5',
  $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
             || '/functions/v1/interactive-brokers-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'secret_api_key')
      ),
      body := jsonb_build_object('mode', 'cron')
    ) AS request_id
    WHERE EXTRACT(hour FROM now() AT TIME ZONE 'America/New_York') = 16;
  $cron$
);
