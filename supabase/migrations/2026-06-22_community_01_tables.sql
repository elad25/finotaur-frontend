-- FINOTAUR Community publish backbone — Phase: broad infrastructure.
-- Creates the global feed tables (global_posts / comments / reactions),
-- the universal trade-share ledger (trade_shares), and the shared-note
-- co-editing layer (shared_notes / shared_note_revisions).
-- Also extends profiles with global feed / leaderboard opt-in flags.
--
-- RLS policies live in companion migration: 2026-06-22_community_02_rls.sql
-- RPC functions live in companion migration: 2026-06-22_community_03_rpcs.sql
--
-- All writes should go through SECURITY DEFINER RPCs (migration 03).
-- All reads should be gated by RLS policies (migration 02).

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. global_posts
-- Global feed posts (no space_id — visible to all opted-in users).
-- Mirrors space_posts but operates at the platform level.

CREATE TABLE IF NOT EXISTS public.global_posts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body              text,
  attached_trade_id uuid        REFERENCES public.trades(id) ON DELETE SET NULL,
  hide_pnl          boolean     NOT NULL DEFAULT false,
  show_setup_only   boolean     NOT NULL DEFAULT false,
  reveal_size       boolean     NOT NULL DEFAULT false,
  pinned            boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  edited_at         timestamptz,
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_global_posts_created_at
  ON public.global_posts (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_global_posts_author_id
  ON public.global_posts (author_id);

COMMENT ON TABLE public.global_posts IS
  'Platform-wide feed posts. Not scoped to any mentor space. Writes are SECURITY DEFINER only; reads are RLS-gated.';


-- 2. global_post_comments
-- Thread comments on global feed posts.

CREATE TABLE IF NOT EXISTS public.global_post_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES public.global_posts(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_global_post_comments_post_id
  ON public.global_post_comments (post_id);

COMMENT ON TABLE public.global_post_comments IS
  'Thread comments on global feed posts. Writes are SECURITY DEFINER only; reads are RLS-gated.';


-- 3. global_post_reactions
-- Kind-based reactions on global posts (no emoji column).
-- One row per (post, user, kind); kind is constrained to a fixed set.

CREATE TABLE IF NOT EXISTS public.global_post_reactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES public.global_posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind       text        NOT NULL CHECK (kind IN ('up', 'down', 'repost')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_global_post_reactions_post_id
  ON public.global_post_reactions (post_id);

COMMENT ON TABLE public.global_post_reactions IS
  'Kind-based reactions on global posts. One row per (post, user, kind). Writes are SECURITY DEFINER only.';


-- 4. trade_shares
-- Universal publish ledger: records every trade-share event regardless of
-- destination (global feed, community room, or 1:1 mentor review).
-- Defined after global_posts because it FKs it.
--
-- Scope semantics:
--   'global'    → room_id must be NULL; share appears in global_posts
--   'community' → room_id must NOT be NULL; share appears in a space feed
--   'mentor'    → room_id must NOT be NULL; target_mentor_id is the intended
--                 reviewer (enforced in the RPC layer, not a hard DB constraint,
--                 to keep flexibility for multi-mentor spaces)

CREATE TABLE IF NOT EXISTS public.trade_shares (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id          uuid        NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  author_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope             text        NOT NULL CHECK (scope IN ('global', 'community', 'mentor')),
  room_id           uuid        REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  target_mentor_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  hide_pnl          boolean     NOT NULL DEFAULT false,
  show_setup_only   boolean     NOT NULL DEFAULT false,
  reveal_size       boolean     NOT NULL DEFAULT false,
  caption           text,
  global_post_id    uuid        REFERENCES public.global_posts(id) ON DELETE SET NULL,
  space_post_id     uuid        REFERENCES public.space_posts(id) ON DELETE SET NULL,
  review_id         uuid        REFERENCES public.space_trade_reviews(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  -- scope='global' requires room_id IS NULL; community/mentor require room_id IS NOT NULL
  CONSTRAINT trade_shares_scope_room_ck CHECK (
    (scope = 'global' AND room_id IS NULL)
    OR (scope IN ('community', 'mentor') AND room_id IS NOT NULL)
  )
);

COMMENT ON COLUMN public.trade_shares.target_mentor_id IS
  'For scope=''mentor'': the intended reviewer. Required by convention and enforced in the RPC; '
  'not a hard NOT NULL constraint to keep flexibility for multi-mentor rooms.';

CREATE INDEX IF NOT EXISTS idx_trade_shares_scope_created_at
  ON public.trade_shares (scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_shares_room_id
  ON public.trade_shares (room_id);

CREATE INDEX IF NOT EXISTS idx_trade_shares_author_id
  ON public.trade_shares (author_id);

CREATE INDEX IF NOT EXISTS idx_trade_shares_trade_id
  ON public.trade_shares (trade_id);

COMMENT ON TABLE public.trade_shares IS
  'Universal trade-publish ledger. One row per share event, linking a trade to its '
  'destination (global / community room / mentor review). Writes are SECURITY DEFINER only.';


-- 5. shared_notes
-- One living co-edited note per trade review. Updated in place; history
-- captured via the shared_note_revisions trigger (see below).

CREATE TABLE IF NOT EXISTS public.shared_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  uuid        NOT NULL UNIQUE REFERENCES public.space_trade_reviews(id) ON DELETE CASCADE,
  goal       text,
  body       text,
  updated_by uuid        REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shared_notes IS
  'One co-edited note per trade review. Body/goal edits are append-only via the revision trigger.';


-- 6. shared_note_revisions
-- Append-only history for shared_notes. Rows are inserted by the
-- tg_shared_notes_revision trigger on every body/goal change; never
-- written directly by application code.

CREATE TABLE IF NOT EXISTS public.shared_note_revisions (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id   uuid        NOT NULL REFERENCES public.shared_notes(id) ON DELETE CASCADE,
  body      text,
  goal      text,
  edited_by uuid        NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_note_revisions_note_created
  ON public.shared_note_revisions (note_id, created_at DESC);

COMMENT ON TABLE public.shared_note_revisions IS
  'Append-only revision history for shared_notes. Populated exclusively by the '
  'tg_shared_notes_revision trigger; never written directly.';


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: tg_shared_notes_revision
-- Fires AFTER UPDATE on shared_notes when body or goal changes.
-- Inserts a revision row capturing the NEW values and the editor identity.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_shared_notes_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only record a revision when body or goal actually changed.
  IF (NEW.body IS DISTINCT FROM OLD.body) OR (NEW.goal IS DISTINCT FROM OLD.goal) THEN
    INSERT INTO public.shared_note_revisions (note_id, body, goal, edited_by)
    VALUES (NEW.id, NEW.body, NEW.goal, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_shared_notes_revision ON public.shared_notes;
CREATE TRIGGER tg_shared_notes_revision
  AFTER UPDATE ON public.shared_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_shared_notes_revision();

COMMENT ON FUNCTION public.fn_shared_notes_revision() IS
  'Captures a revision row in shared_note_revisions whenever body or goal changes on shared_notes.';


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: updated_at maintenance for shared_notes
-- Follows the per-table trigger-function convention used in this codebase
-- (e.g. bt_set_updated_at, cron_heartbeat_set_updated_at).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.shared_notes_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shared_notes_updated_at ON public.shared_notes;
CREATE TRIGGER trg_shared_notes_updated_at
  BEFORE UPDATE ON public.shared_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.shared_notes_set_updated_at();

COMMENT ON FUNCTION public.shared_notes_set_updated_at() IS
  'Keeps shared_notes.updated_at current on every UPDATE.';


-- ─────────────────────────────────────────────────────────────────────────────
-- profiles: opt-in flags for global feed and leaderboard participation
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS global_feed_opt_in        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS global_leaderboard_opt_in boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.global_feed_opt_in IS
  'User has opted into appearing in and posting to the global community feed.';

COMMENT ON COLUMN public.profiles.global_leaderboard_opt_in IS
  'User has opted into the global performance leaderboard.';
