// src/components/portfolio/ClosePositionDialog.tsx
// ═══════════════════════════════════════════════════════════════
// Modal dialog: "How many shares to sell?" for closing / partial-
// closing a saved portfolio lot.  Caller is responsible for the
// actual save; this component only collects the quantity and calls
// onConfirm(soldQty).
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import type { Lot } from '@/lib/portfolio/types';

interface ClosePositionDialogProps {
  lot: Lot | null;
  open: boolean;
  onClose: () => void;
  /** Called with the clamped quantity to sell (1 … lot.quantity). */
  onConfirm: (soldQty: number) => Promise<void>;
}

export function ClosePositionDialog({
  lot,
  open,
  onClose,
  onConfirm,
}: ClosePositionDialogProps) {
  const maxQty = lot?.quantity ?? 1;
  const [qty, setQty] = useState<string>(String(maxQty));
  const [busy, setBusy] = useState(false);

  // Reset quantity to lot's full size whenever the dialog opens for a new lot.
  useEffect(() => {
    if (open && lot) {
      setQty(String(lot.quantity));
    }
  }, [open, lot]);

  const parsed = parseInt(qty, 10);
  const valid = !Number.isNaN(parsed) && parsed >= 1 && parsed <= maxQty;

  async function handleConfirm() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onConfirm(parsed);
    } finally {
      setBusy(false);
    }
  }

  if (!lot) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="bg-surface-base border border-border-ds-subtle shadow-xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-ink-primary text-base font-semibold">
            Close position — {lot.ticker}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm text-ink-secondary">
            How many shares do you want to sell?{' '}
            <span className="text-ink-tertiary">(max {lot.quantity.toLocaleString('en-US')})</span>
          </p>

          <input
            type="number"
            min={1}
            max={maxQty}
            step={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="no-spinner w-full rounded-md border border-border-ds-subtle bg-surface-1 px-3 py-2 text-sm text-ink-primary font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-gold-primary"
            autoFocus
            disabled={busy}
          />

          {!valid && qty !== '' && (
            <p className="text-xs text-red-400">
              Enter a number between 1 and {maxQty}.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            showArrow={false}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="gold"
            size="sm"
            showArrow={false}
            onClick={handleConfirm}
            disabled={!valid || busy}
          >
            {busy ? 'Closing…' : 'Close / Sell'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
