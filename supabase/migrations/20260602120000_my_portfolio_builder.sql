-- My Portfolio (Koyfin-style manual portfolio builder) — ADDITIVE, forward-only.
--
-- A customer builds ONE manual portfolio made of one or more ACCOUNTS (Koyfin
-- "Account 1", "Account 2" tabs). Each account holds a cash position and a set
-- of POSITIONS. A position row is a single lot — "Add Lot" in the UI = another
-- row with the same ticker but its own cost/share and purchase date.
--
--   portfolios (1 manual row per user)            <- existing table, columns added
--     +-- portfolio_accounts (N per portfolio)    <- new
--           +-- portfolio_positions (N per account, one row per lot)  <- new
--
-- "One portfolio per customer" is enforced at the APPLICATION layer (the save
-- path upserts the user's existing manual portfolio). No DB unique index is
-- added here on purpose: `source='manual'` portfolios are a SHARED row already
-- feeding the trade journal (trades.portfolio_id), and a unique index could
-- make pre-existing insert paths (journal/copilot auto-create) throw. Additive
-- only — nothing existing is dropped, renamed, or made stricter.

-- 1. Additive nullable/defaulted columns on the existing portfolios table.
ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS currency          text    NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS benchmark_symbol  text,                 -- e.g. 'SPY' (NULL = none)
  ADD COLUMN IF NOT EXISTS benchmark_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.portfolios.currency          IS 'Portfolio reporting currency (My Portfolio builder). Default USD.';
COMMENT ON COLUMN public.portfolios.benchmark_symbol  IS 'Optional benchmark ticker for the portfolio (e.g. SPY). NULL = none.';
COMMENT ON COLUMN public.portfolios.benchmark_enabled IS 'Whether the benchmark comparison is turned on for this portfolio.';

-- 2. Accounts within a portfolio (the Koyfin "Account" tabs).
CREATE TABLE IF NOT EXISTS public.portfolio_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  portfolio_id  uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'Account 1',
  cash_position numeric(20,2) NOT NULL DEFAULT 0,
  cash_currency text NOT NULL DEFAULT 'USD',
  sort_order    integer NOT NULL DEFAULT 0,        -- tab display order
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_accounts_portfolio_id ON public.portfolio_accounts(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_accounts_user_id      ON public.portfolio_accounts(user_id);

COMMENT ON TABLE public.portfolio_accounts IS
  'Accounts within a user''s manual portfolio (Koyfin-style tabs). Holds the cash position. '
  'FK cascades on portfolio delete.';

-- 3. Positions — one row per lot.
CREATE TABLE IF NOT EXISTS public.portfolio_positions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  portfolio_id   uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  account_id     uuid NOT NULL REFERENCES public.portfolio_accounts(id) ON DELETE CASCADE,
  ticker         text NOT NULL,
  quantity       numeric(20,8) NOT NULL,
  cost_per_share numeric(20,4),                     -- nullable: cost optional in the UI
  purchase_date  date,                              -- nullable: "Select Date" is optional
  sort_order     integer NOT NULL DEFAULT 0,        -- row display order within the account
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT portfolio_positions_quantity_check CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_positions_account_id   ON public.portfolio_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_portfolio_id ON public.portfolio_positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user_id      ON public.portfolio_positions(user_id);

COMMENT ON TABLE public.portfolio_positions IS
  'Individual holdings (one row per lot) inside a portfolio account. '
  '"Add Lot" = another row, same ticker, different cost/share + purchase date. FK cascades on account delete.';

-- 4. RLS — owner-only, mirroring the existing portfolios policy shape (auth.uid() = user_id).
ALTER TABLE public.portfolio_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY portfolio_accounts_select_own ON public.portfolio_accounts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY portfolio_accounts_insert_own ON public.portfolio_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY portfolio_accounts_update_own ON public.portfolio_accounts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY portfolio_accounts_delete_own ON public.portfolio_accounts
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY portfolio_positions_select_own ON public.portfolio_positions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY portfolio_positions_insert_own ON public.portfolio_positions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY portfolio_positions_update_own ON public.portfolio_positions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY portfolio_positions_delete_own ON public.portfolio_positions
  FOR DELETE USING (user_id = auth.uid());
