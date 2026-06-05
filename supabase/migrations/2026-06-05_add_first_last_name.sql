-- 2026-06-05 — Add first_name / last_name to profiles + populate from signup metadata.
-- Applied to live DB via Supabase MCP apply_migration (migrations:
--   add_first_last_name_to_profiles, fix_first_last_name_backfill_singleword).
-- This file mirrors what was applied, for repo record.

-- 1. Add columns (additive, non-destructive)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text;

-- 2. Best-effort backfill: split existing display_name into first/last.
--    Only fills rows where both name columns are still NULL. Never clears anything.
UPDATE public.profiles
SET
  first_name = NULLIF(split_part(trim(display_name), ' ', 1), ''),
  last_name  = NULLIF(trim(substring(trim(display_name) FROM position(' ' IN trim(display_name)) + 1)), '')
WHERE display_name IS NOT NULL
  AND trim(display_name) <> ''
  AND first_name IS NULL
  AND last_name  IS NULL;

-- 2b. Corrective: single-word display_name (no space) must not duplicate into last_name.
UPDATE public.profiles
SET last_name = NULL
WHERE trim(display_name) NOT LIKE '% %'
  AND last_name IS NOT NULL;

-- 3. handle_new_user: populate first/last and compose display_name.
--    Email signup sends first_name/last_name; Google OAuth sends given_name/family_name.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_first text := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'given_name'
  );
  v_last text := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'family_name'
  );
  v_display text := COALESCE(
    NULLIF(trim(concat_ws(' ', v_first, v_last)), ''),
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
BEGIN
  INSERT INTO public.profiles (id, email, display_name, first_name, last_name, account_type)
  VALUES (NEW.id, NEW.email, v_display, v_first, v_last, 'free')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for auth.users.id=%: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;  -- never block signup
END;
$function$;
