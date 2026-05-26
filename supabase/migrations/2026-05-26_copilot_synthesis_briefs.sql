CREATE TABLE IF NOT EXISTS copilot_synthesis_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model text NOT NULL,
  cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  visibility text NOT NULL DEFAULT 'live' CHECK (visibility IN ('draft','live')),
  qa_score int,
  central_thesis text,
  macro_narrative text,
  weekly_context text,
  this_week_tactical text,
  ground_sentiment jsonb DEFAULT '[]'::jsonb,
  sector_calls jsonb DEFAULT '[]'::jsonb,
  trade_ideas jsonb DEFAULT '[]'::jsonb,
  key_risks jsonb DEFAULT '[]'::jsonb,
  source_provenance jsonb DEFAULT '{}'::jsonb,
  web_search_sources jsonb DEFAULT '[]'::jsonb,
  raw_payload jsonb,
  processing_info jsonb
);

CREATE INDEX IF NOT EXISTS idx_copilot_synthesis_briefs_week_start
  ON copilot_synthesis_briefs (week_start DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_synthesis_briefs_visibility
  ON copilot_synthesis_briefs (visibility);

COMMENT ON TABLE copilot_synthesis_briefs IS
  'Weekly multi-horizon synthesis brief consumed by /copilot/top-opportunities and /copilot/ai-analyst. Generated Sunday 17:45 IL.';
