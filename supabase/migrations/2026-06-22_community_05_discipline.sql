-- =============================================================================
-- FINOTAUR Discipline Score — canonical server-side aggregate
-- Migration: 2026-06-22_community_05_discipline.sql
-- =============================================================================
--
-- PURPOSE
-- -------
-- This migration is the single source of truth for the FINOTAUR "discipline"
-- (Consistency Index) score. It exposes two RPCs:
--
--   public.user_discipline_score(p_user, p_period)
--     → per-user aggregate (building block)
--
--   public.global_discipline_leaderboard(p_period)
--     → platform-wide ranked board for opted-in paying users
--
-- The frontend modules src/utils/consistencyIndex.ts and
-- src/utils/emotionDetection.ts remain authoritative for per-session UI
-- rendering (they carry trade-row data that never reaches the DB).
-- These server RPCs are authoritative for leaderboards, admin flags,
-- and any cross-user or historical aggregate.
--
-- =============================================================================
-- PORT FIDELITY SUMMARY  (detailed section at end of file)
-- =============================================================================
--
-- Sub-index              | Fidelity   | Notes
-- ---------------------- | ---------- | ----------------------------------------
-- riskConsistency        | EXACT      | CV(risk_usd or ABS(entry-exit)*qty*mult)
-- processAdherence       | EXACT      | stop_price + session + strategy_id logic
-- behavioralStability    | APPROX     | mental_state missing; approximated via
--                        |            |  loss-streak window + quick re-entry gap
-- outcomeConsistency     | EXACT*     | expectancyR from actual_r mean; rStdev
--                        |            |  from actual_r pop.stdev (* actual_r is
--                        |            |  broker-computed, not canonical R — noted)
-- weights                | EXACT      | 0.30/0.30/0.25/0.15
-- composite formula      | EXACT      | same clamp + round logic
--
-- Minimum trade threshold: 5 (same as TS "min 5 trades" note).
-- =============================================================================


-- =============================================================================
-- RPC 1: public.user_discipline_score
-- =============================================================================
--
-- Returns the discipline composite (0–100) and its four sub-scores for one
-- user over a period. This function is a building block: direct exposure to
-- callers who are NOT the owner of p_user is controlled by the leaderboard
-- RPC and by existing RLS on the trades table (SECURITY DEFINER bypasses RLS
-- here, but only aggregate scalars are returned — no trade rows).
--
-- Authorization note:
--   Any authenticated user may call this for any p_user. That is intentional:
--   the function returns ONLY aggregate scores (no trade-level rows), so the
--   privacy risk is low. Cross-user leaderboard exposure is controlled by
--   global_leaderboard_opt_in in global_discipline_leaderboard (RPC 2).
--   If tighter control is needed later, add:
--     IF p_user <> auth.uid() AND NOT public.is_paying_user() THEN RAISE ... END IF;

CREATE OR REPLACE FUNCTION public.user_discipline_score(
  p_user   uuid,
  p_period text DEFAULT 'all'
)
RETURNS TABLE (
  discipline_score        numeric,
  risk_consistency        numeric,
  process_adherence       numeric,
  behavioral_stability    numeric,
  outcome_consistency     numeric,
  emotional_rate          numeric,
  trade_count             bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;

  -- ── raw trade data collected in one scan ─────────────────────────────────
  -- risk values (for CV computation)
  v_risk_vals           numeric[];
  -- process adherence
  v_total_trades        bigint  := 0;
  v_adherent_count      bigint  := 0;
  v_any_strategy_present boolean := false;
  -- outcome consistency inputs
  v_r_vals              numeric[];   -- actual_r per closed trade
  -- emotion approximation accumulators
  v_emotional_count     bigint  := 0;

  -- ── computed intermediates ────────────────────────────────────────────────
  v_risk_mean           numeric;
  v_risk_stdev          numeric;
  v_cv_risk             numeric;
  v_risk_consistency    numeric;

  v_adherence_rate      numeric;
  v_process_adherence   numeric;

  v_emotional_rate      numeric;
  v_behavioral_stability numeric;

  v_r_mean              numeric;
  v_r_stdev             numeric;
  v_expectancy_component numeric;
  v_stability_component  numeric;
  v_outcome_consistency  numeric;

  v_raw_index           numeric;
  v_discipline_score    numeric;

  -- ── minimum sample guard ─────────────────────────────────────────────────
  v_min_trades CONSTANT int := 5;  -- mirrors TS "min 5 trades" note

BEGIN
  -- ── Resolve period lower bound ────────────────────────────────────────────
  -- Matches the same CASE used by space_leaderboard and global_pnl_leaderboard.
  v_start := CASE
    WHEN p_period = 'this_month' THEN date_trunc('month', now())
    WHEN p_period = 'this_year'  THEN date_trunc('year',  now())
    ELSE NULL  -- 'all': no lower bound
  END;

  -- ── Single-pass aggregate over closed trades ─────────────────────────────
  --
  -- We collect everything we need in one CTE scan to avoid repeated seq-scans.
  --
  -- EMOTION APPROXIMATION (behavioral_stability sub-index):
  --   The TS source uses mental_state (1..5) to boost confidence and
  --   stop_price + session to flag "disciplined". On the server we have no
  --   mental_state (it lives in day_scenarios, not trades). We approximate
  --   negative-emotion detection via two behavioral heuristics available on
  --   the trades table:
  --
  --   Heuristic A — revenge / tilt (loss-streak + quick re-entry):
  --     A trade is flagged "emotional" when BOTH of the following are true:
  --       1. The immediately preceding trade for the same user (ordered by
  --          close_at) had outcome = 'LOSS'  AND
  --          this is at least the 2nd consecutive LOSS in a streak (streak >= 2
  --          at the START of evaluating the current trade, i.e. the prior trade
  --          that was a LOSS extended a run that already had >= 1 LOSS before it)
  --          ← matches TS "tilt" threshold lossStreak >= 2
  --       2. The gap between the previous trade's close_at and this trade's
  --          open_at is < 15 minutes  ← matches TS "revenge" threshold of 15 min
  --
  --   Heuristic B — explicit mistake field:
  --     Trades where mistake IN ('late','fomo','size') are flagged emotional,
  --     mirroring the TS fomo + greed detection (which also fires on mistake).
  --
  --   Overtrading heuristic (day-level):
  --     Days where trade count > MAX(3, medianTradesPerDay * 2) flag ALL trades
  --     on that day as emotional. Implemented via a day-count CTE below.
  --
  --   Known gap vs TS: we cannot detect "tilt" (escalating size during a streak)
  --   or "fear" (position shrinkage) because quantity is per-trade and comparing
  --   adjacent quantity values in SQL requires a window that would substantially
  --   complicate this query without large accuracy gains. The heuristics above
  --   capture the highest-signal signals (revenge + explicit self-labelling +
  --   overtrading) and are documented as approximations.

  WITH
  -- ── 1. Base trade set ─────────────────────────────────────────────────────
  base AS (
    SELECT
      t.id,
      t.open_at,
      t.close_at,
      t.outcome,
      t.pnl,
      t.quantity,
      t.entry_price,
      t.exit_price,
      t.stop_price,
      t.strategy_id,
      t.session,
      t.mistake,
      t.actual_r,
      -- risk_usd priority 1: explicit field
      -- risk_usd priority 2: reconstructed from price levels
      --   ABS(entry_price - stop_price) * quantity * multiplier
      -- Only positive values are usable (zero means field not filled).
      CASE
        WHEN t.risk_usd IS NOT NULL AND t.risk_usd > 0
          THEN t.risk_usd
        WHEN t.entry_price IS NOT NULL
          AND t.stop_price  IS NOT NULL
          AND t.quantity    IS NOT NULL AND t.quantity    > 0
          AND t.multiplier  IS NOT NULL AND t.multiplier  > 0
          THEN NULLIF(ABS(t.entry_price - t.stop_price) * t.quantity * t.multiplier, 0)
        ELSE NULL
      END AS risk_proxy
    FROM public.trades t
    WHERE t.user_id     = p_user
      AND t.close_at    IS NOT NULL     -- closed trades only
      AND t.deleted_at  IS NULL         -- exclude soft-deleted
      AND (v_start IS NULL OR t.close_at >= v_start)
  ),

  -- ── 2. Day-level trade counts for overtrading heuristic ──────────────────
  --
  -- Count trades per calendar day (UTC date of open_at, same as TS toDateKey).
  day_counts AS (
    SELECT
      (open_at AT TIME ZONE 'UTC')::date AS trade_date,
      COUNT(*)                            AS day_trade_count
    FROM base
    GROUP BY 1
  ),

  -- ── 3. Median trades per day (for the overtrading threshold) ─────────────
  --
  -- PostgreSQL lacks a built-in MEDIAN aggregate; we compute it via
  -- PERCENTILE_CONT(0.5) which is equivalent to the JS population median
  -- for even-length arrays (midpoint interpolation).
  day_median AS (
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY day_trade_count) AS median_trades_per_day
    FROM day_counts
  ),

  -- ── 4. Window pass: prior outcome and gap for emotion heuristics ──────────
  --
  -- LAG gives us the prior trade's outcome and close_at (ordered by close_at
  -- within this user's trade set).
  windowed AS (
    SELECT
      b.*,
      dc.day_trade_count,
      LAG(b.outcome)  OVER (ORDER BY b.close_at) AS prev_outcome,
      LAG(b.close_at) OVER (ORDER BY b.close_at) AS prev_close_at,
      -- Running loss streak BEFORE the current trade (count of consecutive LOSS
      -- values ending with the previous trade).
      -- We approximate via COUNT of consecutive LOSS outcomes in the window
      -- using a gap-and-island approach: assign a group_id that increments on
      -- every non-LOSS, then count within the most-recent group.
      -- For simplicity (and to avoid a correlated subquery), we use a single
      -- LAG look-back for "streak >= 2" by checking whether BOTH the previous
      -- AND the one-before-previous were LOSS.
      -- This is a conservative approximation: it catches streak=2 but misses
      -- longer streaks where the "tilt" flag might already have fired.
      -- Full streak tracking would require a recursive CTE or application-side loop.
      LAG(b.outcome, 2) OVER (ORDER BY b.close_at) AS two_back_outcome
    FROM base b
    JOIN day_counts dc
      ON (b.open_at AT TIME ZONE 'UTC')::date = dc.trade_date
  ),

  -- ── 5. Per-trade emotion flag ─────────────────────────────────────────────
  flagged AS (
    SELECT
      w.*,
      (
        -- Heuristic A: revenge (prev was LOSS within 15 min, streak >= 2)
        (
          w.prev_outcome = 'LOSS'
          AND w.two_back_outcome = 'LOSS'   -- streak of at least 2 before this trade
          AND w.prev_close_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (w.open_at - w.prev_close_at)) / 60.0 BETWEEN 0 AND 15
        )
        -- Heuristic B: explicit self-labelled mistake (fomo / late / size)
        OR w.mistake IN ('late', 'fomo', 'size')
        -- Heuristic C: overtrading day
        -- overtrade threshold = MAX(3, median_trades_per_day * 2)
        OR w.day_trade_count > GREATEST(3, (SELECT COALESCE(dm.median_trades_per_day, 0) * 2 FROM day_median dm))
      ) AS is_emotional
    FROM windowed w
  ),

  -- ── 6. Aggregate: strategy presence flag (for processAdherence) ──────────
  strategy_check AS (
    SELECT EXISTS (
      SELECT 1 FROM base WHERE strategy_id IS NOT NULL AND strategy_id::text <> ''
    ) AS any_strategy_present
  ),

  -- ── 7. Final aggregation ──────────────────────────────────────────────────
  agg AS (
    SELECT
      COUNT(*)                                          AS total_trades,
      -- risk consistency inputs
      ARRAY_AGG(risk_proxy) FILTER (WHERE risk_proxy IS NOT NULL)
                                                        AS risk_vals,
      -- process adherence
      COUNT(*) FILTER (
        WHERE
          stop_price  IS NOT NULL                         -- has a defined exit plan
          AND session IS NOT NULL AND TRIM(session) <> '' -- session is recorded
          AND (
            -- strategy criterion: only applied when any trade has a strategy_id
            NOT (SELECT any_strategy_present FROM strategy_check)
            OR (strategy_id IS NOT NULL AND strategy_id::text <> '')
          )
      )                                                 AS adherent_count,
      -- outcome consistency inputs (actual_r as R-value proxy)
      ARRAY_AGG(actual_r)  FILTER (WHERE actual_r IS NOT NULL)
                                                        AS r_vals,
      -- behavioral stability
      COUNT(*) FILTER (WHERE is_emotional)              AS emotional_count
    FROM flagged
  )

  -- ── Materialise into variables ────────────────────────────────────────────
  SELECT
    agg.total_trades,
    agg.risk_vals,
    agg.adherent_count,
    agg.r_vals,
    agg.emotional_count
  INTO
    v_total_trades,
    v_risk_vals,
    v_adherent_count,
    v_r_vals,
    v_emotional_count
  FROM agg;

  -- ── Minimum sample guard ──────────────────────────────────────────────────
  -- Mirror the TS "min 5 trades" note: return low/safe defaults below threshold.
  IF v_total_trades < v_min_trades THEN
    RETURN QUERY
    SELECT
      NULL::numeric,   -- discipline_score: null = insufficient data
      50::numeric,     -- risk_consistency: neutral default
      0::numeric,      -- process_adherence
      100::numeric,    -- behavioral_stability: assume stable (no evidence of emotion)
      50::numeric,     -- outcome_consistency: neutral default
      0::numeric,      -- emotional_rate
      v_total_trades;
    RETURN;
  END IF;

  -- ── Sub-score 1: riskConsistency ──────────────────────────────────────────
  --
  -- CV = population_stdev(risk_proxy) / mean(risk_proxy)
  -- riskConsistency = CLAMP(100 * (1 - CV), 0, 100)
  -- When fewer than 2 usable risk values: neutral default 50.
  --
  -- This is an EXACT port of the TS formula.
  IF v_risk_vals IS NULL OR array_length(v_risk_vals, 1) < 2 THEN
    v_risk_consistency := 50;
  ELSE
    SELECT
      AVG(r),
      STDDEV_POP(r)
    INTO v_risk_mean, v_risk_stdev
    FROM UNNEST(v_risk_vals) AS r;

    IF v_risk_mean IS NULL OR v_risk_mean = 0 THEN
      v_risk_consistency := 50;
    ELSE
      v_cv_risk          := LEAST(v_risk_stdev / v_risk_mean, 1);
      v_risk_consistency := GREATEST(0, LEAST(100, 100 * (1 - v_cv_risk)));
    END IF;
  END IF;

  -- ── Sub-score 2: processAdherence ────────────────────────────────────────
  --
  -- adherenceRate = adherent_count / total_trades
  -- processAdherence = adherenceRate * 100
  --
  -- This is an EXACT port of the TS formula. The strategy_id criterion is
  -- included only when any trade has a strategy_id (same conditional as TS).
  v_adherence_rate    := v_adherent_count::numeric / NULLIF(v_total_trades, 0);
  v_process_adherence := COALESCE(v_adherence_rate, 0) * 100;

  -- ── Sub-score 3: behavioralStability ─────────────────────────────────────
  --
  -- emotionalRate = emotional_count / total_trades
  -- behavioralStability = CLAMP((1 - emotionalRate) * 100, 0, 100)
  --
  -- This is an APPROXIMATION: see emotion heuristics at top of function.
  -- The TS source uses mental_state (unavailable server-side) to detect
  -- revenge/tilt/fear/greed with higher precision. The SQL heuristics capture
  -- revenge (loss-streak + quick re-entry), fomo/greed (mistake field), and
  -- overtrading (day-count threshold), but miss:
  --   - tilt (escalating quantity across consecutive losses) — no adjacent qty compare
  --   - fear (quantity shrinkage after a loss) — same reason
  --   - mental_state confidence boosts (mental_state not in trades table)
  v_emotional_rate       := v_emotional_count::numeric / NULLIF(v_total_trades, 0);
  v_emotional_rate       := COALESCE(v_emotional_rate, 0);
  v_behavioral_stability := GREATEST(0, LEAST(100, (1 - v_emotional_rate) * 100));

  -- ── Sub-score 4: outcomeConsistency ──────────────────────────────────────
  --
  -- expectancyComponent = CLAMP(50 + expectancyR * 25, 0, 100)
  --   where expectancyR = mean(actual_r)
  -- stabilityComponent  = CLAMP(100 - rStdev * 20, 0, 100)
  --   where rStdev = population_stdev(actual_r)
  -- outcomeConsistency  = ROUND(0.6 * expectancyComponent + 0.4 * stabilityComponent)
  --
  -- This is an EXACT port of the TS formula. R-value proxy: actual_r is the
  -- broker-computed realised R stored on each trade. The TS source receives R
  -- from the canonical aggregator (which may use a slightly different planned-1r
  -- baseline). Using actual_r is the closest available server-side equivalent.
  IF v_r_vals IS NULL OR array_length(v_r_vals, 1) < 1 THEN
    v_expectancy_component := 50;
    v_stability_component  := 50;
  ELSE
    SELECT AVG(r), STDDEV_POP(r)
    INTO v_r_mean, v_r_stdev
    FROM UNNEST(v_r_vals) AS r;

    v_expectancy_component := GREATEST(0, LEAST(100, 50 + COALESCE(v_r_mean, 0) * 25));

    IF v_r_stdev IS NULL OR array_length(v_r_vals, 1) < 2 THEN
      v_stability_component := 50;
    ELSE
      v_stability_component := GREATEST(0, LEAST(100, 100 - v_r_stdev * 20));
    END IF;
  END IF;

  v_outcome_consistency := ROUND(0.6 * v_expectancy_component + 0.4 * v_stability_component);

  -- ── Composite discipline score ────────────────────────────────────────────
  --
  -- Weights (EXACT match to TS source):
  --   0.30 × riskConsistency
  --   0.30 × processAdherence
  --   0.25 × behavioralStability
  --   0.15 × outcomeConsistency
  v_raw_index :=
      0.30 * v_risk_consistency
    + 0.30 * v_process_adherence
    + 0.25 * v_behavioral_stability
    + 0.15 * v_outcome_consistency;

  v_discipline_score := ROUND(GREATEST(0, LEAST(100, v_raw_index)));

  -- ── Return ────────────────────────────────────────────────────────────────
  RETURN QUERY
  SELECT
    v_discipline_score,
    ROUND(v_risk_consistency),
    ROUND(v_process_adherence),
    ROUND(v_behavioral_stability),
    v_outcome_consistency,
    ROUND(v_emotional_rate::numeric, 4),
    v_total_trades;
END;
$$;

REVOKE ALL ON FUNCTION public.user_discipline_score(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_discipline_score(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_discipline_score(uuid, text) TO service_role;

COMMENT ON FUNCTION public.user_discipline_score(uuid, text) IS
  'Canonical server-side discipline (Consistency Index) score for one user over a period '
  '(all / this_month / this_year). Returns 0–100 composite and four sub-scores. '
  'Requires at least 5 closed trades; returns NULLs/safe defaults below that threshold. '
  'SECURITY DEFINER — returns aggregate scalars only, no trade rows. '
  'Behavioral stability sub-index is an APPROXIMATION (mental_state unavailable server-side); '
  'see inline comments for heuristics used.';


-- =============================================================================
-- RPC 2: public.global_discipline_leaderboard
-- =============================================================================
--
-- Platform-wide discipline ranking for opted-in paying users.
-- Eligible users: global_leaderboard_opt_in = true, platform_plan <> 'free',
--   platform_subscription_status IN ('active','trial').
-- Minimum 5 closed trades in the period (discipline score cannot be NULL).
-- Rank is by discipline_score DESC.
-- Requires the caller to be a paying user (is_paying_user()).

CREATE OR REPLACE FUNCTION public.global_discipline_leaderboard(
  p_period text DEFAULT 'all'
)
RETURNS TABLE (
  user_id          uuid,
  display_name     text,
  discipline_score numeric,
  emotional_rate   numeric,
  trade_count      bigint,
  rank             bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Access guard ──────────────────────────────────────────────────────────
  -- Only paying users may see the leaderboard.
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- ── Eligible user set + per-user discipline score ─────────────────────────
  --
  -- We call user_discipline_score() inline via a LATERAL join for each
  -- eligible profile. The function is STABLE SECURITY DEFINER so the planner
  -- may inline or memoize across rows.
  --
  -- Minimum trade count filter (>= 5): scores returned as NULL below the
  -- threshold are excluded here (trade_count < 5 → discipline_score IS NULL).
  -- This prevents thin samples from topping the board with a 0 score.
  RETURN QUERY
  WITH eligible AS (
    SELECT p.id, p.display_name
    FROM public.profiles p
    WHERE p.global_leaderboard_opt_in        = true
      AND p.platform_plan                   <> 'free'
      AND p.platform_subscription_status    IN ('active', 'trial')
  ),
  scored AS (
    SELECT
      e.id               AS user_id,
      e.display_name,
      ds.discipline_score,
      ds.emotional_rate,
      ds.trade_count
    FROM eligible e
    -- LATERAL: call the score function once per eligible user
    CROSS JOIN LATERAL public.user_discipline_score(e.id, p_period) ds
    -- Exclude users below the minimum sample or with NULL score
    WHERE ds.discipline_score IS NOT NULL
      AND ds.trade_count >= 5
  )
  SELECT
    s.user_id,
    s.display_name,
    s.discipline_score,
    s.emotional_rate,
    s.trade_count,
    RANK() OVER (ORDER BY s.discipline_score DESC) AS rank
  FROM scored s
  ORDER BY rank;
END;
$$;

REVOKE ALL ON FUNCTION public.global_discipline_leaderboard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_discipline_leaderboard(text) TO authenticated;

COMMENT ON FUNCTION public.global_discipline_leaderboard(text) IS
  'Platform-wide discipline leaderboard. Eligible: global_leaderboard_opt_in=true, '
  'platform_plan<>''free'', platform_subscription_status IN (''active'',''trial''). '
  'Minimum 5 closed trades in the period (thin samples excluded). '
  'Ranked by discipline_score DESC (0–100). '
  'Caller must be a paying user (is_paying_user()). SECURITY DEFINER.';


-- =============================================================================
-- PORT FIDELITY (detailed, for review)
-- =============================================================================
--
-- ┌─────────────────────────┬────────────────┬──────────────────────────────────────────────────────────┐
-- │ Sub-index               │ Fidelity       │ Detail                                                   │
-- ├─────────────────────────┼────────────────┼──────────────────────────────────────────────────────────┤
-- │ riskConsistency (30%)   │ EXACT          │ Priority chain: risk_usd → ABS(entry-stop)*qty*mult.     │
-- │                         │                │ CV = STDDEV_POP / AVG (population stdev, same as TS).    │
-- │                         │                │ CLAMP(100*(1-CV), 0, 100). Neutral 50 < 2 samples.      │
-- ├─────────────────────────┼────────────────┼──────────────────────────────────────────────────────────┤
-- │ processAdherence (30%)  │ EXACT          │ stop_price IS NOT NULL + session non-empty + strategy_id │
-- │                         │                │ only when any trade has a strategy (exact TS conditional). │
-- │                         │                │ adherentCount / totalTrades × 100.                       │
-- ├─────────────────────────┼────────────────┼──────────────────────────────────────────────────────────┤
-- │ behavioralStability(25%)│ APPROXIMATED   │ TS uses mental_state (1..5) stored in day_scenarios,    │
-- │                         │                │ NOT in trades. Unavailable server-side.                  │
-- │                         │                │ Approximation captures:                                   │
-- │                         │                │   A) Revenge: prev LOSS + streak>=2 + open_at-close_at  │
-- │                         │                │      < 15 min (matches TS thresholds).                   │
-- │                         │                │   B) FOMO/Greed: mistake IN ('late','fomo','size')       │
-- │                         │                │      (exact TS rule).                                    │
-- │                         │                │   C) Overtrading: day count > MAX(3, median*2)           │
-- │                         │                │      (exact TS algorithm, PERCENTILE_CONT for median).  │
-- │                         │                │ NOT captured:                                            │
-- │                         │                │   - tilt (increasing qty during streak): needs adjacent  │
-- │                         │                │     quantity comparison, omitted for query simplicity.   │
-- │                         │                │   - fear (qty < 0.6×median after LOSS): same reason.    │
-- │                         │                │   - mental_state confidence boosts (field missing).      │
-- │                         │                │ emotionalRate = flagged_count / total. Formula exact.    │
-- ├─────────────────────────┼────────────────┼──────────────────────────────────────────────────────────┤
-- │ outcomeConsistency (15%)│ EXACT*         │ expectancyComponent = CLAMP(50 + mean(R)*25, 0, 100).   │
-- │                         │                │ stabilityComponent  = CLAMP(100 - stdev(R)*20, 0, 100). │
-- │                         │                │ Blend: ROUND(0.6*E + 0.4*S). All exact.                  │
-- │                         │                │ *R-value proxy = actual_r (broker-computed realised R).  │
-- │                         │                │  TS receives R from canonical aggregator which may use   │
-- │                         │                │  a different planned-1r baseline; actual_r is the       │
-- │                         │                │  closest server-side equivalent. Difference is minor     │
-- │                         │                │  for fully synced Tradovate users.                       │
-- ├─────────────────────────┼────────────────┼──────────────────────────────────────────────────────────┤
-- │ Composite weights       │ EXACT          │ 0.30/0.30/0.25/0.15 hardcoded, matching TS.             │
-- │ Composite formula       │ EXACT          │ ROUND(CLAMP(sum, 0, 100)).                               │
-- │ Min-trade guard         │ EXACT          │ < 5 trades → NULL/neutral defaults (TS "min 5" note).   │
-- └─────────────────────────┴────────────────┴──────────────────────────────────────────────────────────┘
