-- One-time-ever Trader intro offer (30% off first month, hidden Whop plan)
create table public.intro_offer_state (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  status      text not null default 'active'
              check (status in ('active','expired','used','dismissed')),
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  auto_opened_at timestamptz,
  used_at     timestamptz,
  graduated_at timestamptz,
  whop_membership_id text,
  updated_at  timestamptz not null default now()
);

alter table public.intro_offer_state enable row level security;

create policy "own row select" on public.intro_offer_state
  for select using (auth.uid() = user_id);
create policy "own row insert" on public.intro_offer_state
  for insert with check (auth.uid() = user_id);
create policy "own row update" on public.intro_offer_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.intro_offer_guard() returns trigger
language plpgsql security definer as $$
begin
  if old.status in ('expired','used','dismissed') and new.status <> old.status then
    raise exception 'intro offer state is terminal';
  end if;
  if new.expires_at > old.expires_at then
    raise exception 'intro offer cannot be extended';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger trg_intro_offer_guard before update on public.intro_offer_state
  for each row execute function public.intro_offer_guard();
