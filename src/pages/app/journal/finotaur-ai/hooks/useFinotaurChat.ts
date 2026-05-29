// src/pages/app/journal/finotaur-ai/hooks/useFinotaurChat.ts
// Stateful hook around streamFinotaurChat. Manages messages, streaming state,
// pending tool calls, conversation id, and prefill text.

import { useCallback, useReducer, useRef, useState } from 'react';
import { streamFinotaurChat } from '../services/finotaurChatStream';
import type { ChatMessage, ChatToolUse } from '../types';

// ─── UUID helper ─────────────────────────────────────────────────────────────
// Safari <15.4 may not have crypto.randomUUID; fall back to a random string.
const uuid = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'APPEND'; message: ChatMessage }
  | { type: 'UPDATE_ASSISTANT'; id: string; delta: string }
  | { type: 'ATTACH_TOOL_USE'; id: string; toolUse: ChatToolUse }
  | { type: 'MARK_DONE'; id: string }
  | { type: 'MARK_ERROR'; id: string }
  | { type: 'CLEAR' };

function messagesReducer(state: ChatMessage[], action: Action): ChatMessage[] {
  switch (action.type) {
    case 'APPEND':
      return [...state, action.message];

    case 'UPDATE_ASSISTANT':
      return state.map((m) =>
        m.id === action.id ? { ...m, content: m.content + action.delta } : m,
      );

    case 'ATTACH_TOOL_USE':
      return state.map((m) =>
        m.id === action.id ? { ...m, tool_use: action.toolUse } : m,
      );

    case 'MARK_DONE':
      return state.map((m) =>
        m.id === action.id ? { ...m, pending: false } : m,
      );

    case 'MARK_ERROR':
      return state.map((m) =>
        m.id === action.id ? { ...m, pending: false } : m,
      );

    case 'CLEAR':
      return [];

    default:
      return state;
  }
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseFinotaurChatResult {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  isStreaming: boolean;
  pendingToolCall: ChatToolUse | null;
  clearPendingToolCall: () => void;
  error: string | null;
  /** Hebrew error copy for display in UI error banners */
  errorHe: string | null;
  setPrefill: (text: string) => void;
  prefill: string;
  conversationId: string | undefined;
  /** Abort the in-flight stream (no-op if not streaming) */
  abort: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinotaurChat(): UseFinotaurChatResult {
  const [messages, dispatch] = useReducer(messagesReducer, []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingToolCall, setPendingToolCall] = useState<ChatToolUse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorHe, setErrorHe] = useState<string | null>(null);
  const [prefill, setPrefill] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  // Keep an AbortController ref so we can cancel a previous stream if a new
  // message is sent before the current one finishes.
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback((): void => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      // Abort any in-flight stream
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      // Clear stale errors
      setError(null);
      setErrorHe(null);

      // Append user message immediately
      const userMsgId = uuid();
      dispatch({
        type: 'APPEND',
        message: { id: userMsgId, role: 'user', content: text },
      });

      // Append assistant placeholder
      const assistantMsgId = uuid();
      dispatch({
        type: 'APPEND',
        message: { id: assistantMsgId, role: 'assistant', content: '', pending: true },
      });

      setIsStreaming(true);

      try {
        const stream = streamFinotaurChat({
          message: text,
          conversationId,
          signal: controller.signal,
        });

        for await (const event of stream) {
          switch (event.type) {
            case 'conversation':
              if (event.id) {
                setConversationId(event.id);
              }
              break;

            case 'chunk':
              if (event.delta) {
                dispatch({ type: 'UPDATE_ASSISTANT', id: assistantMsgId, delta: event.delta });
              }
              break;

            case 'tool_use': {
              const toolUse: ChatToolUse = {
                preview_id: event.preview_id ?? '',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tool_name: (event.tool_name ?? '') as any,
                summary: event.summary ?? '',
                tool_input: event.tool_input,
              };
              dispatch({ type: 'ATTACH_TOOL_USE', id: assistantMsgId, toolUse });
              setPendingToolCall(toolUse);
              break;
            }

            case 'tool_result':
              // Push a new role='tool' message with the output
              dispatch({
                type: 'APPEND',
                message: {
                  id: uuid(),
                  role: 'tool',
                  content: '',
                  tool_result: event.output,
                },
              });
              break;

            case 'done':
              dispatch({ type: 'MARK_DONE', id: assistantMsgId });
              setIsStreaming(false);
              break;

            case 'error':
              setError(event.message_en ?? event.code ?? 'stream_error');
              setErrorHe(event.message_he ?? 'שגיאה ב-AI');
              dispatch({ type: 'MARK_ERROR', id: assistantMsgId });
              setIsStreaming(false);
              break;

            default:
              break;
          }
        }
      } catch (err: unknown) {
        // Ignore abort errors — they are intentional (user sent a new message)
        if (err instanceof Error && err.name === 'AbortError') {
          dispatch({ type: 'MARK_ERROR', id: assistantMsgId });
          setIsStreaming(false);
          return;
        }

        const message = err instanceof Error ? err.message : 'Streaming failed';
        setError(message);
        setErrorHe('בעיה בתקשורת עם שרת ה-AI.');
        dispatch({ type: 'MARK_ERROR', id: assistantMsgId });
        setIsStreaming(false);
      }
    },
    [conversationId],
  );

  const clearPendingToolCall = useCallback(() => {
    setPendingToolCall(null);
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    pendingToolCall,
    clearPendingToolCall,
    error,
    errorHe,
    setPrefill,
    prefill,
    conversationId,
    abort,
  };
}
