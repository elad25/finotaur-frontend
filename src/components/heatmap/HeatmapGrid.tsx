import { useMemo } from 'react';
import type { MarketKey, HeatmapItem } from '../../types/heatmap';
import { useHeatmap } from '../../hooks/useHeatmap';

function tileColor(pct: number, market: MarketKey) {
  const ranges: Record<MarketKey, number> = { stocks: 5, indices: 2, crypto: 15, futures: 3, forex: 1.5, commodities: 4 };
  const max = ranges[market];
  const clamped = Math.max(-max, Math.min(max, pct));
  const n = clamped / max; // -1..1
  const r = n < 0 ? 200 : Math.floor(200 - 160 * n);
  const g = n > 0 ? 200 : Math.floor(200 + 160 * n);
  const b = 185;
  return `rgb(${r},${g},${b})`;
}

export default function HeatmapGrid({ market }: { market: MarketKey }) {
  const { data, isLoading, error } = useHeatmap(market);

  const items = data?.items ?? [];
  const weights = items.map(i => i.weight ?? 1);
  const minW = Math.min(...weights, 1);
  const maxW = Math.max(...weights, 1);
  const norm = (w: number) => { if (maxW === minW) return 1; return 1 + 3 * (w - minW) / (maxW - minW); };

  const tiles = useMemo(() => items.map((it) => ({ ...it, area: Math.round(norm(it.weight ?? 1)) })), [data]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading {market} heatmap…</div>;
  if (error) return <div className="p-6 text-sm text-red-500">Failed to load heatmap.</div>;

  return (
    <div className="px-4 py-4">
      <div className="mb-2 text-xs text-muted-foreground">
        Last updated: {data ? new Date(data.asOf).toLocaleString() : '-'}
        {data?.stale ? <span className="ml-2 text-amber-400">stale</span> : null}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(12, minmax(0,1fr))' }}>
        {tiles.map((t: HeatmapItem) => {
          const colSpan = Math.min(12, Math.max(2, t.area * 2));
          const bg = tileColor(t.changePercent, market);
          return (
            <div
              key={t.symbol}
              className="rounded-xl p-3 shadow-sm border border-border/40 overflow-hidden"
              style={{ gridColumn: `span ${colSpan} / span ${colSpan}`, background: bg }}
              title={`${t.name} (${t.symbol}) • ${t.changePercent.toFixed(2)}%`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{t.symbol}</div>
                <div className="text-xs">{t.changePercent.toFixed(2)}%</div>
              </div>
              <div className="text-xs opacity-80">{t.name}</div>
              <div className="text-xs opacity-80">Price: {t.price}</div>
              {t.group ? <div className="text-[11px] opacity-70">{t.group}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
