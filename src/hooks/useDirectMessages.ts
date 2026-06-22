// src/hooks/useDirectMessages.ts
// Hooks for global 1:1 direct messaging (direct_conversations / direct_messages).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_name: string;
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

export function useMyConversations() {
  const { data = [], isLoading, isError, error, refetch } = useQuery<Conversation[], Error>({
    queryKey: ['dm-conversations'],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_conversations');
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });
  return { conversations: data, isLoading, isError, error, refetch };
}

export function useDirectMessages(conversationId?: string) {
  const qc = useQueryClient();
  const { data = [], isLoading, isError, error, refetch } = useQuery<DirectMessage[], Error>({
    queryKey: ['dm-messages', conversationId ?? ''],
    enabled: !!conversationId,
    staleTime: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_direct_messages', { p_conversation: conversationId, p_limit: 100 });
      if (error) throw error;
      return (data ?? []) as DirectMessage[];
    },
  });
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
          qc.invalidateQueries({ queryKey: ['dm-conversations'] });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);
  return { messages: data, isLoading, isError, error, refetch };
}

export function useSendDirectMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      const { data, error } = await supabase.rpc('send_direct_message', { p_conversation: conversationId, p_body: body });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['dm-messages', v.conversationId] });
      qc.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });
}

export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc('open_direct_conversation', { p_other: otherUserId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dm-conversations'] }),
  });
}
