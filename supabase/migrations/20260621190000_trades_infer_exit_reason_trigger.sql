-- Auto-populate trades.exit_reason from price relationships (SHADOW #4).
-- exit ≈ stop -> 'stop'; exit ≈ take_profit -> 'target'; else closed -> 'manual'.
-- Only sets when exit_reason IS NULL, so a manual pick in the UI always wins.
-- Applied to prod 2026-06-21 via Supabase MCP (auto_infer_exit_reason_trigger).
-- Idempotent: CREATE OR REPLACE + DROP TRIGGER IF EXISTS; backfill respects existing values.

CREATE OR REPLACE FUNCTION public.infer_exit_reason() RETURNS trigger AS $$
DECLARE stop_dist numeric; tol numeric;
BEGIN
  IF NEW.exit_reason IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.exit_price IS NULL THEN RETURN NEW; END IF;
  stop_dist := CASE WHEN NEW.stop_price IS NOT NULL THEN abs(NEW.entry_price - NEW.stop_price) ELSE NULL END;
  tol := GREATEST(COALESCE(stop_dist, 0) * 0.10, 0.0001);
  IF NEW.stop_price IS NOT NULL AND abs(NEW.exit_price - NEW.stop_price) <= tol THEN
    NEW.exit_reason := 'stop';
  ELSIF NEW.take_profit_price IS NOT NULL AND abs(NEW.exit_price - NEW.take_profit_price) <= tol THEN
    NEW.exit_reason := 'target';
  ELSE
    NEW.exit_reason := 'manual';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS zz_infer_exit_reason ON public.trades;
CREATE TRIGGER zz_infer_exit_reason BEFORE INSERT OR UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.infer_exit_reason();

-- Backfill existing closed trades (no-op UPDATE fires the trigger).
UPDATE public.trades SET exit_price = exit_price
WHERE exit_reason IS NULL AND exit_price IS NOT NULL;
