-- ════════════════════════════════════════════════════════════════════════════
-- Perf P1 — process_tradovate_fills RPC (B1) — FEATURE-FLAGGED
-- Session: perf-optimization-P1-scale-100k (2026-05-21)
--
-- Mirrors the JS processFill loop from tradovate-sync/index.ts (lines 308-692)
-- so all per-fill DB work happens in ONE transaction instead of 4-6 sequential
-- round-trips. Single user with 50 fills: ~250 RTTs → ~1 RPC call.
--
-- Behavior MUST match the JS path exactly. Triggers (handle_trade_changes_unified,
-- get_asset_multiplier) still own multiplier + pnl math; this fn just structures
-- the writes the same way the JS code did, in DB order.
--
-- Three sub-paths (mirroring the JS exactly):
--   1. CLOSE — opposite-side position exists → partial or full close
--   2. ADDON — same-side position exists → append entry leg + weighted avg
--   3. OPEN  — no position → insert fresh trade + position_state row
--
-- Returns: jsonb { inserted, updated, skipped, errors, per_fill_results[] }
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.process_tradovate_fills(
  p_user_id     uuid,
  p_account_id  integer,
  p_environment text,
  -- contract_map: jsonb object { "<contractId>": { "name": "...", "multiplier": <num> } }
  p_contract_map jsonb,
  -- fills array (sorted ascending by fill.id):
  --   [{ id:bigint, action:'Buy'|'Sell', contractId:bigint, qty:num, price:num, ts:iso-string }, ...]
  p_fills       jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fill          record;
  v_open_pos      record;
  v_existing_same record;
  v_current_trade record;
  v_contract_info jsonb;
  v_symbol        text;
  v_multiplier    numeric;
  v_fill_side     text;
  v_close_side    text;
  v_fill_at       timestamptz;
  v_inserted      int := 0;
  v_updated       int := 0;
  v_skipped       int := 0;
  v_errors        int := 0;
  v_results       jsonb := '[]'::jsonb;
  v_existing_exits   jsonb;
  v_existing_entries jsonb;
  v_updated_exits    jsonb;
  v_updated_entries  jsonb;
  v_new_exit         jsonb;
  v_new_entry        jsonb;
  v_total_qty        numeric;
  v_closed_qty       numeric;
  v_remaining_qty    numeric;
  v_weighted_avg     numeric;
  v_total_exit_qty   numeric;
  v_new_open_qty     numeric;
  v_new_trade_id     uuid;
BEGIN
  FOR v_fill IN
    SELECT
      (e->>'id')::bigint        AS id,
       e->>'action'             AS action,
      (e->>'contractId')::bigint AS contract_id,
      (e->>'qty')::numeric       AS qty,
      (e->>'price')::numeric     AS price,
      (e->>'timestamp')::timestamptz AS ts
    FROM jsonb_array_elements(p_fills) AS e
    ORDER BY (e->>'id')::bigint ASC
  LOOP
    v_contract_info := p_contract_map -> v_fill.contract_id::text;
    IF v_contract_info IS NULL THEN
      v_errors := v_errors + 1;
      v_results := v_results || jsonb_build_object(
        'fill_id', v_fill.id, 'result', 'error',
        'reason', 'missing_contract_in_map'
      );
      CONTINUE;
    END IF;
    v_symbol     := v_contract_info ->> 'name';
    v_multiplier := (v_contract_info ->> 'multiplier')::numeric;
    v_fill_side  := CASE WHEN v_fill.action = 'Buy' THEN 'LONG' ELSE 'SHORT' END;
    v_close_side := CASE WHEN v_fill_side = 'LONG' THEN 'SHORT' ELSE 'LONG' END;
    v_fill_at    := v_fill.ts;

    -- ── 1. CLOSE path: opposite-side position exists ──
    SELECT * INTO v_open_pos
    FROM public.tradovate_position_state
    WHERE user_id = p_user_id
      AND tradovate_account_id = p_account_id
      AND symbol = v_symbol
      AND side = v_close_side
      AND open_quantity > 0
    LIMIT 1;

    IF FOUND AND v_open_pos.open_trade_id IS NOT NULL THEN
      SELECT quantity, partial_exits INTO v_current_trade
      FROM public.trades
      WHERE id = v_open_pos.open_trade_id;

      IF NOT FOUND THEN
        v_errors := v_errors + 1;
        v_results := v_results || jsonb_build_object(
          'fill_id', v_fill.id, 'result', 'error', 'reason', 'open_trade_not_found'
        );
        CONTINUE;
      END IF;

      v_closed_qty    := LEAST(v_fill.qty, v_open_pos.open_quantity);
      v_remaining_qty := v_open_pos.open_quantity - v_closed_qty;
      v_total_qty     := COALESCE(v_current_trade.quantity, v_closed_qty);

      v_existing_exits := CASE
        WHEN jsonb_typeof(v_current_trade.partial_exits) = 'array'
        THEN v_current_trade.partial_exits
        ELSE '[]'::jsonb
      END;
      v_new_exit := jsonb_build_object(
        'id',         format('tradovate::partial-close::%s', v_fill.id),
        'price',      v_fill.price,
        'quantity',   v_closed_qty,
        'percentage', CASE WHEN v_total_qty > 0
                        THEN ROUND(v_closed_qty / v_total_qty * 10000) / 100
                        ELSE 0 END,
        'timestamp',  v_fill_at,
        'fill_id',    v_fill.id
      );
      v_updated_exits := v_existing_exits || jsonb_build_array(v_new_exit);

      IF v_remaining_qty > 0 THEN
        UPDATE public.trades
        SET partial_exits = v_updated_exits
        WHERE id = v_open_pos.open_trade_id;

        UPDATE public.tradovate_position_state
        SET open_quantity = v_remaining_qty, last_updated_at = v_fill_at
        WHERE id = v_open_pos.id;

        v_updated := v_updated + 1;
        v_results := v_results || jsonb_build_object(
          'fill_id', v_fill.id, 'result', 'partial_close',
          'trade_id', v_open_pos.open_trade_id,
          'remaining_qty', v_remaining_qty
        );
      ELSE
        -- FULL close: compute weighted-avg exit across all legs.
        SELECT
          COALESCE(SUM((e->>'quantity')::numeric), 0),
          COALESCE(SUM((e->>'price')::numeric * (e->>'quantity')::numeric), 0)
        INTO v_total_exit_qty, v_weighted_avg
        FROM jsonb_array_elements(v_updated_exits) AS e;

        v_weighted_avg := CASE
          WHEN v_total_exit_qty > 0 THEN v_weighted_avg / v_total_exit_qty
          ELSE v_fill.price
        END;

        UPDATE public.trades
        SET exit_price    = v_weighted_avg,
            close_at      = v_fill_at,
            fees          = NULL,
            partial_exits = v_updated_exits
        WHERE id = v_open_pos.open_trade_id;

        DELETE FROM public.tradovate_position_state WHERE id = v_open_pos.id;

        v_updated := v_updated + 1;
        v_results := v_results || jsonb_build_object(
          'fill_id', v_fill.id, 'result', 'full_close',
          'trade_id', v_open_pos.open_trade_id,
          'weighted_avg_exit', v_weighted_avg
        );
      END IF;
      CONTINUE;
    END IF;

    -- ── 2. ADDON path: same-side position exists ──
    SELECT * INTO v_existing_same
    FROM public.tradovate_position_state
    WHERE user_id = p_user_id
      AND tradovate_account_id = p_account_id
      AND symbol = v_symbol
      AND side = v_fill_side
      AND open_quantity > 0
    LIMIT 1;

    IF FOUND AND v_existing_same.open_trade_id IS NOT NULL THEN
      SELECT partial_entries INTO v_current_trade
      FROM public.trades
      WHERE id = v_existing_same.open_trade_id;

      IF NOT FOUND THEN
        v_errors := v_errors + 1;
        v_results := v_results || jsonb_build_object(
          'fill_id', v_fill.id, 'result', 'error', 'reason', 'addon_trade_not_found'
        );
        CONTINUE;
      END IF;

      v_existing_entries := CASE
        WHEN jsonb_typeof(v_current_trade.partial_entries) = 'array'
        THEN v_current_trade.partial_entries
        ELSE '[]'::jsonb
      END;
      v_new_entry := jsonb_build_object(
        'id',        format('tradovate::partial-entry::%s', v_fill.id),
        'price',     v_fill.price,
        'quantity',  v_fill.qty,
        'timestamp', v_fill_at,
        'fill_id',   v_fill.id
      );
      v_updated_entries := v_existing_entries || jsonb_build_array(v_new_entry);

      SELECT
        COALESCE(SUM((e->>'quantity')::numeric), 0),
        COALESCE(SUM((e->>'price')::numeric * (e->>'quantity')::numeric), 0)
      INTO v_total_qty, v_weighted_avg
      FROM jsonb_array_elements(v_updated_entries) AS e;

      v_weighted_avg := CASE
        WHEN v_total_qty > 0 THEN v_weighted_avg / v_total_qty
        ELSE v_fill.price
      END;

      UPDATE public.trades
      SET quantity        = v_total_qty,
          entry_price     = v_weighted_avg,
          partial_entries = v_updated_entries
      WHERE id = v_existing_same.open_trade_id;

      v_new_open_qty := v_existing_same.open_quantity + v_fill.qty;
      UPDATE public.tradovate_position_state
      SET open_quantity   = v_new_open_qty,
          avg_entry_price = v_weighted_avg,
          last_updated_at = v_fill_at
      WHERE id = v_existing_same.id;

      v_updated := v_updated + 1;
      v_results := v_results || jsonb_build_object(
        'fill_id', v_fill.id, 'result', 'addon_leg',
        'trade_id', v_existing_same.open_trade_id,
        'new_open_qty', v_new_open_qty
      );
      CONTINUE;
    END IF;

    -- ── 3. OPEN path: fresh trade row + position_state ──
    -- Multiplier intentionally NULL — DB trigger handle_trade_changes_unified
    -- calls get_asset_multiplier(symbol) at insert time (v45 invariant).
    BEGIN
      INSERT INTO public.trades (
        user_id, external_id, idempotency_key,
        symbol, side, quantity, entry_price, exit_price, pnl,
        open_at, close_at, outcome, import_source, broker,
        multiplier, fees, partial_entries
      ) VALUES (
        p_user_id,
        format('tradovate::fill::%s', v_fill.id),
        format('tradovate::%s::%s::%s', p_user_id, p_environment, v_fill.id),
        v_symbol, v_fill_side, v_fill.qty, v_fill.price, NULL, NULL,
        v_fill_at, NULL, 'OPEN', 'tradovate', 'tradovate',
        NULL, NULL,
        jsonb_build_array(jsonb_build_object(
          'id',        format('tradovate::partial-entry::%s', v_fill.id),
          'price',     v_fill.price,
          'quantity',  v_fill.qty,
          'timestamp', v_fill_at,
          'fill_id',   v_fill.id
        ))
      )
      RETURNING id INTO v_new_trade_id;
    EXCEPTION WHEN unique_violation THEN
      v_skipped := v_skipped + 1;
      v_results := v_results || jsonb_build_object(
        'fill_id', v_fill.id, 'result', 'skipped', 'reason', 'duplicate'
      );
      CONTINUE;
    WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_results := v_results || jsonb_build_object(
        'fill_id', v_fill.id, 'result', 'error',
        'reason', 'insert_failed', 'sqlerrm', SQLERRM
      );
      CONTINUE;
    END;

    INSERT INTO public.tradovate_position_state (
      user_id, tradovate_account_id, symbol, side,
      open_quantity, avg_entry_price, open_trade_id, last_updated_at
    ) VALUES (
      p_user_id, p_account_id, v_symbol, v_fill_side,
      v_fill.qty, v_fill.price, v_new_trade_id, v_fill_at
    )
    ON CONFLICT (user_id, tradovate_account_id, symbol, side)
    DO UPDATE SET
      open_quantity   = EXCLUDED.open_quantity,
      avg_entry_price = EXCLUDED.avg_entry_price,
      open_trade_id   = EXCLUDED.open_trade_id,
      last_updated_at = EXCLUDED.last_updated_at;

    v_inserted := v_inserted + 1;
    v_results := v_results || jsonb_build_object(
      'fill_id', v_fill.id, 'result', 'inserted',
      'trade_id', v_new_trade_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated',  v_updated,
    'skipped',  v_skipped,
    'errors',   v_errors,
    'results',  v_results
  );
END;
$$;

COMMENT ON FUNCTION public.process_tradovate_fills(uuid, integer, text, jsonb, jsonb) IS
'B1 perf fix (FEATURE-FLAGGED) — batched mirror of JS processFill loop. Edge fn calls this when PROCESS_FILLS_VIA_RPC=true. Default OFF until validated on demo account.';

REVOKE ALL ON FUNCTION public.process_tradovate_fills(uuid, integer, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_tradovate_fills(uuid, integer, text, jsonb, jsonb) TO service_role;
