import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Square } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import MessageBubble from './MessageBubble';
import PromptChips from './PromptChips';
import ToolCallCard from './ToolCallCard';
import TradeActionModal from './TradeActionModal';
import type { useFinotaurChat } from '../hooks/useFinotaurChat';
import { useTradeAction } from '../hooks/useTradeAction';
import type { PendingToolCall, ChatToolUse, ChatMessage, Briefing, Insight, FinotaurScore } from '../types';

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
  /**
   * Pre-created hook instance from the parent. The parent (FinotaurAI) owns
   * the single useFinotaurChat() call and passes it here; CoachChatPanel never
   * instantiates the hook itself so there is exactly one instance per mounted panel.
   */
  chatInstance: ReturnType<typeof useFinotaurChat>;
  /**
   * Mentor View: when true, renders messagesOverride instead of chat.messages,
   * hides all input/send/stop/tool affordances, and shows a read-only notice.
   */
  isReadOnly?: boolean;
  /**
   * Mentor View: the student's chat messages to display when isReadOnly is true.
   * Ignored when isReadOnly is false/undefined.
   */
  messagesOverride?: ChatMessage[];
  /** FINOTAUR score — rendered as a compact header strip at the top of the chat. */
  score?: FinotaurScore | null;
  /** Daily briefing — surfaced as condensed, clickable starter suggestions in the empty state. */
  briefing?: Briefing | null;
  /** Called when the user taps a briefing finding — prefills the chat to discuss it. */
  onDiscuss?: (insight: Insight) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CoachChatPanel({
  className,
  prefillRequest,
  chatInstance,
  isReadOnly = false,
  messagesOverride,
  score,
  briefing,
  onDiscuss,
}: CoachChatPanelProps): JSX.Element {
  const chat = chatInstance;
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
        {/* Score — at the very top of the page, above the title (per design) */}
        <ScoreStrip score={score} />

        {/* Header */}
        <div className="flex items-center justify-between mb-ds-4 shrink-0">
          <h2 className="font-sans text-h4 font-medium text-ink-primary">
            FINOTAUR <span className="text-gold-primary">AI</span>
          </h2>
          {isReadOnly ? (
            <span className="text-xs text-ink-tertiary italic">read-only</span>
          ) : (
            <button
              type="button"
              onClick={() => chat.newConversation()}
              className="rounded-md border border-border-ds-subtle px-ds-3 py-1 font-sans text-sm text-ink-secondary transition-colors duration-base hover:border-gold-primary/50 hover:text-ink-primary"
            >
              + New Chat
            </button>
          )}
        </div>

        {/* Read-only notice (mentor view) */}
        {isReadOnly && (
          <p className="shrink-0 mb-ds-2 text-xs text-ink-tertiary">
            Viewing student&apos;s chat history (read-only)
          </p>
        )}

        {/* Message list */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-ds-3 min-h-0">
          {isReadOnly ? (
            // ── Mentor view: render messagesOverride, no interactive affordances ──
            !messagesOverride || messagesOverride.length === 0 ? (
              <p className="text-ink-secondary text-sm py-ds-4">No chat history yet.</p>
            ) : (
              <>
                {messagesOverride.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )
          ) : (
            // ── Owner view: existing behaviour ──────────────────────────────────
            chat.messages.length === 0 ? (
              <EmptyState onChipSelect={handleChipSelect} inputDisabled={inputDisabled} briefing={briefing} onDiscuss={onDiscuss} />
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
            )
          )}
        </div>

        {/* Error banner (desktop) — owner path only; never shown in read-only */}
        {!isReadOnly && chat.error && (
          <div
            role="alert"
            className="shrink-0 mt-ds-3 rounded-[8px] border border-num-negative/40 bg-num-negative/5 px-ds-3 py-ds-2"
          >
            <p className="text-sm text-num-negative">{chat.error ?? 'Something went wrong.'}</p>
          </div>
        )}

        {/* Pending tool call — owner path only */}
        {!isReadOnly && pendingToolCallUI && (
          <div className="shrink-0 mt-ds-3">
            <ToolCallCard
              pendingToolCall={pendingToolCallUI}
              onReview={handleReview}
              onDiscard={handleDiscard}
            />
          </div>
        )}

        {/* Input row — hidden in read-only (mentor) mode */}
        {!isReadOnly && (
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
        )}
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
              {isReadOnly ? (
                // ── Mentor view ────────────────────────────────────────────────
                !messagesOverride || messagesOverride.length === 0 ? (
                  <p className="text-ink-secondary text-sm py-ds-4">No chat history yet.</p>
                ) : (
                  <>
                    {messagesOverride.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )
              ) : (
                // ── Owner view ─────────────────────────────────────────────────
                chat.messages.length === 0 ? (
                  <EmptyState onChipSelect={handleChipSelect} inputDisabled={inputDisabled} briefing={briefing} onDiscuss={onDiscuss} />
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
                )
              )}
            </div>
          )}

          {/* Error banner (mobile) — owner path only */}
          {isExpanded && !isReadOnly && chat.error && (
            <div
              role="alert"
              className="shrink-0 mt-ds-3 rounded-[8px] border border-num-negative/40 bg-num-negative/5 px-ds-3 py-ds-2"
            >
              <p className="text-sm text-num-negative">{chat.error ?? 'Something went wrong.'}</p>
            </div>
          )}

          {/* Pending tool call — owner path only */}
          {isExpanded && !isReadOnly && pendingToolCallUI && (
            <div className="shrink-0 mt-ds-3">
              <ToolCallCard
                pendingToolCall={pendingToolCallUI}
                onReview={handleReview}
                onDiscard={handleDiscard}
              />
            </div>
          )}

          {/* Input row — hidden in read-only (mentor) mode */}
          {!isReadOnly && (
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
          )}
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

// ── Score strip — compact FINOTAUR SCORE header rendered inside the chat ──────

function ScoreStrip({ score }: { score?: FinotaurScore | null }): JSX.Element | null {
  if (!score || score.score == null) return null;
  const delta = score.delta;
  return (
    <div className="shrink-0 mb-ds-3 flex items-center gap-ds-2 rounded-[10px] border border-border-ds-subtle bg-surface-1 px-ds-3 py-ds-2">
      <span className="font-sans text-[11px] uppercase tracking-wide text-ink-tertiary">
        FINOTAUR Score · {score.window_days ?? 30}D
      </span>
      <span className="ml-auto font-mono text-h4 font-semibold tabular-nums text-ink-primary">
        {score.score}
      </span>
      {delta != null && delta !== 0 && (
        <span
          className={[
            'font-mono text-[11px] tabular-nums',
            delta > 0 ? 'text-num-positive' : 'text-num-negative',
          ].join(' ')}
        >
          {delta > 0 ? '+' : ''}
          {delta}
        </span>
      )}
    </div>
  );
}

// ── Empty state sub-component ────────────────────────────────────────────────

/** Build the chat prefill prompt for discussing a briefing finding. */
function buildDiscussPrompt(insight: Insight): string {
  return `Let's dig into this finding from my briefing: "${insight.title}". What's driving it and what should I do about it?`;
}

function EmptyState({
  onChipSelect,
  inputDisabled,
  briefing,
  onDiscuss,
}: {
  onChipSelect: (text: string) => void;
  inputDisabled: boolean;
  briefing?: Briefing | null;
  onDiscuss?: (insight: Insight) => void;
}): JSX.Element {
  const insights = briefing?.insights ?? [];

  // No briefing yet (generating, or genuinely none) → generic starter chips.
  if (insights.length === 0) {
    return (
      <div className="m-auto flex w-full max-w-2xl flex-col items-center gap-ds-4 py-ds-6 text-center">
        <div>
          <p className="font-sans text-h4 font-medium text-ink-primary">
            FINOTAUR <span className="text-gold-primary">AI Assistant</span>
          </p>
          <p className="mt-ds-1 text-ink-secondary text-sm">
            Ask about your trades, setups, and performance to begin.
          </p>
        </div>
        <PromptChips onSelect={onChipSelect} disabled={inputDisabled} />
      </div>
    );
  }

  // Briefing present → each finding is a condensed, tappable starter (featured first).
  const ordered = [...insights].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
  );
  const handleSelect = (insight: Insight) => {
    if (onDiscuss) onDiscuss(insight);
    else onChipSelect(buildDiscussPrompt(insight));
  };

  return (
    <div className="m-auto flex w-full max-w-2xl flex-col gap-ds-4 py-ds-6">
      <p className="text-center text-ink-secondary text-sm">
        Today&apos;s briefing — tap a finding to dig in
      </p>
      <div className="flex flex-col gap-ds-2">
        {ordered.map((insight) => (
          <button
            key={insight.id}
            type="button"
            disabled={inputDisabled}
            onClick={() => handleSelect(insight)}
            className={[
              'group w-full rounded-[10px] border border-border-ds-subtle bg-surface-1 px-ds-3 py-ds-2 text-left',
              'transition-colors duration-base hover:border-gold-primary/50 hover:bg-surface-2',
              'disabled:pointer-events-none disabled:opacity-50',
            ].join(' ')}
          >
            <div className="flex items-start gap-ds-2">
              {insight.featured && (
                <span className="mt-0.5 shrink-0 rounded-full bg-gold-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold-primary">
                  Top
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm font-medium text-ink-primary">{insight.title}</p>
                {insight.metric && (
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-tertiary">
                    {insight.metric}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="text-center text-ink-muted text-xs">…or ask anything below.</p>
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
