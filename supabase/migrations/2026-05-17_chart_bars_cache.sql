-- ============================================
-- Chart Bars Cache
-- ============================================
-- OHLCV cache for the FinotaurChart system. Shared across all users — two
-- traders looking at MNQ 5m on the same day pull from the same rows. Designed
-- for the post-launch path of thousands of concurrent traders.
--
-- Used by:    supabase/functions/chart-bars (Edge Function, service-role only)
-- Read from:  YahooFinanceSource via the Edge Function (no direct client access)
-- Write by:   chart-bars Edge Function after a Yahoo fetch fills a gap
--
-- DURABILITY MODEL:
--   Historical bars are immutable. Once `bar_time + interval_seconds < now`
--   the candle never changes. We UPSERT with ON CONFLICT DO NOTHING so two
--   concurrent fills don't race-overwrite each other.
--
--   The currently-forming bar (where bar_time + interval > now - 60s) is NOT
--   cached — the Edge Function always re-fetches that edge bar from Yahoo.
--
-- CAPACITY (rough envelope):
--   ~100 active symbols × 5 intervals × ~50k bars/year ≈ 25M rows/year ≈ 2 GB.
--   Cleanup of >1 year old rows is a Phase 1 cron problem.
--
-- SECURITY:
--   RLS enabled, NO policies. Anon + authenticated clients are denied entirely.
--   The Edge Function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- ============================================

CREATE TABLE IF NOT EXISTS public.chart_bars_cache (
  -- Source-native symbol (Yahoo: e.g. 'MNQ=F', 'AAPL', '^NDX')
  symbol     TEXT NOT NULL,

  -- Interval string in our internal vocabulary
  -- ('1m', '5m', '15m', '30m', '60m', '1h', '4h', '1d', '1wk', '1mo')
  interval   TEXT NOT NULL,

  -- Bar open time in Unix seconds (UTC)
  bar_time   BIGINT NOT NULL,

  -- OHLCV — NUMERIC(20,8) covers crypto precision AND keeps equity/futures clean
  open       NUMERIC(20, 8) NOT NULL,
  high       NUMERIC(20, 8) NOT NULL,
  low        NUMERIC(20, 8) NOT NULL,
  close      NUMERIC(20, 8) NOT NULL,
  volume     NUMERIC(20, 8),

  -- Provenance — currently always 'yahoo' (Binance is fetched client-direct).
  -- Reserved for future TwelveData / Polygon fallbacks.
  source     TEXT NOT NULL DEFAULT 'yahoo',

  -- When the Edge Function wrote this row (debug + future TTL/cleanup)
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (symbol, interval, bar_time)
);

-- Range scans by (symbol, interval) ordered DESC are the dominant query
-- pattern (Edge Function reads the most recent N bars for a window).
CREATE INDEX IF NOT EXISTS idx_chart_bars_cache_range
  ON public.chart_bars_cache (symbol, interval, bar_time DESC);

ALTER TABLE public.chart_bars_cache ENABLE ROW LEVEL SECURITY;
-- No policies intentionally — denies anon + authenticated.
-- Edge Function uses service-role key (bypasses RLS).

COMMENT ON TABLE public.chart_bars_cache IS
  'OHLC bars cache for FinotaurChart. Written by chart-bars Edge Function via service role. Historical bars are immutable. Currently-forming bar never cached. Phase 1+ adds a cron to prune rows older than 1 year.';

COMMENT ON COLUMN public.chart_bars_cache.bar_time IS
  'Unix seconds (UTC). Matches lightweight-charts UTCTimestamp.';

COMMENT ON COLUMN public.chart_bars_cache.interval IS
  'Internal interval vocabulary: 1m, 5m, 15m, 30m, 60m, 1h, 4h, 1d, 1wk, 1mo.';
