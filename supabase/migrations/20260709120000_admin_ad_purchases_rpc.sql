-- admin_ad_purchases(p_days) — cost-per-subscriber measurement.
--
-- Mirrors admin_ad_attribution() but aggregates paid_conversion events instead
-- of signups: paid subscribers + revenue by platform / campaign / ad, split by
-- is_first_payment (new sub vs renewal). Additive — creates a NEW function only,
-- does not touch admin_ad_attribution or public.events. Same admin-only guard,
-- SECURITY DEFINER, and platform-mapping as the sibling function.

CREATE OR REPLACE FUNCTION public.admin_ad_purchases(p_days integer DEFAULT 90)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  WITH purchases AS (
    SELECT
      e.user_id,
      e.ts,
      COALESCE(NULLIF(e.props->>'utm_source',''), NULL)   AS utm_source,
      COALESCE(NULLIF(e.props->>'utm_medium',''), NULL)   AS utm_medium,
      COALESCE(NULLIF(e.props->>'utm_campaign',''), NULL) AS utm_campaign,
      COALESCE(NULLIF(e.props->>'utm_content',''), NULL)  AS utm_content,
      COALESCE(NULLIF(e.props->>'utm_term',''), NULL)     AS utm_term,
      COALESCE((e.props->>'amount_usd')::numeric, 0)          AS amount_usd,
      COALESCE((e.props->>'is_first_payment')::boolean, false) AS is_first_payment,
      NULLIF(e.props->>'plan','')    AS plan,
      NULLIF(e.props->>'product','') AS product,
      CASE
        WHEN lower(COALESCE(e.props->>'utm_source','')) IN ('x','twitter','t.co')      THEN 'X'
        WHEN lower(COALESCE(e.props->>'utm_source','')) IN ('facebook','fb','instagram','ig','meta') THEN 'Meta'
        WHEN COALESCE(e.props->>'utm_source','') <> ''                                  THEN 'Other paid/tagged'
        WHEN COALESCE(e.props->>'referrer','') ILIKE '%google.%'                        THEN 'Organic search'
        WHEN COALESCE(e.props->>'referrer','') <> ''                                    THEN 'Referral'
        ELSE 'Direct / unknown'
      END AS platform
    FROM public.events e
    WHERE e.event_name = 'paid_conversion'
      AND e.ts > now() - make_interval(days => p_days)
  )
  SELECT jsonb_build_object(
    'window_days', p_days,
    'totals', jsonb_build_object(
      'subs',                  (SELECT count(*) FROM purchases),
      'first_payment_subs',    (SELECT count(*) FROM purchases WHERE is_first_payment),
      'renewals',              (SELECT count(*) FROM purchases WHERE NOT is_first_payment),
      'attributed',            (SELECT count(*) FROM purchases WHERE utm_source IS NOT NULL),
      'organic',               (SELECT count(*) FROM purchases WHERE utm_source IS NULL),
      'revenue',               (SELECT COALESCE(sum(amount_usd),0) FROM purchases),
      'first_payment_revenue', (SELECT COALESCE(sum(amount_usd),0) FROM purchases WHERE is_first_payment)
    ),
    'by_platform', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'platform', platform, 'subs', c, 'first_payment_subs', fps, 'revenue', rev
      ) ORDER BY rev DESC)
      FROM (
        SELECT platform, count(*) c, count(*) FILTER (WHERE is_first_payment) fps,
               COALESCE(sum(amount_usd),0) rev
        FROM purchases GROUP BY platform
      ) t
    ), '[]'::jsonb),
    'by_campaign', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'utm_campaign', utm_campaign, 'utm_source', utm_source,
        'subs', c, 'first_payment_subs', fps, 'revenue', rev
      ) ORDER BY rev DESC)
      FROM (
        SELECT utm_campaign, utm_source, count(*) c,
               count(*) FILTER (WHERE is_first_payment) fps, COALESCE(sum(amount_usd),0) rev
        FROM purchases WHERE utm_campaign IS NOT NULL GROUP BY utm_campaign, utm_source
      ) t
    ), '[]'::jsonb),
    'by_ad', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'utm_content', utm_content, 'utm_campaign', utm_campaign, 'utm_source', utm_source,
        'subs', c, 'first_payment_subs', fps, 'revenue', rev
      ) ORDER BY rev DESC)
      FROM (
        SELECT utm_content, utm_campaign, utm_source, count(*) c,
               count(*) FILTER (WHERE is_first_payment) fps, COALESCE(sum(amount_usd),0) rev
        FROM purchases WHERE utm_content IS NOT NULL GROUP BY utm_content, utm_campaign, utm_source
      ) t
    ), '[]'::jsonb),
    'purchases', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', pu.user_id,
        'email', p.email,
        'display_name', p.display_name,
        'ts', pu.ts,
        'platform', pu.platform,
        'utm_source', pu.utm_source,
        'utm_campaign', pu.utm_campaign,
        'utm_content', pu.utm_content,
        'plan', pu.plan,
        'amount_usd', pu.amount_usd,
        'is_first_payment', pu.is_first_payment
      ) ORDER BY pu.ts DESC)
      FROM purchases pu
      LEFT JOIN public.profiles p ON p.id = pu.user_id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_ad_purchases(integer) TO authenticated;
