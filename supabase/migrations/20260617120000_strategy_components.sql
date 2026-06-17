-- Strategy Components model
-- Additive only. Column is nullable; existing rows are backfilled from legacy
-- `checklist` (jsonb) and `confirmation_signals` (text[]) fields.
-- Fully reversible — see rollback comment at the bottom.

-- ===== 1. Add the column (idempotent) =====
ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS components jsonb;

-- ===== 2. Idempotent backfill =====
-- Only processes rows where `components` is still NULL.
-- Builds the typed component array by merging:
--   a) checklist items  → type='checklist',      trackAdherence=true
--   b) confirmation_signals → type='confirmation', trackAdherence=true, id='sig:<slug>'
-- Slug logic mirrors JS slugComponentId(): lowercase, [^a-z0-9]+ → '-', trim.
-- If both sources are empty/null, sets components to '[]'::jsonb so the WHERE
-- clause won't re-run on the row in future backfill passes.
UPDATE public.strategies
SET components = COALESCE(
  (
    SELECT jsonb_agg(component ORDER BY ord)
    FROM (
      -- a) checklist items (jsonb array of {id, label})
      SELECT
        jsonb_build_object(
          'id',             item->>'id',
          'type',           'checklist',
          'label',          item->>'label',
          'trackAdherence', true
        ) AS component,
        ordinality AS ord
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(checklist) = 'array' THEN checklist
          ELSE '[]'::jsonb
        END
      ) WITH ORDINALITY AS t(item, ordinality)
      WHERE item->>'id'    IS NOT NULL
        AND item->>'label' IS NOT NULL

      UNION ALL

      -- b) confirmation_signals (text[]) — id = 'sig:' || slug(signal)
      SELECT
        jsonb_build_object(
          'id',   'sig:' || regexp_replace(
                              regexp_replace(lower(sig), '[^a-z0-9]+', '-', 'g'),
                              '^-+|-+$', '', 'g'
                            ),
          'type',           'confirmation',
          'label',          sig,
          'trackAdherence', true
        ) AS component,
        -- offset ordinals so confirmation signals sort after checklist items
        (10000 + row_number() OVER ()) AS ord
      FROM unnest(
        CASE
          WHEN confirmation_signals IS NOT NULL THEN confirmation_signals
          ELSE ARRAY[]::text[]
        END
      ) AS sig
      WHERE trim(sig) <> ''
    ) combined
  ),
  '[]'::jsonb   -- fallback when both sources are empty/null
)
WHERE components IS NULL;

-- ===== Index (optional — supports JSONB component lookups by type) =====
CREATE INDEX IF NOT EXISTS idx_strategies_components_type
  ON public.strategies USING GIN (components);

-- Rollback:
-- ALTER TABLE public.strategies DROP COLUMN components;
-- DROP INDEX IF EXISTS idx_strategies_components_type;
