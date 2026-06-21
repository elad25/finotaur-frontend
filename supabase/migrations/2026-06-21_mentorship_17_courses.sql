-- Courses + Resources engine.
-- Room managers publish structured courses (with ordered lessons) and
-- standalone resources. All active members can read via RLS SELECT policies;
-- all mutations are channelled through SECURITY DEFINER RPCs.

-- ============================================================
-- TABLES
-- ============================================================

-- space_courses: top-level course container owned by a space.
CREATE TABLE IF NOT EXISTS public.space_courses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    uuid        NOT NULL
                          REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  position    int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

ALTER TABLE public.space_courses ENABLE ROW LEVEL SECURITY;

-- Ordered listing index: manager sets position; created_at breaks ties.
CREATE INDEX IF NOT EXISTS space_courses_space_position_idx
  ON public.space_courses (space_id, position);

-- Members may read non-deleted courses for spaces they belong to.
CREATE POLICY space_courses_select ON public.space_courses
  FOR SELECT
  TO authenticated
  USING (public.is_space_member(space_id));

COMMENT ON TABLE public.space_courses IS
  'Ordered courses within a mentor space. Soft-deleted via deleted_at.';


-- space_lessons: individual lessons belonging to a course.
-- space_id is denormalized here to allow a direct is_space_member() check
-- on the RLS policy without an extra join through space_courses.
CREATE TABLE IF NOT EXISTS public.space_lessons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid        NOT NULL
                          REFERENCES public.space_courses(id) ON DELETE CASCADE,
  space_id    uuid        NOT NULL
                          REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  video_url   text,
  content     text,
  position    int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

ALTER TABLE public.space_lessons ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS space_lessons_course_position_idx
  ON public.space_lessons (course_id, position);

-- Members may read non-deleted lessons for spaces they belong to.
CREATE POLICY space_lessons_select ON public.space_lessons
  FOR SELECT
  TO authenticated
  USING (public.is_space_member(space_id));

COMMENT ON TABLE public.space_lessons IS
  'Ordered lessons within a space_course. Soft-deleted via deleted_at.';


-- space_resources: standalone links, files, or playbooks attached to a space.
CREATE TABLE IF NOT EXISTS public.space_resources (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    uuid        NOT NULL
                          REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  url         text        NOT NULL,
  kind        text        NOT NULL DEFAULT 'link'
                          CHECK (kind IN ('link', 'file', 'playbook')),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

ALTER TABLE public.space_resources ENABLE ROW LEVEL SECURITY;

-- Most-recent-first listing index.
CREATE INDEX IF NOT EXISTS space_resources_space_created_idx
  ON public.space_resources (space_id, created_at DESC);

-- Members may read non-deleted resources for spaces they belong to.
CREATE POLICY space_resources_select ON public.space_resources
  FOR SELECT
  TO authenticated
  USING (public.is_space_member(space_id));

COMMENT ON TABLE public.space_resources IS
  'Standalone resources (links, files, playbooks) attached to a mentor space. Soft-deleted via deleted_at.';


-- ============================================================
-- RPCs
-- ============================================================

-- create_course -------------------------------------------------------
-- Creates a new course in a space. Caller must be owner or co_mentor.
CREATE OR REPLACE FUNCTION public.create_course(
  p_space       uuid,
  p_title       text,
  p_description text DEFAULT NULL
)
RETURNS public.space_courses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course public.space_courses;
BEGIN
  IF NOT public.is_space_manager(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  INSERT INTO public.space_courses (space_id, title, description)
  VALUES (p_space, p_title, p_description)
  RETURNING * INTO v_course;

  RETURN v_course;
END;
$$;

REVOKE ALL ON FUNCTION public.create_course(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_course(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_course(uuid, text, text) IS
  'Creates a course in a mentor space. Requires owner or co_mentor role (manager-gated).';


-- add_lesson ----------------------------------------------------------
-- Appends a lesson to an existing course. Caller must be a manager of the
-- parent space, resolved from the course row.
CREATE OR REPLACE FUNCTION public.add_lesson(
  p_course    uuid,
  p_title     text,
  p_video_url text DEFAULT NULL,
  p_content   text DEFAULT NULL
)
RETURNS public.space_lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id  uuid;
  v_lesson    public.space_lessons;
BEGIN
  -- Resolve the parent space from the course row.
  SELECT space_id INTO v_space_id
  FROM public.space_courses
  WHERE id = p_course;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION 'course_not_found' USING errcode = 'P0002';
  END IF;

  IF NOT public.is_space_manager(v_space_id) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  INSERT INTO public.space_lessons (course_id, space_id, title, video_url, content)
  VALUES (p_course, v_space_id, p_title, p_video_url, p_content)
  RETURNING * INTO v_lesson;

  RETURN v_lesson;
END;
$$;

REVOKE ALL ON FUNCTION public.add_lesson(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_lesson(uuid, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.add_lesson(uuid, text, text, text) IS
  'Adds a lesson to a course. Resolves parent space and requires owner or co_mentor role (manager-gated).';


-- list_courses --------------------------------------------------------
-- Returns non-deleted courses for a space, with a lesson count.
-- Caller must be an active space member.
CREATE OR REPLACE FUNCTION public.list_courses(p_space uuid)
RETURNS TABLE (
  id           uuid,
  title        text,
  description  text,
  position     int,
  lesson_count int,
  created_at   timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.description,
    c.position,
    (
      SELECT COUNT(*)::int
      FROM public.space_lessons l
      WHERE l.course_id  = c.id
        AND l.deleted_at IS NULL
    ) AS lesson_count,
    c.created_at
  FROM public.space_courses c
  WHERE c.space_id   = p_space
    AND c.deleted_at IS NULL
  ORDER BY c.position ASC, c.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_courses(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_courses(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_courses(uuid) IS
  'Returns non-deleted courses for a space with lesson counts. Requires active space membership.';


-- list_lessons --------------------------------------------------------
-- Returns non-deleted lessons for a course, ordered by position then created_at.
-- Caller must be an active member of the parent space.
CREATE OR REPLACE FUNCTION public.list_lessons(p_course uuid)
RETURNS SETOF public.space_lessons
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
BEGIN
  SELECT space_id INTO v_space_id
  FROM public.space_courses
  WHERE id = p_course;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION 'course_not_found' USING errcode = 'P0002';
  END IF;

  IF NOT public.is_space_member(v_space_id) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.space_lessons
  WHERE course_id  = p_course
    AND deleted_at IS NULL
  ORDER BY position ASC, created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_lessons(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_lessons(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_lessons(uuid) IS
  'Returns non-deleted lessons for a course. Resolves parent space and requires active membership.';


-- create_resource -----------------------------------------------------
-- Creates a standalone resource in a space. Caller must be a manager.
-- Invalid kind values silently fall back to ''link''.
CREATE OR REPLACE FUNCTION public.create_resource(
  p_space       uuid,
  p_title       text,
  p_url         text,
  p_kind        text DEFAULT 'link',
  p_description text DEFAULT NULL
)
RETURNS public.space_resources
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind     text;
  v_resource public.space_resources;
BEGIN
  IF NOT public.is_space_manager(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Normalise kind: unknown values default to 'link'.
  v_kind := CASE
    WHEN p_kind IN ('link', 'file', 'playbook') THEN p_kind
    ELSE 'link'
  END;

  INSERT INTO public.space_resources (space_id, title, url, kind, description)
  VALUES (p_space, p_title, p_url, v_kind, p_description)
  RETURNING * INTO v_resource;

  RETURN v_resource;
END;
$$;

REVOKE ALL ON FUNCTION public.create_resource(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_resource(uuid, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_resource(uuid, text, text, text, text) IS
  'Creates a resource in a mentor space. Requires owner or co_mentor role (manager-gated). Invalid kind defaults to ''link''.';


-- list_resources ------------------------------------------------------
-- Returns non-deleted resources for a space, newest first.
-- Caller must be an active space member.
CREATE OR REPLACE FUNCTION public.list_resources(p_space uuid)
RETURNS SETOF public.space_resources
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.space_resources
  WHERE space_id  = p_space
    AND deleted_at IS NULL
  ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_resources(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_resources(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_resources(uuid) IS
  'Returns non-deleted resources for a space, newest first. Requires active space membership.';


-- delete_course -------------------------------------------------------
-- Soft-deletes a course (and implicitly hides its lessons via deleted_at
-- filter in list_lessons). Caller must be a manager of the parent space.
CREATE OR REPLACE FUNCTION public.delete_course(p_course uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
BEGIN
  SELECT space_id INTO v_space_id
  FROM public.space_courses
  WHERE id = p_course;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION 'course_not_found' USING errcode = 'P0002';
  END IF;

  IF NOT public.is_space_manager(v_space_id) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  UPDATE public.space_courses
  SET deleted_at = now()
  WHERE id = p_course;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_course(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_course(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_course(uuid) IS
  'Soft-deletes a course. Resolves parent space and requires owner or co_mentor role (manager-gated).';


-- delete_resource -----------------------------------------------------
-- Soft-deletes a standalone resource.
-- Caller must be a manager of the parent space.
CREATE OR REPLACE FUNCTION public.delete_resource(p_resource uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
BEGIN
  SELECT space_id INTO v_space_id
  FROM public.space_resources
  WHERE id = p_resource;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION 'resource_not_found' USING errcode = 'P0002';
  END IF;

  IF NOT public.is_space_manager(v_space_id) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  UPDATE public.space_resources
  SET deleted_at = now()
  WHERE id = p_resource;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_resource(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_resource(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_resource(uuid) IS
  'Soft-deletes a space resource. Resolves parent space and requires owner or co_mentor role (manager-gated).';
