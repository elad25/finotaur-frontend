// src/hooks/useMentorshipSpaces.ts
// React Query hooks for Mentor Space CRUD operations.
//
// All data access goes through SECURITY DEFINER Postgres RPCs (never direct
// table reads), so that RLS on mentor_spaces / space_members does not block
// legitimate cross-user lookups:
//   - list_my_spaces()              -> spaces where the caller is a member
//   - get_space(p_space)            -> full detail for one space
//   - list_space_channels(p_space)  -> channels the caller can see
//   - list_space_members(p_space)   -> member roster
//   - create_mentor_space(...)      -> owner creates a new space
//   - update_mentor_space(...)      -> owner/co_mentor edits metadata
//   - create_space_invite(...)      -> owner/co_mentor mints an invite link
//   - accept_space_invite(p_token)  -> caller joins via invite token
//   - remove_space_member(...)      -> owner/co_mentor removes a member
//   - set_journal_sharing(...)      -> student toggles journal visibility
//   - open_dm_channel(...)          -> ensures a DM channel exists, returns it

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  SpaceListItem,
  SpaceDetail,
  SpaceChannel,
  SpaceMember,
  SpaceInvite,
  SpaceRole,
} from '@/types/mentorship';

// ================================================
// ERROR MAPPING
// ================================================

/** Maps a Postgres/Supabase RPC error to a user-facing English message. */
export function mapSpaceError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('not_premium'))
    return 'A Premium (FINOTAUR) plan is required to create a Room.';
  if (message.includes('slug_taken')) return 'That space URL is already taken.';
  if (message.includes('access_denied')) return 'You do not have access to do that.';
  if (message.includes('invite_not_found')) return 'Invite not found.';
  if (message.includes('invite_used')) return 'This invite has already been used.';
  if (message.includes('invite_expired')) return 'This invite has expired.';
  if (message.includes('not_authorized_announcement'))
    return 'Only mentors can post announcements.';
  if (message.includes('cannot_remove_owner')) return "You can't remove the space owner.";
  if (message.includes('empty_message')) return 'Message cannot be empty.';
  return 'Something went wrong. Please try again.';
}

// ================================================
// QUERY KEYS
// ================================================

const keys = {
  mySpaces: ['spaces', 'mySpaces'] as const,
  space: (spaceId: string) => ['spaces', 'detail', spaceId] as const,
  channels: (spaceId: string) => ['spaces', 'channels', spaceId] as const,
  members: (spaceId: string) => ['spaces', 'members', spaceId] as const,
};

// ================================================
// QUERIES
// ================================================

export function useMySpaces(): {
  spaces: SpaceListItem[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data = [], isLoading, error } = useQuery<SpaceListItem[], Error>({
    queryKey: keys.mySpaces,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_spaces');
      if (error) throw error;
      return (data ?? []) as SpaceListItem[];
    },
  });
  return { spaces: data, isLoading, error };
}

export function useSpace(spaceId?: string): {
  space: SpaceDetail | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery<SpaceDetail | undefined, Error>({
    queryKey: keys.space(spaceId ?? ''),
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_space', { p_space: spaceId });
      if (error) throw error;
      // RPC wraps a single row in an array
      return ((data ?? []) as SpaceDetail[])[0];
    },
  });
  return { space: data, isLoading, error };
}

export function useSpaceChannels(spaceId?: string): {
  channels: SpaceChannel[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data = [], isLoading, error } = useQuery<SpaceChannel[], Error>({
    queryKey: keys.channels(spaceId ?? ''),
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_space_channels', {
        p_space: spaceId,
      });
      if (error) throw error;
      return (data ?? []) as SpaceChannel[];
    },
  });
  return { channels: data, isLoading, error };
}

export function useSpaceMembers(spaceId?: string): {
  members: SpaceMember[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data = [], isLoading, error } = useQuery<SpaceMember[], Error>({
    queryKey: keys.members(spaceId ?? ''),
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_space_members', {
        p_space: spaceId,
      });
      if (error) throw error;
      return (data ?? []) as SpaceMember[];
    },
  });
  return { members: data, isLoading, error };
}

// ================================================
// MUTATIONS
// ================================================

interface CreateSpaceInput {
  name: string;
  slug: string;
  description?: string;
}

/** Owner creates a new mentor space. Requires a Premium (FINOTAUR) plan. */
export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation<void, Error, CreateSpaceInput>({
    mutationFn: async ({ name, slug, description }) => {
      const { error } = await supabase.rpc('create_mentor_space', {
        p_name: name,
        p_slug: slug,
        p_description: description ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mySpaces });
    },
  });
}

interface UpdateSpaceInput {
  spaceId: string;
  name?: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

/** Owner or co_mentor updates space metadata. */
export function useUpdateSpace() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateSpaceInput>({
    mutationFn: async ({ spaceId, name, description, avatarUrl, bannerUrl }) => {
      const { error } = await supabase.rpc('update_mentor_space', {
        p_space: spaceId,
        p_name: name ?? null,
        p_description: description ?? null,
        p_avatar_url: avatarUrl ?? null,
        p_banner_url: bannerUrl ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: keys.space(spaceId) });
      qc.invalidateQueries({ queryKey: keys.mySpaces });
    },
  });
}

interface CreateInviteInput {
  spaceId: string;
  email?: string;
  role?: SpaceRole;
}

/** Owner or co_mentor mints a new invite link (optionally email-locked). */
export function useCreateInvite() {
  return useMutation<SpaceInvite, Error, CreateInviteInput>({
    mutationFn: async ({ spaceId, email, role }) => {
      const { data, error } = await supabase.rpc('create_space_invite', {
        p_space: spaceId,
        p_email: email ?? null,
        p_role: role ?? null,
      });
      if (error) throw error;
      // create_space_invite RETURNS space_invites (composite row) -> Supabase
      // returns the object directly, not an array.
      return data as SpaceInvite;
    },
  });
}

/** Caller joins a space by redeeming a one-time invite token. */
export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (token: string) => {
      const { error } = await supabase.rpc('accept_space_invite', { p_token: token });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mySpaces });
    },
  });
}

interface RemoveMemberInput {
  spaceId: string;
  userId: string;
}

/** Owner or co_mentor removes a member from the space. */
export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation<void, Error, RemoveMemberInput>({
    mutationFn: async ({ spaceId, userId }) => {
      const { error } = await supabase.rpc('remove_space_member', {
        p_space: spaceId,
        p_user: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: keys.members(spaceId) });
    },
  });
}

interface SetJournalSharingInput {
  spaceId: string;
  shared: boolean;
}

/** Student toggles whether their journal trades are visible to their mentor. */
export function useSetJournalSharing() {
  const qc = useQueryClient();
  return useMutation<void, Error, SetJournalSharingInput>({
    mutationFn: async ({ spaceId, shared }) => {
      const { error } = await supabase.rpc('set_journal_sharing', {
        p_space: spaceId,
        p_shared: shared,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: keys.members(spaceId) });
      qc.invalidateQueries({ queryKey: keys.space(spaceId) });
    },
  });
}

interface OpenDmChannelInput {
  spaceId: string;
  userId: string;
}

/** Ensures a DM channel exists between the caller and another space member. */
export function useOpenDmChannel() {
  const qc = useQueryClient();
  return useMutation<SpaceChannel, Error, OpenDmChannelInput>({
    mutationFn: async ({ spaceId, userId }) => {
      const { data, error } = await supabase.rpc('open_dm_channel', {
        p_space: spaceId,
        p_user: userId,
      });
      if (error) throw error;
      // open_dm_channel RETURNS space_channels (composite row) -> object, not array.
      return data as SpaceChannel;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: keys.channels(spaceId) });
    },
  });
}
