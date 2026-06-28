-- Pin / unpin a space message. Owner-only (room admin powers are owner-only,
-- matching the UI gate in SpaceDetail). One pinned message per channel: pinning
-- a message first clears any other pinned message in the same channel.
-- Additive only — no schema change (space_messages.pinned already exists).

CREATE OR REPLACE FUNCTION public.pin_space_message(
  p_message uuid,
  p_pinned  boolean
)
RETURNS public.space_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.space_messages;
BEGIN
  SELECT * INTO v_msg
  FROM public.space_messages
  WHERE id = p_message
    AND deleted_at IS NULL;

  IF v_msg.id IS NULL THEN
    RAISE EXCEPTION 'message_not_found' USING errcode = 'P0002';
  END IF;

  -- Owner-only: pinning is a room-admin action.
  IF NOT public.is_space_owner(v_msg.space_id) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  IF p_pinned THEN
    -- Single pin per channel: clear any existing pin first.
    UPDATE public.space_messages
    SET pinned = false
    WHERE channel_id = v_msg.channel_id
      AND pinned = true
      AND id <> p_message;

    UPDATE public.space_messages
    SET pinned = true
    WHERE id = p_message
    RETURNING * INTO v_msg;
  ELSE
    UPDATE public.space_messages
    SET pinned = false
    WHERE id = p_message
    RETURNING * INTO v_msg;
  END IF;

  RETURN v_msg;
END;
$$;

REVOKE ALL ON FUNCTION public.pin_space_message(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pin_space_message(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.pin_space_message(uuid, boolean) IS
  'Pin or unpin a space message (owner-only). One pinned message per channel: pinning clears any prior pin in the same channel.';
