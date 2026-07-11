-- 2026-07-11_floor_gates_daily.sql   (IDEMPOTENT)
-- FINOTAUR Floor Challenge rules update:
--   #1 Block JOIN before the competition START date (period_start).
--   #4 Daily-refreshed leaderboard snapshot (board updates once/day @ 22:00 UTC).
-- #2/#3 (broker-only stats — exclude manual & CSV) are ALREADY enforced by
--       floor_user_metrics + floor_user_score (broker<>'manual' AND
--       import_source<>'manual' AND external_id IS NOT NULL) — left untouched.
--
-- floor_join_competition below is the verbatim live pg_get_functiondef body
-- with ONE added gate (period_not_started). Everything else is unchanged.

-- ═══ #1: block JOIN before the competition START date ════════════════════════
CREATE OR REPLACE FUNCTION public.floor_join_competition(p_competition_id uuid)
 RETURNS floor_participants LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_comp public.floor_competitions; v_row public.floor_participants; v_has_profile boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_comp FROM public.floor_competitions WHERE id=p_competition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'competition_not_found'; END IF;
  IF v_comp.status='closed' OR now()>=v_comp.period_end THEN RAISE EXCEPTION 'competition_closed' USING errcode='42501'; END IF;
  -- NEW (2026-07-11): joining is only allowed once the competition has STARTED.
  IF now() < v_comp.period_start THEN
    RAISE EXCEPTION 'period_not_started' USING errcode='42501', message='The challenge has not started yet.'; END IF;
  IF v_comp.registration_opens_at IS NOT NULL AND now()<v_comp.registration_opens_at THEN
    RAISE EXCEPTION 'registration_not_open' USING errcode='42501', message='Registration has not opened yet.'; END IF;
  SELECT (floor_username IS NOT NULL AND display_name IS NOT NULL) INTO v_has_profile FROM public.profiles WHERE id=v_uid;
  IF NOT COALESCE(v_has_profile,false) THEN RAISE EXCEPTION 'profile_required' USING errcode='42501', message='Set up your Floor profile first.'; END IF;
  -- FLOOR CHAMPIONSHIP (20260710): Trader-membership gate.
  IF NOT public.user_has_premium(v_uid) THEN RAISE EXCEPTION 'subscription_required' USING errcode='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.broker_connections bc WHERE bc.user_id=v_uid AND bc.is_active) THEN
    RAISE EXCEPTION 'broker_required' USING errcode='42501'; END IF;
  INSERT INTO public.floor_participants(competition_id,user_id,is_public,status)
  VALUES (p_competition_id,v_uid,true,'active') ON CONFLICT (competition_id,user_id) DO NOTHING RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN SELECT * INTO v_row FROM public.floor_participants WHERE competition_id=p_competition_id AND user_id=v_uid; END IF;
  RETURN v_row;
END; $function$;

-- ═══ #4: daily-refreshed leaderboard snapshot ════════════════════════════════

-- 4a. Snapshot table (mirrors floor_leaderboard's return columns).
CREATE TABLE IF NOT EXISTS public.floor_leaderboard_snapshot (
  competition_id uuid NOT NULL REFERENCES public.floor_competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, display_name text, floor_username text, avatar_url text,
  discipline_score numeric, net_pnl numeric, trade_count bigint, rank integer,
  qualified boolean, is_champion boolean, win_rate numeric, avg_win numeric, avg_loss numeric,
  profit_factor numeric, best_trade numeric, worst_trade numeric, win_streak integer,
  rr numeric, active_days integer, computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (competition_id, user_id));
-- RLS on, no policy → the raw table is not directly readable; access only via
-- the SECURITY DEFINER reader RPC below.
ALTER TABLE public.floor_leaderboard_snapshot ENABLE ROW LEVEL SECURITY;

-- 4b. Refresh: freeze the current live board into the snapshot (all live comps).
CREATE OR REPLACE FUNCTION public.floor_refresh_leaderboard_snapshot()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c record;
BEGIN
  FOR c IN SELECT id FROM public.floor_competitions WHERE status<>'closed' AND now()<period_end LOOP
    DELETE FROM public.floor_leaderboard_snapshot WHERE competition_id=c.id;
    INSERT INTO public.floor_leaderboard_snapshot
      (competition_id,user_id,display_name,floor_username,avatar_url,discipline_score,net_pnl,trade_count,
       rank,qualified,is_champion,win_rate,avg_win,avg_loss,profit_factor,best_trade,worst_trade,win_streak,rr,active_days,computed_at)
    SELECT c.id,l.user_id,l.display_name,l.floor_username,l.avatar_url,l.discipline_score,l.net_pnl,l.trade_count,
       l.rank,l.qualified,l.is_champion,l.win_rate,l.avg_win,l.avg_loss,l.profit_factor,l.best_trade,l.worst_trade,l.win_streak,l.rr,l.active_days,now()
    FROM public.floor_leaderboard(c.id) l;
  END LOOP;
END; $function$;
REVOKE ALL ON FUNCTION public.floor_refresh_leaderboard_snapshot() FROM PUBLIC;

-- 4c. Reader the frontend uses: closed→official live board; else snapshot;
--     else (bootstrap, before first cron) live compute so the board isn't empty.
CREATE OR REPLACE FUNCTION public.floor_leaderboard_daily(p_competition_id uuid)
 RETURNS TABLE(user_id uuid, display_name text, floor_username text, avatar_url text, discipline_score numeric, net_pnl numeric, trade_count bigint, rank integer, qualified boolean, is_champion boolean, win_rate numeric, avg_win numeric, avg_loss numeric, profit_factor numeric, best_trade numeric, worst_trade numeric, win_streak integer, rr numeric, active_days integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.floor_competitions WHERE id=p_competition_id;
  IF v_status='closed' THEN RETURN QUERY SELECT * FROM public.floor_leaderboard(p_competition_id); RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.floor_leaderboard_snapshot s WHERE s.competition_id=p_competition_id) THEN
    RETURN QUERY SELECT s.user_id,s.display_name,s.floor_username,s.avatar_url,s.discipline_score,s.net_pnl,s.trade_count,
      s.rank,s.qualified,s.is_champion,s.win_rate,s.avg_win,s.avg_loss,s.profit_factor,s.best_trade,s.worst_trade,s.win_streak,s.rr,s.active_days
    FROM public.floor_leaderboard_snapshot s WHERE s.competition_id=p_competition_id
    ORDER BY s.qualified DESC, s.rank NULLS LAST, s.trade_count DESC;
  ELSE
    RETURN QUERY SELECT * FROM public.floor_leaderboard(p_competition_id);
  END IF;
END; $function$;
GRANT EXECUTE ON FUNCTION public.floor_leaderboard_daily(uuid) TO authenticated, anon;

-- 4d. Last-updated timestamp for the "Updated daily · last updated X" label.
CREATE OR REPLACE FUNCTION public.floor_leaderboard_last_updated(p_competition_id uuid)
 RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT max(computed_at) FROM public.floor_leaderboard_snapshot WHERE competition_id=p_competition_id; $function$;
GRANT EXECUTE ON FUNCTION public.floor_leaderboard_last_updated(uuid) TO authenticated, anon;

-- 4e. Daily cron @ 22:00 UTC (after CME close). Idempotent re-schedule.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='floor-leaderboard-daily-snapshot';
SELECT cron.schedule('floor-leaderboard-daily-snapshot','0 22 * * *',$$ select public.floor_refresh_leaderboard_snapshot() $$);

-- 4f. Seed once so the board isn't empty before the first nightly run.
SELECT public.floor_refresh_leaderboard_snapshot();
