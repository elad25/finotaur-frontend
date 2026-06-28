// src/hooks/useSpaceFeed.ts
// TanStack Query hooks for the Community Feed (posts, comments, reactions).
//
// All data access goes through SECURITY DEFINER Postgres RPCs:
//   - create_post(p_space, p_body, p_trade_id?)
//   - list_posts(p_space, p_before?, p_limit?)
//   - delete_post(p_post)
//   - add_comment(p_post, p_body)
//   - list_comments(p_post, p_limit?)
//   - toggle_reaction(p_post, p_emoji)
//
// Types are defined inline here — do NOT import from src/types/mentorship.ts.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import type { ReactionAggregate } from '@/constants/feedReactions';

// ================================================
// INLINE TYPES (do not re-export via src/types/mentorship.ts)
// ================================================

export interface FeedPost {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  attached_trade_id: string | null;
  trade_symbol: string | null;
  trade_side: string | null;
  trade_pnl: number | null;
  trade_close_at: string | null;
  pinned: boolean;
  created_at: string;
  comment_count: number;
  reaction_count: number;
  reactions: ReactionAggregate[];
  my_reaction: string | null;
}

export interface FeedComment {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface RecentClosedTrade {
  id: string;
  symbol: string;
  side: string;
  pnl: number | null;
  close_at: string;
}

// ================================================
// QUERY KEYS
// ================================================

const feedKeys = {
  feed: (spaceId: string) => ['feed', 'list', spaceId] as const,
  comments: (postId: string) => ['feed', 'comments', postId] as const,
  recentTrades: (userId: string) => ['feed', 'recentTrades', userId] as const,
};

// ================================================
// QUERIES
// ================================================

/** Lists posts in a space. Ordered by pinned desc, created_at desc. */
export function useSpaceFeed(spaceId?: string): {
  posts: FeedPost[];
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
  } = useQuery<FeedPost[], Error>({
    queryKey: feedKeys.feed(spaceId ?? ''),
    enabled: !!spaceId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_posts', {
        p_space: spaceId,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        ...row,
        reactions: (row.reactions as ReactionAggregate[]) ?? [],
        my_reaction: (row.my_reaction as string | null) ?? null,
      })) as FeedPost[];
    },
  });

  return { posts: data, isLoading, isError, error, refetch };
}

/** Lists comments for a single post. */
export function usePostComments(postId?: string): {
  comments: FeedComment[];
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
  } = useQuery<FeedComment[], Error>({
    queryKey: feedKeys.comments(postId ?? ''),
    enabled: !!postId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_comments', {
        p_post: postId,
      });
      if (error) throw error;
      return (data ?? []) as FeedComment[];
    },
  });

  return { comments: data, isLoading, isError, error, refetch };
}

/** Recent closed trades for the current user — used to attach a trade to a post. */
export function useMyRecentClosedTrades(): {
  trades: RecentClosedTrade[];
  isLoading: boolean;
} {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data = [], isLoading } = useQuery<RecentClosedTrade[], Error>({
    queryKey: feedKeys.recentTrades(userId),
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id,symbol,side,pnl,close_at')
        .eq('user_id', userId)
        .not('close_at', 'is', null)
        .is('deleted_at', null)
        .order('close_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as RecentClosedTrade[];
    },
  });

  return { trades: data, isLoading };
}

// ================================================
// MUTATIONS
// ================================================

interface CreatePostInput {
  spaceId: string;
  body: string;
  tradeId?: string;
}

/** Creates a new post in a space and invalidates the feed. */
export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation<FeedPost, Error, CreatePostInput>({
    mutationFn: async ({ spaceId, body, tradeId }) => {
      const { data, error } = await supabase.rpc('create_post', {
        p_space: spaceId,
        p_body: body,
        p_trade_id: tradeId ?? null,
      });
      if (error) throw new Error(mapSpaceError(error));
      return data as FeedPost;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: feedKeys.feed(spaceId) });
    },
  });
}

interface DeletePostInput {
  postId: string;
  spaceId: string;
}

/** Deletes a post (author or manager). Invalidates the feed. */
export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeletePostInput>({
    mutationFn: async ({ postId }) => {
      const { error } = await supabase.rpc('delete_post', { p_post: postId });
      if (error) throw new Error(mapSpaceError(error));
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: feedKeys.feed(spaceId) });
    },
  });
}

interface AddCommentInput {
  postId: string;
  spaceId: string;
  body: string;
}

/** Adds a comment to a post. Invalidates that post's comments + the feed (for comment_count). */
export function useAddComment() {
  const qc = useQueryClient();
  return useMutation<FeedComment, Error, AddCommentInput>({
    mutationFn: async ({ postId, body }) => {
      const { data, error } = await supabase.rpc('add_comment', {
        p_post: postId,
        p_body: body,
      });
      if (error) throw new Error(mapSpaceError(error));
      return data as FeedComment;
    },
    onSuccess: (_data, { postId, spaceId }) => {
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: feedKeys.feed(spaceId) });
    },
  });
}

interface ToggleReactionInput {
  postId: string;
  spaceId: string;
  emoji: string;
}

/** Toggles a reaction emoji on a post. Invalidates the feed. */
export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation<boolean, Error, ToggleReactionInput>({
    mutationFn: async ({ postId, emoji }) => {
      const { data, error } = await supabase.rpc('toggle_reaction', {
        p_post: postId,
        p_emoji: emoji,
      });
      if (error) throw new Error(mapSpaceError(error));
      return data as boolean;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: feedKeys.feed(spaceId) });
    },
  });
}
