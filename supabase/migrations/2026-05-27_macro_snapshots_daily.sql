-- ============================================
-- Pattern Engine Phase 1 — Macro Context Snapshots (daily)
-- ============================================
-- Daily snapshot of macro context fed to the Pattern Engine synthesizer.
-- Writer:  finotaur-server/src/ai/aggregators/macro-context-aggregator.js
-- Reader:  Phase 3 synthesizer (NOT wired in Phase 1 — table is write-only this phase)
-- Cron:    06:00 ET weekdays via node-cron in finotaur-server boot
-- Sources: FRED (DGS2/DGS10/DGS30/T10Y2Y/T10YIE), Polygon (CL/BZ/GC/HG/NG/VIX + news)
-- ============================================

CREATE TABLE IF NOT EXISTS macro_snapshots_daily (
  id            BIGSERIAL                NOT NULL UNIQUE,
  snapshot_date DATE                     PRIMARY KEY,
  regime        TEXT,
  indicators    JSONB                    NOT NULL DEFAULT '{}'::jsonb,
  fed           JSONB                    NOT NULL DEFAULT '{}'::jsonb,
  global        JSONB                    NOT NULL DEFAULT '{}'::jsonb,
  geopolitics   JSONB                    NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_macro_snapshots_daily_created
  ON macro_snapshots_daily (created_at DESC);

ALTER TABLE macro_snapshots_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on macro_snapshots_daily" ON macro_snapshots_daily;

CREATE POLICY "Service role full access on macro_snapshots_daily"
  ON macro_snapshots_daily
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE macro_snapshots_daily IS
  'Pattern Engine Phase 1 — daily macro snapshot (FRED + Polygon). Write-only in Phase 1; read by Phase 3 synthesizer.';

COMMENT ON COLUMN macro_snapshots_daily.indicators IS
  'Market indicators: commodities (CL/BZ/GC/HG/NG) + VIX. Shape: { vix:number, commodities:{ wti:number, brent:number, gold:number, copper:number, natgas:number } }';

COMMENT ON COLUMN macro_snapshots_daily.fed IS
  'FRED bonds/yields. Shape: { dgs2:number, dgs10:number, dgs30:number, t10y2y:number, t10yie:number }';

COMMENT ON COLUMN macro_snapshots_daily.global IS
  'Reserved for Phase 2+ (FX / global indices). Empty {} in Phase 1.';

COMMENT ON COLUMN macro_snapshots_daily.geopolitics IS
  'Polygon news keyword counts past 7d. Shape: { hormuz:int, iran:int, opec:int, russia:int, china_taiwan:int, hormuz_active:boolean }';

COMMENT ON COLUMN macro_snapshots_daily.regime IS
  'Optional market-regime label (risk_on / risk_off / mixed). Computed in Phase 3; nullable in Phase 1.';
