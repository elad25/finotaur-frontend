-- Auto-classify futures contracts so they are not mis-shown as "Stock".
-- When asset_class is NULL or wrongly stock/etf AND the symbol is a CME futures
-- root (NQ, MNQ, ES, ...) or a <root>+monthletter+year contract (NQU6 -> NQ),
-- set asset_class = 'futures'. Respects existing options/forex/crypto/futures.
-- Applied to prod 2026-06-21 via Supabase MCP (auto_infer_asset_class_futures).
-- Idempotent: CREATE OR REPLACE + DROP TRIGGER IF EXISTS; backfill respects existing values.

CREATE OR REPLACE FUNCTION public.infer_asset_class() RETURNS trigger AS $$
DECLARE roots text[] := ARRAY['ES','MES','NQ','MNQ','YM','MYM','RTY','M2K','CL','MCL','GC','MGC','SI','SIL','HG','NG','PL','ZB','ZN','ZF','ZT','ZC','ZS','ZW','6E','6A','6B','6C','6J','6S'];
        root text;
BEGIN
  IF NEW.symbol IS NULL THEN RETURN NEW; END IF;
  IF NEW.asset_class IS NOT NULL AND NEW.asset_class NOT IN ('stock','stocks','etf','equity') THEN RETURN NEW; END IF;
  root := regexp_replace(upper(NEW.symbol), '[FGHJKMNQUVXZ][0-9]{1,2}$', '');
  IF upper(NEW.symbol) = ANY(roots) OR root = ANY(roots) THEN
    NEW.asset_class := 'futures';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS zz_infer_asset_class ON public.trades;
CREATE TRIGGER zz_infer_asset_class BEFORE INSERT OR UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.infer_asset_class();

-- Backfill existing futures-symbol trades wrongly null/stock (no-op UPDATE fires the trigger).
UPDATE public.trades SET symbol = symbol
WHERE (asset_class IS NULL OR asset_class IN ('stock','stocks','etf','equity'))
  AND (upper(symbol) = ANY(ARRAY['ES','MES','NQ','MNQ','YM','MYM','RTY','M2K','CL','MCL','GC','MGC','SI','SIL','HG','NG','PL','ZB','ZN','ZF','ZT','ZC','ZS','ZW','6E','6A','6B','6C','6J','6S'])
       OR regexp_replace(upper(symbol), '[FGHJKMNQUVXZ][0-9]{1,2}$','') = ANY(ARRAY['ES','MES','NQ','MNQ','YM','MYM','RTY','M2K','CL','MCL','GC','MGC','SI','SIL','HG','NG','PL','ZB','ZN','ZF','ZT','ZC','ZS','ZW','6E','6A','6B','6C','6J','6S']));
