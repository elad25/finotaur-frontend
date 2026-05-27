-- 2026-05-27_trade_idea_pattern_classification.sql
-- Pattern Engine Phase 0 — Foundation (ADL-039)
-- Documents the v2 JSONB shape of copilot_synthesis_briefs.trade_ideas after this
-- sprint. No schema change — JSONB is additive by nature; old rows render with
-- pattern_type = 'other' on the frontend.

COMMENT ON COLUMN public.copilot_synthesis_briefs.trade_ideas IS
'JSONB array of trade ideas. v2 (Phase 0, 2026-05-27, ADL-039) adds 3 fields per idea: pattern_type (enum: beat_raise_ai|mega_contract|triple_pt|funding_short_squeeze|capex_downstream|energy_hedge|crowded_long_hedge|consumer_warning|software_weakness|other), pattern_evidence (string), invalidation (string). Legacy rows without these fields default to pattern_type=other on read.';
