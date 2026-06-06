-- Migration: handle_trade_changes_unified() — options lifecycle insertions
-- Purpose: add three surgical blocks immediately after BEGIN in the existing
--   BEFORE INSERT/UPDATE trigger function, before any multiplier/pnl computation:
--   1. Self-healing asset_class normalization via normalize_asset_class().
--   2. Default US equity options contract multiplier (100) when not explicitly set.
--   3. Expired-worthless settlement. The existing regular-mode P&L branch (STEP 6)
--      requires exit_price > 0, so a $0 expiry would otherwise be mis-booked as OPEN.
--      We route expired-worthless options through the existing, tested risk-only
--      settlement path: supply pnl directly (long = full premium loss, short = full
--      premium kept) and let STEP 6 derive outcome / R-multiples / portfolio update.
--
-- The entire rest of the function body is reproduced VERBATIM from the LIVE
-- production definition (pg_get_functiondef, project xsgbtptkueabylkxibly), NOT from
-- the stale CURRENT_SCHEMA.sql dump — to avoid regressing production. The trigger
-- binding itself is BEFORE INSERT OR UPDATE and is NOT modified by this migration
-- (CREATE OR REPLACE FUNCTION replaces only the function body; owner/grants/comment
-- and the existing trigger timing are preserved).

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
  -- STEP 2: Calculate Risk & Reward Points
  -- ═══════════════════════════════════════

  -- Risk Points (Entry → Stop)
  IF NEW.stop_price IS NOT NULL AND NEW.stop_price > 0 THEN
    NEW.risk_pts := ABS(NEW.entry_price - NEW.stop_price);
  END IF;

  -- Reward Points (Entry → Take Profit)
  IF NEW.take_profit_price IS NOT NULL THEN
    NEW.reward_pts := CASE
      WHEN NEW.side = 'LONG' THEN NEW.take_profit_price - NEW.entry_price
      WHEN NEW.side = 'SHORT' THEN NEW.entry_price - NEW.take_profit_price
      ELSE 0
    END;
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 3: Calculate Risk & Reward USD
  -- ═══════════════════════════════════════

  IF NEW.stop_price IS NOT NULL AND NEW.stop_price > 0 THEN
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
      IF NEW.risk_usd IS NOT NULL AND NEW.risk_usd > 0 THEN
        NEW.actual_r := ROUND(NEW.pnl / NEW.risk_usd, 2);
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
    IF NEW.risk_usd IS NOT NULL AND NEW.risk_usd > 0 THEN
      NEW.actual_r := ROUND(NEW.pnl / NEW.risk_usd, 2);
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
