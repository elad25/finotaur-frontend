-- Multi-leg options support — ADDITIVE, forward-only.
--
-- A multi-leg options trade (vertical spread, iron condor, straddle, etc.) is
-- modeled as ONE parent `trades` row + N child `trade_legs` rows:
--   * The parent trades row carries the NET premium (entry_price) and the NET
--     P&L (pnl), written by the app through the existing input_mode='risk-only'
--     path. Portfolio P&L therefore counts each spread exactly once.
--   * Each trade_legs row holds one option leg's detail.
--
-- The handle_trade_changes_unified trigger on `trades` is NOT touched: net P&L
-- is computed in the app layer and supplied on the parent row. No trigger runs
-- on trade_legs.
--
-- Single-leg options are unaffected (leg_count NULL or 1, no trade_legs rows).

-- 1. Additive nullable columns on trades (no DEFAULT that the trigger must set,
--    no CHECK — app-layer validated, consistent with ADL-013).
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS leg_count     smallint,   -- NULL/1 = single, >1 = multi-leg
  ADD COLUMN IF NOT EXISTS strategy_type text;       -- 'vertical' | 'iron_condor' | 'straddle' | ... (app-validated)

COMMENT ON COLUMN public.trades.leg_count     IS 'Number of option legs for a multi-leg options trade (>1). NULL/1 = single-leg.';
COMMENT ON COLUMN public.trades.strategy_type IS 'Options strategy archetype for a multi-leg trade (app-validated, no DB enum).';

-- 2. Child table: one row per option leg.
CREATE TABLE IF NOT EXISTS public.trade_legs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id        uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  leg_number      smallint NOT NULL,            -- 1..N display/entry order

  option_type     text NOT NULL,                -- 'CALL' | 'PUT'
  strike_price    numeric NOT NULL,
  expiration_date date,                          -- per-leg (usually shared across the spread)
  side            text NOT NULL,                -- 'LONG' | 'SHORT'
  quantity        numeric NOT NULL,             -- contracts for this leg
  entry_price     numeric NOT NULL,             -- premium per share at entry
  exit_price      numeric,                       -- premium per share at close (NULL while open)
  fees            numeric DEFAULT 0,
  gross_pnl       numeric,                       -- app-computed signed P&L for this leg (NULL while open)

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trade_legs_option_type_check CHECK (option_type IN ('CALL','PUT')),
  CONSTRAINT trade_legs_side_check        CHECK (side IN ('LONG','SHORT')),
  CONSTRAINT trade_legs_leg_number_check  CHECK (leg_number BETWEEN 1 AND 8)
);

CREATE INDEX IF NOT EXISTS idx_trade_legs_trade_id ON public.trade_legs(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_legs_user_id  ON public.trade_legs(user_id);

COMMENT ON TABLE public.trade_legs IS
  'Per-leg detail for multi-leg options trades. One parent public.trades row + N legs. '
  'Net premium and net P&L live on the parent (app-computed). FK cascades on parent delete.';

-- 3. RLS — mirror the trades table policy shape exactly.
ALTER TABLE public.trade_legs ENABLE ROW LEVEL SECURITY;

-- SELECT: owner, accepted mentor of owner, or admin-in-admin-mode (matches trades_select_unified).
CREATE POLICY trade_legs_select_unified ON public.trade_legs
  FOR SELECT
  USING (
    (user_id = auth.uid())
    OR is_accepted_mentor_of(user_id)
    OR (rls_check_admin() AND rls_check_admin_mode())
  );

-- INSERT: owner (matches trades_insert_with_limits).
CREATE POLICY trade_legs_insert_own ON public.trade_legs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- INSERT: service_role (matches trades_insert_service_role) — for broker-imported spreads.
CREATE POLICY trade_legs_insert_service_role ON public.trade_legs
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: owner (matches trades_update_own).
CREATE POLICY trade_legs_update_own ON public.trade_legs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: owner (matches trades_delete_own).
CREATE POLICY trade_legs_delete_own ON public.trade_legs
  FOR DELETE
  USING (user_id = auth.uid());
