import * as React from 'react';
import { useState, useMemo } from 'react';
// TODO(2026-05-29): wrap in DS Modal once that lands
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import TradeDiffTable from './TradeDiffTable';
import { makeIdempotencyKey } from '../hooks/useTradeAction';
import type { PendingToolCall } from '../types';

// ── Tag pill helpers ──────────────────────────────────────────────────────────

function TagPill({
  label,
  variant,
}: {
  label: string;
  variant: 'adding' | 'removing';
}): JSX.Element {
  return (
    <span
      className={[
        'rounded-sm border px-2 py-0.5 text-xs',
        variant === 'adding'
          ? 'border-gold-primary/40 text-gold-primary bg-gold-primary/5'
          : 'border-border-ds-subtle text-ink-secondary bg-surface-2',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TradeActionModalProps {
  open: boolean;
  pendingToolCall: PendingToolCall;
  /** The full tool_input data from the server preview row */
  toolInputPayload: Record<string, unknown>;
  /** Optional "before" trade state (caller fetches before opening modal) */
  before?: Record<string, unknown> | null;
  onConfirm: (args: {
    preview_id: string;
    idempotency_key: string;
    confirm: true;
    typed_confirmation?: string;
  }) => void;
  onCancel: () => void;
  isConfirming?: boolean;
  errorMessage?: string | null;
}

// ── Modal body variants ───────────────────────────────────────────────────────

function AddTradeBody({
  payload,
}: {
  payload: Record<string, unknown>;
}): JSX.Element {
  const fields: Array<{ key: string; label: string }> = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'side', label: 'Side' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'entry_price', label: 'Entry price' },
    { key: 'exit_price', label: 'Exit price' },
    { key: 'fees', label: 'Fees' },
  ];

  return (
    <div className="flex flex-col gap-ds-3">
      {fields.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-ds-1">
          <label className="text-xs text-ink-secondary uppercase tracking-wide">
            {label}
          </label>
          <input
            readOnly
            value={
              payload[key] !== undefined && payload[key] !== null
                ? String(payload[key])
                : ''
            }
            placeholder="—"
            className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-3 py-ds-2 text-sm text-ink-primary cursor-default focus:outline-none"
          />
        </div>
      ))}
      <div className="flex flex-col gap-ds-1">
        <label className="text-xs text-ink-secondary uppercase tracking-wide">
          Notes
        </label>
        <textarea
          readOnly
          rows={3}
          value={
            payload['notes'] !== undefined && payload['notes'] !== null
              ? String(payload['notes'])
              : ''
          }
          placeholder="—"
          className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-3 py-ds-2 text-sm text-ink-primary cursor-default focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}

function UpdateTradeBody({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
}): JSX.Element {
  return <TradeDiffTable before={before ?? null} after={after} />;
}

function DeleteTradeBody({
  payload,
  typedConfirmation,
  onTypedConfirmationChange,
}: {
  payload: Record<string, unknown>;
  typedConfirmation: string;
  onTypedConfirmationChange: (v: string) => void;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-ds-4">
      {/* Trade summary */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-4">
        <p className="text-sm text-ink-secondary mb-ds-2">Trade to delete</p>
        <div className="flex flex-wrap gap-ds-3 text-sm text-ink-primary">
          {(['symbol', 'side', 'entry_price', 'exit_price'] as const).map((k) =>
            payload[k] !== undefined ? (
              <span key={k}>
                <span className="text-ink-secondary capitalize">{k.replace('_', ' ')}: </span>
                {String(payload[k])}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {/* Typed confirmation */}
      <div className="flex flex-col gap-ds-2">
        <label className="text-sm text-ink-secondary">
          Type <strong className="text-ink-primary font-semibold">DELETE</strong> to confirm
        </label>
        <input
          type="text"
          value={typedConfirmation}
          onChange={(e) => onTypedConfirmationChange(e.target.value)}
          placeholder="DELETE"
          className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-3 py-ds-2 text-sm text-ink-primary focus:outline-none focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 transition-all duration-200 ease-out"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function TagTradeBody({
  payload,
}: {
  payload: Record<string, unknown>;
}): JSX.Element {
  const addTags = Array.isArray(payload['add_tags'])
    ? (payload['add_tags'] as string[])
    : [];
  const removeTags = Array.isArray(payload['remove_tags'])
    ? (payload['remove_tags'] as string[])
    : [];

  return (
    <div className="grid grid-cols-2 gap-ds-4">
      <div className="flex flex-col gap-ds-2">
        <p className="text-xs text-ink-secondary uppercase tracking-wide">Adding</p>
        <div className="flex flex-wrap gap-ds-2">
          {addTags.length === 0 && (
            <span className="text-ink-secondary text-sm">—</span>
          )}
          {addTags.map((tag) => (
            <TagPill key={tag} label={tag} variant="adding" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-ds-2">
        <p className="text-xs text-ink-secondary uppercase tracking-wide">Removing</p>
        <div className="flex flex-wrap gap-ds-2">
          {removeTags.length === 0 && (
            <span className="text-ink-secondary text-sm">—</span>
          )}
          {removeTags.map((tag) => (
            <TagPill key={tag} label={tag} variant="removing" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Modal title map ───────────────────────────────────────────────────────────

const TITLE_MAP: Record<PendingToolCall['toolName'], string> = {
  add_trade: 'Add trade',
  update_trade: 'Update trade',
  delete_trade: 'Delete trade',
  tag_trade: 'Update tags',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function TradeActionModal({
  open,
  pendingToolCall,
  toolInputPayload,
  before = null,
  onConfirm,
  onCancel,
  isConfirming = false,
  errorMessage = null,
}: TradeActionModalProps): JSX.Element {
  const [typedConfirmation, setTypedConfirmation] = useState('');

  // Generate idempotency key once on mount
  const idempotencyKey = useMemo(() => makeIdempotencyKey(), []);

  const isDeleteTool = pendingToolCall.toolName === 'delete_trade';
  const confirmDisabled =
    isConfirming || (isDeleteTool && typedConfirmation !== 'DELETE');

  function handleConfirm(): void {
    onConfirm({
      preview_id: pendingToolCall.previewId,
      idempotency_key: idempotencyKey,
      confirm: true,
      ...(isDeleteTool ? { typed_confirmation: typedConfirmation } : {}),
    });
  }

  const title = TITLE_MAP[pendingToolCall.toolName] ?? 'Confirm action';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="bg-surface-base border border-border-ds-subtle rounded-[12px] max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-ink-primary font-medium text-h4">
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="py-ds-3">
          {pendingToolCall.toolName === 'add_trade' && (
            <AddTradeBody payload={toolInputPayload} />
          )}
          {pendingToolCall.toolName === 'update_trade' && (
            <UpdateTradeBody before={before} after={toolInputPayload} />
          )}
          {pendingToolCall.toolName === 'delete_trade' && (
            <DeleteTradeBody
              payload={toolInputPayload}
              typedConfirmation={typedConfirmation}
              onTypedConfirmationChange={setTypedConfirmation}
            />
          )}
          {pendingToolCall.toolName === 'tag_trade' && (
            <TagTradeBody payload={toolInputPayload} />
          )}
        </div>

        {/* Inline error */}
        {errorMessage && (
          <p className="text-sm text-num-negative mb-ds-3">{errorMessage}</p>
        )}

        <DialogFooter className="flex flex-row items-center justify-between gap-ds-2">
          {/* Cancel on the left */}
          <Button
            variant="ghost"
            size="compact"
            showArrow={false}
            onClick={onCancel}
            disabled={isConfirming}
          >
            Cancel
          </Button>

          {/* Confirm (gold — the one gold button per viewport) */}
          <Button
            variant="gold"
            size="compact"
            showArrow={false}
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {isConfirming ? 'Confirming…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
