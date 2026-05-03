// ============================================================
// PAGE 2/7: COIN DETAIL — The Most Important Page
// Consolidates: Single Coin, Chart+Indicators, Signals,
//   Derivatives Insight, Fundamentals, Compare (as tab)
// ============================================================

import { memo, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageTemplate } from '@/components/PageTemplate';
import { useCoinDetail, useTopCoins, useTechnicalSignals, useFundingRates } from './_shared/hooks';
import { GlassCard, GlassStat, GlassTabs, SectionHeader, SignalBadge, Sparkline, EmptyState } from './_shared/GlassUI';
import { formatPrice, formatCompact, formatPercent, formatCompactNum, getPriceColor, formatDate, formatSupply, calcVolMcapRatio, formatRatio, clamp } from './_shared/formatters';
import type { KlineData, TechnicalSignal } from './_shared/types';

const INTERVALS = [
  { id: '5m', label: '5m' }, { id: '15m', label: '15m' }, { id: '1h', label: '1H' },
  { id: '4h', label: '4H' }, { id: '1d', label: '1D' }, { id: '1w', label: '1W' },
];
const TABS = [
  { id: 'chart', label: '📈 Chart & Signals' },
  { id: 'derivatives', label: '📊 Derivatives' },
  { id: 'fundamentals', label: '📋 Fundamentals' },
  { id: 'compare', label: '⚖️ Compare' },
];

// ── Quick Stats ──────────────────────────────────────────────
const QuickStats = memo(function QuickStats({ coin }: { coin: any }) {
  const md = coin?.market_data || coin;
  const changes = [
    { l: '1h', v: md?.price_change_percentage_1h_in_currency?.usd ?? md?.price_change_percentage_1h_in_currency },
    { l: '24h', v: md?.price_change_percentage_24h },
    { l: '7d', v: md?.price_change_percentage_7d_in_currency?.usd ?? md?.price_change_percentage_7d_in_currency },
    { l: '30d', v: md?.price_change_percentage_30d_in_currency?.usd ?? md?.price_change_percentage_30d_in_currency },
    { l: '1y', v: md?.price_change_percentage_1y_in_currency?.usd ?? null },
  ];
  const vr = calcVolMcapRatio(md?.total_volume, md?.market_cap);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {coin?.image?.large && <img src={coin.image.large} alt="" className="w-10 h-10 rounded-full" />}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white/95">{coin?.name || '—'}</h1>
            <span className="text-sm text-white/30 uppercase font-mono">{coin?.symbol}</span>
            {coin?.market_cap_rank && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 font-mono">#{coin.market_cap_rank}</span>}
          </div>
          {coin?.categories?.length > 0 && <div className="flex gap-1 mt-0.5 flex-wrap">{coin.categories.slice(0, 3).map((c: string) => <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400/60">{c}</span>)}</div>}
        </div>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <span className="text-2xl font-bold text-white/95 font-mono">{formatPrice(md?.current_price)}</span>
        <div className="flex gap-2">{changes.map(c => <div key={c.l} className="text-center"><span className="text-[9px] text-white/20 block">{c.l}</span><span className={`text-[11px] font-mono font-semibold ${getPriceColor(c.v)}`}>{formatPercent(c.v)}</span></div>)}</div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <GlassStat label="MCap" value={formatCompact(md?.market_cap)} />
        <GlassStat label="FDV" value={formatCompact(md?.fully_diluted_valuation)} />
        <GlassStat label="Vol 24h" value={formatCompact(md?.total_volume)} />
        <GlassStat label="Vol/MCap" value={formatRatio(vr)} />
        <GlassStat label="ATH" value={formatPrice(md?.ath)} change={md?.ath_change_percentage} />
        <GlassStat label="Supply" value={formatSupply(md?.circulating_supply, md?.max_supply || md?.total_supply)} />
      </div>
      {md?.circulating_supply && (md?.max_supply || md?.total_supply) && (
        <div><div className="flex justify-between text-[9px] text-white/25 mb-0.5"><span>Circulating: {formatCompactNum(md.circulating_supply)}</span><span>Max: {formatCompactNum(md.max_supply || md.total_supply)}</span></div><div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500/80 to-emerald-500/80 transition-all duration-700" style={{ width: `${clamp((md.circulating_supply / (md.max_supply || md.total_supply)) * 100, 0, 100)}%` }} /></div></div>
      )}
    </div>
  );
});

// ── Candlestick Chart ────────────────────────────────────────
const CandleChart = memo(function CandleChart({ klines }: { klines: KlineData[] }) {
  if (!klines?.length) return <EmptyState icon="📈" title="No chart data" />;
  const W = 800, H = 350, p = { t: 10, r: 55, b: 20, l: 5 };
  const cW = W - p.l - p.r, cH = H - p.t - p.b;
  const all = klines.flatMap(k => [k.high, k.low]);
  const mn = Math.min(...all), mx = Math.max(...all), rng = mx - mn || 1;
  const cndW = Math.max(1, (cW / klines.length) * 0.7), gap = (cW / klines.length) * 0.3;
  const toY = (pr: number) => p.t + cH - ((pr - mn) / rng) * cH;
  const lbls = Array.from({ length: 6 }, (_, i) => { const pr = mn + (rng / 5) * i; return { pr, y: toY(pr) }; });
  const last = klines[klines.length - 1].close;
  return (
    <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {lbls.map((l, i) => <g key={i}><line x1={p.l} y1={l.y} x2={W - p.r} y2={l.y} stroke="rgba(255,255,255,0.04)" /><text x={W - p.r + 4} y={l.y + 3} fill="rgba(255,255,255,0.2)" fontSize={8} fontFamily="monospace">{formatPrice(l.pr).replace('$', '')}</text></g>)}
      {klines.map((k, i) => { const x = p.l + i * (cndW + gap) + gap / 2; const bull = k.close >= k.open; const bT = toY(Math.max(k.open, k.close)); const bB = toY(Math.min(k.open, k.close)); const col = bull ? '#34d399' : '#f87171'; return <g key={i}><line x1={x + cndW / 2} y1={toY(k.high)} x2={x + cndW / 2} y2={toY(k.low)} stroke={col} strokeWidth={1} opacity={0.6} /><rect x={x} y={bT} width={cndW} height={Math.max(1, bB - bT)} fill={col} opacity={0.85} rx={0.5} /></g>; })}
      <line x1={p.l} y1={toY(last)} x2={W - p.r} y2={toY(last)} stroke="#22d3ee" strokeWidth={1} strokeDasharray="4 2" opacity={0.4} />
      <rect x={W - p.r} y={toY(last) - 7} width={50} height={14} rx={3} fill="#22d3ee" opacity={0.15} />
      <text x={W - p.r + 4} y={toY(last) + 3} fill="#22d3ee" fontSize={8} fontFamily="monospace">{formatPrice(last).replace('$', '')}</text>
    </svg>
  );
});

// ── Chart & Signals Tab ──────────────────────────────────────
const ChartSignalsTab = memo(function ChartSignalsTab({ symbol }: { symbol: string }) {
  const [interval, setInterval_] = useState('1h');
  const { signals, klines, loading } = useTechnicalSignals(`${symbol}USDT`, interval);
  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="flex items-center justify-between mb-2"><SectionHeader title="Price Chart" subtitle={`${symbol}/USDT`} /><GlassTabs tabs={INTERVALS} active={interval} onChange={setInterval_} /></div>
        {loading && !klines ? <div className="h-[350px] flex items-center justify-center text-white/20 text-sm">Loading...</div> : <CandleChart klines={klines || []} />}
      </GlassCard>
      <GlassCard glow="cyan">
        <SectionHeader title="⚡ Market Signals" subtitle="Auto-generated analysis" />
        {signals.length === 0 ? <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/[0.04] rounded-xl" />)}</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{signals.map(s => <SignalBadge key={s.id} signal={s.signal} label={s.label} value={s.value} description={s.description} icon={s.icon} />)}</div>
        )}
      </GlassCard>
    </div>
  );
});

// ── Derivatives Tab ──────────────────────────────────────────
const DerivativesTab = memo(function DerivativesTab({ symbol }: { symbol: string }) {
  const { data: rates } = useFundingRates();
  const fr = useMemo(() => { if (!rates) return null; return rates.find(f => f.symbol === `${symbol}USDT` || f.symbol === symbol); }, [rates, symbol]);
  const pct = fr ? fr.fundingRate * 100 : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassStat label="Funding Rate" value={pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(4)}%` : '—'} icon={<span>{pct != null && pct > 0.03 ? '🔥' : pct != null && pct < -0.03 ? '❄️' : '💰'}</span>} />
        <GlassStat label="Open Interest" value="—" subValue="Connect API" />
        <GlassStat label="Long/Short Ratio" value="—" subValue="Connect API" />
        <GlassStat label="Liquidations 24h" value="—" subValue="Connect API" />
      </div>
      {pct != null && (
        <GlassCard glow={Math.abs(pct) > 0.05 ? 'red' : 'none'}>
          <SectionHeader title="Derivatives Insight" />
          <p className="text-xs text-white/50 leading-relaxed">{pct > 0.05 ? `⚠️ Funding at ${pct.toFixed(4)}% — market overheated long. 73%+ of traders typically long at this level. Historical reversals occur above 0.05%.` : pct < -0.03 ? `🟢 Funding at ${pct.toFixed(4)}% — shorts overcrowded. Negative funding often precedes short squeezes within 24-72h.` : `ℹ️ Funding at ${pct.toFixed(4)}% — within normal range. No extreme positioning.`}</p>
        </GlassCard>
      )}
      <GlassCard>
        <SectionHeader title="🎯 Liquidation Levels" subtitle="Where leveraged positions cluster" />
        <EmptyState icon="🧲" title="Connect Liquidation API" description="Shows price magnets — levels where concentrated leverage creates forced liquidation cascades" />
      </GlassCard>
      <GlassCard>
        <SectionHeader title="📖 Order Book" subtitle="Bid/Ask imbalance & walls" />
        <EmptyState icon="📚" title="Connect WebSocket" description="Heatmap of buy/sell walls, Bid/Ask ratio, and spread analysis" />
      </GlassCard>
    </div>
  );
});

// ── Fundamentals Tab ─────────────────────────────────────────
const FundamentalsTab = memo(function FundamentalsTab({ coin }: { coin: any }) {
  if (!coin) return <EmptyState icon="📋" title="No data" />;
  const links = coin.links || {};
  const linkItems = [
    links.homepage?.[0] && { l: '🌐 Website', u: links.homepage[0] },
    links.repos_url?.github?.[0] && { l: '💻 GitHub', u: links.repos_url.github[0] },
    links.twitter_screen_name && { l: '𝕏 Twitter', u: `https://twitter.com/${links.twitter_screen_name}` },
    links.telegram_channel_identifier && { l: '✈️ Telegram', u: `https://t.me/${links.telegram_channel_identifier}` },
    links.subreddit_url && { l: '🔴 Reddit', u: links.subreddit_url },
  ].filter(Boolean) as { l: string; u: string }[];
  return (
    <div className="space-y-4">
      {coin.description?.en && <GlassCard><SectionHeader title="About" /><div className="text-xs text-white/40 leading-relaxed max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: coin.description.en.slice(0, 800) }} /></GlassCard>}
      <GlassCard>
        <SectionHeader title="Links & Community" />
        <div className="flex flex-wrap gap-2">{linkItems.map(l => <a key={l.u} href={l.u} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] text-white/50 text-[11px] hover:bg-white/[0.08] hover:text-white/70 transition-all">{l.l}</a>)}</div>
      </GlassCard>
      {coin.developer_data && <GlassCard><SectionHeader title="Developer Activity" /><div className="grid grid-cols-3 gap-3">{[['⭐ Stars', coin.developer_data.stars], ['🔀 Forks', coin.developer_data.forks], ['📝 Commits/4w', coin.developer_data.commit_count_4_weeks]].map(([l, v]: any) => <div key={l} className="text-center"><p className="text-[10px] text-white/25">{l}</p><p className="text-sm font-bold text-white/60 font-mono">{v?.toLocaleString() || '—'}</p></div>)}</div></GlassCard>}
    </div>
  );
});

// ── Compare Tab ──────────────────────────────────────────────
const CompareTab = memo(function CompareTab({ currentCoin }: { currentCoin: any }) {
  const { data: allCoins } = useTopCoins(1, 50, true);
  const [compareId, setCompareId] = useState('');
  const [search, setSearch] = useState('');

  const compareCoin = useMemo(() => allCoins?.find(c => c.id === compareId), [allCoins, compareId]);
  const searchResults = useMemo(() => {
    if (!allCoins || !search) return [];
    return allCoins.filter(c => (c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase())) && c.id !== currentCoin?.id).slice(0, 6);
  }, [allCoins, search, currentCoin]);

  const md = currentCoin?.market_data || currentCoin;
  const metrics = [
    { l: 'Price', a: formatPrice(md?.current_price), b: compareCoin ? formatPrice(compareCoin.current_price) : '—' },
    { l: '24h Change', a: formatPercent(md?.price_change_percentage_24h), b: compareCoin ? formatPercent(compareCoin.price_change_percentage_24h) : '—' },
    { l: 'Market Cap', a: formatCompact(md?.market_cap), b: compareCoin ? formatCompact(compareCoin.market_cap) : '—' },
    { l: 'Volume 24h', a: formatCompact(md?.total_volume), b: compareCoin ? formatCompact(compareCoin.total_volume) : '—' },
    { l: 'Vol/MCap', a: formatRatio(calcVolMcapRatio(md?.total_volume, md?.market_cap)), b: compareCoin ? formatRatio(calcVolMcapRatio(compareCoin.total_volume, compareCoin.market_cap)) : '—' },
    { l: 'ATH Distance', a: md?.ath_change_percentage != null ? `${md.ath_change_percentage.toFixed(1)}%` : '—', b: compareCoin?.ath_change_percentage != null ? `${compareCoin.ath_change_percentage.toFixed(1)}%` : '—' },
  ];

  return (
    <div className="space-y-4">
      <GlassCard padding="sm">
        <SectionHeader title="Compare With" />
        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search coin to compare..." className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30" />
          {searchResults.length > 0 && <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl bg-[#0f1117] border border-white/[0.08] shadow-xl max-h-40 overflow-y-auto">{searchResults.map(c => <button key={c.id} onClick={() => { setCompareId(c.id); setSearch(''); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] text-left">{c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" />}<span className="text-xs text-white/70">{c.name}</span><span className="text-[10px] text-white/30 uppercase">{c.symbol}</span></button>)}</div>}
        </div>
      </GlassCard>
      <GlassCard>
        <table className="w-full text-sm"><thead><tr className="border-b border-white/[0.04]"><th className="text-left py-2 px-3 text-[11px] text-white/30 font-medium">Metric</th><th className="text-right py-2 px-3 text-[11px] text-cyan-400/60 font-medium uppercase">{currentCoin?.symbol || '—'}</th><th className="text-right py-2 px-3 text-[11px] text-purple-400/60 font-medium uppercase">{compareCoin?.symbol || 'Select coin'}</th></tr></thead><tbody>
          {metrics.map(m => <tr key={m.l} className="border-b border-white/[0.02]"><td className="py-2 px-3 text-[11px] text-white/40">{m.l}</td><td className="py-2 px-3 text-right font-mono text-xs text-white/70">{m.a}</td><td className="py-2 px-3 text-right font-mono text-xs text-white/50">{m.b}</td></tr>)}
        </tbody></table>
        {compareCoin?.sparkline_in_7d?.price && currentCoin?.market_data?.sparkline_7d?.price && (
          <div className="grid grid-cols-2 gap-4 mt-3 px-3">
            <div className="text-center"><p className="text-[10px] text-cyan-400/50 mb-1">{currentCoin.symbol?.toUpperCase()} 7d</p><Sparkline data={currentCoin.market_data.sparkline_7d.price} width={140} height={40} className="mx-auto" /></div>
            <div className="text-center"><p className="text-[10px] text-purple-400/50 mb-1">{compareCoin.symbol.toUpperCase()} 7d</p><Sparkline data={compareCoin.sparkline_in_7d.price} width={140} height={40} className="mx-auto" /></div>
          </div>
        )}
      </GlassCard>
    </div>
  );
});

// ── Main Page ────────────────────────────────────────────────
export default function CoinDetail() {
  const { coinId } = useParams<{ coinId: string }>();
  const { data: coin, loading } = useCoinDetail(coinId || 'bitcoin');
  const [tab, setTab] = useState('chart');
  const symbol = coin?.symbol?.toUpperCase() || coinId?.toUpperCase() || 'BTC';

  if (loading && !coin) return <PageTemplate title="Loading..." description=""><GlassCard><div className="animate-pulse h-40 bg-white/[0.04] rounded-xl" /></GlassCard></PageTemplate>;

  return (
    <PageTemplate title={coin?.name || coinId || 'Coin'} description={`Live data for ${coin?.name || ''}`}>
      <div className="space-y-4">
        <GlassCard padding="lg"><QuickStats coin={coin} /></GlassCard>
        <GlassTabs tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'chart' && <ChartSignalsTab symbol={symbol} />}
        {tab === 'derivatives' && <DerivativesTab symbol={symbol} />}
        {tab === 'fundamentals' && <FundamentalsTab coin={coin} />}
        {tab === 'compare' && <CompareTab currentCoin={coin} />}
      </div>
    </PageTemplate>
  );
}
