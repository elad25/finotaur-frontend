// src/pages/app/etfs/EtfTable.tsx
// =====================================================
// Shared ETF results table — used by Directory & Screener.
// Columns: Ticker, Name, Exchange, List Date.
// Each row links to /app/etfs/<ticker>/overview.
// =====================================================

import { useNavigate } from 'react-router-dom';
import type { EtfListItem } from '@/types/etf.types';
import { fmtDate } from './format';

interface EtfTableProps {
  etfs: EtfListItem[];
  loading?: boolean;
}

export function EtfTable({ etfs, loading }: EtfTableProps) {
  const navigate = useNavigate();

  if (loading && etfs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-ink-tertiary text-sm">
        Loading…
      </div>
    );
  }

  if (!loading && etfs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-ink-tertiary text-sm">
        No ETFs found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-ds-subtle">
            <th className="pb-ds-2 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary pr-ds-4">
              Ticker
            </th>
            <th className="pb-ds-2 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary pr-ds-4">
              Name
            </th>
            <th className="pb-ds-2 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary pr-ds-4">
              Exchange
            </th>
            <th className="pb-ds-2 text-right text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
              Listed
            </th>
          </tr>
        </thead>
        <tbody>
          {etfs.map((etf) => (
            <tr
              key={etf.ticker}
              className="border-b border-border-ds-subtle/50 last:border-0 cursor-pointer hover:bg-gold-primary/5 transition-colors"
              onClick={() => navigate(`/app/etfs/${etf.ticker}/overview`)}
            >
              <td className="py-ds-2 pr-ds-4">
                <span className="font-data font-semibold text-ink-primary">{etf.ticker}</span>
              </td>
              <td className="py-ds-2 pr-ds-4 text-ink-secondary max-w-[260px] truncate">
                {etf.name}
              </td>
              <td className="py-ds-2 pr-ds-4 text-ink-tertiary">
                {etf.primaryExchange ?? '—'}
              </td>
              <td className="py-ds-2 text-right font-data text-ink-tertiary tabular-nums">
                {fmtDate(etf.listDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
