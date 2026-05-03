// ============================================================
// PAGE 5/7: SENTIMENT — Market Mood Center
// Consolidates: Fear & Greed, News, Market Breadth, On-Chain
// ============================================================

import { memo, useMemo, useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { useFearGreed, useTopCoins, useFundingRates, useCryptoNews } from './_shared/hooks';
import { GlassCard, GlassStat, GlassTabs, SectionHeader, FearGreedGauge, SignalBadge, GlassTableSkeleton, EmptyState } from './_shared/GlassUI';
import { formatPercent, getPriceColor, timeAgo } from './_shared/formatters';

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'news', label: '📰 News' },
  { id: 'onchain', label: '🔗 On-Chain' },
];

// ── Overview Tab ─────────────────────────────────────────────
const OverviewTab = memo(function OverviewTab() {
  const { data: fg, loading: fgL } = useFearGreed();
  const { data: coins } = useTopCoins(1, 100, false);
  const { data: rates } = useFundingRates();

  const breadth = useMemo(() => {
    if (!coins) return { g: 0, l: 0, n: 0, t: 0 };
    let g = 0, l = 0, n = 0;
    coins.forEach(c => { const ch = c.price_change_percentage_24h || 0; if (ch > 0.5) g++; else if (ch < -0.5) l++; else n++; });
    return { g, l, n, t: coins.length };
  }, [coins]);

  const avgFunding = useMemo(() => rates?.length ? rates.reduce((s, r) => s + r.fundingRate, 0) / rates.length * 100 : null, [rates]);
  const gPct = breadth.t > 0 ? (breadth.g / breadth.t) * 100 : 50;
  const lPct = breadth.t > 0 ? (breadth.l / breadth.t) * 100 : 50;

  const signals = useMemo(() => {
    const r: any[] = [];
    if (fg) {
      const v = fg.value;
      r.push({ signal: v <= 25 ? 'strong_bearish' : v <= 40 ? 'bearish' : v <= 60 ? 'neutral' : v <= 75 ? 'bullish' : 'strong_bullish', label: 'Fear & Greed', value: `${v} — ${fg.value_classification}`, desc: v <= 25 ? 'Extreme fear — historically a buying opportunity' : v >= 75 ? 'Extreme greed — historically signals tops' : 'Market mood within normal range', icon: v <= 40 ? '😨' : v >= 60 ? '🤑' : '😐' });
    }
    r.push({ signal: gPct > 65 ? 'bullish' : gPct < 35 ? 'bearish' : 'neutral', label: 'Market Breadth', value: `${gPct.toFixed(0)}% positive`, desc: gPct > 65 ? 'Broad strength — majority rising' : gPct < 35 ? 'Broad weakness — majority declining' : 'Mixed market', icon: gPct > 65 ? '🟢' : gPct < 35 ? '🔴' : '🟡' });
    if (avgFunding != null) r.push({ signal: avgFunding > 0.03 ? 'bearish' : avgFunding < -0.01 ? 'bullish' : 'neutral', label: 'Funding Sentiment', value: avgFunding > 0.03 ? 'Overheated Long' : avgFunding < -0.01 ? 'Short Crowded' : 'Balanced', desc: `Avg funding: ${avgFunding.toFixed(4)}%`, icon: '💰' });
    return r;
  }, [fg, gPct, avgFunding]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <FearGreedGauge value={fg?.value ?? 50} label={fg?.value_classification ?? '...'} loading={fgL} />
        <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {signals.map(s => <SignalBadge key={s.label} signal={s.signal} label={s.label} value={s.value} description={s.desc} icon={s.icon} />)}
        </div>
      </div>

      {/* Market Breadth Bar */}
      <GlassCard padding="sm">
        <SectionHeader title="Market Breadth" subtitle={`Top ${breadth.t} coins`} />
        <div className="flex h-4 rounded-full overflow-hidden bg-white/[0.04] mb-2">
          <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${gPct}%` }} />
          <div className="bg-white/10 transition-all duration-700" style={{ width: `${100 - gPct - lPct}%` }} />
          <div className="bg-red-500 transition-all duration-700" style={{ width: `${lPct}%` }} />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-emerald-400">🟢 {breadth.g} Gainers ({gPct.toFixed(0)}%)</span>
          <span className="text-white/25">{breadth.n} Flat</span>
          <span className="text-red-400">🔴 {breadth.l} Losers ({lPct.toFixed(0)}%)</span>
        </div>
      </GlassCard>
    </div>
  );
});

// ── News Tab ─────────────────────────────────────────────────
const NewsTab = memo(function NewsTab() {
  const { data: news, loading } = useCryptoNews(30);
  return loading ? <GlassTableSkeleton rows={10} /> : !news?.length ? <EmptyState icon="📰" title="No news" /> : (
    <div className="divide-y divide-white/[0.03]">
      {news.map((item: any, i: number) => {
        const title = item.title || item.headline || '';
        const desc = item.description || item.summary || '';
        const url = item.url || item.link || '#';
        const source = typeof item.source === 'string' ? item.source : item.source?.name || item.provider || '';
        const date = item.publishedAt || item.published_at || item.created_at || '';
        const img = item.imageUrl || item.image_url || item.thumb || null;
        const sent = item.sentiment;
        return (
          <a key={item.id || i} href={url} target="_blank" rel="noopener noreferrer" className="block group">
            <div className="flex gap-3 px-2 py-3 rounded-xl hover:bg-white/[0.03] transition-colors">
              {img && <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/5"><img src={img} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" /></div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${sent === 'positive' ? 'bg-emerald-400' : sent === 'negative' ? 'bg-red-400' : 'bg-white/20'}`} />
                  {source && <span className="text-[10px] text-cyan-400/60 font-medium uppercase">{source}</span>}
                  {date && <span className="text-[10px] text-white/20">{timeAgo(date)}</span>}
                </div>
                <h3 className="text-sm text-white/80 font-medium leading-snug group-hover:text-white transition-colors line-clamp-2">{title}</h3>
                {desc && <p className="text-[11px] text-white/30 mt-0.5 line-clamp-1">{desc}</p>}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
});

// ── On-Chain Tab ─────────────────────────────────────────────
const OnChainTab = memo(function OnChainTab() {
  const metrics = [
    { icon: '🏦', title: 'Exchange Flows', desc: 'Track net inflows/outflows. Large inflows = selling pressure.' },
    { icon: '🐋', title: 'Whale Activity', desc: 'Wallets >1000 BTC — accumulation vs distribution patterns.' },
    { icon: '⛏️', title: 'Hash Rate & Mining', desc: 'Network hash rate, difficulty, block times, miner revenue.' },
    { icon: '👥', title: 'Active Addresses', desc: 'Daily active addresses and new address creation trends.' },
    { icon: '🔒', title: 'Staking & Validators', desc: 'ETH staking ratio, validator queue, staking APY.' },
    { icon: '🌊', title: 'DeFi TVL', desc: 'Total value locked across protocols — measures DeFi health.' },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map(m => (
          <GlassCard key={m.title} hover padding="sm">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">{m.icon}</span>
              <div><h3 className="text-xs text-white/75 font-semibold">{m.title}</h3><p className="text-[10px] text-white/35 mt-0.5 leading-relaxed">{m.desc}</p><p className="text-[9px] text-cyan-400/50 mt-1">Coming Soon</p></div>
            </div>
          </GlassCard>
        ))}
      </div>
      <GlassCard glow="purple"><SectionHeader title="📖 Reading On-Chain" />
        <div className="text-xs text-white/40 space-y-2 leading-relaxed">
          <p><strong className="text-white/60">Exchange Inflows</strong> — Large amounts flowing into exchanges → holders preparing to sell. Sustained outflows → accumulation.</p>
          <p><strong className="text-white/60">MVRV Ratio</strong> — Market Value to Realized Value. Above 3.5 = overheated. Below 1.0 = undervalued.</p>
          <p><strong className="text-white/60">NVT Signal</strong> — Network Value to Transactions. High NVT = network overvalued relative to usage.</p>
        </div>
      </GlassCard>
    </div>
  );
});

// ── Main ─────────────────────────────────────────────────────
export default function CryptoSentiment() {
  const [tab, setTab] = useState('overview');
  return (
    <PageTemplate title="Sentiment & News" description="Market mood, news feed, and on-chain metrics">
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'overview' && <OverviewTab />}
        {tab === 'news' && <GlassCard padding="sm"><SectionHeader title="Latest Crypto News" subtitle="Auto-refreshes every 2 minutes" /><NewsTab /></GlassCard>}
        {tab === 'onchain' && <OnChainTab />}
      </div>
    </PageTemplate>
  );
}
