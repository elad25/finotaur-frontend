-- 20260710_floor_championship.sql
-- FINOTAUR Floor Championship upgrade — quality ranking (Profit Factor),
-- discipline floor as an eligibility gate (never P&L), Trader-only entry,
-- and richer prize/metrics surfacing.
--
-- IDEMPOTENT — safe to re-run. FILE ONLY, NOT applied to any DB by this task.
--
-- floor_join_competition / floor_close_competition below are based on the
-- verbatim live `pg_get_functiondef` bodies (confirmed from prod). Only the
-- specific deltas documented inline are applied on top — everything else in
-- those two functions is untouched from production.
--
-- Summary of changes:
--   1. floor_competitions.prize_summary (+ seed for the current competition).
--   2. floor_score_snapshots.profit_factor (frozen PF at competition close).
--   3. floor_user_metrics: + active_days; PF=999 edge fix (zero losses, wins>0).
--   4. floor_leaderboard / floor_leaderboard_cumulative: + rr, active_days;
--      qualified now requires a discipline floor (>=40) AND a computable PF;
--      RANK is now BY PROFIT FACTOR (quality) — discipline is the gate, not
--      the sort key. Ranking is NEVER by P&L.
--   5. floor_join_competition: + Trader-membership gate (subscription_required).
--   6. floor_close_competition: qualified now mirrors the leaderboard rule
--      (discipline >=40 + computable PF) so winners = the displayed board;
--      ranks by PF; freezes profit_factor into the snapshot + into
--      floor_winners.score (placement 1-5, table uses column `placement`);
--      differentiates the 1st-place prize (cash + 1yr) from 2nd-5th (1yr
--      only). Entitlement grant is unchanged: public.granted_entitlement
--      (singular table, columns user_id/tier/expires_at/reason, dedup via
--      NOT EXISTS on (user_id, reason)).

-- ─── 1. floor_competitions.prize_summary ──────────────────────────────────────
ALTER TABLE public.floor_competitions ADD COLUMN IF NOT EXISTS prize_summary text;

UPDATE public.floor_competitions
SET prize_summary = '1st: $500 cash + 1 year of Trader. 2nd-5th: 1 year of Trader.'
WHERE id = '104fe5f3-3ece-4fdc-860b-5fe7c68c47c2';

-- ─── 2. floor_score_snapshots.profit_factor ───────────────────────────────────
ALTER TABLE public.floor_score_snapshots ADD COLUMN IF NOT EXISTS profit_factor numeric;

-- ─── 3. floor_user_metrics — + active_days, PF=999 edge fix ───────────────────
DROP FUNCTION IF EXISTS public.floor_user_metrics(uuid, timestamptz, timestamptz);
CREATE FUNCTION public.floor_user_metrics(
  p_user  uuid,
  p_start timestamptz DEFAULT NULL,
  p_end   timestamptz DEFAULT NULL
)
RETURNS TABLE(
  win_rate      numeric,
  avg_win       numeric,
  avg_loss      numeric,
  profit_factor numeric,
  best_trade    numeric,
  worst_trade   numeric,
  win_streak    integer,
  active_days   integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT t.pnl, t.close_at
    FROM public.trades t
    WHERE t.user_id = p_user
      AND t.close_at IS NOT NULL
      AND t.deleted_at IS NULL
      AND t.broker IS NOT NULL AND t.broker <> 'manual'
      AND t.import_source IS NOT NULL AND t.import_source <> 'manual'
      AND t.external_id IS NOT NULL
      AND t.pnl IS NOT NULL
      AND (p_start IS NULL OR t.close_at >= p_start)
      AND (p_end   IS NULL OR t.close_at <  p_end)
  ),
  seq AS (
    SELECT (pnl > 0) AS is_win,
           row_number() OVER (ORDER BY close_at)
             - row_number() OVER (PARTITION BY (pnl > 0) ORDER BY close_at) AS grp
    FROM base
  ),
  streaks AS (
    SELECT is_win, count(*) AS run_len
    FROM seq
    GROUP BY is_win, grp
  )
  SELECT
    ROUND(100.0 * count(*) FILTER (WHERE pnl > 0) / NULLIF(count(*), 0), 1),
    ROUND(avg(pnl) FILTER (WHERE pnl > 0), 2),
    ROUND(avg(pnl) FILTER (WHERE pnl < 0), 2),
    -- profit_factor = gross wins / abs(gross losses). Zero-loss edge: a
    -- trader with wins and ZERO losing trades is not "infinite" — surface a
    -- capped 999 instead of NULL so quality ranking still works.
    CASE
      WHEN COALESCE(sum(pnl) FILTER (WHERE pnl < 0), 0) = 0
       AND COALESCE(sum(pnl) FILTER (WHERE pnl > 0), 0) > 0
      THEN 999
      ELSE ROUND(
        COALESCE(sum(pnl) FILTER (WHERE pnl > 0), 0)
        / NULLIF(ABS(sum(pnl) FILTER (WHERE pnl < 0)), 0), 2
      )
    END,
    max(pnl),
    min(pnl),
    COALESCE((SELECT max(run_len) FROM streaks WHERE is_win), 0)::int,
    count(DISTINCT date(close_at))::int
  FROM base;
$function$;

REVOKE ALL ON FUNCTION public.floor_user_metrics(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.floor_user_metrics(uuid, timestamptz, timestamptz) TO authenticated;

-- ─── 4a. floor_leaderboard (competition) — quality ranking + rr/active_days ───
DROP FUNCTION IF EXISTS public.floor_leaderboard(uuid);
CREATE FUNCTION public.floor_leaderboard(p_competition_id uuid)
RETURNS TABLE(
  user_id uuid, display_name text, floor_username text, avatar_url text,
  discipline_score numeric, net_pnl numeric, trade_count bigint, rank integer,
  qualified boolean, is_champion boolean,
  win_rate numeric, avg_win numeric, avg_loss numeric, profit_factor numeric,
  best_trade numeric, worst_trade numeric, win_streak integer,
  rr numeric, active_days integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_comp public.floor_competitions;
BEGIN
  SELECT * INTO v_comp FROM public.floor_competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_comp.status = 'closed' THEN
    RETURN QUERY
      SELECT s.user_id, pr.display_name, pr.floor_username, pr.avatar_url, s.discipline_score,
             (s.components->>'net_pnl')::numeric, s.trade_count, s.rank,
             (s.trade_count >= v_comp.min_trades),
             EXISTS(SELECT 1 FROM public.floor_winners w WHERE w.user_id = s.user_id),
             m.win_rate, m.avg_win, m.avg_loss,
             -- prefer the frozen snapshot PF; NULL for pre-migration snapshots
             -- falls back to a live recompute over the same closed window.
             COALESCE(s.profit_factor, m.profit_factor),
             m.best_trade, m.worst_trade, m.win_streak,
             ROUND(ABS(m.avg_win / NULLIF(m.avg_loss, 0)), 2), m.active_days
      FROM public.floor_score_snapshots s
      JOIN public.profiles pr ON pr.id = s.user_id
      CROSS JOIN LATERAL public.floor_user_metrics(s.user_id, v_comp.period_start, v_comp.period_end) m
      WHERE s.competition_id = p_competition_id
      ORDER BY s.rank NULLS LAST, s.discipline_score DESC NULLS LAST;
    RETURN;
  END IF;

  RETURN QUERY
  WITH parts AS (
    SELECT fp.user_id FROM public.floor_participants fp
    WHERE fp.competition_id = v_comp.id AND fp.is_public AND fp.status = 'active'
  ),
  scored AS (
    SELECT pa.user_id, pr.display_name, pr.floor_username, pr.avatar_url,
           sc.discipline_score, sc.net_pnl, sc.trade_count,
           -- Eligibility gate: enough trades + a valid discipline floor +
           -- a computable profit factor. This is the ONLY place P&L-adjacent
           -- inputs matter — the discipline floor exists to filter out
           -- reckless/gambling patterns, not to drive rank.
           (sc.trade_count >= v_comp.min_trades
             AND sc.discipline_score IS NOT NULL
             AND m.profit_factor IS NOT NULL
             AND sc.discipline_score >= 40) AS qualified,
           m.win_rate, m.avg_win, m.avg_loss, m.profit_factor,
           m.best_trade, m.worst_trade, m.win_streak, m.active_days
    FROM parts pa
    JOIN public.profiles pr ON pr.id = pa.user_id
    CROSS JOIN LATERAL public.floor_user_score(pa.user_id, v_comp.period_start, v_comp.period_end) sc
    CROSS JOIN LATERAL public.floor_user_metrics(pa.user_id, v_comp.period_start, v_comp.period_end) m
  ),
  ranked AS (
    SELECT s.*,
      -- Ranking by profit factor (quality), discipline floor as eligibility
      -- — NEVER by P&L.
      CASE WHEN s.qualified
        THEN RANK() OVER (
          PARTITION BY s.qualified
          ORDER BY s.profit_factor DESC, s.discipline_score DESC, s.win_rate DESC
        )
      END::int AS rnk
    FROM scored s
  )
  SELECT r.user_id, r.display_name, r.floor_username, r.avatar_url, r.discipline_score,
         r.net_pnl, r.trade_count, r.rnk, r.qualified,
         EXISTS(SELECT 1 FROM public.floor_winners w WHERE w.user_id = r.user_id),
         r.win_rate, r.avg_win, r.avg_loss, r.profit_factor, r.best_trade, r.worst_trade, r.win_streak,
         ROUND(ABS(r.avg_win / NULLIF(r.avg_loss, 0)), 2), r.active_days
  FROM ranked r
  ORDER BY r.qualified DESC, r.rnk NULLS LAST, r.trade_count DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.floor_leaderboard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.floor_leaderboard(uuid) TO authenticated;

-- ─── 4b. floor_leaderboard_cumulative (this_year / all_time) — same changes ───
DROP FUNCTION IF EXISTS public.floor_leaderboard_cumulative(text);
CREATE FUNCTION public.floor_leaderboard_cumulative(p_scope text DEFAULT 'all_time'::text)
RETURNS TABLE(
  user_id uuid, display_name text, floor_username text, avatar_url text,
  discipline_score numeric, net_pnl numeric, trade_count bigint, rank integer,
  qualified boolean, is_champion boolean,
  win_rate numeric, avg_win numeric, avg_loss numeric, profit_factor numeric,
  best_trade numeric, worst_trade numeric, win_streak integer,
  rr numeric, active_days integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_start timestamptz; v_min CONSTANT int := 20;
BEGIN
  v_start := CASE WHEN p_scope = 'this_year' THEN date_trunc('year', now()) ELSE NULL END;
  RETURN QUERY
  WITH parts AS (SELECT DISTINCT fp.user_id FROM public.floor_participants fp WHERE fp.is_public),
  scored AS (
    SELECT pa.user_id, pr.display_name, pr.floor_username, pr.avatar_url,
           sc.discipline_score, sc.net_pnl, sc.trade_count,
           (sc.trade_count >= v_min
             AND sc.discipline_score IS NOT NULL
             AND m.profit_factor IS NOT NULL
             AND sc.discipline_score >= 40) AS qualified,
           m.win_rate, m.avg_win, m.avg_loss, m.profit_factor,
           m.best_trade, m.worst_trade, m.win_streak, m.active_days
    FROM parts pa
    JOIN public.profiles pr ON pr.id = pa.user_id
    CROSS JOIN LATERAL public.floor_user_score(pa.user_id, v_start, NULL) sc
    CROSS JOIN LATERAL public.floor_user_metrics(pa.user_id, v_start, NULL) m
  ),
  ranked AS (
    SELECT s.*,
      -- Ranking by profit factor (quality), discipline floor as eligibility
      -- — NEVER by P&L.
      CASE WHEN s.qualified
        THEN RANK() OVER (
          PARTITION BY s.qualified
          ORDER BY s.profit_factor DESC, s.discipline_score DESC, s.win_rate DESC
        )
      END::int AS rnk
    FROM scored s
  )
  SELECT r.user_id, r.display_name, r.floor_username, r.avatar_url, r.discipline_score,
         r.net_pnl, r.trade_count, r.rnk, r.qualified,
         EXISTS(SELECT 1 FROM public.floor_winners w WHERE w.user_id = r.user_id),
         r.win_rate, r.avg_win, r.avg_loss, r.profit_factor, r.best_trade, r.worst_trade, r.win_streak,
         ROUND(ABS(r.avg_win / NULLIF(r.avg_loss, 0)), 2), r.active_days
  FROM ranked r
  ORDER BY r.qualified DESC, r.rnk NULLS LAST, r.trade_count DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.floor_leaderboard_cumulative(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.floor_leaderboard_cumulative(text) TO authenticated;

-- ─── 5. floor_join_competition — + Trader-membership gate ─────────────────────
-- Base body is VERBATIM from the live `pg_get_functiondef` (confirmed from
-- prod). The ONLY change is the subscription_required gate inserted between
-- profile_required and broker_required.
CREATE OR REPLACE FUNCTION public.floor_join_competition(p_competition_id uuid)
 RETURNS floor_participants
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_comp public.floor_competitions; v_row public.floor_participants; v_has_profile boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_comp FROM public.floor_competitions WHERE id=p_competition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'competition_not_found'; END IF;
  IF v_comp.status='closed' OR now()>=v_comp.period_end THEN RAISE EXCEPTION 'competition_closed' USING errcode='42501'; END IF;
  IF v_comp.registration_opens_at IS NOT NULL AND now()<v_comp.registration_opens_at THEN
    RAISE EXCEPTION 'registration_not_open' USING errcode='42501', message='Registration has not opened yet.'; END IF;
  SELECT (floor_username IS NOT NULL AND display_name IS NOT NULL) INTO v_has_profile FROM public.profiles WHERE id=v_uid;
  IF NOT COALESCE(v_has_profile,false) THEN RAISE EXCEPTION 'profile_required' USING errcode='42501', message='Set up your Floor profile first.'; END IF;
  -- FLOOR CHAMPIONSHIP (20260710): Trader-membership gate. The Championship
  -- is a Trader-tier perk — this is purely a membership requirement to
  -- enter, checked server-side regardless of what the client shows.
  IF NOT public.user_has_premium(v_uid) THEN RAISE EXCEPTION 'subscription_required' USING errcode='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.broker_connections bc WHERE bc.user_id=v_uid AND bc.is_active) THEN
    RAISE EXCEPTION 'broker_required' USING errcode='42501'; END IF;
  INSERT INTO public.floor_participants(competition_id,user_id,is_public,status)
  VALUES (p_competition_id,v_uid,true,'active') ON CONFLICT (competition_id,user_id) DO NOTHING RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN SELECT * INTO v_row FROM public.floor_participants WHERE competition_id=p_competition_id AND user_id=v_uid; END IF;
  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.floor_join_competition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.floor_join_competition(uuid) TO authenticated;

-- ─── 6. floor_close_competition — PF-based ranking + differentiated prizes ────
-- Base body is VERBATIM from the live `pg_get_functiondef` (confirmed from
-- prod), including the exact admin gate (profiles.role IN ('admin',
-- 'super_admin') OR current_user IN ('postgres','supabase_admin',
-- 'service_role')). Deltas applied (documented inline at each site):
--   1. scored: + CROSS JOIN LATERAL floor_user_metrics m; qualified now
--      mirrors the leaderboard's rule exactly (discipline >=40 + computable
--      PF) so winners = the displayed board.
--   2. ranked: ORDER BY profit_factor DESC, discipline_score DESC, win_rate DESC.
--   3. Snapshot INSERT: + profit_factor (column list + DO UPDATE SET).
--   4. Winners INSERT: prize differentiated by placement; score = profit_factor.
CREATE OR REPLACE FUNCTION public.floor_close_competition(p_competition_id uuid)
 RETURNS SETOF floor_winners
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_comp public.floor_competitions; v_uid uuid := auth.uid(); v_is_admin boolean; v_period text;
BEGIN
  SELECT * INTO v_comp FROM public.floor_competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'competition_not_found'; END IF;

  IF v_uid IS NOT NULL THEN
    SELECT (p.role IN ('admin','super_admin')) INTO v_is_admin FROM public.profiles p WHERE p.id = v_uid;
  END IF;
  IF NOT ( (v_uid IS NOT NULL AND COALESCE(v_is_admin,false))
           OR current_user IN ('postgres','supabase_admin','service_role') ) THEN
    RAISE EXCEPTION 'admin_required' USING errcode='42501';
  END IF;

  IF v_comp.status = 'closed' THEN RAISE EXCEPTION 'already_closed'; END IF;
  v_period := to_char(v_comp.period_start,'YYYY_MM');

  WITH parts AS (
    SELECT fp.user_id FROM public.floor_participants fp
    WHERE fp.competition_id = v_comp.id AND fp.is_public AND fp.status = 'active'
  ),
  scored AS (
    SELECT pa.user_id, sc.discipline_score, sc.trade_count,
      jsonb_build_object('risk_consistency',sc.risk_consistency,'process_adherence',sc.process_adherence,
        'behavioral_stability',sc.behavioral_stability,'outcome_consistency',sc.outcome_consistency,
        'emotional_rate',sc.emotional_rate) AS components,
      -- FLOOR CHAMPIONSHIP (20260710) delta 1: + floor_user_metrics m for
      -- profit_factor/win_rate; qualified now mirrors the leaderboard's rule
      -- exactly (discipline floor >=40 + computable PF) so winners = the
      -- board members actually see.
      m.profit_factor, m.win_rate,
      (sc.trade_count >= v_comp.min_trades AND sc.discipline_score IS NOT NULL
        AND sc.discipline_score >= 40 AND m.profit_factor IS NOT NULL) AS qualified
    FROM parts pa
    CROSS JOIN LATERAL public.floor_user_score(pa.user_id, v_comp.period_start, v_comp.period_end) sc
    CROSS JOIN LATERAL public.floor_user_metrics(pa.user_id, v_comp.period_start, v_comp.period_end) m
  ),
  ranked AS (
    SELECT s.*, CASE WHEN s.qualified
                -- FLOOR CHAMPIONSHIP (20260710) delta 2: rank by profit
                -- factor (quality) — NEVER by P&L. Discipline floor is the
                -- eligibility gate above, not the sort key.
                THEN RANK() OVER (PARTITION BY s.qualified ORDER BY s.profit_factor DESC, s.discipline_score DESC, s.win_rate DESC) END::int AS rnk
    FROM scored s
  )
  -- FLOOR CHAMPIONSHIP (20260710) delta 3: + profit_factor in the snapshot
  -- column list and the DO UPDATE SET, so it's frozen at close time.
  INSERT INTO public.floor_score_snapshots(competition_id,user_id,discipline_score,components,trade_count,rank,profit_factor)
  SELECT v_comp.id, r.user_id, r.discipline_score, r.components, r.trade_count, r.rnk, r.profit_factor
  FROM ranked r
  ON CONFLICT (competition_id,user_id) DO UPDATE
    SET discipline_score=excluded.discipline_score, components=excluded.components,
        trade_count=excluded.trade_count, rank=excluded.rank, profit_factor=excluded.profit_factor, captured_at=now();

  -- FLOOR CHAMPIONSHIP (20260710) delta 4: prize differentiated by
  -- placement (1st = cash + 1yr, 2nd-5th = 1yr only); score is now Profit
  -- Factor (read from the just-frozen snapshot row), never P&L.
  INSERT INTO public.floor_winners(competition_id,user_id,placement,prize,score)
  SELECT v_comp.id, s.user_id, s.rank,
         CASE WHEN s.rank = 1 THEN 'usd500_premium_1y' ELSE 'premium_1y' END,
         s.profit_factor
  FROM public.floor_score_snapshots s
  WHERE s.competition_id = v_comp.id AND s.rank IS NOT NULL AND s.rank <= 5
  ON CONFLICT (competition_id,user_id) DO NOTHING;

  INSERT INTO public.granted_entitlement(user_id,tier,expires_at,reason)
  SELECT w.user_id, 'journal_premium', now() + interval '1 year', 'floor_winner_' || v_period
  FROM public.floor_winners w
  WHERE w.competition_id = v_comp.id
    AND NOT EXISTS (SELECT 1 FROM public.granted_entitlement g
                    WHERE g.user_id = w.user_id AND g.reason = 'floor_winner_' || v_period);

  UPDATE public.floor_competitions SET status='closed', closed_at=now() WHERE id = v_comp.id;
  UPDATE public.floor_participants  SET status='closed' WHERE competition_id = v_comp.id AND status='active';

  RETURN QUERY SELECT * FROM public.floor_winners WHERE competition_id = v_comp.id ORDER BY placement;
END;
$function$;

REVOKE ALL ON FUNCTION public.floor_close_competition(uuid) FROM PUBLIC;
-- floor_close_competition stays internal (admin / service-role only, per
-- its own gate above) — no authenticated grant, matching
-- floor_user_score/floor_user_metrics posture for functions not meant to be
-- called directly by end users.
