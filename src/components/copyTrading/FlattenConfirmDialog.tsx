// src/components/copyTrading/FlattenConfirmDialog.tsx
// Confirmation dialog for the FLATTEN ALL / Flatten single destructive action.
// Uses DS tokens only. Renders as a fixed centered overlay with a red danger button.

import { memo, useEffect } from 'react';
import { AlertOctagon, X } from 'lucide-react';

interface FlattenConfirmDialogProps {
  open: boolean;
  scope: 'all' | 'single';
  accountName?: string;
  positionsCount: number;
  accountsCount: number;
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
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const title =
    scope === 'all' ? 'FLATTEN ALL POSITIONS' : `Flatten ${accountName ?? 'account'}`;
  const subtitle =
    scope === 'all'
      ? `Close ${positionsCount} position${positionsCount === 1 ? '' : 's'} across ${accountsCount} account${accountsCount === 1 ? '' : 's'}, plus cancel ALL pending orders.`
      : `Close ${positionsCount} position${positionsCount === 1 ? '' : 's'} on ${accountName}, plus cancel its pending orders.`;
  const confirmLabel = scope === 'all' ? 'I understand, flatten all' : 'I understand, flatten';

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-surface-base/85 p-ds-4 backdrop-blur-sm">
      <div className="relative mx-ds-4 w-full max-w-md rounded-lg border border-num-negative/40 bg-surface-1 p-ds-5 shadow-2xl">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute right-ds-3 top-ds-3 text-ink-tertiary transition-colors duration-base hover:text-ink-primary disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-ds-3 flex items-center gap-ds-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-num-negative/30 bg-num-negative/10">
            <AlertOctagon className="h-5 w-5 text-num-negative" />
          </div>
          <h3 className="text-base font-semibold text-ink-primary">{title}</h3>
        </div>

        <p className="mb-ds-4 text-sm text-ink-secondary">{subtitle}</p>

        <div className="mb-ds-4 rounded-md border border-num-negative/20 bg-num-negative/5 p-ds-3">
          <p className="text-sm font-semibold leading-relaxed text-num-negative">
            Warning: clicking confirm will immediately close and exit all affected positions.
            All pending orders will be cancelled, and realized P&amp;L impact is irreversible.
          </p>
        </div>

        <div className="flex gap-ds-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-md border border-border-ds-default px-ds-4 py-ds-2 text-sm text-ink-primary transition-colors duration-base hover:bg-surface-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-md bg-num-negative px-ds-4 py-ds-2 text-sm font-semibold text-ink-primary transition-colors duration-base hover:bg-num-negative/80 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isLoading ? 'Flattening...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
});
