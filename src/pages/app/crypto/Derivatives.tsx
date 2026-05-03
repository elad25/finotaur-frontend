// ============================================================
// PAGE 4/7: DERIVATIVES — All Futures & Derivatives Data
// Consolidates: Funding Rates, Liquidations, OI, Long/Short
// ============================================================

import { memo, useMemo, useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { useFundingRates } from './_shared/hooks';
import { GlassCard, GlassStat, GlassTabs, SectionHeader, SignalBadge, GlassTableSkeleton, EmptyState } from './_shared/GlassUI';

const TABS = [
  { id: 'funding', label: '💰 Funding Rates' },
  { id: 'liquidations', label: '💧 Liquidations' },
  { id: 'oi', label: '📊 Open Interest' },
];

// ── Funding Rates Tab ────────────────────────────────────────
const FundingTab = memo(function FundingTab() {
  const { data: rates, loading } = useFundingRates();
  const [sort, setSort] = useState<'abs' | 'high' | 'low'>('abs');

  const sorted = useMemo(() => {
    if (!rates) return [];
    const s = [...rates];
    if (sort === 'high') s.sort((a, b) => b.fundingRate - a.fundingRate);
    else if (sort === 'low') s.sort((a, b) => a.fundingRate - b.fundingRate);
    else s.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));
    return s;
  }, [rates, sort]);

  const avg = useMemo(() => rates && rates.length > 0 ? rates.reduce((s, r) => s + r.fundingRate, 0) / rates.length * 100 : null, [rates]);
  const extremeH = sorted.filter(r => r.fundingRate * 100 > 0.05).length;
  const extremeL = sorted.filter(r => r.fundingRate * 100 < -0.03).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassStat label="Avg Market Funding" value={avg != null ? `${avg >= 0 ? '+' : ''}${avg.toFixed(4)}%` : '—'} loading={loading} />
        <GlassStat label="Extreme High (>0.05%)" value={`${extremeH} coins`} loading={loading} />
        <GlassStat label="Extreme Negative (<-0.03%)" value={`${extremeL} coins`} loading={loading} />
      </div>

      {avg != null && (
        <SignalBadge
          signal={avg > 0.03 ? 'bearish' : avg < -0.01 ? 'bullish' : 'neutral'}
          label="Market Funding Sentiment"
          value={avg > 0.03 ? 'Overheated Long' : avg < -0.01 ? 'Overcrowded Short' : 'Balanced'}
          description={avg > 0.03 ? 'Avg funding positive — longs pay shorts. Historical reversals at extreme levels.' : avg < -0.01 ? 'Avg funding negative — shorts overcrowded. Short squeeze potential.' : 'Balanced funding — no extreme market positioning detected.'}
          icon={avg > 0.03 ? '🔥' : avg < -0.01 ? '❄️' : '⚖️'}
        />
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/30">{sorted.length} contracts</span>
        <div className="flex gap-1">{[['abs', 'Extreme'], ['high', 'Highest'], ['low', 'Lowest']].map(([id, lbl]) => (
          <button key={id} onClick={() => setSort(id as any)} className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${sort === id ? 'bg-white/[0.1] text-white' : 'text-white/30 hover:text-white/60'}`}>{lbl}</button>
        ))}</div>
      </div>

      {loading ? <GlassTableSkeleton rows={20} /> : (
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]"><th className="text-left py-2 px-2 font-medium">Symbol</th><th className="text-right py-2 px-2 font-medium">Funding</th><th className="text-right py-2 px-2 font-medium">Annualized</th><th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Mark Price</th><th className="text-center py-2 px-2 font-medium">Signal</th></tr></thead><tbody>
          {sorted.slice(0, 50).map(r => {
            const pct = r.fundingRate * 100; const ann = pct * 3 * 365;
            const isH = pct > 0.05, isL = pct < -0.03;
            return <tr key={r.symbol} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors"><td className="py-1.5 px-2 text-white/60 text-xs font-medium">{r.symbol}</td><td className={`py-1.5 px-2 text-right font-mono text-xs font-bold ${isH ? 'text-red-400' : isL ? 'text-emerald-400' : 'text-white/40'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(4)}%</td><td className={`py-1.5 px-2 text-right font-mono text-xs ${Math.abs(ann) > 30 ? 'text-amber-400' : 'text-white/25'}`}>{ann >= 0 ? '+' : ''}{ann.toFixed(1)}%</td><td className="py-1.5 px-2 text-right font-mono text-xs text-white/30 hidden sm:table-cell">${r.markPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '—'}</td><td className="py-1.5 px-2 text-center">{isH ? <span className="text-red-400 text-[10px]">⚠️ HIGH</span> : isL ? <span className="text-emerald-400 text-[10px]">🟢 LOW</span> : <span className="text-white/15 text-[10px]">—</span>}</td></tr>;
          })}
        </tbody></table></div>
      )}
    </div>
  );
});

// ── Liquidations Tab ─────────────────────────────────────────
const LiquidationsTab = memo(function LiquidationsTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassStat label="Longs Liquidated 24h" value="—" icon={<span className="text-red-400">🔻</span>} />
        <GlassStat label="Shorts Liquidated 24h" value="—" icon={<span className="text-emerald-400">🔺</span>} />
        <GlassStat label="Largest Single" value="—" icon={<span>💥</span>} />
        <GlassStat label="Total 24h" value="—" icon={<span>📊</span>} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard glow="red"><SectionHeader title="🔴 Live Liquidation Feed" subtitle="Real-time from Binance WebSocket" /><EmptyState icon="💧" title="Connect WebSocket" description="Real-time liquidation events — symbol, side, size, price" /></GlassCard>
        <GlassCard glow="amber"><SectionHeader title="🎯 Liquidation Levels" subtitle="Price magnets from concentrated leverage" /><EmptyState icon="🧲" title="Connect OI + Leverage API" description="Price levels where forced liquidation cascades concentrate" /></GlassCard>
      </div>
      <SignalBadge signal="neutral" label="Liquidation Insight" value="Connect API" description="'Market liquidated $180M longs in 24h — this often marks local bottoms when combined with funding rate resets'" icon="💡" />
    </div>
  );
});

// ── Open Interest Tab ────────────────────────────────────────
const OITab = memo(function OITab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassStat label="BTC OI" value="—" subValue="Connect API" />
        <GlassStat label="ETH OI" value="—" subValue="Connect API" />
        <GlassStat label="Total OI Change 24h" value="—" />
        <GlassStat label="Top L/S Ratio" value="—" subValue="Connect API" />
      </div>
      <GlassCard><SectionHeader title="Open Interest Tracker" subtitle="Track money flowing into/out of futures" /><EmptyState icon="📊" title="Connect Binance Futures API" description="Rising OI + rising price = new money entering (bullish). Rising OI + falling price = shorts building. Falling OI = positions closing." /></GlassCard>
      <GlassCard><SectionHeader title="Long/Short Ratio" subtitle="Top traders vs retail positioning" /><EmptyState icon="⚖️" title="Connect L/S API" description="When >70% of traders are long, the crowd is usually wrong. Smart money often takes the opposite side." /></GlassCard>
    </div>
  );
});

// ── Main ─────────────────────────────────────────────────────
export default function CryptoDerivatives() {
  const [tab, setTab] = useState('funding');
  return (
    <PageTemplate title="Derivatives" description="Funding rates, liquidations, and open interest">
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={setTab} />
        <GlassCard padding="sm">
          {tab === 'funding' && <FundingTab />}
          {tab === 'liquidations' && <LiquidationsTab />}
          {tab === 'oi' && <OITab />}
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
