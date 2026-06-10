-- 2026-05-29_journal_ai_atomic_usage_and_updated_via.sql
-- Phase B (§D) — FINOTAUR AI Coach — LEDGER RECONCILIATION
--
-- IMPORTANT: Both objects below ALREADY EXIST in the production database
-- (verified 2026-05-29 via Supabase MCP). They were applied out-of-band and
-- never tracked in this migrations folder. This file reconciles the ledger so
-- a fresh DB rebuild reproduces production. It is idempotent and safe to
-- re-apply (CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS) — applying it to the
-- live project is a no-op.
--
-- (a) increment_journal_ai_usage: atomic upsert+increment for ai_usage_daily.
--     Reproduced EXACTLY from the live definition (pg_get_functiondef).
-- (b) trades.updated_via: nullable audit column (live state: text, NULL default).
--
-- user_trade_stats_v already exists (2026-05-11_chunk3_b4_user_trade_stats_v.sql)
-- and is intentionally NOT redefined here.

-- ─── (a) atomic usage increment RPC (matches production signature) ────────────
CREATE OR REPLACE FUNCTION public.increment_journal_ai_usage(
  p_user_id  uuid,
  p_service  text,
  p_date     date    DEFAULT CURRENT_DATE,
  p_count    integer DEFAULT 1,
  p_tokens   integer DEFAULT 0,
  p_cost_usd numeric DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  INSERT INTO public.ai_usage_daily (user_id, service, date, count, tokens, cost_usd)
  VALUES (p_user_id, p_service, p_date, p_count, p_tokens, p_cost_usd)
  ON CONFLICT (user_id, service, date) DO UPDATE
    SET count    = public.ai_usage_daily.count    + EXCLUDED.count,
        tokens   = public.ai_usage_daily.tokens   + EXCLUDED.tokens,
        cost_usd = public.ai_usage_daily.cost_usd + EXCLUDED.cost_usd;
END;
$function$;

-- SECURITY FIX (2026-05-29, approved by Elad): this SECURITY DEFINER function
-- takes an arbitrary p_user_id, so an unauthenticated `anon` caller could inflate
-- any user's usage counters. Revoke anon; only authenticated + service_role may
-- execute (the server calls it via service_role).
REVOKE EXECUTE ON FUNCTION public.increment_journal_ai_usage(uuid, text, date, integer, integer, numeric)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_journal_ai_usage(uuid, text, date, integer, integer, numeric)
  TO authenticated, service_role;

-- ─── (b) trades.updated_via audit column (live: text, nullable, no default) ───
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS updated_via text;
