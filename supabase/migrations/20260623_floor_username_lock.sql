-- 20260623_floor_username_lock.sql
-- The Floor: single unique nickname with a 3-month lock + optional display name.
--   * Adds profiles.floor_username_locked_until — the nickname cannot be CHANGED
--     before this timestamp (a hard 3-month lock).
--   * set_floor_profile now:
--       - treats display_name as OPTIONAL (falls back to the nickname) — the
--         single-nickname identity model.
--       - enforces the hard lock: an existing nickname can't be changed until
--         lock expiry; a clear error names the unlock date.
--       - starts a fresh 3-month lock on every accepted nickname (first set or
--         later change).
--       - always allows avatar / display updates when the nickname is unchanged
--         (so avatars stay freely editable).
--   * Existing holders keep locked_until = NULL → one free change, then locked
--     (no retroactive lock — intentional, avoids surprising current testers).

-- ─── 1. Lock column ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS floor_username_locked_until timestamptz;

COMMENT ON COLUMN public.profiles.floor_username_locked_until IS
  'The Floor nickname is locked (cannot be changed) until this time. '
  'Set to now() + 3 months whenever the nickname is set or changed. NULL = never set yet.';

-- ─── 2. set_floor_profile — nickname-first + 3-month hard lock ─────────────────
CREATE OR REPLACE FUNCTION public.set_floor_profile(
  p_username     text,
  p_display_name text DEFAULT NULL,
  p_avatar_url   text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid          uuid := auth.uid();
  v_clean        text;
  v_name         text;
  v_avatar       text;
  v_current      text;
  v_locked_until timestamptz;
  v_changing     boolean;
  v_new_lock     timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  v_clean  := lower(trim(coalesce(p_username, '')));
  v_name   := trim(coalesce(p_display_name, ''));
  v_avatar := nullif(trim(coalesce(p_avatar_url, '')), '');

  IF v_clean !~ '^[a-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'invalid_username' USING errcode = '22023',
      message = 'Username must be 3-20 characters: lowercase letters, numbers or underscore.';
  END IF;

  -- Single-nickname model: display name is optional; defaults to the nickname.
  IF v_name = '' THEN
    v_name := v_clean;
  END IF;

  SELECT floor_username, floor_username_locked_until
    INTO v_current, v_locked_until
    FROM public.profiles
   WHERE id = v_uid;

  v_changing := (v_current IS NULL) OR (lower(v_current) IS DISTINCT FROM v_clean);

  -- Hard 3-month lock: block CHANGING an existing nickname before expiry.
  IF v_changing
     AND v_current IS NOT NULL
     AND v_locked_until IS NOT NULL
     AND now() < v_locked_until THEN
    RAISE EXCEPTION 'username_locked' USING errcode = '42501',
      message = 'You can change your nickname after ' || to_char(v_locked_until, 'Mon DD, YYYY') || '.';
  END IF;

  -- Uniqueness (case-insensitive, excluding self).
  IF EXISTS (
    SELECT 1 FROM public.profiles
     WHERE lower(floor_username) = v_clean AND id <> v_uid
  ) THEN
    RAISE EXCEPTION 'username_taken' USING errcode = '23505',
      message = 'That username is already taken.';
  END IF;

  -- Fresh 3-month lock starts on every accepted nickname (first set or change).
  v_new_lock := CASE WHEN v_changing THEN now() + interval '3 months'
                     ELSE v_locked_until END;

  UPDATE public.profiles
     SET floor_username              = v_clean,
         display_name                = v_name,
         avatar_url                  = v_avatar,
         floor_username_locked_until = v_new_lock,
         updated_at                  = now()
   WHERE id = v_uid;

  RETURN json_build_object(
    'floor_username',              v_clean,
    'display_name',                v_name,
    'avatar_url',                  v_avatar,
    'floor_username_locked_until', v_new_lock
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.set_floor_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_floor_profile(text, text, text) TO authenticated;
