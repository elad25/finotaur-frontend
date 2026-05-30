-- Mentor View (read-only): accepted mentor can read a student's backtests.
-- Existing owner-only policies still govern writes.
-- NOTE: already applied to production via Supabase MCP (migration name: mentor_08_backtest_select).

CREATE POLICY "backtest_sessions_v2_mentor_select" ON public.backtest_sessions_v2
  FOR SELECT TO authenticated
  USING (public.is_accepted_mentor_of(user_id));

CREATE POLICY "backtest_trades_v2_mentor_select" ON public.backtest_trades_v2
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.backtest_sessions_v2 s
    WHERE s.id = backtest_trades_v2.session_id
      AND public.is_accepted_mentor_of(s.user_id)
  ));
