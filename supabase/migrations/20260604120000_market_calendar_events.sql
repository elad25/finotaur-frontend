-- Calendar feature: single Supabase-backed cache table for all 7 tabs.
-- Populated by finotaur-server node-cron (weekly full build + daily actuals refresh).
-- Read by GET /api/all-markets/calendar (served behind CDN). NO Polygon anywhere.

CREATE TABLE IF NOT EXISTS public.market_calendar_events (
  id            BIGSERIAL PRIMARY KEY,
  category      TEXT        NOT NULL,           -- economic|holidays|earnings|dividends|splits|ipo|expiration
  event_date    DATE        NOT NULL,           -- normalized YYYY-MM-DD (ex-date for dividends)
  dedup_key     TEXT        NOT NULL,           -- stable natural key for upsert
  country_code  TEXT,                           -- economic/holidays country filter
  symbol        TEXT,                           -- equity tabs search
  details       JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- full per-tab payload, shaped for the frontend
  source        TEXT        NOT NULL DEFAULT 'nasdaq_public', -- nasdaq_public | calculated | static
  scanned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_calendar_dedup UNIQUE (category, dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_calendar_cat_date
  ON public.market_calendar_events (category, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_country
  ON public.market_calendar_events (category, country_code, event_date);

COMMENT ON TABLE public.market_calendar_events IS
  'Calendar tabs cache (economic/holidays/earnings/dividends/splits/ipo/expiration). Written by finotaur-server calendarCron (weekly build + daily actuals). Read-mostly, served behind CDN. No Polygon.';

ALTER TABLE public.market_calendar_events ENABLE ROW LEVEL SECURITY;

-- Public read-only: calendar is public market data (anon + authenticated).
CREATE POLICY "public_read_calendar"
  ON public.market_calendar_events
  FOR SELECT
  USING (true);

-- Service role: full write access (the scanner). service_role bypasses RLS anyway,
-- but the explicit policy documents intent and covers any future restricted role.
CREATE POLICY "service_role_write_calendar"
  ON public.market_calendar_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
