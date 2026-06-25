// src/hooks/useSharedNote.ts
// TanStack Query hooks for the shared mentor note on a 1:1 trade review,
// with a Supabase Realtime subscription that triggers a refetch when the
// note is updated by either party.
//
// RPCs:
//   - get_shared_note(p_review)                       → SharedNote row (single)
//   - update_shared_note(p_review, p_goal, p_body)    → updated SharedNote row
//   - list_note_revisions(p_review, p_limit)          → NoteRevision[]
//
// Realtime: subscribes to UPDATE events on shared_notes filtered by review_id.
// On event arrival the query is invalidated so React Query refetches the
// authoritative server row (mirrors the pattern in useSpaceMessages.ts).

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import type { SharedNote, NoteRevision } from '@/types/community';

// ================================================
// QUERY KEYS
// ================================================

const keys = {
  note: (reviewId: string) => ['shared-note', reviewId] as const,
  revisions: (reviewId: string, limit: number) =>
    ['shared-note', 'revisions', reviewId, limit] as const,
};

// ================================================
// QUERIES + REALTIME
// ================================================

/**
 * Fetches the shared note for a review and subscribes to realtime UPDATE
 * events so both parties (mentor + student) see edits immediately.
 */
export function useSharedNote(reviewId?: string): {
  note: SharedNote | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const qc = useQueryClient();

  const {
    data = null,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SharedNote | null, Error>({
    queryKey: keys.note(reviewId ?? ''),
    enabled: !!reviewId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shared_note', {
        p_review: reviewId,
      });
      if (error) throw error;
      // RPC returns a single composite row (not an array).
      return (data ?? null) as SharedNote | null;
    },
  });

  // ------------------------------------------------------------------
  // Realtime: invalidate on UPDATE so both parties get the latest note.
  // Pattern mirrors useSpaceMessages.ts — invalidate rather than merge
  // because UPDATE payloads lack the joined `updated_by` profile data.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!reviewId) return;

    const channel = supabase
      .channel(`shared-note:${reviewId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shared_notes',
          filter: `review_id=eq.${reviewId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: keys.note(reviewId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reviewId, qc]);

  return { note: data, isLoading, isError, error, refetch };
}

const REVISIONS_DEFAULT_LIMIT = 20;

/** Fetches the revision history for a shared note. */
export function useNoteRevisions(
  reviewId?: string,
  limit: number = REVISIONS_DEFAULT_LIMIT,
): {
  revisions: NoteRevision[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<NoteRevision[], Error>({
    queryKey: keys.revisions(reviewId ?? '', limit),
    enabled: !!reviewId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_note_revisions', {
        p_review: reviewId,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as NoteRevision[];
    },
  });

  return { revisions: data, isLoading, isError, error, refetch };
}

// ================================================
// MUTATIONS
// ================================================

interface UpdateSharedNoteInput {
  reviewId: string;
  goal: string;
  body: string;
}

/**
 * Updates the shared note for a review. On success, the query cache is
 * updated optimistically via invalidation so the local editor reflects
 * the server-authoritative response. The realtime subscription on the
 * other party's instance will also fire and trigger their refetch.
 */
export function useUpdateSharedNote() {
  const qc = useQueryClient();
  return useMutation<SharedNote, Error, UpdateSharedNoteInput>({
    mutationFn: async ({ reviewId, goal, body }) => {
      const { data, error } = await supabase.rpc('update_shared_note', {
        p_review: reviewId,
        p_goal: goal,
        p_body: body,
      });
      if (error) throw new Error(mapSpaceError(error));
      return data as SharedNote;
    },
    onSuccess: (_data, { reviewId }) => {
      qc.invalidateQueries({ queryKey: keys.note(reviewId) });
      // Revision list grows after each save — invalidate so it stays fresh.
      qc.invalidateQueries({
        queryKey: ['shared-note', 'revisions', reviewId],
        exact: false,
      });
    },
  });
}
