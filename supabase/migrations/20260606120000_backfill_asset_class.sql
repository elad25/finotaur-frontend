-- Migration: backfill / normalize existing trades rows
-- Purpose: idempotent one-time cleanup of historical asset_class values that
--   were stored in non-canonical form before the normalize_asset_class() function
--   was introduced. Safe to re-run — WHERE clauses ensure no-ops on already-clean rows.
--
-- Known dirty rows fixed by this migration:
--   - QBTS trade: asset_class was stored as 'opt' → normalized to 'options'
--   - A trade with asset_class 'stk' → normalized to 'stock'

BEGIN;

-- Step 1: normalize asset_class to canonical values
UPDATE public.trades
SET asset_class = public.normalize_asset_class(asset_class)
WHERE asset_class IS NOT NULL
  AND asset_class IS DISTINCT FROM public.normalize_asset_class(asset_class);

-- Step 2: apply default US equity options multiplier (100) for options rows
--   that were inserted without an explicit multiplier or with the stock default of 1
UPDATE public.trades
SET multiplier = 100
WHERE asset_class = 'options'
  AND (multiplier IS NULL OR multiplier = 1);

-- Step 3: populate underlying_symbol from symbol for options rows where it is missing
--   (e.g. QBTS250117C00005000 — underlying = QBTS)
UPDATE public.trades
SET underlying_symbol = symbol
WHERE asset_class = 'options'
  AND underlying_symbol IS NULL;

COMMIT;
