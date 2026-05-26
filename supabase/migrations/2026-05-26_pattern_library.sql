-- Migration: pattern_library
-- Created: 2026-05-26 (catalyst-deck sprint, Tree #2)
-- Purpose: Admin-curated pattern library for Catalyst Intelligence Deck.
--          Each row = an analyzed historical move (LONG or SHORT) with
--          first+second catalyst chain, fed back into the scanner as
--          few-shot examples.
--
-- Admin check: uses existing public.is_admin() from complete-migration-2 PART 2A
--              (checks profiles.role IN ('admin', 'super_admin')).
--
-- Applied to production: 2026-05-26 via Supabase MCP (apply_migration).

BEGIN;

-- 1. ENUMs (8 catalyst categories + LONG/SHORT + second-catalyst role)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catalyst_category') THEN
    CREATE TYPE catalyst_category AS ENUM (
      'regulation',         -- EPA/SEC/FDA new rule or framework
      'gov_procurement',    -- Pentagon / agency contract award
      'trade_policy',       -- Tariff, sanction, export ban
      'subsidy',            -- IRA, CHIPS Act, DOE incentive
      'geopolitical',       -- Supply-shock event, conflict, OPEC
      'court_ruling',       -- DOJ/SCOTUS antitrust, breakup
      'fda_binary',         -- Drug approval / CRL / PDUFA
      'state_mandate'       -- California EV, NY congestion pricing
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pattern_direction') THEN
    CREATE TYPE pattern_direction AS ENUM ('LONG', 'SHORT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catalyst_role') THEN
    CREATE TYPE catalyst_role AS ENUM ('confirmation', 'extension', 'amplifier');
  END IF;
END $$;

-- 2. Main table
CREATE TABLE IF NOT EXISTS public.pattern_library (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker                          text NOT NULL
                                    CHECK (ticker = upper(ticker) AND length(ticker) BETWEEN 1 AND 10),
  move_start_date                 date NOT NULL,
  move_end_date                   date NOT NULL CHECK (move_end_date >= move_start_date),
  return_pct                      numeric NOT NULL CHECK (abs(return_pct) >= 5),
  direction                       pattern_direction NOT NULL,
  first_catalyst_date             date NOT NULL,
  first_catalyst_category         catalyst_category NOT NULL,
  first_catalyst_sector           text,
  first_catalyst_summary          text NOT NULL,
  first_catalyst_earliest_signal  text NOT NULL,
  first_catalyst_source_url       text,
  second_catalyst_date            date,
  second_catalyst_category        catalyst_category,
  second_catalyst_summary         text,
  second_catalyst_role            catalyst_role,
  second_catalyst_source_url      text,
  mechanism                       text NOT NULL,
  replication_signals             jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by                      uuid NOT NULL REFERENCES auth.users(id),
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  admin_reviewed                  boolean NOT NULL DEFAULT false,
  admin_notes                     text,
  analysis_cost_usd               numeric(10, 4)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_pattern_library_ticker
  ON public.pattern_library (ticker);
CREATE INDEX IF NOT EXISTS idx_pattern_library_first_category
  ON public.pattern_library (first_catalyst_category);
CREATE INDEX IF NOT EXISTS idx_pattern_library_direction
  ON public.pattern_library (direction);
CREATE INDEX IF NOT EXISTS idx_pattern_library_admin_reviewed
  ON public.pattern_library (admin_reviewed) WHERE admin_reviewed = true;
CREATE INDEX IF NOT EXISTS idx_pattern_library_created_at
  ON public.pattern_library (created_at DESC);

-- 4. updated_at auto-bump
CREATE OR REPLACE FUNCTION public.touch_pattern_library_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_pattern_library_touch ON public.pattern_library;
CREATE TRIGGER trg_pattern_library_touch
  BEFORE UPDATE ON public.pattern_library
  FOR EACH ROW EXECUTE FUNCTION public.touch_pattern_library_updated_at();

-- 5. RLS policies (admin-only CRUD; scanner uses service_role bypass)
ALTER TABLE public.pattern_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY pattern_library_admin_all ON public.pattern_library
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Documentation
COMMENT ON TABLE public.pattern_library IS
  'Catalyst Intelligence Deck pattern library. Admin-curated. Fed back into scanner via few-shot. Created in catalyst-deck sprint 2026-05-26.';

COMMIT;
