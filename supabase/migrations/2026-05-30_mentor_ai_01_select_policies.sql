-- Mentor View Phase 2 — FINOTAUR AI read-only access.
-- Adds an accepted-mentor SELECT branch to the FINOTAUR AI briefing + chat-history tables,
-- mirroring the Phase-1 pattern (backtest mentor SELECT policies).
--
-- Additive & read-only: these are new permissive SELECT policies. The existing owner
-- policies (INSERT/UPDATE/DELETE/SELECT scoped to user_id = auth.uid()) are left untouched,
-- so writes stay owner-only and Postgres simply ORs the new SELECT branch in.
--
-- Authorization is enforced by public.is_accepted_mentor_of(user_id) — a SECURITY DEFINER
-- predicate that captures auth.uid() internally, so a caller can only ask
-- "am I an accepted mentor of this owner?" and never read rows for an unrelated user.
--
-- Score is intentionally NOT covered here: get_finotaur_score() is SECURITY INVOKER and
-- reads public.trades, which already carries a mentor SELECT branch (trades_select_unified).
-- ai_usage_daily is intentionally NOT covered: the mentor never generates, so the student's
-- daily quota stays private and is never incremented.
--
-- Applied to production (project xsgbtptkueabylkxibly) on 2026-05-30.

CREATE POLICY "briefings_mentor_select" ON public.journal_ai_briefings
  FOR SELECT TO authenticated
  USING (public.is_accepted_mentor_of(user_id));

CREATE POLICY "convos_mentor_select" ON public.journal_ai_conversations
  FOR SELECT TO authenticated
  USING (public.is_accepted_mentor_of(user_id));

CREATE POLICY "messages_mentor_select" ON public.journal_ai_messages
  FOR SELECT TO authenticated
  USING (public.is_accepted_mentor_of(user_id));
