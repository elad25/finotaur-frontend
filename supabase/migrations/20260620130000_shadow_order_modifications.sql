-- Migration: shadow_order_modifications
-- Forward-capture store for stop/target moves during a live trade.
-- Price-path bars reuse the existing trade_price_bars table.

create table if not exists public.shadow_order_modifications (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid references public.trades(id) on delete cascade,
  user_id uuid not null,
  broker text,
  contract_name text,
  kind text not null check (kind in ('stop','target')),
  price numeric not null,
  event_time timestamptz not null,
  source text default 'tradovate_ws',
  created_at timestamptz not null default now()
);

create index if not exists idx_shadow_order_mods_trade
  on public.shadow_order_modifications(trade_id);

create index if not exists idx_shadow_order_mods_user_time
  on public.shadow_order_modifications(user_id, event_time);

alter table public.shadow_order_modifications enable row level security;

create policy "shadow_mods_owner_read"
  on public.shadow_order_modifications
  for select
  using (auth.uid() = user_id);

create policy "shadow_mods_service_write"
  on public.shadow_order_modifications
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
