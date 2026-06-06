-- Migration: normalize_asset_class helper function
-- Purpose: canonical asset-class alias normalization for the options lifecycle feature.
-- Any writer that stores asset_class (manual UI, broker sync, CSV import) can call
-- this function and get back one of the canonical values:
--   options | stock | futures | forex | crypto | etf | NULL
-- NULL is returned for unknown / empty / NULL input (never guess).

create or replace function public.normalize_asset_class(raw text)
returns text language sql immutable as $$
  select case lower(trim(coalesce(raw,'')))
    when 'opt'        then 'options'
    when 'option'     then 'options'
    when 'options'    then 'options'
    when 'stk'        then 'stock'
    when 'stock'      then 'stock'
    when 'stocks'     then 'stock'
    when 'equity'     then 'stock'
    when 'equities'   then 'stock'
    when 'shares'     then 'stock'
    when 'fut'        then 'futures'
    when 'future'     then 'futures'
    when 'futures'    then 'futures'
    when 'cash'       then 'forex'
    when 'fx'         then 'forex'
    when 'forex'      then 'forex'
    when 'crypto'     then 'crypto'
    when 'perp'       then 'crypto'
    when 'perpetual'  then 'crypto'
    when 'coin'       then 'crypto'
    when 'etf'        then 'etf'
    when 'etfs'       then 'etf'
    else null
  end
$$;
