import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Square } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import MessageBubble from './MessageBubble';
import PromptChips from './PromptChips';
import ToolCallCard from './ToolCallCard';
import TradeActionModal from './TradeActionModal';
import { useFinotaurChat } from '../hooks/useFinotaurChat';
import { useTradeAction } from '../hooks/useTradeAction';
import type { PendingToolCall, ChatToolUse } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert ChatToolUse (hook shape) → PendingToolCall (UI shape) */
function toPendingToolCall(toolUse: ChatToolUse): PendingToolCall {
  return {
    previewId: toolUse.preview_id,
    toolName: toolUse.tool_name,
    summary: toolUse.summary,
    toolInput: toolUse.tool_input,
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CoachChatPanelProps {
  /** Optional className override on the outer Card */
  className?: string;
  /** When this string changes, the panel's input is pre-filled with it (one-shot). */
  prefillRequest?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CoachChatPanel({ className, prefillRequest }: CoachChatPanelProps): JSX.Element {
  const chat = useFinotaurChat();
  const action = useTradeAction();

  // ── Local state ─────────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePendingToolCall, setActivePendingToolCall] = useState<PendingToolCall | null>(null);
  /** Mobile: whether the bottom-sheet is expanded */
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastPrefillRef = useRef<string | null>(null);

  // ── Sync prefillRequest prop → input (one-shot per distinct value) ───────────
  useEffect(() => {
    if (prefillRequest && prefillRequest !== lastPrefillRef.current) {
      lastPrefillRef.current = prefillRequest;
      chat.setPrefill(prefillRequest);
      // Auto-expand mobile sheet if collapsed
      setIsExpanded(true);
    }
  }, [prefillRequest, chat]);

  // ── Sync prefill from hook → input ──────────────────────────────────────────
  useEffect(() => {
    if (chat.prefill) {
      setInputText(chat.prefill);
      chat.setPrefill('');
    }
  }, [chat.prefill, chat.setPrefill]);

  // ── Auto-scroll to latest message ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  // ── Auto-grow textarea (1-4 lines) ──────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20; // approximate px per line
    const maxHeight = lineHeight * 4 + 16; // 4 lines + padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [inputText]);

  // ── Send handler ─────────────────────────────────────────────────────────────
  const handleSend = useCallback((): void => {
    const text = inputText.trim();
    if (!text || chat.isStreaming || chat.pendingToolCall) return;
    setInputText('');
    chat.sendMessage(text);
  }, [inputText, chat]);

  // ── Textarea keydown (Enter sends, Shift+Enter newline) ──────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── ToolCallCard → Review ────────────────────────────────────────────────────
  function handleReview(pending: PendingToolCall): void {
    setActivePendingToolCall(pending);
    setIsModalOpen(true);
  }

  // ── ToolCallCard → Discard ───────────────────────────────────────────────────
  function handleDiscard(): void {
    chat.clearPendingToolCall();
  }

  // ── Modal → Confirm ──────────────────────────────────────────────────────────
  function handleModalConfirm(args: {
    preview_id: string;
    idempotency_key: string;
    confirm: true;
    typed_confirmation?: string;
  }): void {
    action.mutate(args, {
      onSuccess: () => {
        setIsModalOpen(false);
        setActivePendingToolCall(null);
        chat.clearPendingToolCall();
        // Insert a system-level confirmation message into the chat
        // Note: sendMessage is for user messages; we append a synthetic assistant message
        // by sending a minimal confirmation notice via the hook's send path is not ideal.
        // Instead we directly reflect success via a brief inline note in the UI.
      },
    });
  }

  // ── Modal → Cancel ───────────────────────────────────────────────────────────
  function handleModalCancel(): void {
    setIsModalOpen(false);
    setActivePendingToolCall(null);
  }

  // ── Prompt chip selection ────────────────────────────────────────────────────
  function handleChipSelect(text: string): void {
    setInputText(text);
    textareaRef.current?.focus();
  }

  // ── Pending tool call derived from hook ──────────────────────────────────────
  const pendingToolCallUI: PendingToolCall | null = chat.pendingToolCall
    ? toPendingToolCall(chat.pendingToolCall)
    : null;

  const inputDisabled = chat.isStreaming || Boolean(chat.pendingToolCall);

  // ── Action error (shown in modal) ────────────────────────────────────────────
  const actionError = action.isError
    ? (action.error instanceof Error ? action.error.message : 'Action failed')
    : null;

  // ── Success flash: show "✓ Action confirmed" when mutation succeeds ──────────
  const [showConfirmFlash, setShowConfirmFlash] = useState(false);
  useEffect(() => {
    if (action.isSuccess) {
      setShowConfirmFlash(true);
      const t = setTimeout(() => setShowConfirmFlash(false), 3000);
      return () => clearTimeout(t);
    }
  }, [action.isSuccess]);

  // ── Desktop layout: sticky aside ─────────────────────────────────────────────
  // ── Mobile layout: bottom sheet ──────────────────────────────────────────────

  return (
    <>
      {/* ── Desktop: sidebar panel ─────────────────────────────────────────── */}
      <Card
        variant="glass"
        padding="compact"
        className={[
          // Desktop: visible as a full-height sticky column
          'hidden lg:flex lg:flex-col lg:h-full',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-ds-4 shrink-0">
          <h2 className="font-sans text-h4 font-medium text-ink-primary">
            AI Coach
          </h2>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-ds-3 min-h-0">
          {chat.messages.length === 0 ? (
            <EmptyState onChipSelect={handleChipSelect} inputDisabled={inputDisabled} />
          ) : (
            <>
              {chat.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {showConfirmFlash && (
                <p className="text-sm text-ink-secondary pl-ds-3">
                  ✓ Action confirmed
                </p>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error banner (desktop) — surfaces SSE / chat errors that would otherwise be silent */}
        {(chat.error || chat.errorHe) && (
          <div
            role="alert"
            className="shrink-0 mt-ds-3 rounded-[8px] border border-num-negative/40 bg-num-negative/5 px-ds-3 py-ds-2"
          >
            <p className="text-sm text-num-negative">{chat.error ?? chat.errorHe}</p>
          </div>
        )}

        {/* Pending tool call — between message list and input */}
        {pendingToolCallUI && (
          <div className="shrink-0 mt-ds-3">
            <ToolCallCard
              pendingToolCall={pendingToolCallUI}
              onReview={handleReview}
              onDiscard={handleDiscard}
            />
          </div>
        )}

        {/* Input row */}
        <InputRow
          ref={textareaRef}
          value={inputText}
          onChange={setInputText}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          disabled={inputDisabled}
          isStreaming={chat.isStreaming}
          onStop={chat.abort}
        />
      </Card>

      {/* ── Mobile: bottom sheet ───────────────────────────────────────────── */}
      <div
        className={[
          'lg:hidden fixed bottom-0 left-0 right-0 z-40',
          'transition-transform duration-200 ease-out',
          isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-64px)]',
        ].join(' ')}
      >
        <Card variant="glass" padding="compact" className="rounded-b-none flex flex-col max-h-[80vh]">
          {/* Header row (always visible — acts as handle) */}
          <div
            className="flex items-center justify-between cursor-pointer mb-ds-3 shrink-0"
            onClick={() => setIsExpanded((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setIsExpanded((v) => !v);
            }}
          >
            <h2 className="font-sans text-h4 font-medium text-ink-primary">
              AI Coach
            </h2>
            <span className="text-ink-secondary text-sm">
              {isExpanded ? '▼ Minimize' : '▲ Expand'}
            </span>
          </div>

          {/* Messages (only visible when expanded) */}
          {isExpanded && (
            <div className="flex-1 overflow-y-auto flex flex-col gap-ds-3 min-h-0">
              {chat.messages.length === 0 ? (
                <EmptyState onChipSelect={handleChipSelect} inputDisabled={inputDisabled} />
              ) : (
                <>
                  {chat.messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {showConfirmFlash && (
                    <p className="text-sm text-ink-secondary pl-ds-3">
                      ✓ Action confirmed
                    </p>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          )}

          {/* Error banner (mobile) — only visible when sheet expanded */}
          {isExpanded && (chat.error || chat.errorHe) && (
            <div
              role="alert"
              className="shrink-0 mt-ds-3 rounded-[8px] border border-num-negative/40 bg-num-negative/5 px-ds-3 py-ds-2"
            >
              <p className="text-sm text-num-negative">{chat.error ?? chat.errorHe}</p>
            </div>
          )}

          {/* Pending tool call */}
          {isExpanded && pendingToolCallUI && (
            <div className="shrink-0 mt-ds-3">
              <ToolCallCard
                pendingToolCall={pendingToolCallUI}
                onReview={handleReview}
                onDiscard={handleDiscard}
              />
            </div>
          )}

          {/* Input row (always visible when sheet is open) */}
          <InputRow
            ref={textareaRef}
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            disabled={inputDisabled}
            isStreaming={chat.isStreaming}
            onStop={chat.abort}
          />
        </Card>
      </div>

      {/* ── Trade action modal ─────────────────────────────────────────────── */}
      {activePendingToolCall && (
        <TradeActionModal
          open={isModalOpen}
          pendingToolCall={activePendingToolCall}
          // Phase 5: agentLoop yields tool_input on every mutation tool_use event;
          // hook captures it on ChatToolUse.tool_input. We pass it through here so
          // the modal renders a real diff (update_trade) or pre-filled form (add_trade).
          toolInputPayload={activePendingToolCall.toolInput ?? {}}
          before={null}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
          isConfirming={action.isPending}
          errorMessage={actionError}
        />
      )}
    </>
  );
}

// ── Empty state sub-component ────────────────────────────────────────────────

function EmptyState({
  onChipSelect,
  inputDisabled,
}: {
  onChipSelect: (text: string) => void;
  inputDisabled: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-ds-4 py-ds-4">
      <p className="text-ink-secondary text-sm">
        What would you like to analyze today?
      </p>
      <PromptChips onSelect={onChipSelect} disabled={inputDisabled} />
    </div>
  );
}

// ── Input row sub-component ──────────────────────────────────────────────────

interface InputRowProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  /** When true, replace Send button with Stop button (calls onStop). */
  isStreaming: boolean;
  /** Abort handler — called when user clicks Stop. */
  onStop: () => void;
}

const InputRow = React.forwardRef<HTMLTextAreaElement, InputRowProps>(
  function InputRow(
    { value, onChange, onSend, onKeyDown, disabled, isStreaming, onStop },
    ref,
  ) {
    return (
      <div className="flex items-end gap-ds-2 mt-ds-3 shrink-0">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder="Ask AI Coach…"
          className={[
            'flex-1 resize-none rounded-md border border-border-ds-subtle bg-surface-1',
            'px-ds-3 py-ds-2 text-sm text-ink-primary placeholder:text-ink-muted',
            'focus:outline-none focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30',
            'transition-all duration-200 ease-out',
            'disabled:pointer-events-none disabled:opacity-50',
            'overflow-hidden',
          ].join(' ')}
        />
        {isStreaming ? (
          <Button
            variant="ghost"
            size="compact"
            showArrow={false}
            onClick={onStop}
            aria-label="Stop streaming"
          >
            <Square size={14} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="compact"
            showArrow={false}
            disabled={disabled || !value.trim()}
            onClick={onSend}
            aria-label="Send message"
          >
            <Send size={16} />
          </Button>
        )}
      </div>
    );
  },
);
