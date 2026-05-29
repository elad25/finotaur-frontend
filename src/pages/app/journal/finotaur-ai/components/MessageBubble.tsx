import * as React from 'react';
import { useState } from 'react';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps): JSX.Element {
  const [isToolExpanded, setIsToolExpanded] = useState(false);

  // ── tool message ────────────────────────────────────────────────────────────
  if (message.role === 'tool') {
    const toolName = message.tool_result
      ? (message as { tool_result?: { action?: string } }).tool_result?.action ?? 'tool'
      : 'tool';
    const outputJson = message.tool_result
      ? JSON.stringify(message.tool_result, null, 2)
      : '';

    return (
      <div className="w-full border-l-2 border-border-ds-subtle pl-ds-3 py-ds-2">
        <button
          type="button"
          onClick={() => setIsToolExpanded((v) => !v)}
          className="flex items-center gap-ds-2 text-ink-secondary text-sm transition-all duration-200 ease-out hover:text-ink-primary"
        >
          <span>🛠 used {toolName}</span>
          <span className="text-ink-muted text-xs">{isToolExpanded ? '▲' : '▼'}</span>
        </button>
        {isToolExpanded && outputJson && (
          <pre className="overflow-x-auto text-xs mt-ds-2 text-ink-secondary bg-surface-2 rounded-md p-ds-3">
            {outputJson}
          </pre>
        )}
      </div>
    );
  }

  // ── assistant message ───────────────────────────────────────────────────────
  if (message.role === 'assistant') {
    const isStreaming = message.pending === true;
    return (
      <div className="flex justify-start w-full">
        <div className="p-ds-3 text-ink-primary max-w-[80%]">
          <span>{message.content}</span>
          {isStreaming && (
            <span
              className="inline-block w-[2px] h-[1em] ml-[2px] bg-ink-primary align-middle animate-pulse"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    );
  }

  // ── user message (default) ──────────────────────────────────────────────────
  return (
    <div className="flex justify-end w-full">
      <div className="bg-surface-1 text-ink-primary rounded-[12px] p-ds-3 max-w-[80%] border-[0.5px] border-border-ds-subtle">
        {message.content}
      </div>
    </div>
  );
}
