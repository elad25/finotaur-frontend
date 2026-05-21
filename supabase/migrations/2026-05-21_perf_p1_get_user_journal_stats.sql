-- ════════════════════════════════════════════════════════════════════════════
-- Perf P1 — get_user_journal_stats RPC (F5)
-- Session: perf-optimization-P1-scale-100k (2026-05-21)
--
-- Replaces client-side `calculateStatistics()` walk (src/utils/statistics.ts)
-- for stats-heavy screens (Statistics, Analytics, AIReview, Overview).
--
-- Extends the existing `get_user_portfolio_stats` (10 fields, no date range)
-- with the full set of stats consumers need + an optional date range. Existing
-- RPC stays for backward compat — this is additive.
--
-- Field mapping vs src/utils/statistics.ts:calculateStatistics():
--   totalClosed     ← closed.length
--   wins/losses/breakeven ← closed.filter(pnl >0/<0/=0).length
--   winRate         ← wins / (wins+losses+breakeven)            [0..1, like JS]
--   netPnl          ← Σ pnl
--   grossProfit     ← Σ pnl (pnl>0)
--   grossLoss       ← |Σ pnl| (pnl<0)
--   avgWin          ← AVG(pnl) FILTER (pnl>0)
--   avgLoss         ← |AVG(pnl) FILTER (pnl<0)|
--   profitFactor    ← grossProfit / grossLoss (Infinity-equiv: NULL when losses=0 & wins>0)
--   expectancy      ← winRate*avgWin − (1−winRate)*avgLoss
--   largestWin      ← MAX(pnl) FILTER (pnl>0)
--   largestLoss     ← MIN(pnl) FILTER (pnl<0)
--   avgRR           ← AVG fallback chain (actual_user_r→actual_r→rr>0→pnl/risk_usd)
--                     — same chain as get_user_portfolio_stats for compatibility
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_journal_stats(
  p_user_id        uuid,
  p_portfolio_ids  uuid[]      DEFAULT NULL,
  p_from           timestamptz DEFAULT NULL,
  p_to             timestamptz DEFAULT NULL
) RETURNS TABLE (
  user_id         uuid,
  total_closed    integer,
  wins            integer,
  losses          integer,
  breakeven       integer,
  win_rate        numeric,    -- 0..1 (multiply by 100 in UI for percentage)
  net_pnl         numeric,
  gross_profit    numeric,
  gross_loss      numeric,
  avg_win         numeric,
  avg_loss        numeric,    -- positive number (absolute value of avg of negatives)
  profit_factor   numeric,    -- gross_profit / gross_loss; NULL when undefined
  expectancy      numeric,
  largest_win     numeric,
  largest_loss    numeric,    -- negative number (min of negatives)
  avg_rr          numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      t.user_id,
      t.pnl,
      t.actual_user_r,
      t.actual_r,
      t.rr,
      t.input_mode,
      t.risk_usd
    FROM public.trades t
    WHERE t.deleted_at IS NULL
      AND t.outcome IN ('WIN', 'LOSS', 'BE')
      AND t.user_id = p_user_id
      AND (p_portfolio_ids IS NULL OR t.portfolio_id = ANY(p_portfolio_ids))
      AND (p_from IS NULL OR t.open_at >= p_from)
      AND (p_to   IS NULL OR t.open_at <  p_to)
  ),
  agg AS (
    SELECT
      p_user_id                                                    AS user_id,
      COUNT(*)::int                                                AS total_closed,
      COUNT(*) FILTER (WHERE pnl > 0)::int                         AS wins,
      COUNT(*) FILTER (WHERE pnl < 0)::int                         AS losses,
      COUNT(*) FILTER (WHERE pnl = 0 OR pnl IS NULL)::int          AS breakeven,
      COALESCE(SUM(pnl), 0)                                        AS net_pnl,
      COALESCE(SUM(pnl) FILTER (WHERE pnl > 0), 0)                 AS gross_profit,
      COALESCE(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0)            AS gross_loss,
      COALESCE(AVG(pnl) FILTER (WHERE pnl > 0), 0)                 AS avg_win,
      COALESCE(ABS(AVG(pnl) FILTER (WHERE pnl < 0)), 0)            AS avg_loss,
      COALESCE(MAX(pnl) FILTER (WHERE pnl > 0), 0)                 AS largest_win,
      COALESCE(MIN(pnl) FILTER (WHERE pnl < 0), 0)                 AS largest_loss,
      COALESCE(AVG(
        COALESCE(
          actual_user_r,
          actual_r,
          CASE WHEN rr > 0 THEN rr ELSE NULL END,
          CASE
            WHEN pnl IS NOT NULL AND risk_usd > 0 THEN
              CASE
                WHEN input_mode = 'risk-only' THEN pnl / risk_usd
                ELSE ABS(pnl) / risk_usd
              END
            ELSE NULL
          END
        )
      ) FILTER (WHERE pnl IS NOT NULL), 0)                          AS avg_rr
    FROM base
  )
  SELECT
    a.user_id,
    a.total_closed,
    a.wins,
    a.losses,
    a.breakeven,
    -- win_rate: 0..1 like JS calculateWinRate(); guard against div0.
    CASE WHEN a.total_closed > 0
      THEN a.wins::numeric / a.total_closed::numeric
      ELSE 0::numeric
    END                                                            AS win_rate,
    a.net_pnl,
    a.gross_profit,
    a.gross_loss,
    a.avg_win,
    a.avg_loss,
    -- profit_factor: NULL when undefined (matches JS Infinity / 0 / NaN handling
    -- by the consumer — easier to detect than a magic number).
    CASE
      WHEN a.gross_loss > 0 THEN a.gross_profit / a.gross_loss
      WHEN a.gross_profit > 0 THEN NULL  -- Infinity equivalent
      ELSE 0::numeric                    -- no wins, no losses
    END                                                            AS profit_factor,
    -- expectancy: winRate*avgWin − (1−winRate)*avgLoss
    (
      CASE WHEN a.total_closed > 0
        THEN a.wins::numeric / a.total_closed::numeric
        ELSE 0::numeric
      END
    ) * a.avg_win
    - (
        1 - CASE WHEN a.total_closed > 0
          THEN a.wins::numeric / a.total_closed::numeric
          ELSE 0::numeric
        END
      ) * a.avg_loss                                               AS expectancy,
    a.largest_win,
    a.largest_loss,
    a.avg_rr
  FROM agg a;
$$;

COMMENT ON FUNCTION public.get_user_journal_stats(uuid, uuid[], timestamptz, timestamptz) IS
'F5 perf fix — full journal stats RPC. Mirrors src/utils/statistics.ts:calculateStatistics() field set + adds date range. SECURITY INVOKER + RLS on trades enforces per-user visibility. Date range is half-open [from, to).';

GRANT EXECUTE ON FUNCTION public.get_user_journal_stats(uuid, uuid[], timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_journal_stats(uuid, uuid[], timestamptz, timestamptz) TO service_role;
