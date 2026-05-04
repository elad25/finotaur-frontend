// ============================================================
// PAGE 1/7: OVERVIEW — The Crypto Dashboard
// Consolidates: Dashboard, LiveTicker, Top Movers, Heatmap,
//   Trending, Volume Spikes, Market Breadth
// ============================================================

import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { useGlobalData, useTopCoins, useTrending, useFearGreed } from './_shared/hooks';
import { GlassCard, GlassStat, GlassTabs, SectionHeader, FearGreedGauge, Sparkline, GlassStatSkeleton, GlassTableSkeleton, EmptyState } from './_shared/GlassUI';
import { formatPrice, formatCompact, formatPercent, formatCompactNum, getPriceColor, calcVolMcapRatio, formatRatio } from './_shared/formatters';

// ── Live Ticker (scrolling price bar) ────────────────────────
const LiveTicker = memo(function LiveTicker() {
  const { data: coins } = useTopCoins(1, 20, false);
  const items = useMemo(() => coins?.slice(0, 20) || [], [coins]);
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div className="w-full overflow-hidden bg-white/[0.02] border border-white/[0.04] rounded-xl py-2 mb-4">
      <div className="flex hover:[animation-play-state:paused]" style={{ animation: 'ticker 60s linear infinite', width: `${doubled.length * 160}px` }}>
        {doubled.map((c, i) => (
          <div key={`${c.id}-${i}`} className="flex items-center gap-1.5 px-3 flex-shrink-0" style={{ width: 160 }}>
            {c.image && <img src={c.image} alt="" className="w-3.5 h-3.5 rounded-full" loading="lazy" />}
            <span className="text-[10px] text-white/50 font-medium uppercase">{c.symbol}</span>
            <span className="text-[10px] text-white/70 font-mono">{formatPrice(c.current_price)}</span>
            <span className={`text-[9px] font-mono ${getPriceColor(c.price_change_percentage_24h)}`}>{formatPercent(c.price_change_percentage_24h)}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
});

// ── Market Stats Bar ─────────────────────────────────────────
const MarketStatsBar = memo(function MarketStatsBar() {
  const { data: global, loading: gLoad } = useGlobalData();
  const { data: fg, loading: fgLoad } = useFearGreed();
  const { data: coins } = useTopCoins(1, 100, false);

  const breadth = useMemo(() => {
    if (!coins) return { g: 0, l: 0, t: 0 };
    let g = 0, l = 0;
    coins.forEach(c => { const ch = c.price_change_percentage_24h || 0; if (ch > 0.5) g++; else if (ch < -0.5) l++; });
    return { g, l, t: coins.length };
  }, [coins]);

  if (gLoad) return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">{Array.from({ length: 6 }).map((_, i) => <GlassStatSkeleton key={i} />)}</div>;

  const d = global?.data;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <GlassStat label="Total Market Cap" value={formatCompact(d?.total_market_cap?.usd)} change={d?.market_cap_change_percentage_24h_usd} />
      <GlassStat label="Volume 24h" value={formatCompact(d?.total_volume?.usd)} />
      <GlassStat label="BTC Dominance" value={`${(d?.market_cap_percentage?.btc || 0).toFixed(1)}%`} />
      <GlassStat label="ETH Dominance" value={`${(d?.market_cap_percentage?.eth || 0).toFixed(1)}%`} />
      <GlassStat label="Market Breadth" value={`${breadth.g}🟢 ${breadth.l}🔴`} subValue={`of ${breadth.t} coins`} />
      <FearGreedGauge value={fg?.value ?? 50} label={fg?.value_classification ?? '...'} loading={fgLoad} />
    </div>
  );
});

// ── Top Coins Table ──────────────────────────────────────────
const TopCoinsTable = memo(function TopCoinsTable() {
  const { data: coins, loading } = useTopCoins(1, 50, true);
  const [sortKey, setSortKey] = useState<string>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!coins) return [];
    const s = [...coins];
    s.sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case 'price': av = a.current_price; bv = b.current_price; break;
        case '24h': av = a.price_change_percentage_24h || 0; bv = b.price_change_percentage_24h || 0; break;
        case 'mcap': av = a.market_cap; bv = b.market_cap; break;
        case 'vol': av = a.total_volume; bv = b.total_volume; break;
        default: av = a.market_cap_rank ?? 999; bv = b.market_cap_rank ?? 999;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return s;
  }, [coins, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'rank' ? 'asc' : 'desc'); }
  };

  const SH = ({ k, label, right }: { k: string; label: string; right?: boolean }) => (
    <th className={`py-2 px-2 font-medium cursor-pointer hover:text-white/50 transition-colors ${right ? 'text-right' : 'text-left'}`} onClick={() => toggleSort(k)}>
      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <GlassCard padding="sm">
      <SectionHeader title="Top 50 Cryptocurrencies" subtitle="Click column headers to sort" />
      {loading ? <GlassTableSkeleton rows={15} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]">
              <SH k="rank" label="#" />
              <th className="text-left py-2 px-2 font-medium">Coin</th>
              <SH k="price" label="Price" right />
              <SH k="24h" label="24h" right />
              <th className="text-right py-2 px-2 font-medium hidden md:table-cell">7d</th>
              <SH k="mcap" label="MCap" right />
              <SH k="vol" label="Volume" right />
              <th className="text-right py-2 px-2 font-medium hidden lg:table-cell">Vol/MCap</th>
              <th className="text-right py-2 px-2 font-medium hidden xl:table-cell w-20">7d</th>
            </tr></thead>
            <tbody>
              {sorted.map(c => {
                const vr = calcVolMcapRatio(c.total_volume, c.market_cap);
                return (
                  <tr key={c.id} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors cursor-pointer">
                    <td className="py-2 px-2 text-white/25 font-mono text-[11px]">{c.market_cap_rank}</td>
                    <td className="py-2 px-2"><div className="flex items-center gap-2">{c.image && <img src={c.image} alt="" className="w-5 h-5 rounded-full" loading="lazy" />}<span className="text-white/85 text-xs font-medium">{c.name}</span><span className="text-white/20 text-[10px] uppercase ml-1">{c.symbol}</span></div></td>
                    <td className="py-2 px-2 text-right text-white/80 font-mono text-xs">{formatPrice(c.current_price)}</td>
                    <td className={`py-2 px-2 text-right font-mono text-xs font-semibold ${getPriceColor(c.price_change_percentage_24h)}`}>{formatPercent(c.price_change_percentage_24h)}</td>
                    <td className={`py-2 px-2 text-right font-mono text-xs hidden md:table-cell ${getPriceColor(c.price_change_percentage_7d_in_currency)}`}>{formatPercent(c.price_change_percentage_7d_in_currency)}</td>
                    <td className="py-2 px-2 text-right text-white/50 font-mono text-xs">{formatCompact(c.market_cap)}</td>
                    <td className="py-2 px-2 text-right text-white/40 font-mono text-xs">{formatCompact(c.total_volume)}</td>
                    <td className="py-2 px-2 text-right font-mono text-xs hidden lg:table-cell"><span className={vr && vr > 0.15 ? 'text-amber-400' : 'text-white/25'}>{formatRatio(vr)}</span></td>
                    <td className="py-2 px-2 text-right hidden xl:table-cell">{c.sparkline_in_7d?.price && <Sparkline data={c.sparkline_in_7d.price} width={64} height={22} className="ml-auto" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
});

// ── Trending + Volume Anomalies sidebar ──────────────────────
const SidebarWidgets = memo(function SidebarWidgets() {
  const { data: trending, loading: tLoad } = useTrending();
  const { data: coins } = useTopCoins(1, 100, false);

  const volumeSpikes = useMemo(() => {
    if (!coins) return [];
    return coins.filter(c => { const vr = calcVolMcapRatio(c.total_volume, c.market_cap); return vr && vr > 0.2; })
      .sort((a, b) => (calcVolMcapRatio(b.total_volume, b.market_cap) || 0) - (calcVolMcapRatio(a.total_volume, a.market_cap) || 0))
      .slice(0, 8);
  }, [coins]);

  const gainers = useMemo(() => coins?.slice().sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0, 5) || [], [coins]);
  const losers = useMemo(() => coins?.slice().sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0)).slice(0, 5) || [], [coins]);

  return (
    <div className="space-y-3">
      {/* Gainers/Losers */}
      <GlassCard padding="sm" glow="emerald">
        <SectionHeader title="🟢 Top Gainers 24h" />
        {gainers.map(c => (
          <div key={c.id} className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-1.5">{c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" />}<span className="text-[11px] text-white/70">{c.symbol.toUpperCase()}</span></div>
            <span className="text-[11px] text-emerald-400 font-mono font-bold">{formatPercent(c.price_change_percentage_24h)}</span>
          </div>
        ))}
      </GlassCard>

      <GlassCard padding="sm" glow="red">
        <SectionHeader title="🔴 Top Losers 24h" />
        {losers.map(c => (
          <div key={c.id} className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-1.5">{c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" />}<span className="text-[11px] text-white/70">{c.symbol.toUpperCase()}</span></div>
            <span className="text-[11px] text-red-400 font-mono font-bold">{formatPercent(c.price_change_percentage_24h)}</span>
          </div>
        ))}
      </GlassCard>

      {/* Trending */}
      <GlassCard padding="sm">
        <SectionHeader title="🔥 Trending" />
        {tLoad ? <GlassTableSkeleton rows={5} /> : trending?.slice(0, 8).map((t: any) => (
          <div key={t.item.id} className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-1.5">{t.item.thumb && <img src={t.item.thumb} alt="" className="w-4 h-4 rounded-full" />}<span className="text-[11px] text-white/70">{t.item.name}</span></div>
            <span className="text-[10px] text-white/25 uppercase">{t.item.symbol}</span>
          </div>
        ))}
      </GlassCard>

      {/* Volume Anomalies */}
      <GlassCard padding="sm" glow="amber">
        <SectionHeader title="⚡ Volume Spikes" subtitle="Vol/MCap > 20%" />
        {volumeSpikes.length === 0 ? <p className="text-[11px] text-white/25">No anomalies detected</p> : volumeSpikes.map(c => (
          <div key={c.id} className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-1.5">{c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" />}<span className="text-[11px] text-white/70">{c.symbol.toUpperCase()}</span></div>
            <span className="text-[11px] text-amber-400 font-mono font-bold">{formatRatio(calcVolMcapRatio(c.total_volume, c.market_cap))}</span>
          </div>
        ))}
      </GlassCard>
    </div>
  );
});

// ── Mini Heatmap ─────────────────────────────────────────────
const MiniHeatmap = memo(function MiniHeatmap() {
  const { data: coins } = useTopCoins(1, 50, false);
  const tiles = useMemo(() => {
    if (!coins) return [];
    return coins.slice(0, 40).map(c => ({
      id: c.id, symbol: c.symbol, change: c.price_change_percentage_24h || 0,
      size: Math.sqrt(c.market_cap || 0),
    }));
  }, [coins]);

  if (tiles.length === 0) return null;
  const maxSize = Math.max(...tiles.map(t => t.size));

  const getColor = (ch: number) => {
    if (ch >= 8) return 'bg-emerald-500/70';
    if (ch >= 3) return 'bg-emerald-500/40';
    if (ch >= 0.5) return 'bg-emerald-500/20';
    if (ch >= -0.5) return 'bg-white/[0.06]';
    if (ch >= -3) return 'bg-red-500/20';
    if (ch >= -8) return 'bg-red-500/40';
    return 'bg-red-500/70';
  };

  return (
    <GlassCard padding="sm">
      <SectionHeader title="Market Heatmap" subtitle="Size = market cap • Color = 24h change" />
      <div className="flex flex-wrap gap-1">
        {tiles.map(t => {
          const norm = Math.max(28, (t.size / maxSize) * 80);
          return (
            <div key={t.id} className={`rounded-md flex items-center justify-center ${getColor(t.change)} transition-colors cursor-pointer group relative`}
              style={{ width: norm, height: norm, minWidth: 28 }}>
              <span className="text-[8px] text-white/60 font-bold uppercase leading-none">{t.symbol}</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-black/90 text-[9px] text-white/80 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {t.symbol.toUpperCase()} {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
});

// ── Main Page ────────────────────────────────────────────────
export default function CryptoOverview() {
  return (
    <PageTemplate title="Crypto Dashboard" description="Live crypto market snapshot">
      <div className="space-y-4">
        <LiveTicker />
        <MarketStatsBar />
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-3 space-y-4">
            <TopCoinsTable />
            <MiniHeatmap />
          </div>
          <SidebarWidgets />
        </div>
      </div>
    </PageTemplate>
  );
}
