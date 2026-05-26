-- =====================================================
-- Migration: add prev_close to sector_snapshots
-- Date: 2026-05-25
-- =====================================================
-- Context: The sector_snapshots `price` column carries the LATEST quote
-- from Yahoo/FMP. On weekends/holidays the underlying API returns null or
-- 0, so the UI ends up showing "$0.00" or em-dashes instead of Friday's
-- actual closing price.
--
-- Fix: persist the `previousClose` field that Yahoo/FMP already return
-- alongside the live quote, into a dedicated `prev_close` column. The UI
-- (and any downstream consumer) can then fall back to `prev_close`
-- whenever `price` is null/0 — so weekend/holiday/pre-market visits
-- never see an empty headline.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). Nullable so existing rows
-- aren't rejected; the writer cron backfills on the next run.
-- =====================================================

ALTER TABLE public.sector_snapshots
  ADD COLUMN IF NOT EXISTS prev_close numeric(10,2);

COMMENT ON COLUMN public.sector_snapshots.prev_close IS
  'Last trading session''s closing price for the sector ETF. Populated by '
  'sector-refresh cron from Yahoo/FMP regularMarketPreviousClose. The UI '
  'falls back to this value when `price` is null or 0 (weekends/holidays/'
  'pre-market) so the headline always shows a meaningful number.';
