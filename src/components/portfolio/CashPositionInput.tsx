// src/components/portfolio/CashPositionInput.tsx
// ═══════════════════════════════════════════════════════════════
// Cash position input: dollar-prefixed numeric field + currency
// selector. Defaults to 0. Used per-account in the modal.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { cn } from '@/lib/utils';
import { CURRENCIES, currencySymbol } from '@/lib/portfolio/currencies';

export interface CashPositionInputProps {
  amount: number;
  currency: string;
  onAmountChange: (n: number) => void;
  onCurrencyChange: (c: string) => void;
}

export function CashPositionInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
}: CashPositionInputProps) {
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow empty string → 0
    if (raw === '' || raw === '-') {
      onAmountChange(0);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      onAmountChange(parsed);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-ink-secondary font-medium">Cash Position</label>
      <div className="flex items-center gap-0">
        {/* Currency symbol prefix — reflects selected currency */}
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-1.5 text-sm text-ink-secondary',
            'border border-r-0 border-border-ds-subtle rounded-l-md bg-surface-1',
          )}
        >
          {currencySymbol(currency)}
        </span>

        {/* Numeric input */}
        <input
          type="number"
          min={0}
          step="0.01"
          value={amount === 0 ? '' : amount}
          onChange={handleAmountChange}
          placeholder="0"
          className={cn(
            'flex-1 min-w-0 bg-surface-1 border border-border-ds-subtle border-l-0 border-r-0 px-2.5 py-1.5',
            'text-sm text-ink-primary placeholder:text-ink-tertiary font-mono tabular-nums',
            'focus:outline-none focus:border-gold-primary focus:ring-1 focus:ring-gold-primary',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          )}
        />

        {/* Currency select */}
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className={cn(
            'bg-surface-1 border border-l-0 border-border-ds-subtle rounded-r-md px-2 py-1.5',
            'text-sm text-ink-secondary',
            'focus:outline-none focus:border-gold-primary',
            'cursor-pointer',
          )}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
