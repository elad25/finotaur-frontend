-- Bell shows ONLY admin-authored announcements (not auto report/company notifications).
CREATE OR REPLACE FUNCTION public.get_my_notifications(p_limit int DEFAULT 30)
RETURNS TABLE(id uuid, notification_id uuid, title text, message text, type text, priority text, is_read boolean, published_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT un.id, c.id, c.title, c.message, c.type, c.priority, COALESCE(un.is_read,false), c.published_at
  FROM public.user_notifications un
  JOIN public.update_center_notifications c ON c.id = un.notification_id
  WHERE un.user_id = auth.uid()
    AND COALESCE(un.is_dismissed,false) = false
    AND COALESCE(c.status,'sent') = 'sent'
    AND COALESCE(c.is_admin_generated,false) = true
  ORDER BY c.published_at DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_my_unread_count()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.user_notifications un
  JOIN public.update_center_notifications c ON c.id = un.notification_id
  WHERE un.user_id = auth.uid() AND COALESCE(un.is_read,false)=false
    AND COALESCE(un.is_dismissed,false)=false AND COALESCE(c.status,'sent')='sent'
    AND COALESCE(c.is_admin_generated,false) = true;
$$;
