-- ============================================
-- Pattern Engine Phase 1.5c — Stock Universe Daily (catalyst stack L2 pre-catalyst scanner)
-- ============================================
-- Daily per-ticker snapshot of YTD performance + last/prev close, for
-- 110 curated tickers from SECTOR_CONFIG. Powers Phase 2 composite
-- pre-catalyst filter: "up X%+ YTD AND earnings within Y days AND
-- 2+ PT raises L30D" (Rule 4 funding-squeeze + Rule 3 triple-PT
-- compositional gating).
--
-- Writer:  finotaur-server/src/ai/aggregators/universe-scanner.js
-- Reader:  Phase 2 Rule 4 + composite filter logic (next phases)
-- Cron:    22:45 ET weekdays via node-cron (after analyst-pt cron at 22:30)
-- Source:  Polygon /v2/aggs/ticker/<T>/range/1/day (free tier)
-- Beta / IV: deferred to a future 1.5c-v2 (require options-chain + 5yr returns
--            against benchmark — heavier compute; not needed for v1 composite
--            screens that key off YTD%).
-- ============================================

CREATE TABLE IF NOT EXISTS stock_universe_daily (
  snapshot_date     DATE         NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/New_York')::date,
  ticker            TEXT         NOT NULL,
  sector            TEXT,
  ytd_pct           NUMERIC(8,2),
  last_close        NUMERIC(12,4),
  prev_close        NUMERIC(12,4),
  year_start_close  NUMERIC(12,4),
  bars_in_year      INTEGER,
  fetched_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (snapshot_date, ticker)
);

CREATE INDEX IF NOT EXISTS idx_stock_universe_daily_ticker_date
  ON stock_universe_daily (ticker, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_universe_daily_ytd_top
  ON stock_universe_daily (snapshot_date DESC, ytd_pct DESC)
  WHERE ytd_pct IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_universe_daily_sector_ytd
  ON stock_universe_daily (snapshot_date DESC, sector, ytd_pct DESC)
  WHERE sector IS NOT NULL;

ALTER TABLE stock_universe_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on stock_universe_daily" ON stock_universe_daily;

CREATE POLICY "Service role full access on stock_universe_daily"
  ON stock_universe_daily
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE stock_universe_daily IS
  'Pattern Engine Phase 1.5c — per-ticker daily snapshot of YTD% + last/prev close + year-start-close. PK (snapshot_date, ticker). Source: Polygon aggs. Beta + IV deferred to v2.';

COMMENT ON COLUMN stock_universe_daily.ytd_pct IS
  'Year-to-date percent change. Computed as (last_close - year_start_close) / year_start_close * 100. NULL if year_start_close unavailable.';

COMMENT ON COLUMN stock_universe_daily.year_start_close IS
  'Close price on first trading day of the current calendar year, from Polygon /v2/aggs daily bars (adjusted=true).';

COMMENT ON COLUMN stock_universe_daily.bars_in_year IS
  'Count of trading bars returned by Polygon for the YTD window. Sanity check — should be 1 to ~252; near-zero indicates data gap and ytd_pct may be unreliable.';

COMMENT ON COLUMN stock_universe_daily.sector IS
  'Sector from SECTOR_CONFIG inlined in the aggregator. NULL only if ticker is not in the curated 110-ticker universe.';
