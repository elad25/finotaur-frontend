// ============================================================
// PAGE 3/7: SCREENER — All Discovery Tools
// Consolidates: Screener, Sectors/Categories, Exchanges
// Tabs: Scanner | Sectors | Exchanges
// ============================================================

import { memo, useMemo, useState, useCallback } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { useTopCoins, useCategories, useExchanges } from './_shared/hooks';
import { GlassCard, GlassTabs, SectionHeader, GlassTableSkeleton, EmptyState } from './_shared/GlassUI';
import { formatPrice, formatPercent, formatCompact, getPriceColor, calcVolMcapRatio, formatRatio } from './_shared/formatters';

const PAGE_TABS = [
  { id: 'scanner', label: '🔍 Scanner' },
  { id: 'sectors', label: '📂 Sectors' },
  { id: 'exchanges', label: '🏦 Exchanges' },
];
const PRESETS = [
  { id: 'none', label: 'Custom', icon: '⚙️' },
  { id: 'oversold', label: 'Oversold Bounce', icon: '📉' },
  { id: 'breakout', label: 'Breakout Watch', icon: '🚀' },
  { id: 'volume', label: 'Volume Spike', icon: '⚡' },
  { id: 'deep', label: 'Deep Value (ATH -80%+)', icon: '💎' },
];
const CAPS: Record<string, [number, number]> = { micro: [0, 50e6], small: [50e6, 500e6], mid: [500e6, 5e9], large: [5e9, Infinity] };

// ── Scanner Tab ──────────────────────────────────────────────
const ScannerTab = memo(function ScannerTab() {
  const { data: coins, loading } = useTopCoins(1, 100, false);
  const [preset, setPreset] = useState('none');
  const [maxATH, setMaxATH] = useState<number | ''>('');
  const [minVR, setMinVR] = useState<number | ''>('');
  const [cap, setCap] = useState('all');
  const [chMin, setChMin] = useState<number | ''>('');
  const [chMax, setChMax] = useState<number | ''>('');

  const applyPreset = useCallback((id: string) => {
    setPreset(id); setMaxATH(''); setMinVR(''); setCap('all'); setChMin(''); setChMax('');
    if (id === 'oversold') setChMax(-10);
    if (id === 'breakout') setMinVR(0.15);
    if (id === 'volume') setMinVR(0.2);
    if (id === 'deep') setMaxATH(-80);
  }, []);

  const filtered = useMemo(() => {
    if (!coins) return [];
    return coins.filter(c => {
      if (cap !== 'all') { const [mn, mx] = CAPS[cap] || [0, Infinity]; if (c.market_cap < mn || c.market_cap >= mx) return false; }
      if (maxATH !== '' && c.ath_change_percentage != null && c.ath_change_percentage > Number(maxATH)) return false;
      if (minVR !== '') { const r = calcVolMcapRatio(c.total_volume, c.market_cap); if (!r || r < Number(minVR)) return false; }
      const ch = c.price_change_percentage_24h || 0;
      if (chMin !== '' && ch < Number(chMin)) return false;
      if (chMax !== '' && ch > Number(chMax)) return false;
      return true;
    });
  }, [coins, cap, maxATH, minVR, chMin, chMax]);

  const Inp = ({ label, value, onChange, ph }: any) => (
    <div><label className="text-[10px] text-white/30 uppercase block mb-1">{label}</label><input type="number" value={value} onChange={(e: any) => { onChange(e.target.value === '' ? '' : Number(e.target.value)); setPreset('none'); }} placeholder={ph} className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30 font-mono" /></div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">{PRESETS.map(p => <button key={p.id} onClick={() => applyPreset(p.id)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${preset === p.id ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'}`}>{p.icon} {p.label}</button>)}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <div><label className="text-[10px] text-white/30 uppercase block mb-1">Market Cap</label><select value={cap} onChange={e => { setCap(e.target.value); setPreset('none'); }} className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30"><option value="all">All</option><option value="micro">Micro</option><option value="small">Small</option><option value="mid">Mid</option><option value="large">Large</option></select></div>
        <Inp label="ATH Max %" value={maxATH} onChange={setMaxATH} ph="-80" />
        <Inp label="Min Vol/MCap" value={minVR} onChange={setMinVR} ph="0.15" />
        <Inp label="24h Min %" value={chMin} onChange={setChMin} ph="-10" />
        <Inp label="24h Max %" value={chMax} onChange={setChMax} ph="50" />
      </div>
      <div className="text-[11px] text-white/30">{filtered.length} coins match</div>
      {loading ? <GlassTableSkeleton rows={15} /> : filtered.length === 0 ? <EmptyState icon="🔍" title="No matches" description="Widen criteria" /> : (
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]"><th className="text-left py-2 px-2 font-medium">#</th><th className="text-left py-2 px-2 font-medium">Coin</th><th className="text-right py-2 px-2 font-medium">Price</th><th className="text-right py-2 px-2 font-medium">24h</th><th className="text-right py-2 px-2 font-medium hidden md:table-cell">MCap</th><th className="text-right py-2 px-2 font-medium hidden lg:table-cell">Vol/MCap</th><th className="text-right py-2 px-2 font-medium hidden lg:table-cell">ATH</th></tr></thead><tbody>
          {filtered.map((c, i) => { const vr = calcVolMcapRatio(c.total_volume, c.market_cap); return <tr key={c.id} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors cursor-pointer"><td className="py-1.5 px-2 text-white/25 font-mono text-[11px]">{c.market_cap_rank ?? i + 1}</td><td className="py-1.5 px-2"><div className="flex items-center gap-1.5">{c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" loading="lazy" />}<span className="text-white/80 text-xs">{c.name}</span></div></td><td className="py-1.5 px-2 text-right text-white/70 font-mono text-xs">{formatPrice(c.current_price)}</td><td className={`py-1.5 px-2 text-right font-mono text-xs ${getPriceColor(c.price_change_percentage_24h)}`}>{formatPercent(c.price_change_percentage_24h)}</td><td className="py-1.5 px-2 text-right text-white/40 font-mono text-xs hidden md:table-cell">{formatCompact(c.market_cap)}</td><td className="py-1.5 px-2 text-right font-mono text-xs hidden lg:table-cell"><span className={vr && vr > 0.15 ? 'text-amber-400' : 'text-white/25'}>{formatRatio(vr)}</span></td><td className="py-1.5 px-2 text-right text-red-400/50 font-mono text-xs hidden lg:table-cell">{c.ath_change_percentage != null ? `${c.ath_change_percentage.toFixed(0)}%` : '—'}</td></tr>; })}
        </tbody></table></div>
      )}
    </div>
  );
});

// ── Sectors Tab ──────────────────────────────────────────────
const SectorsTab = memo(function SectorsTab() {
  const { data: cats, loading } = useCategories();
  const sorted = useMemo(() => cats?.filter(c => c.market_cap > 0).sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0)).slice(0, 40) || [], [cats]);
  const { top, bottom } = useMemo(() => {
    if (!cats) return { top: [], bottom: [] };
    const v = cats.filter(c => c.market_cap_change_24h != null).sort((a, b) => (b.market_cap_change_24h || 0) - (a.market_cap_change_24h || 0));
    return { top: v.slice(0, 5), bottom: v.slice(-5).reverse() };
  }, [cats]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GlassCard padding="sm" glow="emerald"><SectionHeader title="🟢 Money Flowing In" />{top.map(c => <div key={c.id} className="flex justify-between py-1 px-1"><span className="text-[11px] text-white/60">{c.name}</span><span className="text-[11px] text-emerald-400 font-mono font-bold">{formatPercent(c.market_cap_change_24h)}</span></div>)}</GlassCard>
        <GlassCard padding="sm" glow="red"><SectionHeader title="🔴 Money Flowing Out" />{bottom.map(c => <div key={c.id} className="flex justify-between py-1 px-1"><span className="text-[11px] text-white/60">{c.name}</span><span className="text-[11px] text-red-400 font-mono font-bold">{formatPercent(c.market_cap_change_24h)}</span></div>)}</GlassCard>
      </div>
      {loading ? <GlassTableSkeleton rows={15} /> : (
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]"><th className="text-left py-2 px-2 font-medium">Category</th><th className="text-right py-2 px-2 font-medium">MCap</th><th className="text-right py-2 px-2 font-medium">24h</th><th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Volume</th><th className="text-left py-2 px-2 font-medium hidden md:table-cell">Top 3</th></tr></thead><tbody>
          {sorted.map(c => <tr key={c.id} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors cursor-pointer"><td className="py-2 px-2 text-white/70 text-xs">{c.name}</td><td className="py-2 px-2 text-right text-white/50 font-mono text-xs">{formatCompact(c.market_cap)}</td><td className={`py-2 px-2 text-right font-mono text-xs font-bold ${getPriceColor(c.market_cap_change_24h)}`}>{formatPercent(c.market_cap_change_24h)}</td><td className="py-2 px-2 text-right text-white/30 font-mono text-xs hidden sm:table-cell">{formatCompact(c.volume_24h)}</td><td className="py-2 px-2 hidden md:table-cell"><div className="flex gap-1">{c.top_3_coins?.slice(0, 3).map((img, i) => <img key={i} src={img} alt="" className="w-4 h-4 rounded-full" loading="lazy" />)}</div></td></tr>)}
        </tbody></table></div>
      )}
    </div>
  );
});

// ── Exchanges Tab ────────────────────────────────────────────
const ExchangesTab = memo(function ExchangesTab() {
  const { data: exchanges, loading } = useExchanges();
  const sorted = useMemo(() => exchanges?.sort((a, b) => (b.trade_volume_24h_btc || 0) - (a.trade_volume_24h_btc || 0)).slice(0, 30) || [], [exchanges]);
  const TrustBadge = ({ score }: { score: number }) => { const cls = score >= 8 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : score >= 5 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'; return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cls}`}>{score}/10</span>; };
  return loading ? <GlassTableSkeleton rows={15} /> : (
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]"><th className="text-left py-2 px-2 font-medium">#</th><th className="text-left py-2 px-2 font-medium">Exchange</th><th className="text-center py-2 px-2 font-medium">Trust</th><th className="text-right py-2 px-2 font-medium">Volume (BTC)</th><th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Year</th><th className="text-left py-2 px-2 font-medium hidden md:table-cell">Country</th></tr></thead><tbody>
      {sorted.map((ex, i) => <tr key={ex.id} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors"><td className="py-2 px-2 text-white/25 font-mono text-[11px]">{ex.trust_score_rank || i + 1}</td><td className="py-2 px-2"><div className="flex items-center gap-1.5">{ex.image && <img src={ex.image} alt="" className="w-4 h-4 rounded-full" />}<a href={ex.url} target="_blank" rel="noopener noreferrer" className="text-white/70 text-xs hover:text-cyan-400 transition-colors">{ex.name}</a></div></td><td className="py-2 px-2 text-center"><TrustBadge score={ex.trust_score || 0} /></td><td className="py-2 px-2 text-right text-white/60 font-mono text-xs">{ex.trade_volume_24h_btc?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '—'}</td><td className="py-2 px-2 text-right text-white/25 text-xs hidden sm:table-cell">{ex.year_established || '—'}</td><td className="py-2 px-2 text-white/25 text-xs hidden md:table-cell">{ex.country || '—'}</td></tr>)}
    </tbody></table></div>
  );
});

// ── Main ─────────────────────────────────────────────────────
function CryptoScreenerContent() {
  const [tab, setTab] = useState('scanner');
  return (
    <div className="space-y-4">
      <GlassTabs tabs={PAGE_TABS} active={tab} onChange={setTab} />
      <GlassCard padding="sm">
        {tab === 'scanner' && <ScannerTab />}
        {tab === 'sectors' && <SectorsTab />}
        {tab === 'exchanges' && <ExchangesTab />}
      </GlassCard>
    </div>
  );
}

export default function CryptoScreener({ embedded = false }: { embedded?: boolean }) {
  if (embedded) {
    return <CryptoScreenerContent />;
  }

  return (
    <PageTemplate title="Market Scanner" description="Find opportunities across crypto markets" centered>
      <CryptoScreenerContent />
    </PageTemplate>
  );
}
