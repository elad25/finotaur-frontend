// src/pages/app/crypto/whales/components/LiveTape.tsx
// Scrolling tape of whale trades — newest on top.

import { memo, useMemo } from 'react';
import { GlassTableSkeleton, EmptyState } from '../../_shared/GlassUI';
import { formatPrice, formatCompact, timeAgo } from '../../_shared/formatters';
import { SizeBar } from './SizeBar';
import type { WhaleTrade } from '../../_shared/types';

interface LiveTapeProps {
  trades: WhaleTrade[];
  loading?: boolean;
  /** 'liquidation' changes side labels to LONG LIQ / SHORT LIQ */
  variant?: 'trade' | 'liquidation';
}

const TIER_COLORS: Record<string, string> = {
  mega:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  huge:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  large: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

export const LiveTape = memo(function LiveTape({ trades, loading, variant = 'trade' }: LiveTapeProps) {
  const maxUsd = useMemo(
    () => trades.reduce((m, t) => Math.max(m, t.notionalUsd), 0),
    [trades],
  );

  if (loading) return <GlassTableSkeleton rows={12} />;

  if (trades.length === 0) {
    return (
      <EmptyState
        icon="🐋"
        title="No whale trades yet"
        description="Waiting for large prints above your size filter."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]">
            <th className="text-left py-2 px-2 font-medium">Time</th>
            <th className="text-left py-2 px-2 font-medium">Symbol</th>
            <th className="text-left py-2 px-2 font-medium">Side</th>
            <th className="text-right py-2 px-2 font-medium">Price</th>
            <th className="text-right py-2 px-2 font-medium">Size</th>
            <th className="text-left py-2 px-2 font-medium hidden sm:table-cell">Market</th>
            <th className="text-left py-2 px-2 font-medium hidden md:table-cell">Tier</th>
          </tr>
        </thead>
        <tbody>
          {trades.map(t => (
            <tr
              key={t.id}
              className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors animate-[fadeIn_0.3s_ease-in]"
            >
              <td className="py-1.5 px-2 text-white/30 font-mono text-[11px] whitespace-nowrap">
                {timeAgo(t.tradedAt)}
              </td>
              <td className="py-1.5 px-2 text-white/80 font-mono text-xs font-semibold">
                {t.symbol.replace('USDT', '')}
              </td>
              <td className="py-1.5 px-2">
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.side === 'buy' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className={`text-xs font-semibold ${t.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {variant === 'liquidation'
                      ? t.side === 'buy' ? 'LONG LIQ' : 'SHORT LIQ'
                      : t.side === 'buy' ? 'Buy' : 'Sell'}
                  </span>
                </div>
              </td>
              <td className="py-1.5 px-2 text-right text-white/70 font-mono text-xs">
                {formatPrice(t.price)}
              </td>
              <td className="py-1.5 px-2 text-right">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-white/70 font-mono text-xs">{formatCompact(t.notionalUsd)}</span>
                  <SizeBar value={t.notionalUsd} max={maxUsd} side={t.side} />
                </div>
              </td>
              <td className="py-1.5 px-2 hidden sm:table-cell">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  t.market === 'futures'
                    ? 'bg-amber-500/10 text-amber-400/80 border-amber-500/20'
                    : 'bg-cyan-500/10 text-cyan-400/80 border-cyan-500/20'
                }`}>
                  {t.market}
                </span>
              </td>
              <td className="py-1.5 px-2 hidden md:table-cell">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  TIER_COLORS[t.tier] ?? 'bg-white/[0.05] text-white/30 border-white/[0.08]'
                }`}>
                  {t.tier}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
