-- Journal options: record the expiration outcome of a single-leg option trade.
--
-- option_outcome captures how an option position ended, distinct from the
-- generic WIN/LOSS/BE outcome:
--   'expired_worthless'  the option expired with no value (exit_price = 0)
--   'assigned'           a short option was assigned
--   'exercised'          a long option was exercised
--   NULL                 normal close / not applicable (default)
--
-- Consistent with the 2026-05-30 options migration (ADL-013):
--   * NULLABLE, no DEFAULT — existing rows are unaffected.
--   * NO CHECK constraint — value set is validated in the app layer, so we
--     never risk failing inserts on the legacy NULL-asset_class rows or the
--     handle_trade_changes_unified trigger (which is NOT touched here).
--
-- This column is additive only. Nothing reads it until the app is deployed.

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS option_outcome text;
