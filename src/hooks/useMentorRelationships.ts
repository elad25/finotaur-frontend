// src/hooks/useMentorRelationships.ts
// React Query hooks for the Mentor Mode feature.
//
// All data access goes through SECURITY DEFINER Postgres RPCs (never direct
// table reads), because profiles RLS prevents a student/mentor from reading the
// counterpart's profile row to resolve display_name/email:
//   - list_my_students()            -> mentor's accepted students
//   - list_my_mentors()             -> student's pending/accepted mentors
//   - list_pending_mentor_requests()-> mentor's incoming pending requests
//   - request_mentor_by_email(p_email)
//   - respond_to_mentor_request(p_relationship_id, p_accept)
//   - revoke_mentor_relationship(p_relationship_id)
//
// Authorization is enforced server-side by RLS + is_accepted_mentor_of(). These
// hooks use the normal RLS-protected `supabase` client — NEVER supabaseAdmin.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ================================================
// TYPES
// ================================================

export type MentorRelationshipStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface StudentLink {
  relationship_id: string;
  student_id: string;
  display_name: string;
  email: string;
  accepted_at: string;
}

export interface MentorLink {
  relationship_id: string;
  mentor_id: string;
  display_name: string;
  email: string;
  status: MentorRelationshipStatus;
  created_at: string;
}

export interface PendingRequest {
  relationship_id: string;
  student_id: string;
  display_name: string;
  email: string;
  created_at: string;
}

// ================================================
// ERROR MAPPING
// ================================================

/** Maps a Postgres/Supabase RPC error to a user-facing English message. */
export function mapMentorError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('mentor_not_found')) return 'No FINOTAUR account found with that email.';
  if (message.includes('cannot_mentor_self')) return "You can't add yourself as a mentor.";
  if (message.includes('request_already_exists'))
    return 'You already have a pending or active request with this mentor.';
  if (message.includes('request_not_actionable')) return 'This request is no longer pending.';
  if (message.includes('relationship_not_actionable')) return 'This relationship is no longer active.';
  if (message.includes('not authenticated')) return 'Your session expired. Please sign in again.';
  return 'Something went wrong. Please try again.';
}

// ================================================
// QUERY KEYS
// ================================================

const keys = {
  myStudents: ['mentor', 'myStudents'] as const,
  myMentors: ['mentor', 'myMentors'] as const,
  pendingRequests: ['mentor', 'pendingRequests'] as const,
};

// ================================================
// QUERIES
// ================================================

export function useMyStudents(): { students: StudentLink[]; isLoading: boolean; error: Error | null } {
  const { data = [], isLoading, error } = useQuery<StudentLink[], Error>({
    queryKey: keys.myStudents,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_students');
      if (error) throw error;
      return (data ?? []) as StudentLink[];
    },
  });
  return { students: data, isLoading, error };
}

export function useMyMentors(): { mentors: MentorLink[]; isLoading: boolean; error: Error | null } {
  const { data = [], isLoading, error } = useQuery<MentorLink[], Error>({
    queryKey: keys.myMentors,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_mentors');
      if (error) throw error;
      return (data ?? []) as MentorLink[];
    },
  });
  return { mentors: data, isLoading, error };
}

export function usePendingMentorRequests(): {
  requests: PendingRequest[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data = [], isLoading, error } = useQuery<PendingRequest[], Error>({
    queryKey: keys.pendingRequests,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_pending_mentor_requests');
      if (error) throw error;
      return (data ?? []) as PendingRequest[];
    },
  });
  return { requests: data, isLoading, error };
}

// ================================================
// MUTATIONS
// ================================================

/** Student sends a request to a mentor by email. */
export function useRequestMentor() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (email: string) => {
      const { error } = await supabase.rpc('request_mentor_by_email', { p_email: email });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myMentors });
    },
  });
}

/** Mentor accepts or declines a pending request. */
export function useRespondToMentorRequest() {
  const qc = useQueryClient();
  return useMutation<void, Error, { relationshipId: string; accept: boolean }>({
    mutationFn: async ({ relationshipId, accept }) => {
      const { error } = await supabase.rpc('respond_to_mentor_request', {
        p_relationship_id: relationshipId,
        p_accept: accept,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.pendingRequests });
      qc.invalidateQueries({ queryKey: keys.myStudents });
    },
  });
}

/** Either party revokes a pending/accepted relationship. */
export function useRevokeRelationship() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (relationshipId: string) => {
      const { error } = await supabase.rpc('revoke_mentor_relationship', {
        p_relationship_id: relationshipId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myMentors });
      qc.invalidateQueries({ queryKey: keys.myStudents });
      qc.invalidateQueries({ queryKey: keys.pendingRequests });
    },
  });
}
