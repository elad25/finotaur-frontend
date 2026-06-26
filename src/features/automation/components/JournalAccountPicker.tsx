// src/features/automation/components/JournalAccountPicker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Select the user's tradeable journal accounts — the SAME universe that the
// trade journal's AccountFilterDropdown shows.  Uses usePortfolios() so source
// and destination account lists are always in sync with the journal.
//
// Unlike AccountPicker (which lists broker_connections), this picker operates
// at the account level (~22 accounts) rather than the connection level (~2-3).
// ─────────────────────────────────────────────────────────────────────────────

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionSpinner } from '@/components/ds/Spinner';
import { usePortfolios } from '@/hooks/usePortfolios';
import type { JournalAccount } from '../lib/automationTypes';

interface JournalAccountPickerProps {
  /** Currently selected account_id (String(tradovate_account_id)), or null = nothing selected. */
  value: string | null;
  /** Called with the full JournalAccount shape on selection, or null on clear. */
  onChange: (account: JournalAccount | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Build the display label for a single account option. */
function accountLabel(name: string, env: string | null, connectionLabel?: string | null): string {
  const envTag = env === 'live' ? 'Live' : env === 'demo' ? 'Demo' : null;
  const parts = [name];
  if (envTag) parts.push(`(${envTag})`);
  if (connectionLabel) parts.push(`— ${connectionLabel}`);
  return parts.join(' ');
}

export function JournalAccountPicker({
  value,
  onChange,
  placeholder = 'Select account',
  disabled = false,
  className,
}: JournalAccountPickerProps) {
  const { tradovatePortfolios, isLoading } = usePortfolios();

  if (isLoading) return <SectionSpinner />;

  // Only include active tradovate accounts that have a numeric account_id.
  // These are the accounts the copier agent can actually trade on.
  const tradeable = tradovatePortfolios.filter(
    (p) => p.is_active && p.tradovate_account_id != null,
  );

  const handleChange = (selectedId: string) => {
    const portfolio = tradeable.find(
      (p) => String(p.tradovate_account_id) === selectedId,
    );
    if (!portfolio || portfolio.tradovate_account_id == null) {
      onChange(null);
      return;
    }
    onChange({
      account_id: String(portfolio.tradovate_account_id),
      account_name: portfolio.name,
      broker: 'tradovate',
      environment: portfolio.environment ?? null,
      label: portfolio.connection_label ?? undefined,
    });
  };

  // Group by connection_label for better UX when the user has multiple connections.
  const groups = new Map<string, typeof tradeable>();
  for (const p of tradeable) {
    const groupKey = p.connection_label ?? 'Accounts';
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(p);
  }

  const useGroupLabels = groups.size > 1;

  return (
    <Select
      value={value ?? ''}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {tradeable.length === 0 ? (
          <SelectItem value="__none__" disabled>
            No active journal accounts
          </SelectItem>
        ) : useGroupLabels ? (
          Array.from(groups.entries()).map(([groupName, accounts]) => (
            <SelectGroup key={groupName}>
              <SelectLabel>{groupName}</SelectLabel>
              {accounts.map((p) => (
                <SelectItem
                  key={p.tradovate_account_id}
                  value={String(p.tradovate_account_id)}
                >
                  {accountLabel(p.name, p.environment)}
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        ) : (
          tradeable.map((p) => (
            <SelectItem
              key={p.tradovate_account_id}
              value={String(p.tradovate_account_id)}
            >
              {accountLabel(p.name, p.environment, p.connection_label)}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
