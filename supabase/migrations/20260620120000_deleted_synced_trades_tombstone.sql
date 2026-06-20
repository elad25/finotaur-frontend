-- ═══════════════════════════════════════════════════════════════
-- Migration: "deleted stays deleted" — broker-sync tombstones
-- Date: 2026-06-20
--
-- PROBLEM:
--   A user deletes a broker-synced trade (e.g. an open QBTS option from
--   IBKR). The delete is a hard DELETE, so the row and its external_id are
--   gone. The next broker sync sees that external_id as "new" and RE-IMPORTS
--   the trade. Deleted trades keep coming back.
--
--   Root cause is identity-based dedup with no memory of intentional deletes:
--     - frontend services build a Set of existing trades.external_id and skip
--       matches (ibTradeSync / tradovateSyncV2)
--     - exchange-sync upserts ON CONFLICT(idempotency_key) DO NOTHING
--   In ALL of these, once the row is deleted the dedup no longer recognizes
--   the trade → re-insert.
--
-- FIX (pure DB, catches every import + delete path, current and future):
--   1. A tombstone table records (user_id, broker, external_id) of any
--      deleted broker-synced trade.
--   2. BEFORE DELETE trigger on trades writes the tombstone.
--   3. BEFORE INSERT trigger on trades drops (returns NULL) any insert whose
--      (user_id, broker, external_id) is tombstoned — so no sync path, edge
--      function, webhook, or future importer can resurrect it.
--
--   Manual trades (external_id IS NULL) are never tombstoned and never
--   blocked. A user who manually re-adds a symbol is unaffected.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tombstone table ────────────────────────────────────────
create table if not exists public.deleted_synced_trades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  broker      text not null,
  external_id text not null,
  symbol      text,
  deleted_at  timestamptz not null default now(),
  -- the unique constraint's btree index also serves the BEFORE INSERT lookup
  unique (user_id, broker, external_id)
);

alter table public.deleted_synced_trades enable row level security;

-- Frontend never needs this table for the mechanism to work (triggers run
-- server-side), but allow a user to read/clear their own tombstones for any
-- future "restore deleted trade" UI. Service role + SECURITY DEFINER triggers
-- bypass RLS regardless.
drop policy if exists deleted_synced_trades_select_own on public.deleted_synced_trades;
create policy deleted_synced_trades_select_own
  on public.deleted_synced_trades for select
  using (auth.uid() = user_id);

drop policy if exists deleted_synced_trades_delete_own on public.deleted_synced_trades;
create policy deleted_synced_trades_delete_own
  on public.deleted_synced_trades for delete
  using (auth.uid() = user_id);

-- ── 2. BEFORE DELETE: record the tombstone ────────────────────
create or replace function public.record_trade_tombstone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only broker-synced trades have an identity that could re-import.
  if OLD.external_id is not null and OLD.broker is not null then
    insert into public.deleted_synced_trades (user_id, broker, external_id, symbol)
    values (OLD.user_id, OLD.broker, OLD.external_id, OLD.symbol)
    on conflict (user_id, broker, external_id) do nothing;
  end if;
  return OLD;
end;
$$;

drop trigger if exists zz_record_trade_tombstone on public.trades;
create trigger zz_record_trade_tombstone
  before delete on public.trades
  for each row execute function public.record_trade_tombstone();

-- ── 3. BEFORE INSERT: skip resurrecting a tombstoned trade ────
create or replace function public.skip_tombstoned_trade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Manual trades / no broker identity → never tombstoned, always allowed.
  if NEW.external_id is null or NEW.broker is null then
    return NEW;
  end if;

  if exists (
    select 1 from public.deleted_synced_trades d
    where d.user_id    = NEW.user_id
      and d.broker      = NEW.broker
      and d.external_id = NEW.external_id
  ) then
    return null;  -- silently drop the re-import; row is never inserted
  end if;

  return NEW;
end;
$$;

-- Name sorts FIRST among BEFORE INSERT triggers (before
-- 'aaa_enforce_free_trade_limit'), so a tombstoned re-import is dropped
-- before any other BEFORE INSERT trigger runs.
drop trigger if exists a_skip_tombstoned_trade on public.trades;
create trigger a_skip_tombstoned_trade
  before insert on public.trades
  for each row execute function public.skip_tombstoned_trade();
