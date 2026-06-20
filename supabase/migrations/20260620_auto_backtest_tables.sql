-- Automated pattern-detection backtest: saved setups, runs, per-detection trades.
-- Applied to prod (xsgbtptkueabylkxibly) 2026-06-20 via Supabase MCP apply_migration.
-- Additive only; new tables; RLS owner-scoped. Idempotent.

create table if not exists public.bt_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  schema_version int not null default 1,
  definition jsonb not null,
  is_shared boolean not null default false,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bt_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  setup_id uuid references public.bt_setups(id) on delete set null,
  setup_snapshot jsonb not null,
  symbol text not null,
  timeframe text not null,
  source text not null,
  from_ts bigint not null,
  to_ts bigint not null,
  initial_balance numeric not null,
  statistics jsonb not null,
  equity_curve jsonb not null default '[]'::jsonb,
  r_multiple_distribution jsonb,
  engine_version text not null default 'auto-bt-mvp-1',
  created_at timestamptz not null default now()
);

create table if not exists public.bt_detections (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.bt_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern_type text not null,
  direction text not null,
  formed_at_index int not null,
  formed_at_ts bigint,
  zone_top numeric,
  zone_bottom numeric,
  entry_price numeric,
  entry_ts bigint,
  stop_loss numeric,
  take_profit numeric,
  exit_price numeric,
  exit_ts bigint,
  exit_reason text,
  realized_pnl numeric,
  r_multiple numeric,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_bt_setups_user on public.bt_setups(user_id);
create index if not exists idx_bt_runs_user on public.bt_runs(user_id, created_at desc);
create index if not exists idx_bt_runs_setup on public.bt_runs(setup_id);
create index if not exists idx_bt_detections_run on public.bt_detections(run_id);

create or replace function public.bt_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_bt_setups_updated_at on public.bt_setups;
create trigger trg_bt_setups_updated_at before update on public.bt_setups
  for each row execute function public.bt_set_updated_at();

alter table public.bt_setups enable row level security;
alter table public.bt_runs enable row level security;
alter table public.bt_detections enable row level security;

drop policy if exists bt_setups_owner on public.bt_setups;
create policy bt_setups_owner on public.bt_setups for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists bt_setups_shared_read on public.bt_setups;
create policy bt_setups_shared_read on public.bt_setups for select
  using (is_shared = true);

drop policy if exists bt_runs_owner on public.bt_runs;
create policy bt_runs_owner on public.bt_runs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists bt_detections_owner on public.bt_detections;
create policy bt_detections_owner on public.bt_detections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
