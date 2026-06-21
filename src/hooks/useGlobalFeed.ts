// src/hooks/useGlobalFeed.ts
// TanStack Query hooks for the Global Community Feed (posts, comments, reactions).
//
// All data access goes through SECURITY DEFINER Postgres RPCs:
//   - list_global_feed(p_before?, p_limit?)
//   - create_global_post(p_body, p_trade_id?, p_hide_pnl?, p_show_setup_only?, p_reveal_size?)
//   - delete_global_post(p_post)
//   - add_global_comment(p_post, p_body)
//   - list_global_comments(p_post, p_limit?)
//   - toggle_global_reaction(p_post, p_kind)
//
// Pagination: cursor-based via p_before (ISO timestamp of the oldest item in
// the current page). Pass the created_at of the last visible item to load more.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mapSpaceError } from '@/hooks/useMentorshipSpaces';
import type { GlobalFeedItem, GlobalComment, SharePrivacy } from '@/types/community';

// ================================================
// QUERY KEYS
// ================================================

const feedKeys = {
  feed: () => ['global-feed', 'list'] as const,
  feedPage: (before: string | null) => ['global-feed', 'list', before] as const,
  comments: (postId: string) => ['global-feed', 'comments', postId] as const,
};

// ================================================
// QUERIES
// ================================================

const FEED_PAGE_SIZE = 20;

/**
 * Fetches one page of the global feed.
 *
 * @param before ISO timestamp cursor — pass null/undefined for the first page,
 *               or the `created_at` of the last item currently shown to load more.
 */
export function useGlobalFeed(before?: string | null): {
  posts: GlobalFeedItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const cursor = before ?? null;

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<GlobalFeedItem[], Error>({
    queryKey: feedKeys.feedPage(cursor),
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_global_feed', {
        p_before: cursor,
        p_limit: FEED_PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as GlobalFeedItem[];
    },
  });

  return { posts: data, isLoading, isError, error, refetch };
}

/** Lists comments for a single global post. */
export function useGlobalPostComments(postId?: string): {
  comments: GlobalComment[];
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
  } = useQuery<GlobalComment[], Error>({
    queryKey: feedKeys.comments(postId ?? ''),
    enabled: !!postId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_global_comments', {
        p_post: postId,
        p_limit: 50,
      });
      if (error) throw error;
      return (data ?? []) as GlobalComment[];
    },
  });

  return { comments: data, isLoading, isError, error, refetch };
}

// ================================================
// MUTATIONS
// ================================================

interface CreateGlobalPostInput {
  body: string;
  tradeId?: string;
  privacy?: Pick<SharePrivacy, 'hidePnl' | 'showSetupOnly' | 'revealSize'>;
}

/** Creates a new global community post. Invalidates the feed on success. */
export function useCreateGlobalPost() {
  const qc = useQueryClient();
  return useMutation<GlobalFeedItem, Error, CreateGlobalPostInput>({
    mutationFn: async ({ body, tradeId, privacy }) => {
      const { data, error } = await supabase.rpc('create_global_post', {
        p_body: body,
        p_trade_id: tradeId ?? null,
        p_hide_pnl: privacy?.hidePnl ?? false,
        p_show_setup_only: privacy?.showSetupOnly ?? false,
        p_reveal_size: privacy?.revealSize ?? false,
      });
      if (error) throw new Error(mapSpaceError(error));
      return data as GlobalFeedItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.feed() });
    },
  });
}

interface DeleteGlobalPostInput {
  postId: string;
}

/** Deletes a global post (author-only, enforced server-side). Invalidates the feed. */
export function useDeleteGlobalPost() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteGlobalPostInput>({
    mutationFn: async ({ postId }) => {
      const { error } = await supabase.rpc('delete_global_post', { p_post: postId });
      if (error) throw new Error(mapSpaceError(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.feed() });
    },
  });
}

interface AddGlobalCommentInput {
  postId: string;
  body: string;
}

/**
 * Adds a comment to a global post.
 * Invalidates both the comment list and the feed (to refresh comment_count).
 */
export function useAddGlobalComment() {
  const qc = useQueryClient();
  return useMutation<GlobalComment, Error, AddGlobalCommentInput>({
    mutationFn: async ({ postId, body }) => {
      const { data, error } = await supabase.rpc('add_global_comment', {
        p_post: postId,
        p_body: body,
      });
      if (error) throw new Error(mapSpaceError(error));
      return data as GlobalComment;
    },
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: feedKeys.feed() });
    },
  });
}

export type GlobalReactionKind = 'up' | 'down' | 'repost';

interface ToggleGlobalReactionInput {
  postId: string;
  kind: GlobalReactionKind;
}

/** Toggles an up/down/repost reaction on a global post. Invalidates the feed. */
export function useToggleGlobalReaction() {
  const qc = useQueryClient();
  return useMutation<void, Error, ToggleGlobalReactionInput>({
    mutationFn: async ({ postId, kind }) => {
      const { error } = await supabase.rpc('toggle_global_reaction', {
        p_post: postId,
        p_kind: kind,
      });
      if (error) throw new Error(mapSpaceError(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.feed() });
    },
  });
}
