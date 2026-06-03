-- Multi-portfolio: save_my_portfolio targets a SPECIFIC portfolio by id.
-- ADDITIVE, forward-only, backward-compatible.
--
-- Adds a trailing optional parameter `p_portfolio_id uuid DEFAULT NULL`:
--   * p_portfolio_id NOT NULL  -> save into THAT portfolio (ownership-checked).
--   * p_portfolio_id NULL       -> previous behavior: find the caller's existing
--                                  manual portfolio and update it, else create one.
-- The DEFAULT NULL keeps the old 5-arg call signature working for any client
-- still on a cached bundle (no duplicate creation during the deploy window).
--
-- Portfolio-count and ticker caps (FREE 1/10, PRO+ 5/50) are enforced in the
-- APP layer (portfolioLimits.ts) — product limits, not security. RLS enforces
-- ownership on all tables.

-- Drop the previous 5-arg version first. Without this, the new 6-arg version
-- (with a DEFAULT) would coexist with the old 5-arg one, making a 5-arg call
-- ambiguous ("function is not unique"). After the drop, both legacy 5-arg calls
-- and new 6-arg calls resolve to the single new function.
DROP FUNCTION IF EXISTS public.save_my_portfolio(text, text, boolean, text, jsonb);

CREATE OR REPLACE FUNCTION public.save_my_portfolio(
  p_name              text,
  p_currency          text,
  p_benchmark_enabled boolean,
  p_benchmark_symbol  text,
  p_accounts          jsonb,
  p_portfolio_id      uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid     uuid;
  v_pid     uuid;
  acc_elem  jsonb;
  pos_elem  jsonb;
  v_acc_id  uuid;
  acc_idx   integer;
  pos_idx   integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_portfolio_id IS NOT NULL THEN
    -- Target a specific portfolio the caller owns.
    SELECT id INTO v_pid
      FROM public.portfolios
     WHERE id = p_portfolio_id AND user_id = v_uid
     LIMIT 1;
    IF v_pid IS NULL THEN
      RAISE EXCEPTION 'Portfolio not found';
    END IF;
    UPDATE public.portfolios
       SET name              = COALESCE(NULLIF(p_name, ''), name),
           currency          = p_currency,
           benchmark_enabled = p_benchmark_enabled,
           benchmark_symbol  = p_benchmark_symbol,
           updated_at        = now()
     WHERE id = v_pid;
  ELSE
    -- Backward-compatible path: the caller's existing manual portfolio, else create.
    SELECT id INTO v_pid
      FROM public.portfolios
     WHERE user_id = v_uid AND source = 'manual'
     LIMIT 1;

    IF v_pid IS NOT NULL THEN
      UPDATE public.portfolios
         SET currency          = p_currency,
             benchmark_enabled = p_benchmark_enabled,
             benchmark_symbol  = p_benchmark_symbol,
             updated_at        = now()
       WHERE id = v_pid;
    ELSE
      INSERT INTO public.portfolios
        (user_id, name, source, environment, is_active,
         currency, benchmark_enabled, benchmark_symbol)
      VALUES
        (v_uid,
         COALESCE(NULLIF(p_name, ''), 'My Portfolio'),
         'manual', 'live', true,
         p_currency, p_benchmark_enabled, p_benchmark_symbol)
      RETURNING id INTO v_pid;
    END IF;
  END IF;

  -- Replace accounts + positions for this portfolio (atomic within the function).
  DELETE FROM public.portfolio_accounts
   WHERE portfolio_id = v_pid AND user_id = v_uid;

  acc_idx := 0;
  FOR acc_elem IN
    SELECT value FROM jsonb_array_elements(p_accounts) WITH ORDINALITY AS t(value, ord)
    ORDER BY ord
  LOOP
    INSERT INTO public.portfolio_accounts
      (user_id, portfolio_id, name, cash_position, cash_currency, sort_order)
    VALUES
      (v_uid, v_pid,
       acc_elem->>'name',
       COALESCE(NULLIF(acc_elem->>'cash_position', '')::numeric, 0),
       COALESCE(NULLIF(acc_elem->>'cash_currency', ''), 'USD'),
       acc_idx)
    RETURNING id INTO v_acc_id;

    pos_idx := 0;
    FOR pos_elem IN
      SELECT value
        FROM jsonb_array_elements(acc_elem->'positions') WITH ORDINALITY AS t(value, ord)
       ORDER BY ord
    LOOP
      CONTINUE WHEN NULLIF(pos_elem->>'ticker', '') IS NULL;
      CONTINUE WHEN (pos_elem->>'quantity')::numeric IS NULL;
      CONTINUE WHEN (pos_elem->>'quantity')::numeric <= 0;

      INSERT INTO public.portfolio_positions
        (user_id, portfolio_id, account_id,
         ticker, quantity, cost_per_share, purchase_date, sort_order)
      VALUES
        (v_uid, v_pid, v_acc_id,
         upper(trim(pos_elem->>'ticker')),
         (pos_elem->>'quantity')::numeric,
         NULLIF(pos_elem->>'cost_per_share', '')::numeric,
         NULLIF(pos_elem->>'purchase_date',  '')::date,
         pos_idx);

      pos_idx := pos_idx + 1;
    END LOOP;

    acc_idx := acc_idx + 1;
  END LOOP;

  RETURN v_pid;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.save_my_portfolio(text, text, boolean, text, jsonb, uuid)
  TO authenticated;
