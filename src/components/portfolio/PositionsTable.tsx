// src/components/portfolio/PositionsTable.tsx
// ═══════════════════════════════════════════════════════════════
// Positions grid for the active portfolio account.
// Columns: Ticker | Quantity | Cost/Share | Purchase Date | actions
// Empty state: centered prompt when no positions exist.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Plus, X } from 'lucide-react';
import { Lot } from '@/lib/portfolio/types';
import { TickerCell } from './TickerCell';
import { cn } from '@/lib/utils';

export interface PositionsTableProps {
  positions: Lot[];
  onAddTicker: () => void;
  onAddLot: (ticker: string) => void;
  onUpdateLot: (i: number, patch: Partial<Lot>) => void;
  onRemoveLot: (i: number) => void;
  /** Called when the built-in "Upload CSV" header link is clicked.
   *  If `uploadSlot` is provided, this prop is ignored and the slot
   *  is rendered in the header instead. */
  onUploadCsvClick?: () => void;
  /** Optional React node rendered in the header's right slot in place
   *  of the default "Upload CSV" text button. Use to embed CsvUploadButton
   *  directly so its file picker + preview live inside the table. */
  uploadSlot?: React.ReactNode;
}

// ── Shared cell/input style ──────────────────────────────────────
const cellInput = cn(
  'w-full bg-surface-1 border border-border-ds-subtle rounded-md px-2 py-1.5',
  'text-sm text-ink-primary placeholder:text-ink-tertiary font-mono tabular-nums',
  'focus:outline-none focus:border-gold-primary focus:ring-1 focus:ring-gold-primary',
  'transition-colors',
);

// ── Column widths (approximate, flex-based) ──────────────────────
const COL_TICKER  = 'w-[140px] shrink-0';
const COL_QTY     = 'w-[100px] shrink-0';
const COL_COST    = 'w-[110px] shrink-0';
const COL_DATE    = 'w-[130px] shrink-0';
const COL_ACTIONS = 'flex-1 flex items-center justify-end gap-1';

export function PositionsTable({
  positions,
  onAddTicker,
  onAddLot,
  onUpdateLot,
  onRemoveLot,
  onUploadCsvClick,
  uploadSlot,
}: PositionsTableProps) {
  // Empty state
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <p className="text-sm text-ink-primary font-medium">Add positions to get started</p>
        <p className="text-xs text-ink-secondary">
          Add tickers individually or upload multiple by CSV.
        </p>
        <button
          type="button"
          onClick={onAddTicker}
          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-1 border border-border-ds-subtle text-sm text-ink-primary hover:bg-white/5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 text-gold-primary" />
          Add Ticker
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Column header row */}
      <div className="flex items-center gap-2 px-1 pb-1 border-b border-border-ds-subtle">
        <span className={cn('text-xs text-ink-secondary font-medium', COL_TICKER)}>Ticker</span>
        <span className={cn('text-xs text-ink-secondary font-medium', COL_QTY)}>
          Quantity <span className="text-num-negative">*</span>
        </span>
        <span className={cn('text-xs text-ink-secondary font-medium', COL_COST)}>Cost / Share</span>
        <span className={cn('text-xs text-ink-secondary font-medium', COL_DATE)}>Purchase Date</span>
        <div className={COL_ACTIONS}>
          {uploadSlot ?? (
            <button
              type="button"
              onClick={onUploadCsvClick}
              className="text-xs text-ink-secondary hover:text-ink-primary transition-colors px-2 py-1 rounded border border-border-ds-subtle hover:border-border-ds-default"
            >
              Upload CSV
            </button>
          )}
        </div>
      </div>

      {/* Position rows */}
      {positions.map((lot, i) => (
        <PositionRow
          key={i}
          lot={lot}
          index={i}
          onUpdate={(patch) => onUpdateLot(i, patch)}
          onAddLot={() => onAddLot(lot.ticker)}
          onRemove={() => onRemoveLot(i)}
        />
      ))}

      {/* Add Ticker footer */}
      <button
        type="button"
        onClick={onAddTicker}
        className="mt-2 self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border-ds-subtle text-sm text-ink-secondary hover:text-ink-primary hover:border-border-ds-default transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Ticker
      </button>
    </div>
  );
}

// ── Single position row ──────────────────────────────────────────

interface PositionRowProps {
  lot: Lot;
  index: number;
  onUpdate: (patch: Partial<Lot>) => void;
  onAddLot: () => void;
  onRemove: () => void;
}

function PositionRow({ lot, onUpdate, onAddLot, onRemove }: PositionRowProps) {
  function handleQuantityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '') {
      onUpdate({ quantity: 0 });
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate({ quantity: parsed });
    }
  }

  function handleCostChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '') {
      onUpdate({ costPerShare: null });
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate({ costPerShare: parsed });
    }
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate({ purchaseDate: e.target.value || null });
  }

  return (
    <div className="flex items-center gap-2 px-1 py-0.5">
      {/* Ticker */}
      <div className={COL_TICKER}>
        <TickerCell
          value={lot.ticker}
          onChange={(ticker) => onUpdate({ ticker })}
          placeholder="Ticker"
        />
      </div>

      {/* Quantity */}
      <div className={COL_QTY}>
        <input
          type="number"
          min={0}
          step="any"
          value={lot.quantity === 0 ? '' : lot.quantity}
          onChange={handleQuantityChange}
          placeholder="0"
          required
          className={cn(
            cellInput,
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          )}
        />
      </div>

      {/* Cost / Share */}
      <div className={COL_COST}>
        <input
          type="number"
          min={0}
          step="any"
          value={lot.costPerShare ?? ''}
          onChange={handleCostChange}
          placeholder="Optional"
          className={cn(
            cellInput,
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          )}
        />
      </div>

      {/* Purchase Date */}
      <div className={COL_DATE}>
        <input
          type="date"
          value={lot.purchaseDate ?? ''}
          onChange={handleDateChange}
          className={cn(
            cellInput,
            'cursor-pointer',
            // Date input placeholder via CSS color trick
            !lot.purchaseDate && 'text-ink-tertiary',
          )}
        />
      </div>

      {/* Actions */}
      <div className={COL_ACTIONS}>
        <button
          type="button"
          onClick={onAddLot}
          disabled={!lot.ticker}
          title="Add another lot for this ticker"
          className={cn(
            'text-xs text-ink-secondary hover:text-ink-primary transition-colors whitespace-nowrap',
            !lot.ticker && 'opacity-40 cursor-not-allowed',
          )}
        >
          + Add Lot
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove position"
          className="p-1 text-ink-tertiary hover:text-num-negative transition-colors rounded"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
