-- 2026-07-20: reconcile_open_trades_vs_broker has been silently failing on every
-- close attempt since trades_exit_reason_chk was added: it writes
-- exit_reason='broker_flat_reconciled', but the constraint only allows
-- NULL/trailing/manual/signal/target/stop (error 23514). The reconcile marker
-- convention is updated_via='reconciler' (which it already sets) — drop the
-- exit_reason assignment so the close actually lands.
--
-- APPLIED TO PROD 2026-07-20 via Supabase MCP apply_migration
-- (name: fix_reconcile_open_trades_exit_reason_constraint).
CREATE OR REPLACE FUNCTION public.reconcile_open_trades_vs_broker(p_dry_run boolean DEFAULT true, p_freshness_minutes integer DEFAULT 15)
 RETURNS TABLE(trade_id uuid, account_name text, symbol text, side text, action text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT t.id, t.user_id, t.entry_price, t.symbol AS sym, t.side AS sd,
           p.name AS acct, s.captured_at, s.positions
    FROM public.trades t
    JOIN public.portfolios p ON p.id = t.portfolio_id
    JOIN LATERAL (
      SELECT a.captured_at, a.positions
      FROM public.automation_account_snapshots a
      WHERE a.account_name = p.name
      ORDER BY a.captured_at DESC
      LIMIT 1
    ) s ON true
    WHERE t.close_at IS NULL
      AND t.external_id IS NOT NULL                 -- synced trades only, never manual
      AND t.deleted_at IS NULL
      AND s.captured_at > now() - make_interval(mins => p_freshness_minutes)  -- fresh only
      AND jsonb_typeof(s.positions) = 'array'
      AND jsonb_array_length(s.positions) = 0        -- broker reports account FLAT
  LOOP
    IF NOT p_dry_run THEN
      UPDATE public.trades
      SET close_at    = r.captured_at,
          exit_price  = r.entry_price,               -- breakeven: reset has no real exit
          pnl         = 0,
          outcome     = 'BE',
          -- exit_reason intentionally untouched: trades_exit_reason_chk only
          -- allows trailing/manual/signal/target/stop; the reconcile marker is
          -- updated_via='reconciler' (same convention as tradovate-sync L7c).
          updated_at  = now(),
          updated_via = 'reconciler'
      WHERE id = r.id AND close_at IS NULL;

      INSERT INTO public.trade_reconciliation_log(
        trade_id, user_id, account_name, action, snapshot_captured_at,
        snapshot_positions, set_close_at, set_exit_price, set_pnl)
      VALUES (r.id, r.user_id, r.acct, 'closed_broker_flat', r.captured_at,
        r.positions, r.captured_at, r.entry_price, 0);
    END IF;

    trade_id := r.id; account_name := r.acct; symbol := r.sym; side := r.sd;
    action := CASE WHEN p_dry_run THEN 'would_close_broker_flat' ELSE 'closed_broker_flat' END;
    RETURN NEXT;
  END LOOP;
END $function$;
