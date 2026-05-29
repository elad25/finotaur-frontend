import * as React from 'react';
import ToolResultRenderer from './ToolResultRenderer';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

// Friendly action labels for the tool-message eyebrow
const ACTION_LABELS: Record<string, string> = {
  get_trades: 'looked up your trades',
  find_trades: 'searched your trades',
  list_trades: 'listed your trades',
  get_score: 'computed your score',
};

export default function MessageBubble({ message }: MessageBubbleProps): JSX.Element {
  // ── tool message ────────────────────────────────────────────────────────────
  if (message.role === 'tool') {
    const action =
      (message as { tool_result?: { action?: string } }).tool_result?.action ?? 'tool';
    const label = ACTION_LABELS[action] ?? `used ${action}`;

    return (
      <div className="w-full border-l-2 border-border-ds-subtle pl-ds-3 py-ds-2">
        <p className="text-ink-secondary text-xs mb-ds-2">🛠 {label}</p>
        <ToolResultRenderer result={message.tool_result} />
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
