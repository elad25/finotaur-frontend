-- ============================================
-- Pattern Engine Phase 1.5b — Analyst PT Revisions (catalyst stack L2 data layer)
-- ============================================
-- Persists every analyst price-target revision extracted from Polygon
-- news articles by Haiku 4.5 structured-output tool. One row per
-- (article × ticker) tuple. Phase 2 Rule 3 (Triple PT, +50%) detector
-- reads `triple_pt_qualifies = true` rows in last 30d.
--
-- Writer:  finotaur-server/src/ai/aggregators/analyst-pt-aggregator.js
-- Reader:  Phase 2 Rule 3 detector (next phases)
-- Cron:    22:30 ET weekdays via node-cron (after earnings-keyword cron at 22:00)
-- Source:  Polygon /v2/reference/news (free) + Haiku 4.5 extraction (~$2/mo)
-- ============================================

CREATE TABLE IF NOT EXISTS analyst_pt_revisions (
  id                  BIGSERIAL    NOT NULL UNIQUE,
  revision_date       DATE         NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/New_York')::date,
  ticker              TEXT         NOT NULL,
  analyst             TEXT         NOT NULL,
  direction           TEXT         NOT NULL,
  old_pt              NUMERIC(10,2),
  new_pt              NUMERIC(10,2),
  pt_change_pct       NUMERIC(8,2),
  triple_pt_qualifies BOOLEAN      NOT NULL DEFAULT FALSE,
  rating              TEXT,
  article_url         TEXT         NOT NULL,
  article_title       TEXT,
  published_utc       TIMESTAMPTZ  NOT NULL,
  raw_extraction      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  extraction_model    TEXT         NOT NULL DEFAULT 'claude-haiku-4-5',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (article_url, ticker),
  CHECK (direction IN ('raise', 'lower', 'initiate', 'maintain', 'reiterate'))
);

CREATE INDEX IF NOT EXISTS idx_analyst_pt_revisions_date
  ON analyst_pt_revisions (revision_date DESC);

CREATE INDEX IF NOT EXISTS idx_analyst_pt_revisions_ticker_date
  ON analyst_pt_revisions (ticker, revision_date DESC);

CREATE INDEX IF NOT EXISTS idx_analyst_pt_revisions_triple_pt
  ON analyst_pt_revisions (revision_date DESC, ticker)
  WHERE triple_pt_qualifies = TRUE;

CREATE INDEX IF NOT EXISTS idx_analyst_pt_revisions_analyst_date
  ON analyst_pt_revisions (analyst, revision_date DESC);

ALTER TABLE analyst_pt_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on analyst_pt_revisions" ON analyst_pt_revisions;

CREATE POLICY "Service role full access on analyst_pt_revisions"
  ON analyst_pt_revisions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE analyst_pt_revisions IS
  'Pattern Engine Phase 1.5b — analyst price-target revisions extracted from Polygon news via Haiku 4.5. PK (article_url, ticker). Feeds Phase 2 Rule 3 (Triple PT). triple_pt_qualifies flag set when pt_change_pct >= 50.';

COMMENT ON COLUMN analyst_pt_revisions.direction IS
  'Action type. CHECK constraint: raise | lower | initiate | maintain | reiterate.';

COMMENT ON COLUMN analyst_pt_revisions.pt_change_pct IS
  'Percentage change from old_pt to new_pt. NULL if old_pt is null (e.g., initiate coverage). Computed at write time by aggregator.';

COMMENT ON COLUMN analyst_pt_revisions.triple_pt_qualifies IS
  'TRUE when pt_change_pct >= 50 (the "Triple PT" rule threshold per ADL-039 Rule 3). Computed at write time. Partial index for fast Rule 3 detector lookups.';

COMMENT ON COLUMN analyst_pt_revisions.raw_extraction IS
  'Full Haiku tool_use input JSON for audit + reprocessing. Includes confidence, source quote, any extra fields the model returned.';

COMMENT ON COLUMN analyst_pt_revisions.extraction_model IS
  'Anthropic model ID that produced this row. Default claude-haiku-4-5. Allows future re-extraction with newer models without losing old rows.';
