-- Message RPCs: post a message and paginate channel history.
-- Announcement channels require manager (owner/co_mentor) role.
-- All SECURITY DEFINER.

-- Post a message to a channel. Validates access, role for announcements,
-- and rejects blank bodies.
CREATE OR REPLACE FUNCTION public.post_space_message(
  p_channel uuid,
  p_body    text
)
RETURNS public.space_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel public.space_channels;
  v_msg     public.space_messages;
BEGIN
  SELECT * INTO v_channel
  FROM public.space_channels
  WHERE id = p_channel;

  IF v_channel.id IS NULL THEN
    RAISE EXCEPTION 'channel_not_found' USING errcode = 'P0002';
  END IF;

  IF NOT public.can_access_channel(p_channel) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Only managers may post to announcement channels.
  IF v_channel.type = 'announcement'
     AND NOT public.is_space_manager(v_channel.space_id)
  THEN
    RAISE EXCEPTION 'not_authorized_announcement' USING errcode = '42501';
  END IF;

  p_body := trim(p_body);
  IF p_body = '' OR p_body IS NULL THEN
    RAISE EXCEPTION 'empty_message' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.space_messages (channel_id, space_id, author_id, body)
  VALUES (p_channel, v_channel.space_id, auth.uid(), p_body)
  RETURNING * INTO v_msg;

  RETURN v_msg;
END;
$$;

REVOKE ALL ON FUNCTION public.post_space_message(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_space_message(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.post_space_message(uuid, text) IS
  'Posts a message to a space channel. Announcement channels require manager role. Empty bodies are rejected.';


-- Paginated message history for a channel, newest first, cursor-based via p_before.
-- Joins profiles for author display name. Excludes soft-deleted messages.
CREATE OR REPLACE FUNCTION public.list_space_messages(
  p_channel uuid,
  p_before  timestamptz DEFAULT NULL,
  p_limit   int         DEFAULT 50
)
RETURNS TABLE (
  id          uuid,
  channel_id  uuid,
  author_id   uuid,
  author_name text,
  body        text,
  attachments jsonb,
  pinned      boolean,
  created_at  timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_channel(p_channel) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.channel_id,
    m.author_id,
    COALESCE(p.display_name, p.email) AS author_name,
    m.body,
    m.attachments,
    m.pinned,
    m.created_at
  FROM public.space_messages m
  JOIN public.profiles       p ON p.id = m.author_id
  WHERE m.channel_id  = p_channel
    AND m.deleted_at  IS NULL
    AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at DESC
  LIMIT LEAST(p_limit, 100);
END;
$$;

REVOKE ALL ON FUNCTION public.list_space_messages(uuid, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_space_messages(uuid, timestamptz, int) TO authenticated;

COMMENT ON FUNCTION public.list_space_messages(uuid, timestamptz, int) IS
  'Cursor-paginated message history for a channel. Excludes soft-deleted rows. Newest first. Max 100 per page.';
