-- ─────────────────────────────────────────────────────────────────────────────
-- automation_settings_lock_guard — you cannot disable automation while locked.
--
-- A manual account lock only enforces while the desktop agent is running
-- (master_enabled AND NOT kill_switch_engaged — the agent's WI-2 gate). So while
-- any of the user's accounts is under an active manual lock, both transitions
-- that would neuter enforcement are rejected at the DB layer (defends against
-- direct API writes, not just the UI):
--   master_enabled:      true  -> false
--   kill_switch_engaged: false -> true
-- The lock releases automatically at the next CME session open (5PM CT); after
-- that these toggles work normally again.
--
-- "Active lock" = a portfolio with kill_switch_active AND
-- kill_switch_locked_until > now() (matches the frontend + locked_accounts logic).
--
-- NOTE: uses the USING-only RAISE form. Combining a format string with
-- `USING MESSAGE=` is illegal (sqlstate 42601 "RAISE option already specified")
-- and would surface a generic Postgres error to the client instead of this
-- message.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.automation_settings_lock_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_active_lock boolean;
BEGIN
  IF ( COALESCE(OLD.master_enabled, false) = true  AND NEW.master_enabled = false )
     OR ( COALESCE(OLD.kill_switch_engaged, false) = false AND NEW.kill_switch_engaged = true )
  THEN
    SELECT EXISTS (
      SELECT 1 FROM public.portfolios p
       WHERE p.user_id = NEW.user_id
         AND p.kill_switch_active = true
         AND p.kill_switch_locked_until IS NOT NULL
         AND p.kill_switch_locked_until > now()
    ) INTO v_has_active_lock;

    IF v_has_active_lock THEN
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        MESSAGE = 'Automation cannot be turned off while accounts are locked.',
        DETAIL  = 'A manual account lock is a commitment until the next futures session open (5:00 PM CT); the automation must stay on so the lock can be enforced.',
        HINT    = 'The lock releases automatically at the next session open (5:00 PM CT).';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_automation_settings_lock_guard ON public.automation_settings;
CREATE TRIGGER trg_automation_settings_lock_guard
  BEFORE UPDATE ON public.automation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.automation_settings_lock_guard();
