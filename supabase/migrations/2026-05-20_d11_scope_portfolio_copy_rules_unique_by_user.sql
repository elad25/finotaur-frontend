-- ═══════════════════════════════════════════════════════════════
-- D-11: Scope portfolio_copy_rules UNIQUE constraint by user_id
-- ═══════════════════════════════════════════════════════════════
--
-- PROBLEM:
--   The original UNIQUE(source_portfolio_id, target_portfolio_id) constraint
--   was global across all users. When two users happened to follow between
--   the same physical portfolio pair (rare but possible — e.g., shared demo
--   portfolios), the second user's INSERT failed silently with a duplicate
--   key error, blocking them from creating a copy rule.
--
-- FIX:
--   Drop the global UNIQUE and replace with a per-user variant.
--   New constraint: UNIQUE(user_id, source_portfolio_id, target_portfolio_id).
--   Each user is still limited to ONE rule per (source, target) pair — the
--   intended business rule — but users no longer collide across accounts.
--
-- SAFETY:
--   • Table is currently empty (0 rows) — no migration of existing data needed.
--   • New constraint is strictly MORE permissive than the old one (allows
--     pairs across users that were previously blocked). It cannot introduce
--     conflicts for existing rows even on a populated table, because the
--     old constraint already enforced per-(source,target) uniqueness.
--   • Reversible: drop the new constraint, re-add the old one.
--
-- See: MASTER_PLAN.md Part 2 Tier-1 Blockers — D-11
-- ═══════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.portfolio_copy_rules
  DROP CONSTRAINT IF EXISTS portfolio_copy_rules_source_portfolio_id_target_portfolio_i_key;

ALTER TABLE public.portfolio_copy_rules
  ADD CONSTRAINT portfolio_copy_rules_user_source_target_key
  UNIQUE (user_id, source_portfolio_id, target_portfolio_id);

COMMENT ON CONSTRAINT portfolio_copy_rules_user_source_target_key
  ON public.portfolio_copy_rules IS
  'D-11 (2026-05-20): per-user uniqueness on (source, target). Previously global, blocking concurrent users on shared portfolio pairs.';

COMMIT;
