-- Wave 2 / Sub-wave B — Crypto support (ADDITIVE, nullable, forward-only)
-- Adds leverage / margin / perpetual-funding columns to public.trades.
-- No existing row is touched. App-layer validation (ADL-013).

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS leverage          numeric,  -- e.g. 10 for 10x; NULL/1 = spot
  ADD COLUMN IF NOT EXISTS position_type     text,     -- 'spot' | 'perpetual' | 'margin'
  ADD COLUMN IF NOT EXISTS liquidation_price numeric,  -- computed at entry from leverage + collateral
  ADD COLUMN IF NOT EXISTS funding_paid      numeric;  -- cumulative funding cost for perpetuals

COMMENT ON COLUMN public.trades.leverage          IS 'Leverage multiple (crypto/forex). NULL or 1 = unleveraged/spot.';
COMMENT ON COLUMN public.trades.position_type     IS 'spot | perpetual | margin (crypto). App-layer validated.';
COMMENT ON COLUMN public.trades.liquidation_price IS 'Liquidation price for leveraged positions.';
COMMENT ON COLUMN public.trades.funding_paid      IS 'Cumulative funding cost paid/received on a perpetual.';
