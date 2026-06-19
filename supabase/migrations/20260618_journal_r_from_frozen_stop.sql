-- ============================================================================
-- Journal R-from-frozen-stop + Risk-Free classification
-- APPLIED TO PROD (xsgbtptkueabylkxibly) 2026-06-18 in 2 stages: schema+trigger via
-- `apply_migration journal_r_from_frozen_stop_schema_and_trigger`, then this backfill
-- (section 3) via execute_sql after a live canary. Verified: 47 risk_defined / 80
-- no_stop / 0 risk_free, trigger re-enabled, 46/46 closed risk_defined kept actual_r.
-- ----------------------------------------------------------------------------
-- WHAT:
--   1. R (stop-based, `actual_r`) is now derived from a FROZEN stop
--      (`r_stop_price`), not the live `stop_price`. The first stop attached to a
--      trade opens a 10-second grace window in which edits still refine R; after
--      the window R is locked. Later stop moves (trailing) never change R.
--   2. Risk is now SIGNED, not ABS(). A stop sitting in profit (long stop above
--      entry / short stop below entry) is no longer treated as fake risk:
--      the trade is classified `risk_free` and gets a `locked_profit_usd` metric
--      instead of a (previously positive, wrong) `actual_r`.
--   3. New `risk_class`: 'risk_defined' | 'risk_free' | 'no_stop'.
--
-- WHY:
--   The live trigger computed `risk_pts = ABS(entry - stop)`, so a profit-side
--   stop produced a positive, meaningless R that polluted expectancy. Elad asked
--   that such trades NOT get an R, and that R lock 10s after the original stop.
--
-- NOTE: `actual_user_r` (account-level R = pnl / user's fixed 1R) is INTENTIONALLY
--   left untouched — it does not depend on the stop and stays meaningful even for
--   risk-free trades. Only the stop-derived `actual_r` becomes NULL.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE. Backfill runs with the
-- trigger temporarily disabled so historical portfolio totals are NOT recomputed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. New columns (additive, non-destructive)
-- ----------------------------------------------------------------------------
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS r_stop_price      NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS r_stop_set_at     TIMESTAMPTZ;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS r_locked_at       TIMESTAMPTZ;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS risk_class        TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS locked_profit_usd NUMERIC;

COMMENT ON COLUMN public.trades.r_stop_price      IS 'Frozen stop that defines R. Set within a 10s grace window after the first stop; immutable afterwards (trailing stop_price does not change it).';
COMMENT ON COLUMN public.trades.r_stop_set_at     IS 'When the first stop appeared (start of the 10s R-lock grace window).';
COMMENT ON COLUMN public.trades.r_locked_at       IS 'When r_stop_price was frozen (end of the grace window).';
COMMENT ON COLUMN public.trades.risk_class        IS 'risk_defined = real loss-side stop; risk_free = stop in profit (no R, has locked_profit_usd); no_stop = no stop.';
COMMENT ON COLUMN public.trades.locked_profit_usd IS 'Guaranteed profit locked in by a profit-side stop = |entry - r_stop| * qty * mult - fees. Only set for risk_free.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trades_risk_class_check'
  ) THEN
    ALTER TABLE public.trades
      ADD CONSTRAINT trades_risk_class_check
      CHECK (risk_class IS NULL OR risk_class IN ('risk_defined','risk_free','no_stop'));
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- 2. Replace the unified trade trigger function (BEFORE INSERT OR UPDATE)
--    Surgical changes vs. live definition:
--      * DECLARE: + v_signed_risk_pts
--      * NEW STEP 1.5: freeze r_stop_price within the 10s window
--      * STEP 2: SIGNED risk + risk_class classification (was ABS)
--      * STEP 3: risk_usd only for risk_defined
--      * STEP 6: actual_r only for risk_defined, else NULL
--    Everything else is preserved verbatim from the live function.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_trade_changes_unified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  multiplier NUMERIC;
  price_diff NUMERIC;
  gross_pnl NUMERIC;
  v_account_type TEXT;
  v_old_pnl NUMERIC := 0;

  -- 🆕 Variables for R-multiple calculation
  v_portfolio_size NUMERIC;
  v_risk_mode TEXT;
  v_risk_percentage NUMERIC;
  v_fixed_risk_amount NUMERIC;
  v_user_one_r NUMERIC; -- User's 1R
  v_signed_risk_pts NUMERIC; -- 🆕 signed entry→stop distance (>0 = real risk)
BEGIN
  -- ═══════════════════════════════════════
  -- [options-lifecycle] STEP -1: options lifecycle pre-processing (added)
  -- ═══════════════════════════════════════

  -- Canonical asset_class enforcement (self-healing; BEFORE trigger so NEW persists).
  NEW.asset_class := public.normalize_asset_class(NEW.asset_class);

  -- Default US equity options contract multiplier (100) when unset.
  IF NEW.asset_class = 'options' AND (NEW.multiplier IS NULL OR NEW.multiplier = 1) THEN
    NEW.multiplier := 100;
  END IF;

  -- Expired-worthless settlement. STEP 6 regular mode needs exit_price > 0, so a $0
  -- expiry would be treated as OPEN. Route through the risk-only path with a directly
  -- supplied pnl; STEP 6 then sets outcome / R / portfolio. exit_price=0 is kept for display.
  IF NEW.asset_class = 'options' AND NEW.option_outcome = 'expired_worthless' THEN
    NEW.exit_price := 0;
    NEW.close_at := COALESCE(NEW.close_at, NEW.expiration_date::timestamptz, now());
    NEW.input_mode := 'risk-only';
    IF NEW.side = 'SHORT' THEN
      -- Short premium seller keeps the full premium, less fees.
      NEW.pnl := (NEW.entry_price * NEW.quantity * COALESCE(NEW.multiplier, 1)) - COALESCE(NEW.fees, 0);
    ELSE
      -- Long premium buyer loses the full premium, plus fees.
      NEW.pnl := -((NEW.entry_price * NEW.quantity * COALESCE(NEW.multiplier, 1)) + COALESCE(NEW.fees, 0));
    END IF;
  END IF;

  -- ═══════════════════════════════════════
  -- 🆕 STEP 0: Get user's risk settings WITH DEFAULTS
  -- ═══════════════════════════════════════

  SELECT
    COALESCE(portfolio_size, initial_portfolio, current_portfolio, 10000) as portfolio_size,
    COALESCE(risk_mode, 'percentage') as risk_mode,
    COALESCE(risk_percentage, 1.0) as risk_percentage,
    COALESCE(fixed_risk_amount, 100) as fixed_risk_amount
  INTO
    v_portfolio_size,
    v_risk_mode,
    v_risk_percentage,
    v_fixed_risk_amount
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- 🔥 CRITICAL FIX: Ensure we ALWAYS have valid values
  IF v_portfolio_size IS NULL OR v_portfolio_size <= 0 THEN
    v_portfolio_size := 10000;
  END IF;

  IF v_risk_mode IS NULL THEN
    v_risk_mode := 'percentage';
  END IF;

  IF v_risk_percentage IS NULL OR v_risk_percentage <= 0 THEN
    v_risk_percentage := 1.0;
  END IF;

  -- Calculate user's 1R (NEVER NULL!)
  IF v_risk_mode = 'percentage' THEN
    v_user_one_r := (v_portfolio_size * v_risk_percentage) / 100;
  ELSIF v_risk_mode = 'fixed' AND v_fixed_risk_amount IS NOT NULL AND v_fixed_risk_amount > 0 THEN
    v_user_one_r := v_fixed_risk_amount;
  ELSE
    -- 🔥 FALLBACK: Use 1% of portfolio as default
    v_user_one_r := (v_portfolio_size * 1.0) / 100;
  END IF;

  -- 🔥 FINAL SAFETY CHECK: Ensure v_user_one_r is never NULL or zero
  IF v_user_one_r IS NULL OR v_user_one_r <= 0 THEN
    v_user_one_r := 100; -- Absolute fallback: $100
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 1: Calculate Multiplier
  -- ═══════════════════════════════════════

  IF NEW.multiplier IS NOT NULL AND NEW.multiplier > 0 THEN
    multiplier := NEW.multiplier;
  ELSE
    multiplier := public.get_asset_multiplier(NEW.symbol);
    NEW.multiplier := multiplier;
  END IF;

  -- ═══════════════════════════════════════
  -- 🆕 STEP 1.5: Freeze the R-defining stop (+10s grace window)
  -- The first stop attached starts a 10s window in which edits still refine R.
  -- After the window r_stop_price is locked; later stop moves are "trailing"
  -- and never change R. Works for both manual and broker-imported trades.
  -- (On UPDATE, NEW carries the stored r_* values for columns not in the SET.)
  -- ═══════════════════════════════════════

  IF NEW.stop_price IS NOT NULL AND NEW.stop_price > 0 THEN
    IF NEW.r_stop_set_at IS NULL THEN
      NEW.r_stop_set_at := now();
    END IF;

    IF NEW.r_locked_at IS NULL THEN
      IF now() <= NEW.r_stop_set_at + INTERVAL '10 seconds' THEN
        -- still inside the grace window → keep syncing to the latest stop
        NEW.r_stop_price := NEW.stop_price;
      ELSE
        -- window elapsed → freeze R now
        NEW.r_stop_price := COALESCE(NEW.r_stop_price, NEW.stop_price);
        NEW.r_locked_at  := now();
      END IF;
    END IF;
    -- else: already locked → r_stop_price stays frozen (trailing stop_price ignored for R)
  ELSE
    NEW.r_stop_price  := NULL;
    NEW.r_stop_set_at := NULL;
    NEW.r_locked_at   := NULL;
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 2: Risk classification + points (SIGNED, from frozen r_stop_price)
  -- ═══════════════════════════════════════

  IF NEW.r_stop_price IS NOT NULL AND NEW.r_stop_price > 0 THEN
    v_signed_risk_pts := CASE
      WHEN NEW.side = 'LONG'  THEN NEW.entry_price - NEW.r_stop_price
      WHEN NEW.side = 'SHORT' THEN NEW.r_stop_price - NEW.entry_price
      ELSE 0
    END;

    IF v_signed_risk_pts > 0 THEN
      -- Normal: real loss-side stop defines risk
      NEW.risk_class        := 'risk_defined';
      NEW.risk_pts          := v_signed_risk_pts;
      NEW.locked_profit_usd := NULL;
    ELSE
      -- Stop sits in profit (or at entry) → no real risk = Risk-Free trade
      NEW.risk_class        := 'risk_free';
      NEW.risk_pts          := NULL;
      NEW.risk_usd          := NULL;
      NEW.user_risk_r       := NULL;
      NEW.locked_profit_usd := (ABS(NEW.entry_price - NEW.r_stop_price) * NEW.quantity * multiplier) - COALESCE(NEW.fees, 0);
    END IF;
  ELSE
    NEW.risk_class        := 'no_stop';
    NEW.risk_pts          := NULL;
    NEW.risk_usd          := NULL;
    NEW.locked_profit_usd := NULL;
  END IF;

  -- Reward Points (Entry → Take Profit) — unchanged
  IF NEW.take_profit_price IS NOT NULL THEN
    NEW.reward_pts := CASE
      WHEN NEW.side = 'LONG' THEN NEW.take_profit_price - NEW.entry_price
      WHEN NEW.side = 'SHORT' THEN NEW.entry_price - NEW.take_profit_price
      ELSE 0
    END;
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 3: Calculate Risk & Reward USD (only when risk is real)
  -- ═══════════════════════════════════════

  IF NEW.risk_class = 'risk_defined' THEN
    -- Risk USD = Points × Quantity × Multiplier + Fees
    NEW.risk_usd := (NEW.risk_pts * NEW.quantity * multiplier) + COALESCE(NEW.fees, 0);

    IF NEW.take_profit_price IS NOT NULL THEN
      -- Reward USD = Points × Quantity × Multiplier
      NEW.reward_usd := ABS(NEW.reward_pts * NEW.quantity * multiplier);
    END IF;
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 4: Calculate R:R Ratio
  -- ═══════════════════════════════════════

  IF NEW.risk_pts IS NOT NULL AND NEW.risk_pts > 0 AND NEW.reward_pts IS NOT NULL THEN
    NEW.rr := ROUND(ABS(NEW.reward_pts / NEW.risk_pts), 2);
  END IF;

  -- ═══════════════════════════════════════
  -- 🆕 STEP 5: Calculate user_risk_r & user_reward_r
  -- ═══════════════════════════════════════

  IF v_user_one_r IS NOT NULL AND v_user_one_r > 0 THEN
    -- YOU'RE RISKING: X.XXR (for OPEN trades)
    IF NEW.risk_usd IS NOT NULL AND NEW.exit_price IS NULL THEN
      NEW.user_risk_r := ROUND(NEW.risk_usd / v_user_one_r, 2);
    END IF;

    -- POTENTIAL REWARD: +X.XXR (for OPEN trades only)
    IF NEW.reward_usd IS NOT NULL AND NEW.exit_price IS NULL THEN
      NEW.user_reward_r := ROUND(NEW.reward_usd / v_user_one_r, 2);
    END IF;
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 6: If trade is closed - calculate P&L
  -- ═══════════════════════════════════════

  -- 🔥 RISK-ONLY MODE: Check if pnl was provided directly
  IF NEW.input_mode = 'risk-only' THEN

    -- If pnl was provided, trade is closed
    IF NEW.pnl IS NOT NULL THEN
      -- Recalculate R values for consistency
      -- 🆕 stop-based actual_r only when risk is real; else NULL (risk-free / no-stop)
      IF NEW.risk_class = 'risk_defined' AND NEW.risk_usd IS NOT NULL AND NEW.risk_usd > 0 THEN
        NEW.actual_r := ROUND(NEW.pnl / NEW.risk_usd, 2);
      ELSE
        NEW.actual_r := NULL;
      END IF;

      IF v_user_one_r IS NOT NULL AND v_user_one_r > 0 THEN
        NEW.actual_user_r := ROUND(NEW.pnl / v_user_one_r, 2);
      END IF;

      -- Set outcome based on pnl
      NEW.outcome := CASE
        WHEN NEW.pnl > 0.01 THEN 'WIN'
        WHEN NEW.pnl < -0.01 THEN 'LOSS'
        ELSE 'BE'
      END;

      IF NEW.close_at IS NULL THEN
        NEW.close_at := NOW();
      END IF;

      -- Update portfolio for closed risk-only trade
      IF TG_OP = 'UPDATE' AND OLD.pnl IS NOT NULL THEN
        v_old_pnl := COALESCE(OLD.pnl, 0);
      END IF;

      UPDATE public.profiles
      SET
        total_pnl = COALESCE(total_pnl, 0) - v_old_pnl + NEW.pnl,
        current_portfolio = initial_portfolio + (COALESCE(total_pnl, 0) - v_old_pnl + NEW.pnl),
        updated_at = NOW()
      WHERE id = NEW.user_id;

    ELSE
      -- Risk-Only without result = OPEN
      NEW.outcome := 'OPEN';
      NEW.actual_r := NULL;
      NEW.actual_user_r := NULL;
    END IF;

  -- 🔥 REGULAR MODE: Check exit_price
  ELSIF NEW.exit_price IS NOT NULL AND NEW.exit_price > 0 THEN
    -- Calculate price difference
    IF NEW.side = 'LONG' THEN
      price_diff := NEW.exit_price - NEW.entry_price;
    ELSIF NEW.side = 'SHORT' THEN
      price_diff := NEW.entry_price - NEW.exit_price;
    ELSE
      price_diff := 0;
    END IF;

    -- Calculate P&L
    gross_pnl := price_diff * NEW.quantity * multiplier;
    NEW.pnl := gross_pnl - COALESCE(NEW.fees, 0);

    -- Calculate actual_user_r (User Rs achieved based on actual P&L)
    IF v_user_one_r IS NOT NULL AND v_user_one_r > 0 THEN
      NEW.actual_user_r := ROUND(NEW.pnl / v_user_one_r, 2);
      -- Clear user_reward_r for closed trades (no longer relevant)
      NEW.user_reward_r := NULL;
    END IF;

    -- Calculate actual_r (contract-based R-multiple)
    -- 🆕 only when risk is real; else NULL (risk-free / no-stop)
    IF NEW.risk_class = 'risk_defined' AND NEW.risk_usd IS NOT NULL AND NEW.risk_usd > 0 THEN
      NEW.actual_r := ROUND(NEW.pnl / NEW.risk_usd, 2);
    ELSE
      NEW.actual_r := NULL;
    END IF;

    -- Set outcome
    NEW.outcome := CASE
      WHEN NEW.pnl > 0.01 THEN 'WIN'
      WHEN NEW.pnl < -0.01 THEN 'LOSS'
      ELSE 'BE'
    END;

    IF NEW.close_at IS NULL THEN
      NEW.close_at := NOW();
    END IF;

    -- Update portfolio
    IF TG_OP = 'UPDATE' AND OLD.exit_price IS NOT NULL THEN
      v_old_pnl := COALESCE(OLD.pnl, 0);
    END IF;

    UPDATE public.profiles
    SET
      total_pnl = COALESCE(total_pnl, 0) - v_old_pnl + NEW.pnl,
      current_portfolio = initial_portfolio + (COALESCE(total_pnl, 0) - v_old_pnl + NEW.pnl),
      updated_at = NOW()
    WHERE id = NEW.user_id;

  ELSE
    -- Trade is open (no exit_price and not risk-only with result)
    NEW.outcome := 'OPEN';
    NEW.pnl := NULL;
    NEW.actual_r := NULL;
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 7: Increment Trade Count (only on INSERT)
  -- ═══════════════════════════════════════

  IF TG_OP = 'INSERT' THEN
    SELECT account_type INTO v_account_type
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- 🔥 CRITICAL: platform_free blocked by RLS.
    -- BEFORE trigger runs BEFORE RLS - skip to prevent count inflation on failed inserts.
    IF v_account_type = 'platform_free' THEN
      RETURN NEW;
    END IF;

    UPDATE public.profiles
    SET
      billing_cycle_start = CASE
        WHEN v_account_type IN ('basic', 'premium', 'trial') THEN
          CASE
            WHEN billing_cycle_start IS NULL
              OR billing_cycle_start < DATE_TRUNC('month', CURRENT_DATE)
            THEN DATE_TRUNC('month', CURRENT_DATE)::DATE
            ELSE billing_cycle_start
          END
        ELSE
          COALESCE(billing_cycle_start, DATE_TRUNC('month', CURRENT_DATE)::DATE)
      END,
      current_month_trades_count = CASE
        WHEN v_account_type IN ('basic', 'premium', 'trial') THEN
          CASE
            WHEN billing_cycle_start IS NULL
              OR billing_cycle_start < DATE_TRUNC('month', CURRENT_DATE)
            THEN 1
            ELSE COALESCE(current_month_trades_count, 0) + 1
          END
        ELSE
          COALESCE(current_month_trades_count, 0) + 1
      END,
      trade_count = COALESCE(trade_count, 0) + 1
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 3. Backfill existing trades (trigger DISABLED so portfolio totals are NOT
--    recomputed — we only populate the new R columns and fix fake R).
-- ----------------------------------------------------------------------------
ALTER TABLE public.trades DISABLE TRIGGER handle_trade_changes_unified_trigger;

-- Freeze r_stop = current stop for all historical trades that have a stop.
UPDATE public.trades
SET r_stop_price = stop_price,
    r_stop_set_at = COALESCE(open_at, created_at, now()),
    r_locked_at   = COALESCE(open_at, created_at, now())
WHERE stop_price IS NOT NULL AND stop_price > 0;

-- Classify every row from the SIGNED entry→stop distance.
UPDATE public.trades
SET risk_class = CASE
      WHEN r_stop_price IS NULL OR r_stop_price <= 0 THEN 'no_stop'
      WHEN (side = 'LONG'  AND entry_price - r_stop_price > 0)
        OR (side = 'SHORT' AND r_stop_price - entry_price > 0) THEN 'risk_defined'
      ELSE 'risk_free'
    END
WHERE risk_class IS NULL;

-- Risk-Free historical trades: drop the previously-fake stop R, set locked profit.
-- (actual_user_r is intentionally preserved — it is account-based, not stop-based.)
UPDATE public.trades
SET risk_pts          = NULL,
    risk_usd          = NULL,
    user_risk_r       = NULL,
    actual_r          = NULL,
    locked_profit_usd = (ABS(entry_price - r_stop_price) * quantity * COALESCE(multiplier, 1)) - COALESCE(fees, 0)
WHERE risk_class = 'risk_free';

-- No-stop trades: clear any stale risk fields.
UPDATE public.trades
SET risk_pts          = NULL,
    risk_usd          = NULL,
    locked_profit_usd = NULL
WHERE risk_class = 'no_stop';

ALTER TABLE public.trades ENABLE TRIGGER handle_trade_changes_unified_trigger;

-- ----------------------------------------------------------------------------
-- Rollback (manual, if ever needed):
--   ALTER TABLE public.trades
--     DROP COLUMN IF EXISTS r_stop_price, DROP COLUMN IF EXISTS r_stop_set_at,
--     DROP COLUMN IF EXISTS r_locked_at,  DROP COLUMN IF EXISTS risk_class,
--     DROP COLUMN IF EXISTS locked_profit_usd;
--   -- and re-apply the previous handle_trade_changes_unified() definition.
-- ----------------------------------------------------------------------------
