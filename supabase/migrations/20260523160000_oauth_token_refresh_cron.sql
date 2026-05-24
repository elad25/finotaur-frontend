-- Migration: pg_cron job for proactive OAuth token refresh
-- Date: 2026-05-23
-- Purpose: Trigger oauth-refresh edge function every 5 minutes for connections
--          whose token_expires_at is within 15 minutes from now.
--
-- Idempotency: unschedule first (silently ignored if absent), then schedule fresh.
--
-- Vault secrets referenced (already established by OQ-10 closure 2026-05-06):
--   - 'supabase_url'     → base URL for edge functions
--   - 'secret_api_key'   → service role bearer token for dualAuth cron path
--
-- Race-condition guard: query excludes status IN ('renewing', 'disconnected', 'canceled').
-- oauth-refresh sets status='renewing' before the API call, preventing double-refresh
-- in the next 5-min tick (best-effort; full advisory_lock deferred to S4).

-- Naming uses 14-digit timestamp prefix per Supabase CLI convention.
-- (Note: file applied via MCP apply_migration; CLI is currently out-of-sync with
--  pre-existing infra debt — see Lesson 9 / OQ-LEDGER-DRIFT.)

DO $$
BEGIN
  -- Idempotently drop existing job (safe no-op if it doesn't exist)
  PERFORM cron.unschedule('oauth-token-refresh');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'oauth-token-refresh',
  '*/5 * * * *',
  $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
             || '/functions/v1/oauth-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'secret_api_key')
      ),
      body := jsonb_build_object('connection_id', bc.id::text)
    ) AS request_id
    FROM public.broker_connections bc
    WHERE bc.auth_method = 'oauth'
      AND bc.status NOT IN ('renewing', 'disconnected', 'canceled')
      AND bc.token_expires_at IS NOT NULL
      AND bc.token_expires_at < (now() + interval '15 minutes');
  $cron$
);
