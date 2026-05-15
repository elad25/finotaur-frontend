// src/pages/app/ai/copilot/components/HoldingsTable.tsx
import { useState } from 'react';
import { Card } from '@/components/ds/Card';
import { Price } from '@/components/ds/NumberDisplay';
import { Holding } from '../hooks/usePortfolioMockData';
import { cn } from '@/lib/utils';
import { getCompanyLogo } from '../utils/companyLogo';

interface Props {
  holdings: Holding[];
}

function changeColor(v: number) {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-num-negative';
  return 'text-ink-secondary';
}

const fmtCurrency = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPercent = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%`;

const BADGE_PALETTE = [
  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
];

function symbolBadgeClass(symbol: string): string {
  return BADGE_PALETTE[symbol.charCodeAt(0) % BADGE_PALETTE.length];
}

function CompanyLogo({ symbol, colorClass }: { symbol: string; colorClass: string }) {
  const [errored, setErrored] = useState(false);
  const logoUrl = getCompanyLogo(symbol);

  if (!logoUrl || errored) {
    return (
      <div className={cn('w-9 h-9 rounded-md flex items-center justify-center text-[10px] font-mono font-bold border', colorClass)}>
        {symbol.slice(0, 2)}
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-md bg-white p-1 flex items-center justify-center">
      <img
        src={logoUrl}
        alt={symbol}
        className="w-full h-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

export function HoldingsTable({ holdings }: Props) {
  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);

  return (
    <Card className="relative overflow-hidden bg-[#0b0a07]/90 border-gold-primary/20 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
      <div className="relative">
      <div className="flex items-center justify-between mb-ds-4">
        <div>
          <h2 className="text-base font-semibold text-ink-primary">Holdings</h2>
          <p className="text-xs text-ink-tertiary mt-0.5">{holdings.length} positions</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-ink-tertiary border-b border-border-ds-subtle">
              <th className="text-left font-medium pb-ds-3">Symbol</th>
              <th className="text-right font-medium pb-ds-3">Qty</th>
              <th className="text-right font-medium pb-ds-3">Avg cost</th>
              <th className="text-right font-medium pb-ds-3">Price</th>
              <th className="text-right font-medium pb-ds-3">Market value</th>
              <th className="text-right font-medium pb-ds-3">P&amp;L $</th>
              <th className="text-right font-medium pb-ds-3">P&amp;L %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(h => (
              <tr
                key={h.symbol}
                className="border-b border-gold-primary/10 hover:bg-gold-primary/[0.045] transition-colors"
              >
                <td className="py-ds-3">
                  <div className="flex items-center gap-ds-2">
                    <div className="shrink-0">
                      <CompanyLogo symbol={h.symbol} colorClass={symbolBadgeClass(h.symbol)} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-ink-primary">{h.symbol}</span>
                      <span className="text-xs text-ink-tertiary">{h.name}</span>
                    </div>
                  </div>
                </td>
                <td className="text-right font-mono tabular-nums text-ink-secondary">{h.quantity}</td>
                <td className="text-right"><Price value={h.avgCost} format="currency" /></td>
                <td className="text-right"><Price value={h.marketPrice} format="currency" /></td>
                <td className="text-right"><Price value={h.marketValue} format="currency" /></td>
                <td className="text-right">
                  <span className={cn('font-mono tabular-nums', changeColor(h.unrealizedPnl))}>
                    {fmtCurrency(h.unrealizedPnl)}
                  </span>
                </td>
                <td className="text-right">
                  <span className={cn('font-mono tabular-nums', changeColor(h.unrealizedPnlPercent))}>
                    {fmtPercent(h.unrealizedPnlPercent)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </Card>
  );
}
