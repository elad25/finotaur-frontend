-- ════════════════════════════════════════════════════════════════════
-- Backtest persistence — schema for saved paper-trading sessions.
--
-- Phase 2 of the backtest marketing-ready sprint. Lets users save a session
-- (symbol/interval/trades/stats) and reload it later. Sessions belong to
-- the user who created them (RLS via auth.uid()).
--
-- Trade row mirrors the shape produced by useBacktestSession.ts on the
-- frontend (`PaperPosition`) — but flattened from JSONB to columns so the
-- analytics views can query without unnesting.
-- ════════════════════════════════════════════════════════════════════

-- ─── Sessions ───────────────────────────────────────────────────────
create table if not exists public.backtest_sessions (
  id                uuid          primary key default gen_random_uuid(),
  user_id           uuid          not null references auth.users(id) on delete cascade,
  name              text,
  symbol            text          not null,
  interval          text          not null,
  asset_class       text,                                     -- 'futures' | 'stocks' | 'crypto'
  start_date        timestamptz   not null,                   -- window covered
  end_date          timestamptz   not null,
  initial_balance   numeric(18,4) not null default 10000,
  final_balance     numeric(18,4),                            -- initial + net_pnl on save
  -- Full stats snapshot. Stored as JSONB so we can change the SessionStats
  -- shape without a schema migration. Authoritative view is `statistics`,
  -- columns below are denormalized for fast filtering / leaderboards.
  statistics        jsonb         not null default '{}'::jsonb,
  -- Denormalized headline metrics (indexed for sorting):
  total_trades      integer       not null default 0,
  win_rate          numeric(5,2)  not null default 0,         -- 0–100
  net_pnl           numeric(18,4) not null default 0,
  profit_factor     numeric(10,4) not null default 0,
  -- Optional metadata
  notes             text,
  config            jsonb,                                    -- future: strategy params
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

create index if not exists idx_backtest_sessions_user_created
  on public.backtest_sessions (user_id, created_at desc);

create index if not exists idx_backtest_sessions_user_symbol
  on public.backtest_sessions (user_id, symbol);

-- ─── Trades (1-many per session) ─────────────────────────────────────
create table if not exists public.backtest_trades (
  id              uuid          primary key default gen_random_uuid(),
  session_id      uuid          not null references public.backtest_sessions(id) on delete cascade,
  side            text          not null check (side in ('LONG', 'SHORT')),
  entry_time      timestamptz   not null,
  entry_price     numeric(18,8) not null,
  exit_time       timestamptz,
  exit_price      numeric(18,8),
  size            numeric(18,8) not null,
  stop_loss       numeric(18,8),
  take_profit     numeric(18,8),
  pnl             numeric(18,4),
  pnl_percent     numeric(10,4),
  exit_reason     text          check (exit_reason in ('manual', 'sl', 'tp')),
  created_at      timestamptz   not null default now()
);

create index if not exists idx_backtest_trades_session
  on public.backtest_trades (session_id, entry_time);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table public.backtest_sessions enable row level security;
alter table public.backtest_trades   enable row level security;

-- Sessions: owner-only access. CASCADE on delete via FK above.
drop policy if exists "users own sessions — select" on public.backtest_sessions;
create policy "users own sessions — select"
  on public.backtest_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "users own sessions — insert" on public.backtest_sessions;
create policy "users own sessions — insert"
  on public.backtest_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users own sessions — update" on public.backtest_sessions;
create policy "users own sessions — update"
  on public.backtest_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users own sessions — delete" on public.backtest_sessions;
create policy "users own sessions — delete"
  on public.backtest_sessions for delete
  using (auth.uid() = user_id);

-- Trades: inherit ownership through session_id. EXISTS subquery is
-- index-friendly given idx_backtest_sessions PK.
drop policy if exists "users own trades — select" on public.backtest_trades;
create policy "users own trades — select"
  on public.backtest_trades for select
  using (
    exists (
      select 1 from public.backtest_sessions s
      where s.id = backtest_trades.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "users own trades — insert" on public.backtest_trades;
create policy "users own trades — insert"
  on public.backtest_trades for insert
  with check (
    exists (
      select 1 from public.backtest_sessions s
      where s.id = backtest_trades.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "users own trades — delete" on public.backtest_trades;
create policy "users own trades — delete"
  on public.backtest_trades for delete
  using (
    exists (
      select 1 from public.backtest_sessions s
      where s.id = backtest_trades.session_id and s.user_id = auth.uid()
    )
  );

-- ─── updated_at trigger ──────────────────────────────────────────────
create or replace function public.backtest_sessions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_backtest_sessions_touch on public.backtest_sessions;
create trigger trg_backtest_sessions_touch
  before update on public.backtest_sessions
  for each row execute function public.backtest_sessions_touch_updated_at();

-- ─── Grants (anon needs nothing; authenticated is enough) ────────────
grant select, insert, update, delete on public.backtest_sessions to authenticated;
grant select, insert,         delete on public.backtest_trades   to authenticated;
