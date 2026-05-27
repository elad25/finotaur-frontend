-- ============================================
-- Pattern Engine Phase 1 — Positioning Snapshots (weekly)
-- ============================================
-- Weekly snapshot of institutional / hedge-fund positioning.
-- Writer:  finotaur-server/src/ai/aggregators/positioning-aggregator.js
-- Reader:  Phase 3 synthesizer (NOT wired in Phase 1)
-- Cron:    07:30 ET Mondays via node-cron in finotaur-server boot
-- Sources: SEC EDGAR 13F (top-50 hedge funds curated list), Polygon institutional (if tier supports)
-- ============================================

CREATE TABLE IF NOT EXISTS positioning_snapshots_weekly (
  id                  BIGSERIAL                NOT NULL UNIQUE,
  snapshot_week_start DATE                     PRIMARY KEY,
  tickers             JSONB                    NOT NULL DEFAULT '{}'::jsonb,
  source              TEXT                     NOT NULL DEFAULT 'sec_edgar_13f',
  fetched_at          TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positioning_snapshots_weekly_fetched
  ON positioning_snapshots_weekly (fetched_at DESC);

ALTER TABLE positioning_snapshots_weekly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on positioning_snapshots_weekly" ON positioning_snapshots_weekly;

CREATE POLICY "Service role full access on positioning_snapshots_weekly"
  ON positioning_snapshots_weekly
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE positioning_snapshots_weekly IS
  'Pattern Engine Phase 1 — weekly positioning snapshot (SEC EDGAR 13F + optional Polygon institutional). Write-only in Phase 1; read by Phase 3 synthesizer. PK is the Monday of the snapshot week.';

COMMENT ON COLUMN positioning_snapshots_weekly.tickers IS
  'Per-ticker positioning. Shape: { "<TICKER>": { hf_long_pct: number, hf_long_pct_percentile_5y: number, ownership_delta: number, n_funds: int } }';

COMMENT ON COLUMN positioning_snapshots_weekly.source IS
  'Primary data source label. Default: sec_edgar_13f. May be polygon_institutional or hybrid in future.';

COMMENT ON COLUMN positioning_snapshots_weekly.snapshot_week_start IS
  'Monday of the snapshot week (ISO). Cron fires 07:30 ET Mondays; this column holds that Monday''s date.';
