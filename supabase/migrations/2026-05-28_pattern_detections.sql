-- Phase 2a — pattern_detections table
-- Persists every detector run (matched=true AND matched=false rows kept for backtest + threshold tuning).
-- Partial indexes on matched=TRUE for fast hot-path queries.
-- RLS: service_role only (no end-user read/write).

CREATE TABLE IF NOT EXISTS pattern_detections (
  id                  BIGSERIAL    NOT NULL UNIQUE,
  detection_date      DATE         NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/New_York')::date,
  rule_id             TEXT         NOT NULL,
  ticker              TEXT         NOT NULL,
  pattern_type        TEXT         NOT NULL,
  matched             BOOLEAN      NOT NULL,
  confidence          NUMERIC(4,3) NOT NULL,
  evidence_text       TEXT,
  invalidation_text   TEXT,
  raw_signals         JSONB        NOT NULL DEFAULT '{}'::jsonb,
  detector_version    TEXT         NOT NULL DEFAULT 'v1',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (detection_date, rule_id, ticker),
  CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_pattern_detections_matched
  ON pattern_detections (detection_date DESC, matched, rule_id)
  WHERE matched = TRUE;

CREATE INDEX IF NOT EXISTS idx_pattern_detections_ticker
  ON pattern_detections (ticker, detection_date DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_detections_pattern_type
  ON pattern_detections (pattern_type, detection_date DESC)
  WHERE matched = TRUE;

ALTER TABLE pattern_detections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on pattern_detections" ON pattern_detections;
CREATE POLICY "Service role full access on pattern_detections"
  ON pattern_detections FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
