-- Admin announcements: additive columns + recipient/notification RPCs
ALTER TABLE public.update_center_notifications
  ADD COLUMN IF NOT EXISTS channels text[] DEFAULT ARRAY['inapp']::text[],
  ADD COLUMN IF NOT EXISTS audience_filter jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_ucn_scheduled
  ON public.update_center_notifications(status, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_un_user_unread
  ON public.user_notifications(user_id) WHERE COALESCE(is_read,false) = false;

-- Case-insensitive recipient resolver (returns user_id + email + opt-in flag). Admin-only.
CREATE OR REPLACE FUNCTION public.get_announcement_recipient_ids(p_filters jsonb)
RETURNS TABLE(user_id uuid, email text, display_name text, account_type text, email_opt_in boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conditions text[] := ARRAY[]::text[];
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  IF (p_filters->>'all_users')::boolean THEN
    v_conditions := array_append(v_conditions, '1=1'); END IF;
  IF (p_filters->>'all_paying')::boolean THEN
    v_conditions := array_append(v_conditions, '(subscription_status = ''active'' OR lower(account_type) IN (''basic'',''premium''))'); END IF;
  IF (p_filters->>'premium')::boolean THEN
    v_conditions := array_append(v_conditions, 'lower(account_type) = ''premium'''); END IF;
  IF (p_filters->>'basic')::boolean THEN
    v_conditions := array_append(v_conditions, 'lower(account_type) = ''basic'''); END IF;
  IF (p_filters->>'free')::boolean THEN
    v_conditions := array_append(v_conditions, '(account_type IS NULL OR lower(account_type) = ''free'')'); END IF;
  IF (p_filters->>'active_this_week')::boolean THEN
    v_conditions := array_append(v_conditions, 'last_login_at > NOW() - INTERVAL ''7 days'''); END IF;
  IF (p_filters->>'inactive_30_days')::boolean THEN
    v_conditions := array_append(v_conditions, '(last_login_at < NOW() - INTERVAL ''30 days'' OR last_login_at IS NULL)'); END IF;
  IF (p_filters->>'cancelled_winback')::boolean THEN
    v_conditions := array_append(v_conditions, 'subscription_status IN (''canceled'',''cancelled'',''expired'')'); END IF;
  IF array_length(v_conditions,1) IS NULL THEN RETURN; END IF;
  RETURN QUERY EXECUTE format(
    'SELECT id, email, display_name, account_type, COALESCE(email_notifications, true)
     FROM profiles
     WHERE (is_banned IS NULL OR is_banned = false) AND email IS NOT NULL
       AND role NOT IN (''admin'',''super_admin'') AND (%s)',
    array_to_string(v_conditions, ' OR '));
END; $$;

CREATE OR REPLACE FUNCTION public.get_announcement_recipient_count(p_filters jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT count(*) INTO v FROM public.get_announcement_recipient_ids(p_filters);
  RETURN COALESCE(v,0);
END; $$;

CREATE OR REPLACE FUNCTION public.get_my_notifications(p_limit int DEFAULT 30)
RETURNS TABLE(id uuid, notification_id uuid, title text, message text, type text, priority text, is_read boolean, published_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT un.id, c.id, c.title, c.message, c.type, c.priority, COALESCE(un.is_read,false), c.published_at
  FROM public.user_notifications un
  JOIN public.update_center_notifications c ON c.id = un.notification_id
  WHERE un.user_id = auth.uid()
    AND COALESCE(un.is_dismissed,false) = false
    AND COALESCE(c.status,'sent') = 'sent'
  ORDER BY c.published_at DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_my_unread_count()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.user_notifications un
  JOIN public.update_center_notifications c ON c.id = un.notification_id
  WHERE un.user_id = auth.uid() AND COALESCE(un.is_read,false)=false
    AND COALESCE(un.is_dismissed,false)=false AND COALESCE(c.status,'sent')='sent';
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_notifications SET is_read=true, read_at=now()
  WHERE id = p_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_notifications SET is_read=true, read_at=now()
  WHERE user_id = auth.uid() AND COALESCE(is_read,false)=false;
$$;

CREATE OR REPLACE FUNCTION public.get_recent_announcements(p_limit int DEFAULT 20)
RETURNS TABLE(id uuid, title text, message text, channels text[], audience_filter jsonb, status text, scheduled_at timestamptz, sent_at timestamptz, published_at timestamptz, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  RETURN QUERY SELECT c.id,c.title,c.message,c.channels,c.audience_filter,c.status,c.scheduled_at,c.sent_at,c.published_at,c.created_at
  FROM public.update_center_notifications c WHERE c.is_admin_generated = true
  ORDER BY c.created_at DESC LIMIT p_limit;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_announcement_recipient_ids(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_announcement_recipient_count(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_notifications(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_unread_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_announcements(int) TO authenticated;
