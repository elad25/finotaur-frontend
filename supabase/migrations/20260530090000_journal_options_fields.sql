-- Wave 2 / Sub-wave A — Options support (ADDITIVE, nullable, forward-only)
-- Adds option-specific columns to public.trades. No existing row is touched.
-- Validation lives in the app layer (ADL-013), not as CHECK constraints, to avoid
-- breaking the 40 existing NULL-asset_class rows.

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS option_type      text,   -- 'CALL' | 'PUT' (app-validated)
  ADD COLUMN IF NOT EXISTS strike_price     numeric,
  ADD COLUMN IF NOT EXISTS expiration_date  date;

COMMENT ON COLUMN public.trades.option_type     IS 'CALL | PUT (options only). App-layer validated.';
COMMENT ON COLUMN public.trades.strike_price    IS 'Option strike price (options only).';
COMMENT ON COLUMN public.trades.expiration_date IS 'Option expiration date (options only).';

-- Note: contract multiplier for options = 100, stored in the existing trades.multiplier column.
-- entry_price / exit_price hold the option premium per share. underlying_symbol already exists.
