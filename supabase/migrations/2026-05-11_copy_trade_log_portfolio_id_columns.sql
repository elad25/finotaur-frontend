-- Migration: add source_portfolio_id + target_portfolio_id to copy_trade_log
-- Date:      2026-05-11
-- Author:    pre-customer-integrated-test-prep session (Phase C #2)
-- Reason:    engine.js (master 1c70932) D-15 flatten audit insert at line 169
--            writes source_portfolio_id + target_portfolio_id columns that don't
--            exist in schema. Result: 42703 unknown column → flatten audit row
--            silently dropped via engine's try/catch. Main copy path is unaffected
--            (buildLogRow does NOT write these columns — only flatten path does).
--
-- Forward-compatible (additive): adds nullable FK columns. Existing rows get NULL.
-- Idempotent: ADD COLUMN IF NOT EXISTS.
-- Reversible: see DOWN block at bottom.
-- ON DELETE SET NULL: if a portfolio is deleted, audit rows survive with NULL FK
--                    (audit retention beats referential strictness for audit tables).

BEGIN;

ALTER TABLE public.copy_trade_log
  ADD COLUMN IF NOT EXISTS source_portfolio_id uuid
    REFERENCES public.portfolios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_portfolio_id uuid
    REFERENCES public.portfolios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_copy_trade_log_target_portfolio
  ON public.copy_trade_log(target_portfolio_id)
  WHERE target_portfolio_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_copy_trade_log_source_portfolio
  ON public.copy_trade_log(source_portfolio_id)
  WHERE source_portfolio_id IS NOT NULL;

COMMENT ON COLUMN public.copy_trade_log.source_portfolio_id IS
  'Leader portfolio for copy events; NULL for non-copy events (e.g. flatten).';
COMMENT ON COLUMN public.copy_trade_log.target_portfolio_id IS
  'Follower portfolio (copy events) OR the portfolio being flattened (D-15 audit).';

COMMIT;

-- DOWN (manual; uncomment + run if rollback needed):
--   BEGIN;
--   DROP INDEX IF EXISTS public.idx_copy_trade_log_target_portfolio;
--   DROP INDEX IF EXISTS public.idx_copy_trade_log_source_portfolio;
--   ALTER TABLE public.copy_trade_log
--     DROP COLUMN IF EXISTS target_portfolio_id,
--     DROP COLUMN IF EXISTS source_portfolio_id;
--   COMMIT;
