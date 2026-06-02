-- Watch List (per-user, two groups) — ADDITIVE, forward-only.
--
-- One row per (user, ticker). `source` marks the group:
--   'portfolio' = auto-synced from the user's My Portfolio holdings
--   'manual'    = tickers the user added to the watch list themselves
-- A ticker belongs to exactly one group (unique per user+ticker); whichever
-- group added it first keeps it (portfolio sync uses ON CONFLICT DO NOTHING,
-- so a manually-added ticker is never reclassified or removed by sync).
--
-- The FREE-tier cap (20 tickers total across both groups) is enforced in the
-- app layer (watchlistLimits.ts) — it is a product/monetization limit, not a
-- security boundary. RLS below enforces ownership.

CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  ticker     text NOT NULL,
  source     text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT watchlist_items_source_check       CHECK (source IN ('portfolio', 'manual')),
  CONSTRAINT watchlist_items_user_ticker_unique UNIQUE (user_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);

COMMENT ON TABLE public.watchlist_items IS
  'Per-user watch list. source=portfolio (synced from My Portfolio) | manual (user-added). '
  'One row per user+ticker. FREE-tier 20-item cap enforced in the app layer.';

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY watchlist_items_select_own ON public.watchlist_items
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY watchlist_items_insert_own ON public.watchlist_items
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY watchlist_items_update_own ON public.watchlist_items
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY watchlist_items_delete_own ON public.watchlist_items
  FOR DELETE USING (user_id = auth.uid());
