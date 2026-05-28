-- Pattern Engine — Phase 3 §2.5 (optional, schema only)
-- Tracks the realized outcome of each pattern_detections row
-- after the horizon expires. Backfill cron + measurement logic
-- arrive in Phase 5.

CREATE TABLE IF NOT EXISTS pattern_outcomes (
  id               BIGSERIAL     NOT NULL UNIQUE,
  detection_id     BIGINT        NOT NULL REFERENCES pattern_detections(id) ON DELETE CASCADE,
  measured_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  horizon_days     INT           NOT NULL,
  entry_price      NUMERIC(12,4),
  exit_price       NUMERIC(12,4),
  return_pct       NUMERIC(8,4),
  hit_target       BOOLEAN,
  hit_invalidation BOOLEAN,
  notes            TEXT,
  PRIMARY KEY (detection_id, horizon_days, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_pattern_outcomes_detection
  ON pattern_outcomes (detection_id);

ALTER TABLE pattern_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on pattern_outcomes" ON pattern_outcomes;
CREATE POLICY "Service role full access on pattern_outcomes"
  ON pattern_outcomes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE pattern_outcomes IS
  'Phase 5 — realized outcomes of pattern detections. One row per (detection_id, horizon_days, measured_at). Backfill cron and entry/exit logic land in Phase 5.';
