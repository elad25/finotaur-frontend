-- (mirrors live DB; owner-only Room admin + channel CRUD)
CREATE OR REPLACE FUNCTION public.is_space_owner(p_space uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.mentor_spaces WHERE id = p_space AND owner_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.create_space_invite(p_space uuid, p_email text DEFAULT NULL::text, p_role text DEFAULT 'student'::text)
 RETURNS space_invites LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_token text; v_invite public.space_invites;
BEGIN
  IF NOT public.is_space_owner(p_space) THEN RAISE EXCEPTION 'access_denied' USING errcode = '42501'; END IF;
  v_token := encode(gen_random_bytes(16), 'hex');
  INSERT INTO public.space_invites (space_id, token, email, role, created_by)
  VALUES (p_space, v_token, p_email, p_role, auth.uid()) RETURNING * INTO v_invite;
  RETURN v_invite;
END; $function$;

CREATE OR REPLACE FUNCTION public.add_space_member_direct(p_space uuid, p_user uuid, p_role text DEFAULT 'student'::text)
 RETURNS space_members LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_member public.space_members;
BEGIN
  IF NOT public.is_space_owner(p_space) THEN RAISE EXCEPTION 'access_denied' USING errcode = '42501'; END IF;
  IF p_role NOT IN ('co_mentor','moderator','student') THEN RAISE EXCEPTION 'invalid_role' USING errcode='P0001'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.mentor_relationships mr
      WHERE mr.mentor_id = auth.uid() AND mr.student_id = p_user AND mr.status = 'accepted') THEN
    RAISE EXCEPTION 'not_connected' USING errcode='P0001'; END IF;
  INSERT INTO public.space_members (space_id, user_id, role, status, invited_by)
  VALUES (p_space, p_user, p_role, 'active', auth.uid())
  ON CONFLICT (space_id, user_id) DO UPDATE SET status='active', role=EXCLUDED.role
  RETURNING * INTO v_member;
  RETURN v_member;
END; $function$;

CREATE OR REPLACE FUNCTION public.remove_space_member(p_space uuid, p_user uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_target_role text; v_owner_id uuid;
BEGIN
  IF NOT public.is_space_owner(p_space) THEN RAISE EXCEPTION 'access_denied' USING errcode = '42501'; END IF;
  SELECT role INTO v_target_role FROM public.space_members WHERE space_id = p_space AND user_id = p_user;
  IF v_target_role = 'owner' THEN RAISE EXCEPTION 'cannot_remove_owner' USING errcode = 'P0001'; END IF;
  DELETE FROM public.space_members WHERE space_id = p_space AND user_id = p_user;
  SELECT owner_id INTO v_owner_id FROM public.mentor_spaces WHERE id = p_space;
  UPDATE public.mentor_relationships SET status = 'revoked', revoked_at = now(), revoked_by = auth.uid()
  WHERE student_id = p_user AND mentor_id = v_owner_id AND status = 'accepted';
END; $function$;

CREATE OR REPLACE FUNCTION public.update_mentor_space(p_space uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_banner_url text DEFAULT NULL::text)
 RETURNS mentor_spaces LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_space public.mentor_spaces;
BEGIN
  IF NOT public.is_space_owner(p_space) THEN RAISE EXCEPTION 'access_denied' USING errcode = '42501'; END IF;
  UPDATE public.mentor_spaces SET name = COALESCE(p_name, name), description = COALESCE(p_description, description),
    avatar_url = COALESCE(p_avatar_url, avatar_url), banner_url = COALESCE(p_banner_url, banner_url), updated_at = now()
  WHERE id = p_space RETURNING * INTO v_space;
  RETURN v_space;
END; $function$;

CREATE OR REPLACE FUNCTION public.post_space_message(p_channel uuid, p_body text)
 RETURNS space_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_channel public.space_channels; v_msg public.space_messages;
BEGIN
  SELECT * INTO v_channel FROM public.space_channels WHERE id = p_channel;
  IF v_channel.id IS NULL THEN RAISE EXCEPTION 'channel_not_found' USING errcode = 'P0002'; END IF;
  IF NOT public.can_access_channel(p_channel) THEN RAISE EXCEPTION 'access_denied' USING errcode = '42501'; END IF;
  IF v_channel.type = 'announcement' AND NOT public.is_space_owner(v_channel.space_id) THEN
    RAISE EXCEPTION 'not_authorized_announcement' USING errcode = '42501'; END IF;
  p_body := trim(p_body);
  IF p_body = '' OR p_body IS NULL THEN RAISE EXCEPTION 'empty_message' USING errcode = 'P0001'; END IF;
  INSERT INTO public.space_messages (channel_id, space_id, author_id, body)
  VALUES (p_channel, v_channel.space_id, auth.uid(), p_body) RETURNING * INTO v_msg;
  RETURN v_msg;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_space_channel(p_space uuid, p_name text, p_type text DEFAULT 'chat')
 RETURNS space_channels LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_channel public.space_channels; v_pos int; v_name text;
BEGIN
  IF NOT public.is_space_owner(p_space) THEN RAISE EXCEPTION 'access_denied' USING errcode='42501'; END IF;
  IF p_type NOT IN ('chat','announcement') THEN RAISE EXCEPTION 'invalid_channel_type' USING errcode='P0001'; END IF;
  v_name := trim(p_name);
  IF v_name = '' OR v_name IS NULL THEN RAISE EXCEPTION 'empty_channel_name' USING errcode='P0001'; END IF;
  SELECT COALESCE(MAX(position),-1)+1 INTO v_pos FROM public.space_channels WHERE space_id=p_space;
  INSERT INTO public.space_channels (space_id, name, type, position)
  VALUES (p_space, v_name, p_type, v_pos) RETURNING * INTO v_channel;
  RETURN v_channel;
END; $function$;

CREATE OR REPLACE FUNCTION public.rename_space_channel(p_channel uuid, p_name text)
 RETURNS space_channels LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_channel public.space_channels; v_name text;
BEGIN
  SELECT * INTO v_channel FROM public.space_channels WHERE id=p_channel;
  IF v_channel.id IS NULL THEN RAISE EXCEPTION 'channel_not_found' USING errcode='P0002'; END IF;
  IF NOT public.is_space_owner(v_channel.space_id) THEN RAISE EXCEPTION 'access_denied' USING errcode='42501'; END IF;
  IF v_channel.type = 'dm' THEN RAISE EXCEPTION 'cannot_modify_dm' USING errcode='P0001'; END IF;
  v_name := trim(p_name);
  IF v_name = '' OR v_name IS NULL THEN RAISE EXCEPTION 'empty_channel_name' USING errcode='P0001'; END IF;
  UPDATE public.space_channels SET name=v_name WHERE id=p_channel RETURNING * INTO v_channel;
  RETURN v_channel;
END; $function$;

CREATE OR REPLACE FUNCTION public.delete_space_channel(p_channel uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_channel public.space_channels; v_remaining int;
BEGIN
  SELECT * INTO v_channel FROM public.space_channels WHERE id=p_channel;
  IF v_channel.id IS NULL THEN RAISE EXCEPTION 'channel_not_found' USING errcode='P0002'; END IF;
  IF NOT public.is_space_owner(v_channel.space_id) THEN RAISE EXCEPTION 'access_denied' USING errcode='42501'; END IF;
  IF v_channel.type = 'dm' THEN RAISE EXCEPTION 'cannot_delete_dm' USING errcode='P0001'; END IF;
  SELECT COUNT(*) INTO v_remaining FROM public.space_channels WHERE space_id=v_channel.space_id AND type<>'dm';
  IF v_remaining <= 1 THEN RAISE EXCEPTION 'cannot_delete_last_channel' USING errcode='P0001'; END IF;
  DELETE FROM public.space_messages WHERE channel_id=p_channel;
  DELETE FROM public.space_channels WHERE id=p_channel;
END; $function$;

CREATE OR REPLACE FUNCTION public.reorder_space_channels(p_space uuid, p_channel_ids uuid[])
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE i int;
BEGIN
  IF NOT public.is_space_owner(p_space) THEN RAISE EXCEPTION 'access_denied' USING errcode='42501'; END IF;
  FOR i IN 1 .. COALESCE(array_length(p_channel_ids,1),0) LOOP
    UPDATE public.space_channels SET position = i-1
    WHERE id = p_channel_ids[i] AND space_id = p_space AND type <> 'dm';
  END LOOP;
END; $function$;
