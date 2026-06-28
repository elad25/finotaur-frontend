-- ============================================================================
-- Copier full-fidelity remediation — make every WEB control reach the agent.
--
-- 1) Cross-instrument: per-target cross_to_micro flag (NQ→MNQ etc.).
-- 2) Risk parity: extend automation_risk_rules with the full field set the web
--    exposes (per-trade/weekly loss, profit targets, breach action, max position
--    contracts) + bind rules to a Tradovate account by account_id/name (the same
--    identity the copier uses), so a rule reliably hits the account it trades.
-- 3) automation_upsert_risk_rule — user-scoped upsert keyed by account_id.
-- 4) master_enabled becomes ENTITLEMENT-DRIVEN (the per-user master toggle UI is
--    removed): an entitled user's copier is live; lapsed = inert.
-- ============================================================================

-- ── 1. Cross-instrument flag on targets ─────────────────────────────────────
ALTER TABLE public.automation_copier_route_targets
  ADD COLUMN IF NOT EXISTS cross_to_micro boolean NOT NULL DEFAULT false;

-- ── 2. Risk parity columns + account binding ────────────────────────────────
ALTER TABLE public.automation_risk_rules
  ADD COLUMN IF NOT EXISTS account_id              text,
  ADD COLUMN IF NOT EXISTS account_name            text,
  ADD COLUMN IF NOT EXISTS max_loss_per_trade_usd  numeric,
  ADD COLUMN IF NOT EXISTS max_weekly_loss_usd     numeric,
  ADD COLUMN IF NOT EXISTS trade_profit_target_usd numeric,
  ADD COLUMN IF NOT EXISTS daily_profit_target_usd numeric,
  ADD COLUMN IF NOT EXISTS weekly_profit_target_usd numeric,
  ADD COLUMN IF NOT EXISTS max_position_size       integer,
  ADD COLUMN IF NOT EXISTS risk_breach_action      text
    DEFAULT 'pause_copies';

-- breach action whitelist (drop-then-add for idempotency)
ALTER TABLE public.automation_risk_rules
  DROP CONSTRAINT IF EXISTS automation_risk_rules_breach_action_chk;
ALTER TABLE public.automation_risk_rules
  ADD CONSTRAINT automation_risk_rules_breach_action_chk
  CHECK (risk_breach_action IS NULL
         OR risk_breach_action IN ('pause_copies','stop_copies','close_lock'));

-- one risk rule per (user, account) — enables clean upsert by account
CREATE UNIQUE INDEX IF NOT EXISTS uniq_automation_risk_rules_user_account
  ON public.automation_risk_rules (user_id, account_id)
  WHERE account_id IS NOT NULL;

-- ── 3. automation_upsert_risk_rule — USER-scoped upsert keyed by account ─────
CREATE OR REPLACE FUNCTION public.automation_upsert_risk_rule(
  p_account_id               text,
  p_account_name             text,
  p_label                    text    DEFAULT NULL,
  p_daily_loss_limit_usd     numeric DEFAULT NULL,
  p_max_loss_per_trade_usd   numeric DEFAULT NULL,
  p_max_weekly_loss_usd      numeric DEFAULT NULL,
  p_trade_profit_target_usd  numeric DEFAULT NULL,
  p_daily_profit_target_usd  numeric DEFAULT NULL,
  p_weekly_profit_target_usd numeric DEFAULT NULL,
  p_max_contracts            integer DEFAULT NULL,
  p_max_position_size        integer DEFAULT NULL,
  p_max_position_usd         numeric DEFAULT NULL,
  p_max_trades_per_day       integer DEFAULT NULL,
  p_tilt_loss_streak         integer DEFAULT NULL,
  p_tilt_cooldown_minutes    integer DEFAULT NULL,
  p_risk_breach_action       text    DEFAULT 'pause_copies',
  p_enforce                  boolean DEFAULT true,
  p_is_active                boolean DEFAULT true
)
RETURNS SETOF public.automation_risk_rules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF COALESCE(NULLIF(p_account_id,''), NULL) IS NULL THEN
    RAISE EXCEPTION 'account_id_required' USING errcode = '22023';
  END IF;
  IF p_risk_breach_action IS NOT NULL
     AND p_risk_breach_action NOT IN ('pause_copies','stop_copies','close_lock') THEN
    RAISE EXCEPTION 'invalid_breach_action' USING errcode = '22023';
  END IF;

  RETURN QUERY
  INSERT INTO public.automation_risk_rules AS r (
    user_id, account_id, account_name, label,
    daily_loss_limit_usd, max_loss_per_trade_usd, max_weekly_loss_usd,
    trade_profit_target_usd, daily_profit_target_usd, weekly_profit_target_usd,
    max_contracts, max_position_size, max_position_usd, max_trades_per_day,
    tilt_loss_streak, tilt_cooldown_minutes, risk_breach_action,
    enforce, is_active, updated_at
  )
  VALUES (
    v_uid, p_account_id, NULLIF(p_account_name,''), NULLIF(p_label,''),
    p_daily_loss_limit_usd, p_max_loss_per_trade_usd, p_max_weekly_loss_usd,
    p_trade_profit_target_usd, p_daily_profit_target_usd, p_weekly_profit_target_usd,
    p_max_contracts, p_max_position_size, p_max_position_usd, p_max_trades_per_day,
    p_tilt_loss_streak, p_tilt_cooldown_minutes, COALESCE(p_risk_breach_action,'pause_copies'),
    COALESCE(p_enforce,true), COALESCE(p_is_active,true), now()
  )
  ON CONFLICT (user_id, account_id) WHERE account_id IS NOT NULL
  DO UPDATE SET
    account_name             = EXCLUDED.account_name,
    label                    = EXCLUDED.label,
    daily_loss_limit_usd     = EXCLUDED.daily_loss_limit_usd,
    max_loss_per_trade_usd   = EXCLUDED.max_loss_per_trade_usd,
    max_weekly_loss_usd      = EXCLUDED.max_weekly_loss_usd,
    trade_profit_target_usd  = EXCLUDED.trade_profit_target_usd,
    daily_profit_target_usd  = EXCLUDED.daily_profit_target_usd,
    weekly_profit_target_usd = EXCLUDED.weekly_profit_target_usd,
    max_contracts            = EXCLUDED.max_contracts,
    max_position_size        = EXCLUDED.max_position_size,
    max_position_usd         = EXCLUDED.max_position_usd,
    max_trades_per_day       = EXCLUDED.max_trades_per_day,
    tilt_loss_streak         = EXCLUDED.tilt_loss_streak,
    tilt_cooldown_minutes    = EXCLUDED.tilt_cooldown_minutes,
    risk_breach_action       = EXCLUDED.risk_breach_action,
    enforce                  = EXCLUDED.enforce,
    is_active                = EXCLUDED.is_active,
    updated_at               = now()
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_upsert_risk_rule(text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,integer,integer,numeric,integer,integer,integer,text,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.automation_upsert_risk_rule(text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,integer,integer,numeric,integer,integer,integer,text,boolean,boolean) TO authenticated;

COMMENT ON FUNCTION public.automation_upsert_risk_rule IS
  'User-scoped: upsert a per-account risk rule (keyed by user_id+account_id). Feeds the agent the full enforceable field set.';
