-- ============================================================================
-- Copier free-trial enforcement (GA 2026-07-03)
-- Free users get 15 mirrored executions ("copied trades") — then the copier
-- hard-locks until they upgrade to Premium.
--
-- A "copied trade" = one automation_events row with event_type
-- 'copy_executed' (legacy fill-copy) or 'order_copy_executed' (agent order
-- mirroring). Modified / cancelled / failed events do not consume the trial.
--
-- Enforcement levers (agent 1.6.3 already obeys automation_settings):
--   1. AFTER INSERT trigger on automation_events — on the 15th counted event
--      for a non-exempt user: master_enabled=false + a 'risk_enforced' event
--      so the EnforcementFeed shows WHY copying stopped.
--   2. BEFORE INSERT/UPDATE trigger on automation_settings — a non-exempt,
--      exhausted user cannot re-enable master_enabled (raises exception).
-- Client UX mirror: CopierPremiumGate + useCopierTrial (frontend).
--
-- Premium exemption matches existing DB practice (profiles.account_type =
-- 'premium' is how whop-webhook marks paid users; vip/admin/lifetime kept in
-- line with useSubscription.isPremium).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.copier_trial_exempt(p_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user
      AND (
        account_type IN ('premium', 'admin', 'vip')
        OR role IN ('admin', 'super_admin')
        OR payment_provider = 'lifetime'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.copier_trial_used(p_user uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM automation_events
  WHERE user_id = p_user
    AND event_type IN ('copy_executed', 'order_copy_executed');
$$;

-- ── 1. Disable the copier when the 15th counted event lands ────────────────
CREATE OR REPLACE FUNCTION public.enforce_copier_free_trial()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_used integer;
BEGIN
  IF copier_trial_exempt(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  v_used := copier_trial_used(NEW.user_id);  -- includes NEW (AFTER trigger)

  IF v_used >= 15 THEN
    UPDATE automation_settings
    SET master_enabled = false, updated_at = now()
    WHERE user_id = NEW.user_id AND master_enabled;

    IF FOUND THEN
      -- 'risk_enforced' is outside the trigger's WHEN filter — no recursion.
      INSERT INTO automation_events (user_id, event_type, severity, payload)
      VALUES (
        NEW.user_id, 'risk_enforced', 'warning',
        jsonb_build_object(
          'reason', 'free_copier_trial_exhausted',
          'used', v_used,
          'limit', 15,
          'message', 'Free copier trial (15 copied trades) is used up. Upgrade to Premium to keep copying.'
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_events_copier_trial ON public.automation_events;
CREATE TRIGGER automation_events_copier_trial
  AFTER INSERT ON public.automation_events
  FOR EACH ROW
  WHEN (NEW.event_type IN ('copy_executed', 'order_copy_executed'))
  EXECUTE FUNCTION public.enforce_copier_free_trial();

-- ── 2. Exhausted free users cannot re-enable the copier ────────────────────
CREATE OR REPLACE FUNCTION public.block_copier_enable_when_trial_exhausted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.master_enabled
     AND (TG_OP = 'INSERT' OR NOT OLD.master_enabled)
     AND NOT copier_trial_exempt(NEW.user_id)
     AND copier_trial_used(NEW.user_id) >= 15
  THEN
    RAISE EXCEPTION 'COPIER_TRIAL_EXHAUSTED: Free copier trial (15 copied trades) is used up. Upgrade to Premium to re-enable the copier.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_settings_copier_trial_gate ON public.automation_settings;
CREATE TRIGGER automation_settings_copier_trial_gate
  BEFORE INSERT OR UPDATE ON public.automation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.block_copier_enable_when_trial_exhausted();
