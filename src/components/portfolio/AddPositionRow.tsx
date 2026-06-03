// src/components/portfolio/AddPositionRow.tsx
// ═══════════════════════════════════════════════════════════════
// Inline "add position" form rendered inside an AccountCard row.
// Validates ticker + quantity + cost before enabling "Add".
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { TickerCell } from '@/components/portfolio/TickerCell';
import { currencySymbol } from '@/lib/portfolio/currencies';
import type { Lot } from '@/lib/portfolio/types';
import { cn } from '@/lib/utils';

export interface AddPositionRowProps {
  currency: string;
  onAdd: (lot: Lot) => Promise<void>;
  onCancel: () => void;
}

export function AddPositionRow({ currency, onAdd, onCancel }: AddPositionRowProps) {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [costPerShare, setCostPerShare] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [busy, setBusy] = useState(false);

  const symbol = currencySymbol(currency);

  const canAdd =
    ticker.trim() !== '' &&
    quantity !== '' && quantity > 0 &&
    costPerShare !== '' && costPerShare > 0;

  async function handleAdd() {
    if (!canAdd || busy) return;
    setBusy(true);
    try {
      const lot: Lot = {
        ticker: ticker.toUpperCase().trim(),
        quantity: Number(quantity),
        costPerShare: Number(costPerShare),
        purchaseDate: purchaseDate || null,
      };
      await onAdd(lot);
    } finally {
      setBusy(false);
    }
  }

  const inputBase = cn(
    'no-spinner',
    'bg-surface-1 border border-border-ds-subtle text-ink-primary rounded-md',
    'focus:outline-none focus:border-gold-primary focus:ring-1 focus:ring-gold-primary',
    'placeholder:text-ink-tertiary transition-colors text-sm',
    'px-2 py-1.5',
  );

  return (
    <tr className="border-t border-border-ds-subtle">
      {/* Ticker — autocomplete */}
      <td className="py-2 pr-3">
        <TickerCell
          value={ticker}
          onChange={setTicker}
          placeholder="Ticker"
        />
      </td>

      {/* Quantity */}
      <td className="py-2 pr-3">
        <input
          type="number"
          min={0}
          step="any"
          value={quantity}
          onChange={(e) =>
            setQuantity(e.target.value === '' ? '' : Number(e.target.value))
          }
          placeholder="0"
          className={cn(inputBase, 'w-full text-right font-mono tabular-nums')}
        />
      </td>

      {/* Cost / Share — currency-prefixed */}
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-ink-tertiary shrink-0 select-none">{symbol}</span>
          <input
            type="number"
            min={0}
            step="any"
            value={costPerShare}
            onChange={(e) =>
              setCostPerShare(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="0.00"
            className={cn(inputBase, 'w-full text-right font-mono tabular-nums')}
          />
        </div>
      </td>

      {/* Purchase Date (optional) */}
      <td className="py-2 pr-3" colSpan={3}>
        <input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className={cn(
            inputBase,
            'w-full',
            // Style the date picker chrome to match dark theme
            '[color-scheme:dark]',
          )}
        />
      </td>

      {/* Actions: Add + Cancel */}
      <td className="py-2 pr-3 text-right" colSpan={2}>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd || busy}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
              canAdd && !busy
                ? 'bg-gold-primary text-surface-base hover:bg-gold-bright cursor-pointer'
                : 'bg-gold-primary/30 text-surface-base/50 cursor-not-allowed',
            )}
          >
            {busy ? 'Adding…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-xs text-ink-tertiary hover:text-ink-secondary hover:bg-surface-1 transition-colors"
            aria-label="Cancel"
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  );
}
