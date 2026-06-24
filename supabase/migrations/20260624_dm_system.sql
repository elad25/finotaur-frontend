-- =====================================================================
-- Direct Messages system for The Floor
-- Tables: dm_conversations, dm_messages, dm_requests
-- Features: request/accept flow, avatar+username, realtime, unread
-- =====================================================================

-- ── 1. Tables ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dm_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_requests_no_self CHECK (from_user <> to_user),
  CONSTRAINT dm_requests_pair_unique UNIQUE (from_user, to_user)
);

CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_a_last_read timestamptz NOT NULL DEFAULT now(),
  user_b_last_read timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_conversations_no_self CHECK (user_a <> user_b)
);

-- Ensure a pair can only have one conversation (order-independent)
CREATE UNIQUE INDEX IF NOT EXISTS dm_conversations_pair_idx
  ON public.dm_conversations (
    LEAST(user_a::text,  user_b::text),
    GREATEST(user_a::text, user_b::text)
  );

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 4000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dm_messages_conversation_created_idx
  ON public.dm_messages (conversation_id, created_at DESC);

-- ── 2. RLS ────────────────────────────────────────────────────────────

ALTER TABLE public.dm_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages     ENABLE ROW LEVEL SECURITY;

-- dm_requests: sender sees their own, recipient sees incoming
CREATE POLICY "dm_requests_select" ON public.dm_requests FOR SELECT
  USING (from_user = auth.uid() OR to_user = auth.uid());
CREATE POLICY "dm_requests_insert" ON public.dm_requests FOR INSERT
  WITH CHECK (from_user = auth.uid());
CREATE POLICY "dm_requests_delete" ON public.dm_requests FOR DELETE
  USING (from_user = auth.uid() OR to_user = auth.uid());

-- dm_conversations: only participants
CREATE POLICY "dm_conversations_select" ON public.dm_conversations FOR SELECT
  USING (user_a = auth.uid() OR user_b = auth.uid());
CREATE POLICY "dm_conversations_update" ON public.dm_conversations FOR UPDATE
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- dm_messages: only conversation participants
CREATE POLICY "dm_messages_select" ON public.dm_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );
CREATE POLICY "dm_messages_insert" ON public.dm_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- ── 3. RPCs ───────────────────────────────────────────────────────────

-- Search users by floor_username (for New DM flow)
CREATE OR REPLACE FUNCTION public.search_floor_users(p_query text)
RETURNS TABLE (
  user_id     uuid,
  username    text,
  avatar_url  text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id         AS user_id,
    p.floor_username AS username,
    p.avatar_url
  FROM profiles p
  WHERE p.floor_username IS NOT NULL
    AND p.id <> auth.uid()
    AND p.floor_username ILIKE '%' || lower(trim(p_query)) || '%'
  ORDER BY p.floor_username
  LIMIT 20;
$$;

-- Send a DM request (idempotent — re-inserting is fine)
CREATE OR REPLACE FUNCTION public.send_dm_request(p_to uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Block if conversation already exists
  IF EXISTS (
    SELECT 1 FROM dm_conversations
    WHERE (user_a = auth.uid() AND user_b = p_to)
       OR (user_a = p_to      AND user_b = auth.uid())
  ) THEN
    RAISE EXCEPTION 'conversation_exists';
  END IF;
  -- Block if target hasn't set a floor username yet
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_to AND floor_username IS NOT NULL) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO dm_requests (from_user, to_user)
  VALUES (auth.uid(), p_to)
  ON CONFLICT (from_user, to_user) DO NOTHING;
END;
$$;

-- List incoming DM requests (for the recipient)
CREATE OR REPLACE FUNCTION public.list_dm_requests()
RETURNS TABLE (
  request_id  uuid,
  from_user   uuid,
  username    text,
  avatar_url  text,
  created_at  timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    r.id          AS request_id,
    r.from_user,
    p.floor_username AS username,
    p.avatar_url,
    r.created_at
  FROM dm_requests r
  JOIN profiles p ON p.id = r.from_user
  WHERE r.to_user = auth.uid()
  ORDER BY r.created_at DESC;
$$;

-- Accept a DM request → creates conversation, deletes request
CREATE OR REPLACE FUNCTION public.accept_dm_request(p_request_id uuid)
RETURNS uuid  -- returns conversation_id
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from    uuid;
  v_conv_id uuid;
BEGIN
  -- Verify requester is the recipient
  SELECT from_user INTO v_from
  FROM dm_requests
  WHERE id = p_request_id AND to_user = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  -- Create conversation (idempotent via the unique index)
  INSERT INTO dm_conversations (user_a, user_b)
  VALUES (v_from, auth.uid())
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_conv_id
  FROM dm_conversations
  WHERE (user_a = v_from AND user_b = auth.uid())
     OR (user_a = auth.uid() AND user_b = v_from);

  -- Remove the request
  DELETE FROM dm_requests WHERE id = p_request_id;

  RETURN v_conv_id;
END;
$$;

-- Decline a DM request
CREATE OR REPLACE FUNCTION public.decline_dm_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM dm_requests
  WHERE id = p_request_id AND to_user = auth.uid();
END;
$$;

-- List conversations with other user info + last message + unread count
CREATE OR REPLACE FUNCTION public.list_my_conversations()
RETURNS TABLE (
  conversation_id uuid,
  other_user_id   uuid,
  other_username  text,
  other_avatar    text,
  last_body       text,
  last_at         timestamptz,
  unread          bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_convs AS (
    SELECT
      c.id,
      CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END AS other_id,
      CASE WHEN c.user_a = auth.uid() THEN c.user_a_last_read ELSE c.user_b_last_read END AS my_last_read
    FROM dm_conversations c
    WHERE c.user_a = auth.uid() OR c.user_b = auth.uid()
  ),
  last_msgs AS (
    SELECT DISTINCT ON (conversation_id)
      conversation_id,
      body,
      created_at
    FROM dm_messages
    ORDER BY conversation_id, created_at DESC
  )
  SELECT
    mc.id               AS conversation_id,
    mc.other_id         AS other_user_id,
    p.floor_username    AS other_username,
    p.avatar_url        AS other_avatar,
    lm.body             AS last_body,
    COALESCE(lm.created_at, '1970-01-01'::timestamptz) AS last_at,
    (
      SELECT COUNT(*) FROM dm_messages m2
      WHERE m2.conversation_id = mc.id
        AND m2.sender_id <> auth.uid()
        AND m2.created_at > mc.my_last_read
    )                   AS unread
  FROM my_convs mc
  JOIN profiles p ON p.id = mc.other_id
  LEFT JOIN last_msgs lm ON lm.conversation_id = mc.id
  ORDER BY last_at DESC;
$$;

-- Fetch messages in a conversation (newest at end)
CREATE OR REPLACE FUNCTION public.list_direct_messages(p_conversation uuid, p_limit int DEFAULT 100)
RETURNS TABLE (
  id          uuid,
  sender_id   uuid,
  body        text,
  created_at  timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.sender_id, m.body, m.created_at
  FROM dm_messages m
  WHERE m.conversation_id = p_conversation
    AND EXISTS (
      SELECT 1 FROM dm_conversations c
      WHERE c.id = p_conversation
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  ORDER BY m.created_at ASC
  LIMIT p_limit;
$$;

-- Send a message (verifies sender is a participant)
CREATE OR REPLACE FUNCTION public.send_direct_message(p_conversation uuid, p_body text)
RETURNS uuid  -- new message id
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_msg_id uuid;
BEGIN
  -- Verify participant
  IF NOT EXISTS (
    SELECT 1 FROM dm_conversations
    WHERE id = p_conversation
      AND (user_a = auth.uid() OR user_b = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not_a_participant';
  END IF;

  INSERT INTO dm_messages (conversation_id, sender_id, body)
  VALUES (p_conversation, auth.uid(), trim(p_body))
  RETURNING id INTO v_msg_id;

  -- Mark as read for the sender
  UPDATE dm_conversations
  SET user_a_last_read = now()
  WHERE id = p_conversation AND user_a = auth.uid();
  UPDATE dm_conversations
  SET user_b_last_read = now()
  WHERE id = p_conversation AND user_b = auth.uid();

  RETURN v_msg_id;
END;
$$;

-- Open a conversation by other user id (returns null if none yet)
CREATE OR REPLACE FUNCTION public.open_direct_conversation(p_other uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM dm_conversations
  WHERE (user_a = auth.uid() AND user_b = p_other)
     OR (user_a = p_other     AND user_b = auth.uid())
  LIMIT 1;
$$;

-- Mark all messages in a conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE dm_conversations
  SET user_a_last_read = now()
  WHERE id = p_conversation AND user_a = auth.uid();
  UPDATE dm_conversations
  SET user_b_last_read = now()
  WHERE id = p_conversation AND user_b = auth.uid();
END;
$$;

-- ── 4. Realtime ───────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_requests;
