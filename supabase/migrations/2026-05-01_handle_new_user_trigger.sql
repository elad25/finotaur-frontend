-- ============================================================
-- 2026-05-01 — handle_new_user trigger + Tom Sahar backfill
--
-- Author: Elad (with Claude)
-- Project: dnnevwlzpurhbkzjocnp (Finotaur)
--
-- Purpose:
--   Replace manual frontend INSERT to public.profiles with an
--   automatic AFTER INSERT trigger on auth.users. This eliminates
--   the orphaned-auth.users problem that produced 19 ghosts and
--   one remaining (Tom Sahar, b4c70d90-dd3b-4118-8667-101432d3d464).
--
-- Audit done 2026-05-01: 6 of 7 chained triggers on profiles
-- were verified safe with a minimal INSERT (id, email, display_name,
-- account_type='free'). The 7th (`trg_create_manual_portfolio`)
-- did not appear in any migration file — verify in production:
--   SELECT prosrc FROM pg_proc WHERE proname = 'trg_create_manual_portfolio';
-- If it exists, read it and confirm it doesn't require a column the
-- minimal INSERT omits.
--
-- Idempotent (safe to re-run): uses IF NOT EXISTS / OR REPLACE / DO NOTHING.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- PART 1 — handle_new_user() function
-- ------------------------------------------------------------
-- SECURITY DEFINER: bypasses RLS profiles_insert_policy
--   (which requires id = auth.uid(), but auth.uid() is NULL during
--   the auth.users INSERT trigger — would otherwise block).
-- SET search_path = public: prevents schema-injection if a
--   compromised role creates a same-named function in another schema.
-- EXCEPTION WHEN OTHERS: warn + continue. Never block signup.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for auth.users.id=%: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;  -- never block signup
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Auto-creates profiles row on auth.users INSERT. Minimal field set (id, email, display_name, account_type=free). Other fields filled by 6 chained triggers on profiles. Never blocks signup on failure.';

-- ------------------------------------------------------------
-- PART 2 — Trigger on auth.users
-- ------------------------------------------------------------
-- AFTER INSERT (not BEFORE): profiles.id has FK to auth.users.id,
--   so the auth.users row must exist first.
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------
-- PART 3 — UNIQUE constraint on profiles.email (case-insensitive)
-- ------------------------------------------------------------
-- Prevents race condition where two simultaneous signups (or
-- backfill + trigger collision) create duplicate emails.
-- Pre-flight: if this fails, run the SELECT below first to find
-- and dedupe existing duplicates before re-running:
--
--   SELECT lower(email), COUNT(*)
--   FROM public.profiles
--   GROUP BY lower(email)
--   HAVING COUNT(*) > 1;
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
  ON public.profiles (lower(email));


-- ------------------------------------------------------------
-- PART 4 — Backfill: Tom Sahar (orphaned auth.users → profiles)
-- ------------------------------------------------------------
-- Tom's auth.users row already exists (id b4c70d90...), but his
-- profile was never created (manual frontend INSERT failed silently
-- on 2026-04-XX — we don't have logs to know why). This INSERT
-- runs ONCE to backfill him, after which the trigger handles all
-- new signups.
--
-- ON CONFLICT: idempotent if run twice or if trigger already fired.
-- ------------------------------------------------------------

INSERT INTO public.profiles (id, email, display_name, account_type)
VALUES (
  'b4c70d90-dd3b-4118-8667-101432d3d464',
  'toms.tya@gmail.com',
  'Tom Sahar',
  'free'
)
ON CONFLICT (id) DO NOTHING;

-- Sanity check: verify the row exists post-insert
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.profiles
  WHERE id = 'b4c70d90-dd3b-4118-8667-101432d3d464';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Tom Sahar backfill did not create a profiles row';
  END IF;
END $$;

COMMIT;

-- ============================================================
-- Post-deploy verification queries (run manually)
-- ============================================================
-- 1. Trigger exists?
--    SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
--
-- 2. Tom has profile?
--    SELECT id, email, display_name, account_type, tier, platform_plan
--    FROM public.profiles
--    WHERE id = 'b4c70d90-dd3b-4118-8667-101432d3d464';
--    Expected: account_type='free', tier='free', platform_plan='free'
--    (last two filled by sync_tier_from_account_type chained trigger)
--
-- 3. UNIQUE index active?
--    SELECT indexname FROM pg_indexes
--    WHERE tablename = 'profiles' AND indexname = 'profiles_email_unique';
--
-- 4. Smoke test (in a transaction so it auto-rolls back):
--    BEGIN;
--      INSERT INTO auth.users (id, email, raw_user_meta_data)
--      VALUES (
--        gen_random_uuid(),
--        'smoketest-' || gen_random_uuid() || '@example.com',
--        '{"display_name": "Smoke Test"}'::jsonb
--      );
--      -- Then SELECT * FROM public.profiles WHERE email LIKE 'smoketest-%';
--      -- Expected: 1 row with display_name='Smoke Test', account_type='free'
--    ROLLBACK;
-- ============================================================
