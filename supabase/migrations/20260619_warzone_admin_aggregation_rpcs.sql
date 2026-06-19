-- WAR ZONE admin dashboard: server-side aggregation RPCs + report_date indexes.
--
-- Applied to prod (xsgbtptkueabylkxibly) via Supabase MCP on 2026-06-19.
-- Idempotent (create index if not exists, create or replace function).
--
-- The two RPCs mirror the existing client-side aggregation in WarZoneAdmin.tsx
-- exactly (number-verified identical to the live dashboard). They are kept for a
-- potential future refactor but are NOT wired to the frontend: the page still
-- needs the full rows for the Part-A P&L breakdown and mention counts, so calling
-- the RPCs on top would add requests rather than remove them. The indexes are the
-- immediate win — they speed the existing paginated/ordered admin queries.
--
-- round2 == floor(x*100+0.5)/100 matches JS Math.round(x*100)/100. Focus 30d
-- return is rounded per-row before averaging. The firm-edge count_with_30d counts
-- alpha (not change) non-nulls, matching the existing JS quirk.
--
-- SECURITY INVOKER so existing RLS on these admin tables still governs access.

create index if not exists idx_wztm_report_date
  on public.warzone_ticker_mentions (report_date desc);
create index if not exists idx_wzft_report_date
  on public.warzone_focus_tracking (report_date desc);

create or replace function public.get_warzone_focus_stats()
returns table (
  focus_open integer,
  focus_closed integer,
  focus_hit integer,
  focus_hit_rate numeric,
  focus_avg_return_30d numeric,
  focus_avg_days_to_outcome numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with per_row as (
    select
      status,
      case
        when price_30d is null or entry_price is null or entry_price = 0 then null
        else floor(
          (case when direction = 'LONG' then (price_30d / entry_price - 1) * 100
                else (1 - price_30d / entry_price) * 100 end) * 100 + 0.5
        ) / 100
      end as ret30,
      case
        when status is distinct from 'open'
         and outcome_date is not null
         and report_date is not null
        then (outcome_date - report_date)
      end as days_raw
    from public.warzone_focus_tracking
  )
  select
    (count(*) filter (where status = 'open'))::int,
    (count(*) filter (where status is distinct from 'open'))::int,
    (count(*) filter (where status = 'target_hit'))::int,
    case when count(*) filter (where status is distinct from 'open') > 0
         then floor(
           (count(*) filter (where status = 'target_hit')::numeric
            / count(*) filter (where status is distinct from 'open') * 100) * 100 + 0.5
         ) / 100
    end,
    floor(avg(ret30) * 100 + 0.5) / 100,
    floor(avg(days_raw) filter (where days_raw >= 0) * 100 + 0.5) / 100
  from per_row;
$$;

create or replace function public.get_warzone_mention_edge()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'by_type', coalesce((
      select jsonb_agg(t order by t.avg_alpha_30d_pct desc nulls last)
      from (
        select
          mention_type,
          count(*)                                   as count,
          count(change_30d_pct)                      as count_with_30d,
          case when count(change_30d_pct) > 0
               then floor(avg(change_30d_pct) * 100 + 0.5) / 100 end as avg_change_30d_pct,
          case when count(alpha_30d_pct) > 0
               then floor(avg(alpha_30d_pct) * 100 + 0.5) / 100 end  as avg_alpha_30d_pct
        from public.warzone_ticker_mentions
        group by mention_type
      ) t
    ), '[]'::jsonb),
    'by_firm', coalesce((
      select jsonb_agg(f order by f.avg_alpha_30d_pct desc)
      from (
        select
          source_firm                                as firm,
          count(*)                                   as count,
          count(alpha_30d_pct)                       as count_with_30d,
          floor(avg(alpha_30d_pct) * 100 + 0.5) / 100 as avg_alpha_30d_pct
        from public.warzone_ticker_mentions
        where source_firm is not null
        group by source_firm
        having count(alpha_30d_pct) > 0
        order by floor(avg(alpha_30d_pct) * 100 + 0.5) / 100 desc
        limit 10
      ) f
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_warzone_focus_stats()  to authenticated;
grant execute on function public.get_warzone_mention_edge() to authenticated;
