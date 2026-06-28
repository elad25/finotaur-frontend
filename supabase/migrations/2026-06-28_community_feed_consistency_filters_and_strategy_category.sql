-- 2026-06-28 — Community Feed redesign: consistency reputation + tag filters.
-- APPLIED TO PRODUCTION via Supabase MCP on 2026-06-28 (project xsgbtptkueabylkxibly)
-- in two migrations: `community_feed_consistency_and_filters` and
-- `add_strategy_category_and_rewire_feed_facets`. This file is the consolidated
-- record of the final state for repo traceability.
--
-- Reputation is by design WIN RATE + PROFIT FACTOR (money-agnostic R:R) only —
-- net P&L is never a ranking input (consistency over dollars).

-- ── Dedicated strategy category (distinct from `category`, which the editor
-- repurposed for asset classes) ─────────────────────────────────────────────────
alter table public.strategies add column if not exists strategy_category text;

update public.strategies set strategy_category = 'Price Action'
where strategy_category is null and lower(category) = 'price_action';

-- ── Consistency score: WR + Profit Factor, NO net P&L ───────────────────────────
create or replace function public.community_consistency_score(p_user uuid, p_period text default 'all')
returns table(
  win_rate numeric, profit_factor numeric, avg_rr numeric,
  trade_count bigint, consistency_score numeric, tier text
)
language sql stable security definer set search_path to 'public'
as $$
  with closed as (
    select t.pnl, t.actual_r
    from public.trades t
    where t.user_id = p_user
      and t.close_at is not null
      and t.pnl is not null
      and (
        case p_period
          when 'week'    then t.close_at >= now() - interval '7 days'
          when 'month'   then t.close_at >= now() - interval '30 days'
          when 'quarter' then t.close_at >= now() - interval '90 days'
          else true
        end
      )
  ),
  agg as (
    select
      count(*)::bigint                                    as n,
      count(*) filter (where pnl > 0)::numeric           as wins,
      coalesce(sum(pnl) filter (where pnl > 0), 0)       as gross_win,
      coalesce(abs(sum(pnl) filter (where pnl < 0)), 0)  as gross_loss,
      avg(actual_r) filter (where actual_r is not null)  as avg_r
    from closed
  ),
  calc as (
    select
      n, wins, gross_win, gross_loss, avg_r,
      case when n > 0 then wins / n else null end as wr,
      case when gross_loss > 0 then gross_win / gross_loss
           when gross_win  > 0 then 5.0
           else 0 end as pf_calc
    from agg
  )
  select
    case when n > 0 then round(wr, 4) else null end,
    case when gross_loss > 0 then round(gross_win / gross_loss, 2) else null end,
    round(avg_r, 2),
    n,
    case when n > 0 then round(0.6 * least(coalesce(pf_calc,0) / 3.0, 1) * 100 + 0.4 * coalesce(wr,0) * 100, 1) else null end,
    case
      when n < 10 then null
      when coalesce(pf_calc,0) >= 2.0 and coalesce(wr,0) >= 0.45 then 'elite'
      when coalesce(pf_calc,0) >= 1.5 then 'pro'
      when coalesce(pf_calc,0) >= 1.1 then 'rising'
      else null
    end
  from calc;
$$;
grant execute on function public.community_consistency_score(uuid, text) to authenticated, anon, service_role;

-- ── Consistency leaderboard ("Top this week") ───────────────────────────────────
create or replace function public.community_consistency_leaderboard(p_period text default 'all', p_limit integer default 10)
returns table(
  user_id uuid, display_name text, avatar_url text, win_rate numeric, profit_factor numeric,
  consistency_score numeric, tier text, trade_count bigint, rank bigint
)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not (public.is_paying_user() or public.is_admin_user()) then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  return query
  with eligible as (
    select p.id, coalesce(p.floor_username, p.display_name, p.email) as display_name, p.avatar_url
    from public.profiles p
    where p.platform_plan <> 'free' and p.platform_subscription_status in ('active', 'trial')
  ),
  scored as (
    select e.id as user_id, e.display_name, e.avatar_url,
           cs.win_rate, cs.profit_factor, cs.consistency_score, cs.tier, cs.trade_count
    from eligible e
    cross join lateral public.community_consistency_score(e.id, p_period) cs
    where cs.trade_count >= 5 and cs.consistency_score is not null
  )
  select s.user_id, s.display_name, s.avatar_url, s.win_rate, s.profit_factor,
         s.consistency_score, s.tier, s.trade_count,
         rank() over (order by s.consistency_score desc) as rank
  from scored s
  order by rank
  limit least(p_limit, 50);
end;
$$;
grant execute on function public.community_consistency_leaderboard(text, integer) to authenticated, anon, service_role;

-- ── Tag facets for the right rail ───────────────────────────────────────────────
create or replace function public.feed_tag_facets()
returns table(facet text, value text, label text, count bigint)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not (public.is_paying_user() or public.is_admin_user()) then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  return query
  with posts as (
    select gp.id, gp.author_id, gp.attached_trade_id
    from public.global_posts gp where gp.deleted_at is null
  ),
  joined as (
    select p.id, t.symbol, t.pnl, t.strategy_id, pr.platform_plan
    from posts p
    left join public.trades t    on t.id  = p.attached_trade_id
    join      public.profiles pr on pr.id = p.author_id
  ),
  facets as (
    select 'symbol'::text as facet, j.symbol as value, j.symbol as label, count(*)::bigint as count
    from joined j where j.symbol is not null group by j.symbol
    union all
    select 'strategy_category', s.strategy_category, s.strategy_category, count(*)::bigint
    from joined j join public.strategies s on s.id = j.strategy_id
    where s.strategy_category is not null group by s.strategy_category
    union all
    select 'outcome', 'win', 'Wins', count(*)::bigint from joined j where j.pnl > 0
    union all
    select 'outcome', 'loss', 'Losses', count(*)::bigint from joined j where j.pnl < 0
    union all
    select 'tier', j.platform_plan, initcap(j.platform_plan), count(*)::bigint
    from joined j where j.platform_plan is not null group by j.platform_plan
  )
  select f.facet, f.value, f.label, f.count from facets f where f.count > 0
  order by f.facet, f.count desc;
end;
$$;
grant execute on function public.feed_tag_facets() to authenticated, anon, service_role;

-- ── list_global_feed: optional filters + enrichment (strategy, R, reputation) ────
create or replace function public.list_global_feed(
  p_before timestamp with time zone default null,
  p_limit integer default 20,
  p_symbol text default null,
  p_strategy_category text default null,
  p_outcome text default null,
  p_tier text default null
)
returns table(
  id uuid, author_id uuid, author_name text, author_avatar_url text, body text,
  attached_trade_id uuid, trade_symbol text, trade_side text, trade_pnl numeric, trade_size numeric,
  trade_setup text, trade_entry numeric, trade_exit numeric,
  trade_open_at timestamp with time zone, trade_close_at timestamp with time zone,
  hide_pnl boolean, show_setup_only boolean, reveal_size boolean, pinned boolean,
  created_at timestamp with time zone,
  comment_count bigint, up_count bigint, down_count bigint, repost_count bigint,
  my_reaction text, trade_emotion text,
  trade_strategy_name text, trade_strategy_category text, trade_r numeric,
  author_tier text, author_consistency_tier text, author_win_rate numeric, author_profit_factor numeric
)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not (public.is_paying_user() or public.is_admin_user()) then
    raise exception 'global_feed_requires_paid_plan' using errcode = '42501';
  end if;
  return query
  select
    gp.id, gp.author_id,
    coalesce(pr.floor_username, pr.display_name, pr.email), pr.avatar_url, gp.body,
    gp.attached_trade_id, t.symbol, t.side,
    case when gp.hide_pnl or gp.show_setup_only then null else t.pnl end,
    case when gp.reveal_size then t.quantity else null end,
    t.setup,
    case when gp.show_setup_only then null else t.entry_price end,
    case when gp.show_setup_only then null else t.exit_price  end,
    t.open_at, t.close_at,
    gp.hide_pnl, gp.show_setup_only, gp.reveal_size, gp.pinned, gp.created_at,
    (select count(*) from public.global_post_comments c where c.post_id = gp.id and c.deleted_at is null),
    (select count(*) from public.global_post_reactions r where r.post_id = gp.id and r.kind = 'up'),
    (select count(*) from public.global_post_reactions r where r.post_id = gp.id and r.kind = 'down'),
    (select count(*) from public.global_post_reactions r where r.post_id = gp.id and r.kind = 'repost'),
    (select r2.kind from public.global_post_reactions r2 where r2.post_id = gp.id and r2.user_id = auth.uid() limit 1),
    t.emotion, s.name, s.strategy_category,
    case when gp.hide_pnl or gp.show_setup_only then null else t.actual_r end,
    pr.platform_plan, rep.tier, rep.win_rate, rep.profit_factor
  from public.global_posts gp
  join public.profiles pr on pr.id = gp.author_id
  left join public.trades t on t.id = gp.attached_trade_id
  left join public.strategies s on s.id = t.strategy_id
  left join lateral public.community_consistency_score(gp.author_id, 'all') rep on true
  where gp.deleted_at is null
    and (p_before is null or gp.created_at < p_before)
    and (p_symbol is null or t.symbol = p_symbol)
    and (p_strategy_category is null or s.strategy_category = p_strategy_category)
    and (p_outcome is null or (p_outcome = 'win' and t.pnl > 0) or (p_outcome = 'loss' and t.pnl < 0))
    and (p_tier is null or pr.platform_plan = p_tier)
  order by gp.pinned desc, gp.created_at desc
  limit least(p_limit, 50);
end;
$$;
grant execute on function public.list_global_feed(timestamp with time zone, integer, text, text, text, text) to authenticated, anon, service_role;
