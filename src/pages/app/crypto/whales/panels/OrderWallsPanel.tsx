// src/pages/app/crypto/whales/panels/OrderWallsPanel.tsx
// Order Book Walls panel — global view (biggest walls across all assets) and
// per-asset view (bid/ask ladder + daily chart with wall overlays).

import { memo, useState } from 'react';
import {
  GlassCard,
  GlassTabs,
  SectionHeader,
  EmptyState,
  GlassTableSkeleton,
} from '../../_shared/GlassUI';
import { SizeBar } from '../components/SizeBar';
import { WallsDepthChart } from '../components/WallsDepthChart';
import { useWalls, useSymbolWalls } from '@/hooks/crypto/useWalls';
import { formatPrice, formatCompact, formatPercent } from '../../_shared/formatters';
import type { OrderWall } from '../../_shared/types';

// Universe of tracked symbols (Binance-style)
const UNIVERSE = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'DOTUSDT', 'LINKUSDT',
] as const;

const SYMBOL_TABS = [
  { id: 'all', label: 'All' },
  ...UNIVERSE.map(s => ({ id: s, label: s.replace('USDT', '') })),
];

interface OrderWallsPanelProps {
  symbol?: string;
  compact?: boolean;
}

// ── Global walls table ───────────────────────────────────────
function GlobalWallsTable() {
  const { data, isLoading } = useWalls();
  const walls: OrderWall[] = data ?? [];
  const maxNotional = walls.reduce((m, w) => Math.max(m, w.notionalUsd), 0);

  if (isLoading && walls.length === 0) {
    return (
      <GlassCard padding="sm">
        <SectionHeader title="Biggest Walls — All Assets" />
        <GlassTableSkeleton rows={8} />
      </GlassCard>
    );
  }

  if (!isLoading && walls.length === 0) {
    return (
      <GlassCard>
        <EmptyState icon="🧱" title="No large walls right now" description="Large resting limit orders will appear here when detected." />
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="sm">
      <SectionHeader title="Biggest Walls — All Assets" subtitle="Top resting limit orders by notional value" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/30 uppercase tracking-wider text-[10px]">
              <th className="text-left py-2 px-2 font-medium">Symbol</th>
              <th className="text-left py-2 px-2 font-medium">Side</th>
              <th className="text-right py-2 px-2 font-medium">Price</th>
              <th className="text-right py-2 px-2 font-medium">Size</th>
              <th className="text-right py-2 px-2 font-medium">Notional</th>
              <th className="text-right py-2 px-2 font-medium">Distance</th>
            </tr>
          </thead>
          <tbody>
            {walls.map((wall, i) => (
              <WallRow key={`${wall.symbol}-${wall.side}-${wall.price}-${i}`} wall={wall} maxNotional={maxNotional} />
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// ── Single wall row ──────────────────────────────────────────
const WallRow = memo(function WallRow({
  wall,
  maxNotional,
}: {
  wall: OrderWall;
  maxNotional: number;
}) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-2 px-2 font-mono text-white/70 font-medium">
        {wall.symbol.replace('USDT', '')}
      </td>
      <td className="py-2 px-2">
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            wall.side === 'bid'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-red-500/15 text-red-400'
          }`}
        >
          {wall.side === 'bid' ? 'BID' : 'ASK'}
        </span>
      </td>
      <td className="py-2 px-2 text-right font-mono text-white/80">
        {formatPrice(wall.price)}
      </td>
      <td className="py-2 px-2 text-right font-mono text-white/60">
        {wall.qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </td>
      <td className="py-2 px-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <SizeBar
            value={wall.notionalUsd}
            max={maxNotional}
            side={wall.side === 'bid' ? 'buy' : 'sell'}
          />
          <span className="font-mono text-white/70 w-16 text-right">
            {formatCompact(wall.notionalUsd)}
          </span>
        </div>
      </td>
      <td className="py-2 px-2 text-right font-mono text-white/50">
        {wall.distancePct != null ? formatPercent(wall.distancePct) : '—'}
      </td>
    </tr>
  );
});

// ── Per-symbol bid/ask table ─────────────────────────────────
function SymbolWallsTable({
  walls,
  side,
}: {
  walls: OrderWall[];
  side: 'bid' | 'ask';
}) {
  const maxNotional = walls.reduce((m, w) => Math.max(m, w.notionalUsd), 0);
  const label = side === 'bid' ? 'Bid Walls (Support)' : 'Ask Walls (Resistance)';
  const headerColor = side === 'bid' ? 'text-emerald-400' : 'text-red-400';

  if (walls.length === 0) {
    return (
      <GlassCard padding="sm">
        <p className={`text-xs font-semibold mb-3 ${headerColor}`}>{label}</p>
        <p className="text-xs text-white/30 py-4 text-center">No {side} walls detected</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="sm">
      <p className={`text-xs font-semibold mb-3 ${headerColor}`}>{label}</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/30 uppercase tracking-wider text-[10px]">
            <th className="text-right py-1.5 px-1 font-medium">Price</th>
            <th className="text-right py-1.5 px-1 font-medium">Size</th>
            <th className="text-right py-1.5 px-1 font-medium">Notional</th>
            <th className="text-right py-1.5 px-1 font-medium">Distance</th>
          </tr>
        </thead>
        <tbody>
          {walls.map((wall, i) => (
            <tr
              key={`${wall.price}-${i}`}
              className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-1.5 px-1 text-right font-mono text-white/80">
                {formatPrice(wall.price)}
              </td>
              <td className="py-1.5 px-1 text-right font-mono text-white/60 text-[11px]">
                {wall.qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </td>
              <td className="py-1.5 px-1 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <SizeBar
                    value={wall.notionalUsd}
                    max={maxNotional}
                    side={wall.side === 'bid' ? 'buy' : 'sell'}
                  />
                  <span className="font-mono text-white/70 text-[11px] w-14 text-right">
                    {formatCompact(wall.notionalUsd)}
                  </span>
                </div>
              </td>
              <td className="py-1.5 px-1 text-right font-mono text-white/50 text-[11px]">
                {wall.distancePct != null ? formatPercent(wall.distancePct) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}

// ── Per-asset view ───────────────────────────────────────────
function AssetWallsView({ symbol }: { symbol: string }) {
  const { data, isLoading } = useSymbolWalls(symbol);
  const bids = data?.bids ?? [];
  const asks = data?.asks ?? [];
  const midPrice = data?.midPrice ?? null;

  if (isLoading && !data) {
    return (
      <div className="space-y-3">
        <GlassCard padding="sm"><GlassTableSkeleton rows={5} /></GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Daily chart with wall overlays */}
      <WallsDepthChart
        symbol={symbol}
        walls={{ bids, asks }}
        midPrice={midPrice}
      />
      {/* Bid / Ask tables side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SymbolWallsTable walls={bids} side="bid" />
        <SymbolWallsTable walls={asks} side="ask" />
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────
export const OrderWallsPanel = memo(function OrderWallsPanel({
  symbol: propSymbol,
  compact: _compact,
}: OrderWallsPanelProps) {
  const [selected, setSelected] = useState<string>(propSymbol ?? 'all');

  return (
    <div className="space-y-3">
      {/* Symbol selector */}
      <div className="overflow-x-auto">
        <GlassTabs
          tabs={propSymbol ? [{ id: propSymbol, label: propSymbol.replace('USDT', '') }] : SYMBOL_TABS}
          active={selected}
          onChange={setSelected}
        />
      </div>

      {/* Content */}
      {selected === 'all' ? (
        <GlobalWallsTable />
      ) : (
        <AssetWallsView symbol={selected} />
      )}
    </div>
  );
});
