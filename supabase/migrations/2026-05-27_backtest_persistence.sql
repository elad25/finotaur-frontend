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
--
-- ⚠️ Table suffix `_v2`: production already has `backtest_runs` +
-- `backtest_trades` from an unrelated 2026-05-16 migration with a
-- different schema (and 9 rows in `strategies`). Suffix avoids a silent
-- name collision on `backtest_trades`. Migration to a single set of
-- tables is deferred to Phase 3.5+ once we decide which schema wins.
-- ════════════════════════════════════════════════════════════════════

-- ─── Sessions ───────────────────────────────────────────────────────
create table if not exists public.backtest_sessions_v2 (
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

create index if not exists idx_backtest_sessions_v2_user_created
  on public.backtest_sessions_v2 (user_id, created_at desc);

create index if not exists idx_backtest_sessions_v2_user_symbol
  on public.backtest_sessions_v2 (user_id, symbol);

-- ─── Trades (1-many per session) ─────────────────────────────────────
create table if not exists public.backtest_trades_v2 (
  id              uuid          primary key default gen_random_uuid(),
  session_id      uuid          not null references public.backtest_sessions_v2(id) on delete cascade,
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

create index if not exists idx_backtest_trades_v2_session
  on public.backtest_trades_v2 (session_id, entry_time);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table public.backtest_sessions_v2 enable row level security;
alter table public.backtest_trades_v2   enable row level security;

-- Sessions: owner-only access. CASCADE on delete via FK above.
drop policy if exists "users own sessions v2 — select" on public.backtest_sessions_v2;
create policy "users own sessions v2 — select"
  on public.backtest_sessions_v2 for select
  using (auth.uid() = user_id);

drop policy if exists "users own sessions v2 — insert" on public.backtest_sessions_v2;
create policy "users own sessions v2 — insert"
  on public.backtest_sessions_v2 for insert
  with check (auth.uid() = user_id);

drop policy if exists "users own sessions v2 — update" on public.backtest_sessions_v2;
create policy "users own sessions v2 — update"
  on public.backtest_sessions_v2 for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users own sessions v2 — delete" on public.backtest_sessions_v2;
create policy "users own sessions v2 — delete"
  on public.backtest_sessions_v2 for delete
  using (auth.uid() = user_id);

-- Trades: inherit ownership through session_id.
drop policy if exists "users own trades v2 — select" on public.backtest_trades_v2;
create policy "users own trades v2 — select"
  on public.backtest_trades_v2 for select
  using (
    exists (
      select 1 from public.backtest_sessions_v2 s
      where s.id = backtest_trades_v2.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "users own trades v2 — insert" on public.backtest_trades_v2;
create policy "users own trades v2 — insert"
  on public.backtest_trades_v2 for insert
  with check (
    exists (
      select 1 from public.backtest_sessions_v2 s
      where s.id = backtest_trades_v2.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "users own trades v2 — delete" on public.backtest_trades_v2;
create policy "users own trades v2 — delete"
  on public.backtest_trades_v2 for delete
  using (
    exists (
      select 1 from public.backtest_sessions_v2 s
      where s.id = backtest_trades_v2.session_id and s.user_id = auth.uid()
    )
  );

-- ─── updated_at trigger ──────────────────────────────────────────────
create or replace function public.backtest_sessions_v2_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_backtest_sessions_v2_touch on public.backtest_sessions_v2;
create trigger trg_backtest_sessions_v2_touch
  before update on public.backtest_sessions_v2
  for each row execute function public.backtest_sessions_v2_touch_updated_at();

-- ─── Grants (anon needs nothing; authenticated is enough) ────────────
grant select, insert, update, delete on public.backtest_sessions_v2 to authenticated;
grant select, insert,         delete on public.backtest_trades_v2   to authenticated;
