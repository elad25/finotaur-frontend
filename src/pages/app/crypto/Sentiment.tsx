// ============================================================
// PAGE 5/7: SENTIMENT — Market Mood Center
// Consolidates: Fear & Greed, News, Market Breadth, On-Chain
// ============================================================

import { memo, useMemo, useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { Card, Eyebrow } from '@/components/ds/Card';
import { useFearGreed, useTopCoins, useFundingRates, useCryptoNews } from './_shared/hooks';
import { timeAgo } from './_shared/formatters';

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'news', label: '📰 News' },
  { id: 'onchain', label: '🔗 On-Chain' },
];

// ── Inline DS Tabs ────────────────────────────────────────────
interface DSTabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}
function DSTabs({ tabs, active, onChange }: DSTabsProps) {
  return (
    <div className="flex rounded-[6px] overflow-hidden border border-border-ds-subtle w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            active === tab.id
              ? 'bg-gold-primary/20 text-gold-bright'
              : 'text-ink-tertiary hover:text-ink-secondary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Inline DS Fear & Greed Gauge ──────────────────────────────
interface DSFearGreedProps {
  value: number;
  label: string;
  loading?: boolean;
}
function DSFearGreedGauge({ value, label, loading }: DSFearGreedProps) {
  if (loading) {
    return (
      <Card padding="compact">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-16 bg-surface-2 rounded" />
          <div className="h-8 w-12 bg-surface-2 rounded" />
          <div className="h-3 w-20 bg-surface-2 rounded" />
        </div>
      </Card>
    );
  }
  const accentClass =
    value >= 60 ? 'text-gold-primary' : value <= 40 ? 'text-num-negative' : 'text-ink-secondary';
  const pct = Math.min(100, Math.max(0, value));

  return (
    <Card padding="compact">
      <Eyebrow className="block mb-2">Fear &amp; Greed</Eyebrow>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono tabular-nums text-4xl leading-none ${accentClass}`}>{value}</span>
        <span className="font-mono text-xs text-ink-muted">/100</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${value >= 60 ? 'bg-gold-primary' : value <= 40 ? 'bg-[#E24B4A]' : 'bg-border-ds-default'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-[10px] mt-1 font-medium uppercase tracking-wider ${accentClass}`}>{label}</p>
    </Card>
  );
}

// ── Inline DS Signal Badge ────────────────────────────────────
type SignalDirection = 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
interface DSSignalProps {
  signal: SignalDirection;
  label: string;
  value: string;
  description?: string;
  icon?: string;
}
function DSSignalBadge({ signal, label, value, description, icon }: DSSignalProps) {
  const valueClass =
    signal === 'strong_bullish' || signal === 'bullish'
      ? 'text-gold-primary'
      : signal === 'bearish' || signal === 'strong_bearish'
      ? 'text-num-negative'
      : 'text-ink-muted';

  return (
    <Card padding="compact">
      <div className="flex items-center gap-1.5 mb-1">
        <Eyebrow>{label}</Eyebrow>
        {icon && <span className="text-sm">{icon}</span>}
      </div>
      <p className={`text-sm font-semibold font-mono ${valueClass}`}>{value}</p>
      {description && (
        <p className="text-[11px] mt-1 text-ink-muted leading-relaxed">{description}</p>
      )}
    </Card>
  );
}

// ── Inline DS Table Skeleton ──────────────────────────────────
function DSTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2.5 px-3 rounded-[12px] bg-surface-2">
          <div className="h-4 w-8 bg-surface-1 rounded" />
          <div className="h-4 w-20 bg-surface-1 rounded" />
          <div className="h-4 flex-1 bg-surface-1/60 rounded" />
          <div className="h-4 w-16 bg-surface-1 rounded" />
          <div className="h-4 w-12 bg-surface-1 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Inline DS Empty State ─────────────────────────────────────
function DSEmptyState({ icon, title }: { icon?: string; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <span className="text-3xl mb-3">{icon}</span>}
      <p className="text-sm font-medium text-ink-muted">{title}</p>
    </div>
  );
}

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

  type SignalItem = { signal: SignalDirection; label: string; value: string; desc: string; icon: string };
  function mkSignal(signal: SignalDirection, label: string, value: string, desc: string, icon: string): SignalItem {
    return { signal, label, value, desc, icon };
  }
  const signals = useMemo(() => {
    const r: SignalItem[] = [];
    if (fg) {
      const v: number = fg.value;
      const dir: SignalDirection = v <= 25 ? 'strong_bearish' : v <= 40 ? 'bearish' : v <= 60 ? 'neutral' : v <= 75 ? 'bullish' : 'strong_bullish';
      r.push(mkSignal(dir, 'Fear & Greed', `${v} — ${fg.value_classification}`, v <= 25 ? 'Extreme fear — historically a buying opportunity' : v >= 75 ? 'Extreme greed — historically signals tops' : 'Market mood within normal range', v <= 40 ? '😨' : v >= 60 ? '🤑' : '😐'));
    }
    const breadthDir: SignalDirection = gPct > 65 ? 'bullish' : gPct < 35 ? 'bearish' : 'neutral';
    r.push(mkSignal(breadthDir, 'Market Breadth', `${gPct.toFixed(0)}% positive`, gPct > 65 ? 'Broad strength — majority rising' : gPct < 35 ? 'Broad weakness — majority declining' : 'Mixed market', gPct > 65 ? '🟢' : gPct < 35 ? '🔴' : '🟡'));
    if (avgFunding != null) {
      const fundDir: SignalDirection = avgFunding > 0.03 ? 'bearish' : avgFunding < -0.01 ? 'bullish' : 'neutral';
      r.push(mkSignal(fundDir, 'Funding Sentiment', avgFunding > 0.03 ? 'Overheated Long' : avgFunding < -0.01 ? 'Short Crowded' : 'Balanced', `Avg funding: ${avgFunding.toFixed(4)}%`, '💰'));
    }
    return r;
  }, [fg, gPct, avgFunding]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <DSFearGreedGauge value={fg?.value ?? 50} label={fg?.value_classification ?? '...'} loading={fgL} />
        <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {signals.map(s => (
            <DSSignalBadge
              key={s.label}
              signal={s.signal}
              label={s.label}
              value={s.value}
              description={s.desc}
              icon={s.icon}
            />
          ))}
        </div>
      </div>

      {/* Market Breadth Bar */}
      <Card padding="compact">
        <div className="flex items-end justify-between mb-3">
          <div>
            <Eyebrow>Market Breadth</Eyebrow>
            <p className="text-xs text-ink-tertiary mt-0.5">Top {breadth.t} coins</p>
          </div>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-surface-2 mb-2">
          <div className="bg-gold-primary transition-all duration-700" style={{ width: `${gPct}%` }} />
          <div className="bg-surface-2 transition-all duration-700" style={{ width: `${100 - gPct - lPct}%` }} />
          <div className="bg-[#E24B4A] transition-all duration-700" style={{ width: `${lPct}%` }} />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gold-primary">🟢 {breadth.g} Gainers ({gPct.toFixed(0)}%)</span>
          <span className="text-ink-muted">{breadth.n} Flat</span>
          <span className="text-num-negative">🔴 {breadth.l} Losers ({lPct.toFixed(0)}%)</span>
        </div>
      </Card>
    </div>
  );
});

// ── News Tab ─────────────────────────────────────────────────
const NewsTab = memo(function NewsTab() {
  const { data: news, loading } = useCryptoNews(30);
  return loading ? <DSTableSkeleton rows={10} /> : !news?.length ? <DSEmptyState icon="📰" title="No news" /> : (
    <div className="divide-y divide-border-ds-subtle">
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
            <div className="flex gap-3 px-2 py-3 rounded-xl hover:bg-surface-2 transition-colors">
              {img && <div className="flex-shrink-0 w-16 h-16 rounded-[12px] overflow-hidden bg-surface-2"><img src={img} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" /></div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${sent === 'positive' ? 'bg-gold-primary' : sent === 'negative' ? 'bg-[#E24B4A]' : 'bg-border-ds-default'}`} />
                  {source && <span className="text-[10px] text-ink-tertiary font-medium uppercase">{source}</span>}
                  {date && <span className="text-[10px] text-ink-muted">{timeAgo(date)}</span>}
                </div>
                <h3 className="text-sm text-ink-primary font-medium leading-snug group-hover:text-ink-primary transition-colors line-clamp-2">{title}</h3>
                {desc && <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-1">{desc}</p>}
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
          <Card key={m.title} padding="compact" className="hover:border-border-ds-default cursor-default transition-colors">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">{m.icon}</span>
              <div>
                <h3 className="text-xs text-ink-secondary font-semibold">{m.title}</h3>
                <p className="text-[10px] text-ink-muted mt-0.5 leading-relaxed">{m.desc}</p>
                <p className="text-[9px] text-ink-tertiary mt-1 uppercase tracking-wider">Coming Soon</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card padding="default">
        <Eyebrow className="block mb-3">📖 Reading On-Chain</Eyebrow>
        <div className="text-xs text-ink-muted space-y-2 leading-relaxed">
          <p><strong className="text-ink-secondary">Exchange Inflows</strong> — Large amounts flowing into exchanges → holders preparing to sell. Sustained outflows → accumulation.</p>
          <p><strong className="text-ink-secondary">MVRV Ratio</strong> — Market Value to Realized Value. Above 3.5 = overheated. Below 1.0 = undervalued.</p>
          <p><strong className="text-ink-secondary">NVT Signal</strong> — Network Value to Transactions. High NVT = network overvalued relative to usage.</p>
        </div>
      </Card>
    </div>
  );
});

// ── Main ─────────────────────────────────────────────────────
export default function CryptoSentiment() {
  const [tab, setTab] = useState('overview');
  return (
    <PageTemplate title="Sentiment & News" description="Market mood, news feed, and on-chain metrics">
      <div className="space-y-4">
        <DSTabs tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'overview' && <OverviewTab />}
        {tab === 'news' && (
          <Card padding="compact">
            <div className="flex items-end justify-between mb-3">
              <div>
                <Eyebrow>Latest Crypto News</Eyebrow>
                <p className="text-xs text-ink-tertiary mt-0.5">Auto-refreshes every 2 minutes</p>
              </div>
            </div>
            <NewsTab />
          </Card>
        )}
        {tab === 'onchain' && <OnChainTab />}
      </div>
    </PageTemplate>
  );
}
