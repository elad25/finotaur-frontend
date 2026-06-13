-- Phase 2 (settings redesign): keep public.profiles.email in sync with auth email changes.
--
-- Problem: no trigger synced auth.users.email -> profiles.email. The Settings page lets a
-- user change their email via auth.updateUser({ email }), but lifecycle/welcome emails read
-- profiles.email, so after a change they would be sent to the OLD address (deliverability bug).
--
-- This trigger fires only when the email actually changes (i.e. after the user confirms the
-- new address and Supabase updates auth.users.email), keeping profiles.email authoritative.
-- Additive, idempotent. Does NOT touch any other column.

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = new.email,
           updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();
