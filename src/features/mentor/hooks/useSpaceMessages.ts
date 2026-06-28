// src/hooks/useSpaceMessages.ts
// React Query hook for space channel messages, with Supabase Realtime
// subscription that appends new rows to the query cache on INSERT so the
// channel feels live without polling.

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SpaceMessage } from '@/features/mentor/types/mentorship';

// ================================================
// QUERY KEYS
// ================================================

const keys = {
  messages: (channelId: string) => ['space-messages', channelId] as const,
};

// ================================================
// QUERIES + REALTIME
// ================================================

/**
 * Fetches the 50 most recent messages for a channel (oldest-first for display)
 * and subscribes to Supabase Realtime to append new INSERT events to the cache
 * without a full refetch.
 */
export function useSpaceMessages(channelId?: string): {
  messages: SpaceMessage[];
  isLoading: boolean;
  error: Error | null;
} {
  const qc = useQueryClient();

  const { data = [], isLoading, error } = useQuery<SpaceMessage[], Error>({
    queryKey: keys.messages(channelId ?? ''),
    enabled: !!channelId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_space_messages', {
        p_channel: channelId,
        p_limit: 50,
      });
      if (error) throw error;
      // RPC returns newest-first; reverse so the UI renders oldest at the top.
      return ((data ?? []) as SpaceMessage[]).slice().reverse();
    },
  });

  // ------------------------------------------------------------------
  // Realtime subscription: append INSERT events to the cached array so
  // senders and recipients see new messages instantly without refetching.
  // Also handles UPDATE events so pin changes propagate in real time.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!channelId) return;

    const realtimeChannel = supabase
      .channel(`space-messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'space_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const newMessage: SpaceMessage = {
            ...(payload.new as Omit<SpaceMessage, 'author_name'>),
            author_name: null,
          };
          qc.setQueryData<SpaceMessage[]>(
            keys.messages(channelId),
            (prev = []) =>
              prev.some((m) => m.id === newMessage.id)
                ? prev
                : [...prev, newMessage],
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'space_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updated = payload.new as SpaceMessage;
          qc.setQueryData<SpaceMessage[]>(
            keys.messages(channelId),
            (prev = []) =>
              prev.map((m) =>
                // Keep the already-resolved author_name; merge mutable fields (e.g. pinned).
                m.id === updated.id ? { ...m, ...updated, author_name: m.author_name } : m,
              ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [channelId, qc]);

  return { messages: data, isLoading, error };
}

// ================================================
// MUTATIONS
// ================================================

interface PostMessageInput {
  channelId: string;
  body: string;
}

/**
 * Posts a message to a channel. On success, invalidates the message list so
 * the sender gets the server-authoritative row (with author_name resolved).
 */
export function usePostMessage() {
  const qc = useQueryClient();
  return useMutation<void, Error, PostMessageInput>({
    mutationFn: async ({ channelId, body }) => {
      const { error } = await supabase.rpc('post_space_message', {
        p_channel: channelId,
        p_body: body,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { channelId }) => {
      qc.invalidateQueries({ queryKey: keys.messages(channelId) });
    },
  });
}

interface PinMessageInput {
  messageId: string;
  channelId: string;
  pinned: boolean;
}

/**
 * Pins or unpins a message (owner-only, enforced server-side by
 * pin_space_message). Invalidates the channel's message list on success so the
 * pinned flag is reflected; other clients see it via the realtime UPDATE handler.
 */
export function usePinMessage() {
  const qc = useQueryClient();
  return useMutation<void, Error, PinMessageInput>({
    mutationFn: async ({ messageId, pinned }) => {
      const { error } = await supabase.rpc('pin_space_message', {
        p_message: messageId,
        p_pinned: pinned,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { channelId }) => {
      qc.invalidateQueries({ queryKey: keys.messages(channelId) });
    },
  });
}
