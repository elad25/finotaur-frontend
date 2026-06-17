-- R basis display mode for the trade journal.
-- 'per_trade' (default): R derived from each trade's own stop/risk (actual_r). Missing when no stop is defined.
-- 'manual': R derived from the user's global 1R risk setting (actual_user_r).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS r_basis_mode varchar(20) NOT NULL DEFAULT 'per_trade';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_r_basis_mode_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_r_basis_mode_check
      CHECK (r_basis_mode IN ('per_trade', 'manual'));
  END IF;
END $$;
