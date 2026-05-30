// src/pages/app/journal/finotaur-ai/hooks/useMentorChatHistory.ts
// Read-only hook: fetches a student's most-recent non-archived conversation and
// its messages from Supabase. Used exclusively in mentor (readOnly) mode.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatMessageRole } from '../types';

// ─── Supabase row shapes (raw select results) ─────────────────────────────────

interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  tool_name: string | null;
  tool_input: Record<string, unknown> | null;
  tool_output: Record<string, unknown> | null;
  created_at: string;
}

// ─── Public return type ────────────────────────────────────────────────────────

export interface MentorChatHistoryResult {
  conversation: ConversationRow | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchMentorChatHistory(studentId: string): Promise<{
  conversation: ConversationRow | null;
  messages: ChatMessage[];
}> {
  // 1. Fetch the student's most-recent non-archived conversation.
  const { data: convo, error: convoErr } = await supabase
    .from('journal_ai_conversations')
    .select('id, title, created_at, updated_at')
    .is('archived_at', null)
    .eq('user_id', studentId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (convoErr) throw new Error(convoErr.message);
  if (!convo) return { conversation: null, messages: [] };

  // 2. Fetch all messages for that conversation, ordered oldest-first.
  const { data: rows, error: msgErr } = await supabase
    .from('journal_ai_messages')
    .select('id, role, content, tool_name, tool_input, tool_output, created_at')
    .eq('conversation_id', convo.id)
    .order('created_at', { ascending: true });

  if (msgErr) throw new Error(msgErr.message);

  // 3. Map DB rows → ChatMessage (matches the shape useFinotaurChat produces).
  const messages: ChatMessage[] = (rows ?? []).map((row: MessageRow): ChatMessage => ({
    id: row.id,
    role: row.role as ChatMessageRole,
    content: row.content ?? '',
    // tool_use is only present for assistant messages that proposed a mutation.
    // In read-only history we surface it for display parity but mark it resolved.
    ...(row.tool_name != null
      ? {
          tool_use: {
            preview_id: row.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tool_name: row.tool_name as any,
            summary: '',
            tool_input: row.tool_input ?? undefined,
            resolved: 'confirmed' as const,
          },
        }
      : {}),
    // tool_result present for role='tool' rows.
    ...(row.role === 'tool' && row.tool_output != null
      ? { tool_result: row.tool_output }
      : {}),
  }));

  return { conversation: convo as ConversationRow, messages };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a student's most-recent non-archived conversation + messages.
 * Only runs when `enabled` is true and `studentId` is non-empty.
 */
export function useMentorChatHistory(
  studentId?: string,
  enabled = true,
): MentorChatHistoryResult {
  const query = useQuery({
    queryKey: ['mentor-chat-history', studentId],
    queryFn: () => fetchMentorChatHistory(studentId!),
    enabled: enabled && Boolean(studentId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    conversation: query.data?.conversation ?? null,
    messages: query.data?.messages ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
