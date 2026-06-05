// src/pages/app/crypto/whales/components/NetFlowLeaderboard.tsx
// Per-symbol net whale flow = sum(buy USD) - sum(sell USD) over the provided trades.

import { memo, useMemo } from 'react';
import { GlassCard, SectionHeader } from '../../_shared/GlassUI';
import { formatCompact, getPriceColor } from '../../_shared/formatters';
import type { WhaleTrade } from '../../_shared/types';

interface NetFlowLeaderboardProps {
  trades: WhaleTrade[];
}

export const NetFlowLeaderboard = memo(function NetFlowLeaderboard({ trades }: NetFlowLeaderboardProps) {
  const rows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      const sym = t.symbol.replace('USDT', '');
      const prev = map.get(sym) ?? 0;
      map.set(sym, prev + (t.side === 'buy' ? t.notionalUsd : -t.notionalUsd));
    }
    return [...map.entries()]
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 8);
  }, [trades]);

  return (
    <GlassCard padding="sm">
      <SectionHeader title="Net Whale Flow" subtitle="Buy minus sell volume" />
      {rows.length === 0 ? (
        <p className="text-xs text-white/25 py-4 text-center">No data yet</p>
      ) : (
        <div className="space-y-1">
          {rows.map(([sym, net]) => (
            <div key={sym} className="flex items-center justify-between py-1 px-1">
              <span className="text-xs text-white/70 font-mono font-semibold">{sym}</span>
              <span className={`text-xs font-mono font-bold ${getPriceColor(net / 1_000)}`}>
                {net >= 0 ? '+' : ''}{formatCompact(Math.abs(net))}
                <span className="text-[10px] opacity-60 ml-0.5">{net >= 0 ? '▲' : '▼'}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
});
