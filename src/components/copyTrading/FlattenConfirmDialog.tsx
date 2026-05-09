// src/components/copyTrading/FlattenConfirmDialog.tsx
// ═══════════════════════════════════════════════════════════════
// Confirmation dialog for the FLATTEN ALL / Flatten single destructive action.
// Uses DS tokens only. Renders as a fixed overlay with a red danger button.
// ═══════════════════════════════════════════════════════════════

import { memo } from 'react';
import { AlertOctagon, X } from 'lucide-react';

interface FlattenConfirmDialogProps {
  open: boolean;
  scope: 'all' | 'single';
  accountName?: string;         // when scope='single'
  positionsCount: number;       // total positions to be flattened
  accountsCount: number;        // total accounts affected
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const FlattenConfirmDialog = memo(function FlattenConfirmDialog({
  open,
  scope,
  accountName,
  positionsCount,
  accountsCount,
  onConfirm,
  onCancel,
  isLoading,
}: FlattenConfirmDialogProps) {
  if (!open) return null;

  const title =
    scope === 'all' ? 'FLATTEN ALL POSITIONS' : `Flatten ${accountName ?? 'account'}`;
  const subtitle =
    scope === 'all'
      ? `Close ${positionsCount} position${positionsCount === 1 ? '' : 's'} across ${accountsCount} account${accountsCount === 1 ? '' : 's'}.`
      : `Close ${positionsCount} position${positionsCount === 1 ? '' : 's'} on ${accountName}.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-base/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-ds-4 rounded-lg bg-surface-1 border border-num-negative/40 p-ds-5 shadow-2xl">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-ds-3 right-ds-3 text-ink-tertiary hover:text-ink-primary transition-colors duration-base disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-ds-3 mb-ds-3">
          <div className="w-10 h-10 rounded-md bg-num-negative/10 border border-num-negative/30 flex items-center justify-center flex-shrink-0">
            <AlertOctagon className="w-5 h-5 text-num-negative" />
          </div>
          <h3 className="text-base font-semibold text-ink-primary">{title}</h3>
        </div>

        <p className="text-sm text-ink-secondary mb-ds-4">{subtitle}</p>

        <div className="rounded-md bg-num-negative/5 border border-num-negative/20 p-ds-3 mb-ds-4">
          <p className="text-xs text-num-negative font-medium">
            ⚠ This sends market orders immediately. Realized P&amp;L impact is irreversible.
            Pending orders are not cancelled (use &ldquo;Cancel all orders&rdquo; separately).
          </p>
        </div>

        <div className="flex gap-ds-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-ds-4 py-ds-2 rounded-md border border-border-ds-default text-sm text-ink-primary hover:bg-surface-2 transition-colors duration-base disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-ds-4 py-ds-2 rounded-md bg-num-negative text-white font-semibold text-sm hover:bg-num-negative/80 transition-colors duration-base disabled:opacity-50"
          >
            {isLoading ? 'Flattening…' : scope === 'all' ? 'Flatten All' : 'Flatten'}
          </button>
        </div>
      </div>
    </div>
  );
});
