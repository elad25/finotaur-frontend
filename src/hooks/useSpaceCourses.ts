// src/hooks/useSpaceCourses.ts
// React Query hooks for the Courses + Resources section of a Mentor Space.
//
// All RPCs are SECURITY DEFINER so callers never touch the tables directly.
// Conventions match useMentorshipSpaces.ts:
//   - staleTime 30_000
//   - enabled: !!spaceId / !!courseId
//   - RETURNS <type> → Supabase returns a single object (not array); cast directly.
//   - RETURNS TABLE   → cast to array with ?? [].

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Mirrors the list_courses() RPC return shape. */
export interface RoomCourse {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lesson_count: number;
  created_at: string;
}

/** Mirrors the list_lessons() RPC return shape (space_lessons rows). */
export interface RoomLesson {
  id: string;
  course_id: string;
  space_id: string;
  title: string;
  video_url: string | null;
  content: string | null;
  position: number;
  created_at: string;
}

/** Mirrors the list_resources() RPC return shape (space_resources rows). */
export interface RoomResource {
  id: string;
  space_id: string;
  title: string;
  url: string;
  kind: string | null;
  description: string | null;
  created_at: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

const courseKeys = {
  courses: (spaceId: string) => ['spaces', 'courses', spaceId] as const,
  lessons: (courseId: string) => ['spaces', 'lessons', courseId] as const,
  resources: (spaceId: string) => ['spaces', 'resources', spaceId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/** List all courses in a space, ordered by position. */
export function useRoomCourses(spaceId?: string): {
  courses: RoomCourse[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data = [], isLoading, isError, error, refetch } = useQuery<RoomCourse[], Error>({
    queryKey: courseKeys.courses(spaceId ?? ''),
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_courses', { p_space: spaceId });
      if (error) throw error;
      return (data ?? []) as RoomCourse[];
    },
  });
  return { courses: data, isLoading, isError, error, refetch };
}

/** List all lessons in a course, ordered by position. */
export function useRoomLessons(courseId?: string): {
  lessons: RoomLesson[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data = [], isLoading, isError, error, refetch } = useQuery<RoomLesson[], Error>({
    queryKey: courseKeys.lessons(courseId ?? ''),
    enabled: !!courseId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_lessons', { p_course: courseId });
      if (error) throw error;
      return (data ?? []) as RoomLesson[];
    },
  });
  return { lessons: data, isLoading, isError, error, refetch };
}

/** List all resources in a space. */
export function useRoomResources(spaceId?: string): {
  resources: RoomResource[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data = [], isLoading, isError, error, refetch } = useQuery<RoomResource[], Error>({
    queryKey: courseKeys.resources(spaceId ?? ''),
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_resources', { p_space: spaceId });
      if (error) throw error;
      return (data ?? []) as RoomResource[];
    },
  });
  return { resources: data, isLoading, isError, error, refetch };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

interface CreateCourseInput {
  spaceId: string;
  title: string;
  description?: string;
}

/** Manager creates a new course inside a space. */
export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation<RoomCourse, Error, CreateCourseInput>({
    mutationFn: async ({ spaceId, title, description }) => {
      const { data, error } = await supabase.rpc('create_course', {
        p_space: spaceId,
        p_title: title,
        p_description: description ?? null,
      });
      if (error) throw error;
      // create_course RETURNS course (composite row) — Supabase returns an object, not array.
      return data as RoomCourse;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: courseKeys.courses(spaceId) });
    },
  });
}

interface AddLessonInput {
  courseId: string;
  /** Used to invalidate the parent courses list (lesson_count updates). */
  spaceId: string;
  title: string;
  videoUrl?: string;
  content?: string;
}

/** Manager adds a lesson to an existing course. */
export function useAddLesson() {
  const qc = useQueryClient();
  return useMutation<RoomLesson, Error, AddLessonInput>({
    mutationFn: async ({ courseId, title, videoUrl, content }) => {
      const { data, error } = await supabase.rpc('add_lesson', {
        p_course: courseId,
        p_title: title,
        p_video_url: videoUrl ?? null,
        p_content: content ?? null,
      });
      if (error) throw error;
      // add_lesson RETURNS lesson (composite row) — Supabase returns an object, not array.
      return data as RoomLesson;
    },
    onSuccess: (_data, { courseId, spaceId }) => {
      // Invalidate lesson list for this course AND the course list (lesson_count changes).
      qc.invalidateQueries({ queryKey: courseKeys.lessons(courseId) });
      qc.invalidateQueries({ queryKey: courseKeys.courses(spaceId) });
    },
  });
}

interface CreateResourceInput {
  spaceId: string;
  title: string;
  url: string;
  kind?: string;
  description?: string;
}

/** Manager creates a resource link in a space. */
export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation<RoomResource, Error, CreateResourceInput>({
    mutationFn: async ({ spaceId, title, url, kind, description }) => {
      const { data, error } = await supabase.rpc('create_resource', {
        p_space: spaceId,
        p_title: title,
        p_url: url,
        p_kind: kind ?? null,
        p_description: description ?? null,
      });
      if (error) throw error;
      // create_resource RETURNS resource (composite row) — object, not array.
      return data as RoomResource;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: courseKeys.resources(spaceId) });
    },
  });
}

interface DeleteCourseInput {
  courseId: string;
  spaceId: string;
}

/** Manager deletes a course (and its lessons, by DB cascade). */
export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteCourseInput>({
    mutationFn: async ({ courseId }) => {
      const { error } = await supabase.rpc('delete_course', { p_course: courseId });
      if (error) throw error;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: courseKeys.courses(spaceId) });
    },
  });
}

interface DeleteResourceInput {
  resourceId: string;
  spaceId: string;
}

/** Manager deletes a resource. */
export function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteResourceInput>({
    mutationFn: async ({ resourceId }) => {
      const { error } = await supabase.rpc('delete_resource', { p_resource: resourceId });
      if (error) throw error;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: courseKeys.resources(spaceId) });
    },
  });
}
