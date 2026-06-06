-- Migration: auto-settle expired options via daily pg_cron job
-- Purpose: once per day (just after the expiration date rolls over in NY), find every
--   open options trade whose expiration_date has passed without an exit_price being
--   recorded, stamp it as expired_worthless, and let the handle_trade_changes_unified()
--   BEFORE trigger derive pnl/outcome automatically. The trigger routes expired-worthless
--   through the risk-only settlement path (the regular branch requires exit_price > 0):
--     LONG  expired worthless → pnl = -(entry * qty * multiplier) - fees = full premium loss
--     SHORT expired worthless → pnl =  (entry * qty * multiplier) - fees = full premium gain
--
-- Design notes:
--   - Set-based UPDATE (no row loop) for performance.
--   - Notes append is idempotent: the marker string is only added when absent,
--     so re-running the cron or the migration itself never double-appends.
--   - Rows remain fully editable: a user who sold an ITM option and it was
--     incorrectly auto-settled can correct exit_price and option_outcome manually;
--     the audit note makes the auto-settlement visible in the UI.
--   - This function only sets option_outcome + close_at; the BEFORE trigger fires on
--     the UPDATE and performs exit_price zeroing and pnl/outcome derivation.

-- ─── settle_expired_options() ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.settle_expired_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trades
  SET
    option_outcome = 'expired_worthless',
    close_at       = expiration_date::timestamptz,
    notes          = CASE
                       WHEN notes IS NULL OR notes NOT LIKE '%Auto-settled at expiration (expired worthless)%'
                       THEN COALESCE(notes || E'\n', '') || 'Auto-settled at expiration (expired worthless)'
                       ELSE notes
                     END
  WHERE asset_class      = 'options'
    AND outcome          = 'OPEN'
    AND deleted_at       IS NULL
    AND expiration_date  IS NOT NULL
    AND expiration_date  < (now() AT TIME ZONE 'America/New_York')::date
    AND exit_price       IS NULL;
END;
$$;

-- ─── pg_cron schedule ────────────────────────────────────────────────────────
-- Unschedule any previous version of this job before re-creating it (idempotent).

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'settle-expired-options') THEN
    PERFORM cron.unschedule('settle-expired-options');
  END IF;
END $$;

-- Run daily at 06:00 UTC (= 01:00 EST / 02:00 EDT), safely AFTER midnight ET so an
-- option expiring on date D is settled on the morning of D+1 in New York time.
SELECT cron.schedule(
  'settle-expired-options',
  '0 6 * * *',
  $$ SELECT public.settle_expired_options(); $$
);
