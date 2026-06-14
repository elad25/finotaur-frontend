-- FINO Detective — MFE/MAE excursion store (B0)
-- Per closed trade: how far price actually moved (max favorable / adverse excursion),
-- in price and in R, plus how far toward the target it got. Powers exact What-If
-- target-change scenarios and "you reached 3R then reverted to BE" insights.
-- Additive. RLS-protected. Does NOT touch the trades trigger.

create table if not exists public.trade_excursions (
  trade_id          uuid primary key references public.trades(id) on delete cascade,
  user_id           uuid not null,
  mfe_price         numeric,        -- furthest favorable price during the hold
  mae_price         numeric,        -- furthest adverse price during the hold
  mfe_r             numeric,        -- max favorable excursion, in R (vs entry→stop risk)
  mae_r             numeric,        -- max adverse excursion, in R
  target_reached_r  numeric,        -- how far toward/through the target price got, in R
  bars_source       text,           -- 'binance' | 'yahoo'
  bars_interval     text,           -- '1m' | '5m' | '1h' | '1d'
  computed_at       timestamptz not null default now()
);

create index if not exists trade_excursions_user_idx
  on public.trade_excursions (user_id);

alter table public.trade_excursions enable row level security;

drop policy if exists te_select_own on public.trade_excursions;
create policy te_select_own on public.trade_excursions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists te_rw_service on public.trade_excursions;
create policy te_rw_service on public.trade_excursions
  for all to service_role using (true) with check (true);
