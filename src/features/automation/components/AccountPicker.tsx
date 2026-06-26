// src/features/automation/components/AccountPicker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Small reusable select of the user's broker_connections.
// Uses the canonical useBrokerConnections hook.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { SectionSpinner } from '@/components/ds/Spinner';

interface AccountPickerProps {
  /** Currently selected broker_connection id, or null for "Global default". */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Whether to include a "Global default" option. Default: true. */
  includeGlobal?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AccountPicker({
  value,
  onChange,
  includeGlobal = true,
  placeholder = 'Select account',
  disabled = false,
  className,
}: AccountPickerProps) {
  const { connections, isLoading } = useBrokerConnections({ active: true });

  if (isLoading) return <SectionSpinner />;

  const selectValue = value ?? (includeGlobal ? '__global__' : '');

  const handleChange = (v: string) => {
    onChange(v === '__global__' ? null : v);
  };

  return (
    <Select value={selectValue} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeGlobal && (
          <SelectItem value="__global__">Global default (all accounts)</SelectItem>
        )}
        {connections.map((conn) => (
          <SelectItem key={conn.id} value={conn.id}>
            {conn.connection_name ?? conn.account_name ?? conn.broker} — {conn.environment}
          </SelectItem>
        ))}
        {connections.length === 0 && !includeGlobal && (
          <SelectItem value="" disabled>
            No active connections
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
