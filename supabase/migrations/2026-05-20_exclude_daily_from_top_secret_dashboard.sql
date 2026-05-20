-- =====================================================
-- 2026-05-20  Exclude report_type='daily' from TOP SECRET Dashboard
-- =====================================================
-- WAR ZONE Daily reports were being written to published_reports with
-- report_type='daily' and target_group='top_secret'. They appeared in
-- the function output but the frontend mapReportType() returns null
-- for 'daily', so every fetch transformed 79 rows -> null -> dropped.
-- Result: TOP SECRET Dashboard appeared empty even for super_admin.
--
-- Decision (option A): WAR ZONE Daily is a separate product (daily
-- newsletter, manual admin publish) and should NOT appear in the
-- TOP SECRET Dashboard. Filter it at the RPC layer.
--
-- Existing 'daily' rows in published_reports are left in place — only
-- the read path is filtered. PublishedReportsManager already excludes
-- 'daily' via its v2.1 filter.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_published_reports_for_user(
    p_user_id uuid,
    p_limit integer DEFAULT 100,
    p_is_tester boolean DEFAULT false
)
RETURNS TABLE(
    id uuid,
    report_type text,
    original_report_id text,
    title text,
    subtitle text,
    ticker text,
    company_name text,
    sector text,
    report_month text,
    markdown_content text,
    html_content text,
    qa_score integer,
    pdf_url text,
    pdf_storage_path text,
    highlights text[],
    key_metric_label text,
    key_metric_value text,
    key_insights_count integer,
    is_featured boolean,
    is_pinned boolean,
    published_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    visibility text,
    market_regime text,
    pmi_value numeric,
    target_group text,
    likes_count bigint,
    comments_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_profile RECORD;
BEGIN
    SELECT role, top_secret_enabled, newsletter_enabled, newsletter_paid, account_type
    INTO v_user_profile
    FROM public.profiles
    WHERE profiles.id = p_user_id;

    RETURN QUERY
    SELECT
        pr.id,
        pr.report_type,
        pr.original_report_id,
        pr.title,
        pr.subtitle,
        pr.ticker,
        pr.company_name,
        pr.sector,
        pr.report_month,
        pr.markdown_content,
        pr.html_content,
        pr.qa_score,
        pr.pdf_url,
        pr.pdf_storage_path,
        pr.highlights,
        pr.key_metric_label,
        pr.key_metric_value,
        pr.key_insights_count,
        pr.is_featured,
        pr.is_pinned,
        pr.published_at,
        pr.created_at,
        pr.updated_at,
        pr.visibility,
        pr.market_regime,
        pr.pmi_value,
        pr.target_group,
        COALESCE((SELECT COUNT(*) FROM report_likes rl WHERE rl.report_id = pr.id), 0)::BIGINT AS likes_count,
        0::BIGINT AS comments_count
    FROM public.published_reports pr
    WHERE
        -- 🔥 NEW (2026-05-20): exclude WAR ZONE Daily — separate product
        pr.report_type <> 'daily'
        AND
        -- Visibility filtering
        CASE
          WHEN p_is_tester = TRUE THEN TRUE
          WHEN v_user_profile.role IN ('admin', 'super_admin') THEN TRUE
          ELSE (pr.visibility = 'live')
        END
        -- Target group filtering (for non-admins)
        AND (
            v_user_profile.role IN ('admin', 'super_admin')
            OR pr.target_group = 'all'
            OR (pr.target_group = 'top_secret' AND v_user_profile.top_secret_enabled = true)
            OR (pr.target_group = 'newsletter' AND (v_user_profile.newsletter_enabled = true OR v_user_profile.newsletter_paid = true))
            OR (pr.target_group = 'trading_journal' AND v_user_profile.account_type IN ('basic', 'premium', 'pro'))
        )
    ORDER BY
        pr.is_pinned DESC NULLS LAST,
        pr.is_featured DESC NULLS LAST,
        pr.published_at DESC
    LIMIT p_limit;
END;
$function$;
