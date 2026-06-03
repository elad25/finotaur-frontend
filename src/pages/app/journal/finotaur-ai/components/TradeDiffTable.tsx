import * as React from 'react';
import { Price } from '@/components/ds/NumberDisplay';

const DEFAULT_FIELDS = [
  'symbol',
  'side',
  'quantity',
  'entry_price',
  'exit_price',
  'fees',
  'pnl',
  'rr',
  'setup',
  'notes',
  'tags',
];

// Fields that contain numeric values rendered via <Price>
const CURRENCY_FIELDS = new Set(['entry_price', 'exit_price', 'fees', 'pnl']);
const NUMBER_FIELDS = new Set(['quantity', 'rr']);

interface TradeDiffTableProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  /** Optional explicit field order */
  fields?: string[];
}

function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function renderValue(field: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-ink-secondary">—</span>;
  }

  if (isNumeric(value)) {
    if (CURRENCY_FIELDS.has(field)) {
      return <Price value={value} format="currency" size="small" />;
    }
    if (NUMBER_FIELDS.has(field)) {
      return <Price value={value} format="plain" decimals={2} size="small" />;
    }
  }

  if (Array.isArray(value)) {
    return <span>{value.join(', ')}</span>;
  }

  return <span>{String(value)}</span>;
}

export default function TradeDiffTable({ before, after, fields }: TradeDiffTableProps): JSX.Element {
  // Determine which fields to render: intersection of DEFAULT_FIELDS with those
  // present in either before or after.
  const fieldList = (fields ?? DEFAULT_FIELDS).filter(
    (f) =>
      (before !== null && f in before) ||
      (after !== null && f in after),
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-ds-subtle pb-ds-2">
          <th className="text-left text-xs uppercase tracking-wide text-ink-secondary pb-ds-2 pr-ds-3 font-medium">
            Field
          </th>
          <th className="text-left text-xs uppercase tracking-wide text-ink-secondary pb-ds-2 pr-ds-3 font-medium">
            Current
          </th>
          <th className="text-left text-xs uppercase tracking-wide text-ink-secondary pb-ds-2 font-medium">
            Proposed
          </th>
        </tr>
      </thead>
      <tbody>
        {fieldList.map((field) => {
          const beforeVal = before?.[field] ?? null;
          const afterVal = after?.[field] ?? null;

          // Detect whether this row has a change (loose equality check on JSON)
          const hasChange =
            JSON.stringify(beforeVal) !== JSON.stringify(afterVal);

          return (
            <tr
              key={field}
              className={[
                'border-b border-border-ds-subtle/40',
                hasChange ? 'border-l-2 border-l-gold-primary/40 pl-ds-2' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <td className="py-ds-2 pr-ds-3 text-ink-secondary capitalize">
                {field.replace(/_/g, ' ')}
              </td>
              <td className="py-ds-2 pr-ds-3 text-ink-primary">
                {renderValue(field, beforeVal)}
              </td>
              <td className="py-ds-2 text-ink-primary">
                {renderValue(field, afterVal)}
              </td>
            </tr>
          );
        })}
        {fieldList.length === 0 && (
          <tr>
            <td colSpan={3} className="py-ds-3 text-ink-secondary text-center">
              No fields to display
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
