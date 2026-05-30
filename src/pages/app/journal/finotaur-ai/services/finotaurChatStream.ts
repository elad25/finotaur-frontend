// src/pages/app/journal/finotaur-ai/services/finotaurChatStream.ts
// Low-level SSE wrapper using authFetch + ReadableStream (no EventSource — we POST a body).

import { authFetch } from '@/utils/authFetch';
import type { ChatStreamEvent } from '../types';

export interface ChatStreamOptions {
  message: string;
  conversationId?: string;
  attachedTradeIds?: string[];
  signal?: AbortSignal;
}

export class ChatStreamError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, opts: { status?: number; code?: string } = {}) {
    super(message);
    this.name = 'ChatStreamError';
    this.status = opts.status;
    this.code = opts.code;
  }
}

/**
 * Yields parsed SSE events from POST /api/journal-ai/chat/stream.
 * Aborts cleanly via opts.signal.
 *
 * Server emits events as `data: ${JSON}\n\n`. We use a buffered line parser
 * to handle chunks that split mid-event.
 */
export async function* streamFinotaurChat(opts: ChatStreamOptions): AsyncGenerator<ChatStreamEvent> {
  const { message, conversationId, attachedTradeIds, signal } = opts;

  // 1. Open the POST
  const res = await authFetch('/api/journal-ai/chat/stream', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      message,
      ...(conversationId !== undefined && { conversationId }),
      ...(attachedTradeIds !== undefined && { attachedTradeIds }),
    }),
    signal,
  });

  // 2. Check response.ok / Content-Type
  if (!res.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await res.json().catch(() => ({}));
    throw new ChatStreamError(
      body?.message_en ?? `stream error (${res.status})`,
      { status: res.status, code: body?.code },
    );
  }

  const contentType = res.headers.get('Content-Type') ?? '';
  if (!contentType.startsWith('text/event-stream')) {
    throw new ChatStreamError(
      `Unexpected Content-Type: ${contentType}`,
      { status: res.status },
    );
  }

  // 3. Read body via ReadableStreamDefaultReader + TextDecoder
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      // Check for abort before each read
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      // 4. Buffer incomplete frames; split on '\n\n'
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');

      // Last element may be an incomplete frame — keep it in the buffer
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        if (!frame.trim()) continue;

        // Find the first non-empty line starting with 'data: '
        const lines = frame.split('\n');
        for (const line of lines) {
          const trimmed = line.trimStart();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice('data: '.length);
            try {
              const event = JSON.parse(jsonStr) as ChatStreamEvent;
              // 5. Yield each parsed event
              yield event;
            } catch {
              // Malformed JSON — skip this frame gracefully
            }
            break; // Only one data line per frame
          }
        }
      }
    }

    // Flush any remaining buffered data (TextDecoder stream: false)
    const remaining = decoder.decode(undefined, { stream: false });
    if (remaining) {
      buffer += remaining;
      const frames = buffer.split('\n\n');
      for (const frame of frames) {
        if (!frame.trim()) continue;
        const lines = frame.split('\n');
        for (const line of lines) {
          const trimmed = line.trimStart();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice('data: '.length);
            try {
              const event = JSON.parse(jsonStr) as ChatStreamEvent;
              yield event;
            } catch {
              // Malformed JSON — skip
            }
            break;
          }
        }
      }
    }
  } finally {
    // 6. On signal abort, reader.cancel()
    reader.cancel().catch(() => undefined);
  }
}
