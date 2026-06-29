// src/features/automation/components/AccountPicker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Small reusable select of the user's Tradovate portfolios (copier-eligible).
// Emits a SelectedAccount so callers receive full account identity, not just
// an opaque UUID. For the risk-rule caller, includeGlobal=true allows null
// (global default). For copier source/destination, includeGlobal=false.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePortfolios } from '@/hooks/usePortfolios';
import { SectionSpinner } from '@/components/ds/Spinner';
import type { SelectedAccount } from '../lib/automationTypes';

interface AccountPickerProps {
  /** Currently selected Tradovate account_id as text, or null for "Global default". */
  value: string | null;
  onChange: (account: SelectedAccount | null) => void;
  /** Whether to include a "Global (all accounts)" (null) option. Default: true. */
  includeGlobal?: boolean;
  /** Alias for includeGlobal — prefer this name for new callers. */
  allowGlobal?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const GLOBAL_SENTINEL = '__global__';

export function AccountPicker({
  value,
  onChange,
  includeGlobal = true,
  allowGlobal,
  placeholder = 'Select account',
  disabled = false,
  className,
}: AccountPickerProps) {
  // allowGlobal is an alias; if explicitly provided it takes precedence.
  const showGlobal = allowGlobal !== undefined ? allowGlobal : includeGlobal;
  const { portfolios, isLoading } = usePortfolios();

  if (isLoading) return <SectionSpinner />;

  // Only Tradovate accounts are copier-eligible (NT8 agent matches by account name).
  const eligible = portfolios.filter(
    (p) => p.is_active && p.tradovate_account_id != null,
  );

  const selectValue = value ?? (showGlobal ? GLOBAL_SENTINEL : '');

  const handleChange = (v: string) => {
    if (v === GLOBAL_SENTINEL) {
      onChange(null);
      return;
    }
    const found = eligible.find((p) => String(p.tradovate_account_id) === v);
    if (!found) return;
    onChange({
      account_id: String(found.tradovate_account_id!),
      account_name: found.name,
      broker: 'tradovate',
      environment: found.environment ?? null,
    });
  };

  return (
    <Select value={selectValue} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showGlobal && (
          <SelectItem value={GLOBAL_SENTINEL}>Global (all accounts)</SelectItem>
        )}
        {eligible.map((p) => (
          <SelectItem key={p.id} value={String(p.tradovate_account_id!)}>
            {p.name} — {p.environment ?? 'unknown'}
          </SelectItem>
        ))}
        {eligible.length === 0 && !showGlobal && (
          <SelectItem value="" disabled>
            No Tradovate accounts connected
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
