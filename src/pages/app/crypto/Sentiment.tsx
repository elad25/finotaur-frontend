// ============================================================
// PAGE 5/7: SENTIMENT — Market Mood Center
// Fully scrollable single-page layout — no tabs.
// Sections: Market Sentiment | Crypto News | On-Chain Activity
//           | Sector Rotation | Corporate Treasury
// ============================================================

import { memo, useMemo } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { Card, Eyebrow } from '@/components/ds/Card';
import {
  useFearGreed,
  useFearGreedHistory,
  useTopCoins,
  useFundingRates,
  useCryptoNews,
  useOnChain,
  useCategories,
  useTreasury,
} from './_shared/hooks';
import {
  GlassCard,
  GlassStat,
  GlassStatSkeleton,
  GlassTableSkeleton,
  SectionHeader,
  EmptyState,
} from './_shared/GlassUI';
import { formatCompact, formatPercent, getPriceColor, timeAgo } from './_shared/formatters';
import { SkeletonStat, SkeletonTable } from '@/components/ds/Skeleton';
import type { FearGreedData, CategoryData, TreasuryCompany } from './_shared/types';

// ─────────────────────────────────────────────────────────────
// Local DS primitives (mirror existing pattern in this file)
// ─────────────────────────────────────────────────────────────

// ── Inline DS Fear & Greed Gauge ──────────────────────────────
interface DSFearGreedProps {
  value: number;
  label: string;
  loading?: boolean;
}
function DSFearGreedGauge({ value, label, loading }: DSFearGreedProps) {
  if (loading) return <SkeletonStat />;
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
      {description && <p className="text-[11px] mt-1 text-ink-muted leading-relaxed">{description}</p>}
    </Card>
  );
}

function DSTableSkeleton({ rows = 8 }: { rows?: number }) {
  return <SkeletonTable rows={rows} cols={5} />;
}

function DSEmptyState({ icon, title }: { icon?: string; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <span className="text-3xl mb-3">{icon}</span>}
      <p className="text-sm font-medium text-ink-muted">{title}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section 1: Market Sentiment
// ─────────────────────────────────────────────────────────────

// Fear & Greed value → bar color class
function fgBarColor(v: number): string {
  if (v < 25) return 'bg-red-500';
  if (v < 45) return 'bg-orange-400';
  if (v <= 55) return 'bg-yellow-400';
  if (v <= 75) return 'bg-lime-400';
  return 'bg-emerald-400';
}

interface FGHistoryStripProps {
  history: FearGreedData[];
}
const FGHistoryStrip = memo(function FGHistoryStrip({ history }: FGHistoryStripProps) {
  // history is newest-first; reverse for chronological display (oldest left → newest right)
  const chronological = useMemo(() => [...history].reverse(), [history]);
  if (!chronological.length) return null;

  return (
    <Card padding="compact">
      <Eyebrow className="block mb-3">30-Day Fear &amp; Greed</Eyebrow>
      <div className="flex items-end gap-[2px] h-10">
        {chronological.map((d, i) => {
          const heightPct = Math.max(10, d.value); // minimum visible bar height
          return (
            <div
              key={d.timestamp || i}
              title={`${d.value} — ${d.value_classification}`}
              className={`flex-1 rounded-sm ${fgBarColor(d.value)} opacity-80 hover:opacity-100 transition-opacity cursor-default`}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-ink-muted">
          {chronological[0]?.timestamp
            ? new Date(Number(chronological[0].timestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '30d ago'}
        </span>
        <span className="text-[10px] text-ink-muted">Today</span>
      </div>
    </Card>
  );
});

const MarketSentimentSection = memo(function MarketSentimentSection() {
  const { data: fg, loading: fgL } = useFearGreed();
  const { data: fgHistory, loading: fgHistL } = useFearGreedHistory();
  const { data: coins } = useTopCoins(1, 100, false);
  const { data: rates } = useFundingRates();

  const breadth = useMemo(() => {
    if (!coins) return { g: 0, l: 0, n: 0, t: 0 };
    let g = 0, l = 0, n = 0;
    coins.forEach(c => {
      const ch = c.price_change_percentage_24h || 0;
      if (ch > 0.5) g++;
      else if (ch < -0.5) l++;
      else n++;
    });
    return { g, l, n, t: coins.length };
  }, [coins]);

  const avgFunding = useMemo(
    () => rates?.length ? rates.reduce((s, r) => s + r.fundingRate, 0) / rates.length * 100 : null,
    [rates]
  );

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
      const dir: SignalDirection =
        v <= 25 ? 'strong_bearish' : v <= 40 ? 'bearish' : v <= 60 ? 'neutral' : v <= 75 ? 'bullish' : 'strong_bullish';
      r.push(mkSignal(
        dir, 'Fear & Greed', `${v} — ${fg.value_classification}`,
        v <= 25 ? 'Extreme fear — historically a buying opportunity'
          : v >= 75 ? 'Extreme greed — historically signals tops'
          : 'Market mood within normal range',
        v <= 40 ? '😨' : v >= 60 ? '🤑' : '😐',
      ));
    }
    const breadthDir: SignalDirection = gPct > 65 ? 'bullish' : gPct < 35 ? 'bearish' : 'neutral';
    r.push(mkSignal(
      breadthDir, 'Market Breadth', `${gPct.toFixed(0)}% positive`,
      gPct > 65 ? 'Broad strength — majority rising' : gPct < 35 ? 'Broad weakness — majority declining' : 'Mixed market',
      gPct > 65 ? '▲' : gPct < 35 ? '▼' : '▬',
    ));
    if (avgFunding != null) {
      const fundDir: SignalDirection = avgFunding > 0.03 ? 'bearish' : avgFunding < -0.01 ? 'bullish' : 'neutral';
      r.push(mkSignal(
        fundDir, 'Funding Sentiment',
        avgFunding > 0.03 ? 'Overheated Long' : avgFunding < -0.01 ? 'Short Crowded' : 'Balanced',
        `Avg funding: ${avgFunding.toFixed(4)}%`, '💰',
      ));
    }
    return r;
  }, [fg, gPct, avgFunding]);

  return (
    <div className="space-y-4">
      <SectionHeader title="Market Sentiment" subtitle="Fear & Greed index, market breadth, and funding signals" />

      {/* Gauge + signal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <DSFearGreedGauge value={fg?.value ?? 50} label={fg?.value_classification ?? '…'} loading={fgL} />
        <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {signals.map(s => (
            <DSSignalBadge key={s.label} signal={s.signal} label={s.label} value={s.value} description={s.desc} icon={s.icon} />
          ))}
        </div>
      </div>

      {/* Market Breadth bar */}
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
          <span className="text-gold-primary inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gold-primary inline-block" />
            {breadth.g} Gainers ({gPct.toFixed(0)}%)
          </span>
          <span className="text-ink-muted">{breadth.n} Flat</span>
          <span className="text-num-negative inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E24B4A] inline-block" />
            {breadth.l} Losers ({lPct.toFixed(0)}%)
          </span>
        </div>
      </Card>

      {/* 30-day Fear & Greed history strip */}
      {fgHistL ? (
        <Card padding="compact">
          <Eyebrow className="block mb-3">30-Day Fear &amp; Greed</Eyebrow>
          <div className="flex items-end gap-[2px] h-10 animate-pulse">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-sm bg-surface-2" style={{ height: '50%' }} />
            ))}
          </div>
        </Card>
      ) : fgHistory && fgHistory.length > 0 ? (
        <FGHistoryStrip history={fgHistory} />
      ) : null}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Section 2: Crypto News
// ─────────────────────────────────────────────────────────────

const CryptoNewsSection = memo(function CryptoNewsSection() {
  const { data: news, loading } = useCryptoNews(30);
  return (
    <div>
      <SectionHeader title="Crypto News" subtitle="Auto-refreshes every 2 minutes" />
      <Card padding="compact">
        {loading ? (
          <DSTableSkeleton rows={10} />
        ) : !news?.length ? (
          <DSEmptyState icon="📰" title="No news available" />
        ) : (
          <div className="divide-y divide-border-ds-subtle">
            {news.map((item: any, i: number) => { /* item is untyped external API shape */
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
                    {img && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-[12px] overflow-hidden bg-surface-2">
                        <img src={img} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                      </div>
                    )}
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
        )}
      </Card>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Section 3: On-Chain Activity
// ─────────────────────────────────────────────────────────────

const OnChainSection = memo(function OnChainSection() {
  const { data, loading } = useOnChain();

  const topChains = useMemo(
    () => (data?.chains ?? []).slice(0, 8),
    [data]
  );
  const topFees = useMemo(
    () =>
      (data?.fees ?? [])
        .filter(f => f.fees_24h != null)
        .sort((a, b) => (b.fees_24h ?? 0) - (a.fees_24h ?? 0))
        .slice(0, 8),
    [data]
  );

  return (
    <div className="space-y-4">
      <SectionHeader title="On-Chain Activity" subtitle="DeFi TVL, protocol fees, and stablecoin supply" />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <GlassStatSkeleton key={i} />)}
        </div>
      ) : !data ? (
        <DSEmptyState icon="🔗" title="On-chain data unavailable" />
      ) : (
        <div className="space-y-4">
          {/* Stablecoin Supply stat */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassStat
              label="Stablecoin Supply"
              value={formatCompact(data.stablecoinSupply.total_circulating_usd)}
              subValue={`Top ${data.stablecoinSupply.top_count} stablecoins`}
              change={data.stablecoinSupply.change_24h_pct}
            />
          </div>

          {/* Top Chains by TVL + Top Protocols by Fees side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Chains */}
            <GlassCard padding="md">
              <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-3">
                Top Chains by TVL
              </p>
              {topChains.length === 0 ? (
                <EmptyState icon="⛓️" title="No chain data" />
              ) : (
                <div className="space-y-2">
                  {topChains.map((chain, i) => (
                    <div key={chain.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-white/30 w-4 shrink-0">{i + 1}</span>
                        <span className="text-xs text-white/80 font-medium truncate">{chain.name}</span>
                        {chain.tokenSymbol && (
                          <span className="text-[10px] text-white/30 uppercase shrink-0">{chain.tokenSymbol}</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-white/70 shrink-0">{formatCompact(chain.tvl)}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Protocol Fees */}
            <GlassCard padding="md">
              <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-3">
                Top Protocols by Fees (24h)
              </p>
              {topFees.length === 0 ? (
                <EmptyState icon="🏦" title="No fee data" />
              ) : (
                <div className="space-y-2">
                  {topFees.map((proto, i) => (
                    <div key={proto.slug} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-white/30 w-4 shrink-0">{i + 1}</span>
                        <span className="text-xs text-white/80 font-medium truncate">{proto.name}</span>
                        {proto.category && (
                          <span className="text-[10px] text-white/30 truncate">{proto.category}</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-white/70 shrink-0">
                        {formatCompact(proto.fees_24h ?? undefined)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Section 4: Sector Rotation
// ─────────────────────────────────────────────────────────────

const SectorRotationSection = memo(function SectorRotationSection() {
  const { data: categories, loading } = useCategories();

  // Top 5 gainers and worst 5 losers by 24h market cap change
  const { gainers, losers } = useMemo(() => {
    if (!categories) return { gainers: [] as CategoryData[], losers: [] as CategoryData[] };
    const sorted = [...categories]
      .filter(c => c.market_cap_change_24h != null)
      .sort((a, b) => (b.market_cap_change_24h ?? 0) - (a.market_cap_change_24h ?? 0));
    return { gainers: sorted.slice(0, 5), losers: sorted.slice(-5).reverse() };
  }, [categories]);

  return (
    <div className="space-y-4">
      <SectionHeader title="Sector Rotation" subtitle="Top gaining and losing crypto sectors by 24h market cap change" />

      {loading ? (
        <GlassTableSkeleton rows={5} />
      ) : !categories?.length ? (
        <DSEmptyState icon="🔄" title="Sector data unavailable" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gainers */}
          <GlassCard padding="md">
            <p className="text-[11px] uppercase tracking-wider text-emerald-400/70 font-medium mb-3">
              Best Performing Sectors
            </p>
            <div className="space-y-2.5">
              {gainers.map(cat => (
                <div key={cat.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/80 font-medium truncate">{cat.name}</p>
                    {cat.top_3_coins && cat.top_3_coins.length > 0 && (
                      <p className="text-[10px] text-white/30 mt-0.5 truncate">
                        {cat.top_3_coins.slice(0, 3).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-mono font-semibold shrink-0 ${getPriceColor(cat.market_cap_change_24h)}`}>
                    {formatPercent(cat.market_cap_change_24h)}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Losers */}
          <GlassCard padding="md">
            <p className="text-[11px] uppercase tracking-wider text-red-400/70 font-medium mb-3">
              Worst Performing Sectors
            </p>
            <div className="space-y-2.5">
              {losers.map(cat => (
                <div key={cat.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/80 font-medium truncate">{cat.name}</p>
                    {cat.top_3_coins && cat.top_3_coins.length > 0 && (
                      <p className="text-[10px] text-white/30 mt-0.5 truncate">
                        {cat.top_3_coins.slice(0, 3).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-mono font-semibold shrink-0 ${getPriceColor(cat.market_cap_change_24h)}`}>
                    {formatPercent(cat.market_cap_change_24h)}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Section 5: Corporate Treasury
// ─────────────────────────────────────────────────────────────

interface TreasuryCardProps {
  ticker: 'BTC' | 'ETH';
  label: string;
  icon: string;
  totalHoldings: number | null;
  totalValueUsd: number | null;
  dominance: number | null;
  companies: TreasuryCompany[];
}

const TreasuryCard = memo(function TreasuryCard({
  ticker,
  label,
  icon,
  totalHoldings,
  totalValueUsd,
  dominance,
  companies,
}: TreasuryCardProps) {
  // Show top 5 companies by total_current_value_usd, falling back to total_holdings
  const topCompanies = useMemo(
    () =>
      [...companies]
        .sort((a, b) =>
          ((b.total_current_value_usd ?? b.total_holdings ?? 0) -
            (a.total_current_value_usd ?? a.total_holdings ?? 0))
        )
        .slice(0, 5),
    [companies]
  );

  const glowColor = ticker === 'BTC' ? 'amber' : 'cyan';

  return (
    <GlassCard padding="md" glow={glowColor}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-bold text-white/90">{label}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">{ticker} Corporate Holdings</p>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Total Holdings</p>
          <p className="text-sm font-mono font-bold text-white/90">
            {totalHoldings != null ? `${totalHoldings.toLocaleString()} ${ticker}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Market Value</p>
          <p className="text-sm font-mono font-bold text-white/90">{formatCompact(totalValueUsd ?? undefined)}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Supply Held</p>
          <p className="text-sm font-mono font-bold text-white/90">
            {dominance != null ? `${dominance.toFixed(2)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Top companies */}
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Top Holders</p>
        <div className="space-y-2">
          {topCompanies.map(co => (
            <div key={co.name} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/75 font-medium truncate">{co.name}</p>
                {co.symbol && <p className="text-[10px] text-white/30 uppercase">{co.symbol}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono text-white/70">
                  {co.total_holdings != null ? `${co.total_holdings.toLocaleString()} ${ticker}` : '—'}
                </p>
                <p className="text-[10px] text-white/40">
                  {formatCompact(co.total_current_value_usd ?? undefined)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
});

const CorporateTreasurySection = memo(function CorporateTreasurySection() {
  const { data, loading } = useTreasury();

  return (
    <div className="space-y-4">
      <SectionHeader title="Corporate Treasury" subtitle="Public companies holding Bitcoin and Ethereum on their balance sheets" />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GlassStatSkeleton />
          <GlassStatSkeleton />
        </div>
      ) : !data ? (
        <DSEmptyState icon="🏛️" title="Treasury data unavailable" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TreasuryCard
            ticker="BTC"
            label="Bitcoin"
            icon="₿"
            totalHoldings={data.bitcoin.total_holdings}
            totalValueUsd={data.bitcoin.total_value_usd}
            dominance={data.bitcoin.market_cap_dominance}
            companies={data.bitcoin.companies}
          />
          <TreasuryCard
            ticker="ETH"
            label="Ethereum"
            icon="Ξ"
            totalHoldings={data.ethereum.total_holdings}
            totalValueUsd={data.ethereum.total_value_usd}
            dominance={data.ethereum.market_cap_dominance}
            companies={data.ethereum.companies}
          />
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Main export — single scrolling page
// ─────────────────────────────────────────────────────────────

export default function CryptoSentiment() {
  return (
    <PageTemplate title="Sentiment & News" description="Market mood, news feed, on-chain metrics, sector rotation, and corporate treasury" centered>
      <div className="space-y-10">
        <MarketSentimentSection />
        <CryptoNewsSection />
        <OnChainSection />
        <SectorRotationSection />
        <CorporateTreasurySection />
      </div>
    </PageTemplate>
  );
}
