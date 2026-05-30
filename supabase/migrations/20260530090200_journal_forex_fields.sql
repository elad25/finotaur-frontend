-- Wave 2 / Sub-wave C — Forex / multi-currency support (ADDITIVE, nullable, forward-only)
-- Adds currency-pair and account-currency columns to public.trades so pip value can be
-- computed correctly per pair and converted to the account currency.
-- No existing row is touched. App-layer validation (ADL-013).

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS base_currency    text,     -- e.g. 'EUR' in EUR/USD
  ADD COLUMN IF NOT EXISTS quote_currency   text,     -- e.g. 'USD' in EUR/USD
  ADD COLUMN IF NOT EXISTS account_currency text,     -- account denomination, e.g. 'USD' | 'GBP'
  ADD COLUMN IF NOT EXISTS quote_rate       numeric,  -- quote-ccy -> account-ccy conversion at close
  ADD COLUMN IF NOT EXISTS pip_size         numeric,  -- override of auto-detected pip size
  ADD COLUMN IF NOT EXISTS lot_size         numeric;  -- units per lot (e.g. 100000 standard)

COMMENT ON COLUMN public.trades.base_currency    IS 'Base currency of a forex pair (forex only).';
COMMENT ON COLUMN public.trades.quote_currency   IS 'Quote currency of a forex pair (forex only).';
COMMENT ON COLUMN public.trades.account_currency IS 'Account denomination currency for P&L conversion.';
COMMENT ON COLUMN public.trades.quote_rate       IS 'Quote-currency to account-currency rate used for conversion.';
COMMENT ON COLUMN public.trades.pip_size         IS 'Manual pip-size override (else auto-detected).';
COMMENT ON COLUMN public.trades.lot_size         IS 'Units per lot for forex (e.g. 100000 = standard lot).';
