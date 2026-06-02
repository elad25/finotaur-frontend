-- ADDITIVE, forward-only.
-- Replaces the JS-side delete-and-reinsert save path with an atomic
-- Postgres RPC. All mutations happen inside a single implicit transaction:
-- if any step fails, the entire save rolls back, preventing partial writes.
--
-- Security: SECURITY INVOKER (default) — RLS applies on all tables.
-- The caller identity comes from auth.uid() inside the function;
-- the client never passes a user_id parameter.

CREATE OR REPLACE FUNCTION public.save_my_portfolio(
  p_name              text,
  p_currency          text,
  p_benchmark_enabled boolean,
  p_benchmark_symbol  text,
  p_accounts          jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid   uuid;
  v_pid   uuid;
  acc_elem  jsonb;
  pos_elem  jsonb;
  v_acc_id  uuid;
  acc_idx   integer;
  pos_idx   integer;
BEGIN
  -- 1. Resolve the calling user; reject unauthenticated calls.
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Find the caller's existing manual portfolio (at most one at app layer).
  SELECT id
    INTO v_pid
    FROM public.portfolios
   WHERE user_id = v_uid
     AND source  = 'manual'
   LIMIT 1;

  -- 3. Update or insert the portfolio row.
  IF v_pid IS NOT NULL THEN
    -- Update only the mutable settings; leave name/source/is_active untouched.
    UPDATE public.portfolios
       SET currency          = p_currency,
           benchmark_enabled = p_benchmark_enabled,
           benchmark_symbol  = p_benchmark_symbol,
           updated_at        = now()
     WHERE id = v_pid;
  ELSE
    -- Create a fresh manual portfolio for this user.
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

  -- 4. Atomically wipe the old accounts (positions cascade via FK).
  DELETE FROM public.portfolio_accounts
   WHERE portfolio_id = v_pid
     AND user_id      = v_uid;

  -- 5. Re-insert accounts and their positions from the jsonb payload.
  acc_idx := 0;
  FOR acc_elem IN
    SELECT value FROM jsonb_array_elements(p_accounts) WITH ORDINALITY AS t(value, ord)
    ORDER BY ord
  LOOP
    -- Insert the account row.
    INSERT INTO public.portfolio_accounts
      (user_id, portfolio_id, name, cash_position, cash_currency, sort_order)
    VALUES
      (v_uid,
       v_pid,
       acc_elem->>'name',
       COALESCE(NULLIF(acc_elem->>'cash_position', '')::numeric, 0),
       COALESCE(NULLIF(acc_elem->>'cash_currency', ''), 'USD'),
       acc_idx)
    RETURNING id INTO v_acc_id;

    -- Insert positions for this account.
    pos_idx := 0;
    FOR pos_elem IN
      SELECT value
        FROM jsonb_array_elements(acc_elem->'positions') WITH ORDINALITY AS t(value, ord)
       ORDER BY ord
    LOOP
      -- Skip rows where ticker is blank or quantity is missing / <= 0.
      CONTINUE WHEN NULLIF(pos_elem->>'ticker', '') IS NULL;
      CONTINUE WHEN (pos_elem->>'quantity')::numeric IS NULL;
      CONTINUE WHEN (pos_elem->>'quantity')::numeric <= 0;

      INSERT INTO public.portfolio_positions
        (user_id, portfolio_id, account_id,
         ticker, quantity, cost_per_share, purchase_date, sort_order)
      VALUES
        (v_uid,
         v_pid,
         v_acc_id,
         upper(trim(pos_elem->>'ticker')),
         (pos_elem->>'quantity')::numeric,
         NULLIF(pos_elem->>'cost_per_share', '')::numeric,
         NULLIF(pos_elem->>'purchase_date',  '')::date,
         pos_idx);

      pos_idx := pos_idx + 1;
    END LOOP;

    acc_idx := acc_idx + 1;
  END LOOP;

  -- 6. Return the portfolio id so the client can confirm which row was saved.
  RETURN v_pid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_my_portfolio(text, text, boolean, text, jsonb)
  TO authenticated;
