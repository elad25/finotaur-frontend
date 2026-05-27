-- ============================================
-- Pattern Engine Phase 1.5a — Earnings Keyword Signals (catalyst stack L1 data layer)
-- ============================================
-- Persists every match of one of 5 catalyst keywords ("sold out",
-- "capacity constrained", "demand fulfillment", "long-term supply
-- agreement", "record bookings") found in Polygon earnings press
-- release titles + descriptions. One row per (article × ticker × keyword)
-- tuple. Peer co-occurrence (2+ tickers in same sector mentioning the
-- same keyword in 30d) is computed on read via SQL, not persisted.
--
-- Writer:  finotaur-server/src/ai/aggregators/earnings-keyword-aggregator.js
-- Reader:  Phase 2 Rule 1 (Beat+Raise+AI) + Rule 8 (Consumer warning) detectors
-- Cron:    22:00 ET weekdays via node-cron in finotaur-server boot
-- Source:  Polygon /v2/reference/news (free tier, already paid)
-- ============================================

CREATE TABLE IF NOT EXISTS earnings_keyword_signals (
  id             BIGSERIAL    NOT NULL UNIQUE,
  signal_date    DATE         NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/New_York')::date,
  ticker         TEXT         NOT NULL,
  keyword        TEXT         NOT NULL,
  matched_text   TEXT         NOT NULL,
  article_title  TEXT         NOT NULL,
  article_url    TEXT         NOT NULL,
  publisher      TEXT,
  published_utc  TIMESTAMPTZ  NOT NULL,
  sector         TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (article_url, ticker, keyword),
  CHECK (keyword IN (
    'sold_out',
    'capacity_constrained',
    'demand_fulfillment',
    'long_term_supply_agreement',
    'record_bookings'
  ))
);

CREATE INDEX IF NOT EXISTS idx_earnings_keyword_signals_date
  ON earnings_keyword_signals (signal_date DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_keyword_signals_ticker_kw_date
  ON earnings_keyword_signals (ticker, keyword, signal_date DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_keyword_signals_sector_kw_date
  ON earnings_keyword_signals (sector, keyword, signal_date DESC)
  WHERE sector IS NOT NULL;

ALTER TABLE earnings_keyword_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on earnings_keyword_signals" ON earnings_keyword_signals;

CREATE POLICY "Service role full access on earnings_keyword_signals"
  ON earnings_keyword_signals
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE earnings_keyword_signals IS
  'Pattern Engine Phase 1.5a — earnings press-release keyword catches (Polygon news). Feeds Phase 2 Rules 1 + 8 detectors. PK (article_url, ticker, keyword) dedups per-article rescans.';

COMMENT ON COLUMN earnings_keyword_signals.keyword IS
  'One of 5 catalyst keywords: sold_out | capacity_constrained | demand_fulfillment | long_term_supply_agreement | record_bookings. CHECK constraint enforces enum.';

COMMENT ON COLUMN earnings_keyword_signals.matched_text IS
  'The sentence or excerpt containing the keyword hit, for evidence display.';

COMMENT ON COLUMN earnings_keyword_signals.sector IS
  'Sector from SECTOR_CONFIG lookup at write time. NULL if ticker not in curated universe. Enables peer-co-occurrence queries (2+ tickers in same sector mentioning same keyword in 30d).';

COMMENT ON COLUMN earnings_keyword_signals.signal_date IS
  'ET date when the keyword was extracted. Used for daily counter queries.';
