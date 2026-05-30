// src/pages/app/journal/finotaur-ai/hooks/useMentorChatHistory.ts
// Read-only chat history for the Mentor View. Loads the most-recent
// non-archived conversation for the student, then its messages, and maps
// them to the ChatMessage shape used by CoachChatPanel.
// NO write operations — never calls sendMessage, never mutates.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatMessageRole, ConversationListItem } from '../types';

// ── DB row shapes ────────────────────────────────────────────────────────────

interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  role: string;
  content: string | null;
  tool_name: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool_input: Record<string, unknown> | null;
  tool_output: unknown;
  created_at: string;
}

// ── Mapper ───────────────────────────────────────────────────────────────────

function mapRow(row: MessageRow): ChatMessage {
  const role = row.role as ChatMessageRole;

  if (role === 'tool') {
    // Tool result rows: surface tool_output as tool_result; no tool_use here.
    return {
      id: row.id,
      role,
      content: row.content ?? '',
      pending: false,
      tool_result: row.tool_output ?? null,
    };
  }

  if (role === 'assistant' && row.tool_name) {
    // Assistant proposed a tool call — reconstruct the tool_use shape.
    return {
      id: row.id,
      role,
      content: row.content ?? '',
      pending: false,
      tool_use: {
        preview_id: row.id, // use message id as stable preview_id for display
        // Cast: tool_name is one of the four union variants stored as text.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool_name: row.tool_name as any,
        summary: row.tool_name,
        tool_input: row.tool_input ?? undefined,
      },
    };
  }

  return {
    id: row.id,
    role,
    content: row.content ?? '',
    pending: false,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface MentorChatHistoryResult {
  messages: ChatMessage[];
  conversation: ConversationListItem | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Loads the most-recent non-archived conversation + its messages for a student,
 * accessed by an accepted mentor via RLS. Completely read-only.
 *
 * @param studentId  The student's user_id.
 * @param enabled    Gates the query (false during non-mentor renders).
 */
export function useMentorChatHistory(
  studentId: string | undefined,
  enabled = true,
): MentorChatHistoryResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mentor-chat-history', studentId ?? null],
    enabled: enabled && !!studentId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<{ conversation: ConversationRow | null; messages: ChatMessage[] }> => {
      if (!studentId) return { conversation: null, messages: [] };

      // 1. Most-recent non-archived conversation for the student.
      const { data: convoData, error: convoError } = await supabase
        .from('journal_ai_conversations')
        .select('id,title,created_at,updated_at')
        .is('archived_at', null)
        .eq('user_id', studentId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convoError) throw new Error(convoError.message);
      if (!convoData) return { conversation: null, messages: [] };

      // 2. Messages for that conversation, oldest first.
      const { data: msgData, error: msgError } = await supabase
        .from('journal_ai_messages')
        .select('id,role,content,tool_name,tool_input,tool_output,created_at')
        .eq('conversation_id', convoData.id)
        .order('created_at', { ascending: true });

      if (msgError) throw new Error(msgError.message);

      const messages: ChatMessage[] = (msgData ?? []).map((row) =>
        mapRow(row as MessageRow),
      );

      return { conversation: convoData as ConversationRow, messages };
    },
  });

  return {
    messages: data?.messages ?? [],
    conversation: data?.conversation
      ? {
          id: data.conversation.id,
          title: data.conversation.title,
          created_at: data.conversation.created_at,
          updated_at: data.conversation.updated_at,
        }
      : null,
    isLoading,
    error: error as Error | null,
  };
}
