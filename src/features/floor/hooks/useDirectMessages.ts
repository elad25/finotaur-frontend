// src/hooks/useDirectMessages.ts
// Hooks for global 1:1 direct messaging (dm_conversations / dm_messages / dm_requests).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_username: string;
  other_avatar: string | null;
  last_body: string | null;
  last_at: string;
  unread: number;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface DmRequest {
  request_id: string;
  from_user: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface FloorUserResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

// ── Conversations ──────────────────────────────────────────────────────────────

export function useMyConversations() {
  const qc = useQueryClient();
  const { data = [], isLoading, isError, error, refetch } = useQuery<Conversation[], Error>({
    queryKey: ['dm-conversations'],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_conversations');
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

  // Realtime: refresh conversation list when any dm_request changes
  useEffect(() => {
    const channel = supabase
      .channel('dm-requests-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'dm_requests' },
        () => {
          qc.invalidateQueries({ queryKey: ['dm-requests'] });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return { conversations: data, isLoading, isError, error, refetch };
}

// ── Messages ───────────────────────────────────────────────────────────────────

export function useDirectMessages(conversationId?: string) {
  const qc = useQueryClient();
  const { data = [], isLoading, isError, error, refetch } = useQuery<DirectMessage[], Error>({
    queryKey: ['dm-messages', conversationId ?? ''],
    enabled: !!conversationId,
    staleTime: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_direct_messages', {
        p_conversation: conversationId,
        p_limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as DirectMessage[];
    },
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
          qc.invalidateQueries({ queryKey: ['dm-conversations'] });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  return { messages: data, isLoading, isError, error, refetch };
}

// ── Send message ───────────────────────────────────────────────────────────────

export function useSendDirectMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      const { data, error } = await supabase.rpc('send_direct_message', {
        p_conversation: conversationId,
        p_body: body,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['dm-messages', v.conversationId] });
      qc.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });
}

// ── Open conversation (after acceptance) ──────────────────────────────────────

export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc('open_direct_conversation', { p_other: otherUserId });
      if (error) throw error;
      return data as string | null;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dm-conversations'] }),
  });
}

// ── Mark as read ───────────────────────────────────────────────────────────────

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc('mark_conversation_read', { p_conversation: conversationId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dm-conversations'] }),
  });
}

// ── DM Requests ───────────────────────────────────────────────────────────────

export function useDmRequests() {
  const { data = [], isLoading, refetch } = useQuery<DmRequest[], Error>({
    queryKey: ['dm-requests'],
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_dm_requests');
      if (error) throw error;
      return (data ?? []) as DmRequest[];
    },
  });
  return { requests: data, isLoading, refetch };
}

export function useSendDmRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (toUserId: string) => {
      const { error } = await supabase.rpc('send_dm_request', { p_to: toUserId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dm-conversations'] }),
  });
}

export function useAcceptDmRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc('accept_dm_request', { p_request_id: requestId });
      if (error) throw error;
      return data as string; // conversation_id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dm-requests'] });
      qc.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });
}

export function useDeclineDmRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('decline_dm_request', { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dm-requests'] }),
  });
}

// ── Search users ───────────────────────────────────────────────────────────────

export function useSearchFloorUsers(query: string) {
  const { data = [], isLoading } = useQuery<FloorUserResult[], Error>({
    queryKey: ['floor-user-search', query],
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_floor_users', { p_query: query.trim() });
      if (error) throw error;
      return (data ?? []) as FloorUserResult[];
    },
  });
  return { results: data, isLoading };
}
