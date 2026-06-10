// src/pages/app/crypto/whales/panels/WhaleTradesPanel.tsx
// Merges SSE stream (passed from hub) + REST history; handles client-side filtering + dedup.

import { memo, useState, useMemo } from 'react';
import { GlassCard, SectionHeader } from '../../_shared/GlassUI';
import { type WhaleStreamStatus } from '@/hooks/crypto/useWhaleStream';
import { useWhaleTradesHistory } from '@/hooks/crypto/useWhaleData';
import { WhaleFilters } from '../components/WhaleFilters';
import { StreamStatusPill } from '../components/StreamStatusPill';
import { LiveTape } from '../components/LiveTape';
import { NetFlowLeaderboard } from '../components/NetFlowLeaderboard';
import type { WhaleTrade } from '../../_shared/types';

interface WhaleTradesPanelProps {
  symbol?: string;
  compact?: boolean;
  /** Hub-level stream — passed down so all tabs share one SSE connection */
  stream: {
    trades: WhaleTrade[];
    status: WhaleStreamStatus;
    lastEventTs: number | null;
  };
}

// Well-known symbols to populate the symbol dropdown when no scoping is applied
const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];

export const WhaleTradesPanel = memo(function WhaleTradesPanel({
  symbol: propSymbol,
  compact,
  stream,
}: WhaleTradesPanelProps) {
  const [minUsd, setMinUsd] = useState(0);
  const [symbol, setSymbol] = useState(propSymbol ?? 'all');
  const [side, setSide] = useState<'all' | 'buy' | 'sell'>('all');

  // REST history
  const history = useWhaleTradesHistory({
    minUsd: minUsd > 0 ? minUsd : undefined,
    symbol: propSymbol ?? (symbol !== 'all' ? symbol : undefined),
    side: side !== 'all' ? side : undefined,
    limit: 100,
  });

  // Merge stream trades (from hub) + REST history, dedup + filter + cap
  const merged = useMemo<WhaleTrade[]>(() => {
    const all = [...stream.trades, ...(history.data ?? [])];
    const seen = new Set<string>();
    const deduped: WhaleTrade[] = [];
    for (const t of all) {
      if (!seen.has(t.id)) { seen.add(t.id); deduped.push(t); }
    }
    return deduped
      .filter(t => {
        if (minUsd > 0 && t.notionalUsd < minUsd) return false;
        if (!propSymbol && symbol !== 'all' && t.symbol !== symbol) return false;
        if (side !== 'all' && t.side !== side) return false;
        return true;
      })
      .sort((a, b) => new Date(b.tradedAt).getTime() - new Date(a.tradedAt).getTime())
      .slice(0, 150);
  }, [stream.trades, history.data, minUsd, symbol, side, propSymbol]);

  const isLoading = history.isLoading && stream.trades.length === 0;

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <GlassCard padding="sm">
        <SectionHeader
          title="Whale Trades"
          action={<StreamStatusPill status={stream.status} />}
          className="mb-3"
        />
        <WhaleFilters
          minUsd={minUsd}
          symbol={propSymbol ? propSymbol : symbol}
          side={side}
          onChange={next => {
            if (next.minUsd !== undefined) setMinUsd(next.minUsd);
            if (next.symbol !== undefined) setSymbol(next.symbol);
            if (next.side !== undefined) setSide(next.side);
          }}
          symbols={propSymbol ? [] : DEFAULT_SYMBOLS}
        />
      </GlassCard>

      {/* Main grid */}
      <div className={`grid gap-3 ${!compact && !propSymbol ? 'lg:grid-cols-3' : ''}`}>
        <div className={`${!compact && !propSymbol ? 'lg:col-span-2' : ''}`}>
          <GlassCard padding="sm">
            <LiveTape trades={merged} loading={isLoading} />
          </GlassCard>
        </div>
        {!compact && !propSymbol && (
          <div>
            <NetFlowLeaderboard trades={merged} />
          </div>
        )}
      </div>
    </div>
  );
});
