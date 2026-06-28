-- Chat image attachments: dedicated public bucket + RLS + extend post_space_message.
-- Already applied to production via Supabase MCP on 2026-06-28; this file is the
-- version-controlled record. Safe to re-run (idempotent).

-- No allowed_mime_types restriction (matches the working trade-screenshots/avatars
-- buckets): supabase-js does not reliably send an image/* content-type, so a mime
-- allowlist 400s legit uploads. Safety is covered by the 10MB cap, RLS folder
-- scoping, and client-side compression to JPEG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments', 'chat-attachments', true, 10485760, null
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read chat attachments" on storage.objects;
create policy "Public read chat attachments"
  on storage.objects for select
  using (bucket_id = 'chat-attachments');

drop policy if exists "Users upload own chat attachments" on storage.objects;
create policy "Users upload own chat attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "Users delete own chat attachments" on storage.objects;
create policy "Users delete own chat attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create or replace function public.post_space_message(
  p_channel uuid,
  p_body text,
  p_attachments jsonb default '[]'::jsonb
)
returns space_messages
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_channel public.space_channels;
  v_msg public.space_messages;
  v_atts jsonb := coalesce(p_attachments, '[]'::jsonb);
begin
  select * into v_channel from public.space_channels where id = p_channel;
  if v_channel.id is null then raise exception 'channel_not_found' using errcode = 'P0002'; end if;
  if not public.can_access_channel(p_channel) then raise exception 'access_denied' using errcode = '42501'; end if;
  if v_channel.type = 'announcement' and not public.is_space_owner(v_channel.space_id) then
    raise exception 'not_authorized_announcement' using errcode = '42501'; end if;

  if jsonb_typeof(v_atts) <> 'array' then raise exception 'invalid_attachments' using errcode = 'P0001'; end if;
  if jsonb_array_length(v_atts) > 4 then raise exception 'too_many_attachments' using errcode = 'P0001'; end if;

  p_body := trim(coalesce(p_body, ''));
  if p_body = '' and jsonb_array_length(v_atts) = 0 then
    raise exception 'empty_message' using errcode = 'P0001';
  end if;

  insert into public.space_messages (channel_id, space_id, author_id, body, attachments)
  values (p_channel, v_channel.space_id, auth.uid(), p_body, v_atts)
  returning * into v_msg;
  return v_msg;
end;
$function$;
