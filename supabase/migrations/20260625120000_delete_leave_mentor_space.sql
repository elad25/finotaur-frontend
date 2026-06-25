-- delete_mentor_space: owner-only hard delete
create or replace function delete_mentor_space(p_space uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from space_members
    where space_id = p_space and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'cannot_delete_space';
  end if;
  delete from mentor_spaces where id = p_space;
end;
$$;

-- leave_mentor_space: non-owner member removes themselves
create or replace function leave_mentor_space(p_space uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from space_members
    where space_id = p_space and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'cannot_leave_as_owner';
  end if;

  delete from space_members
  where space_id = p_space and user_id = auth.uid();
end;
$$;
