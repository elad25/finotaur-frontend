-- 2026-06-28 — Require a strategy category when sharing a trade to the global feed.
-- APPLIED TO PRODUCTION via Supabase MCP on 2026-06-28 (project xsgbtptkueabylkxibly),
-- migration `global_post_strategy_category_required_on_share`. Consolidated record.
--
-- The category is now chosen at SHARE TIME and stored per-post on global_posts.
-- share_trade() rejects a global share with no category. list_global_feed() and
-- feed_tag_facets() read coalesce(global_posts.strategy_category, strategies.strategy_category)
-- so older posts (no per-post category) still fall back to the linked strategy.

alter table public.global_posts add column if not exists strategy_category text;

-- share_trade gains p_strategy_category (last arg, default null) and enforces it
-- for scope='global':
--   IF p_strategy_category IS NULL OR trim(p_strategy_category) = '' THEN
--     RAISE EXCEPTION 'strategy_category_required' USING errcode = 'P0001';
--   END IF;
-- and inserts it into global_posts(strategy_category). community/mentor scopes
-- are unchanged. Full body applied via MCP (see migration history).

-- list_global_feed: trade_strategy_category column and the p_strategy_category
-- filter both switched to coalesce(gp.strategy_category, s.strategy_category).

-- feed_tag_facets: the strategy_category facet switched to
-- coalesce(gp.strategy_category, s.strategy_category).
