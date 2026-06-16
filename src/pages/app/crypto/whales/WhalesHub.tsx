// src/pages/app/crypto/whales/WhalesHub.tsx
// Whale Tracker hub — 5-tab signal container. Phase 1 ships Whale Trades.
// Stream is owned at hub level so all tabs can share the same SSE connection.

import { memo, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageTemplate } from '@/components/PageTemplate';
import { GlassCard, GlassTabs, GlassStat, SectionHeader, GlassTableSkeleton, SignalBadge, EmptyState } from '../_shared/GlassUI';
import { useWhaleStream } from '@/hooks/crypto/useWhaleStream';
import { StreamStatusPill } from './components/StreamStatusPill';
import { WhaleTradesPanel } from './panels/WhaleTradesPanel';
import { OrderWallsPanel } from './panels/OrderWallsPanel';
import { useDerivatives, useOnChain } from '../_shared/hooks';
import type { DerivativeAsset } from '../_shared/types';

// ── Shared formatting helper ──────────────────────────────────
function fmtUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// ── OI Panel (compact) ────────────────────────────────────────
const WhaleOIPanel = memo(function WhaleOIPanel() {
  const { data, loading } = useDerivatives();
  const [sort, setSort] = useState<'oi' | 'funding'>('oi');

  const sorted = useMemo((): DerivativeAsset[] => {
    if (!data?.assets) return [];
    const s = [...data.assets];
    if (sort === 'funding') s.sort((a, b) => Math.abs(b.avg_funding_rate ?? 0) - Math.abs(a.avg_funding_rate ?? 0));
    else s.sort((a, b) => b.total_open_interest_usd - a.total_open_interest_usd);
    return s.slice(0, 20);
  }, [data, sort]);

  const totals = data?.totals ?? null;

  return (
    <GlassCard>
      <div className="space-y-4">
        {/* Aggregate row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassStat
            label="Total Open Interest"
            value={totals ? fmtUsd(totals.total_open_interest_usd) : '—'}
            loading={loading}
          />
          <GlassStat
            label="Avg Funding"
            value={totals?.avg_funding_rate != null
              ? `${totals.avg_funding_rate >= 0 ? '+' : ''}${(totals.avg_funding_rate * 100).toFixed(4)}%`
              : '—'}
            loading={loading}
          />
          <GlassStat
            label="Volume 24h"
            value={totals ? fmtUsd(totals.total_volume_24h) : '—'}
            loading={loading}
          />
          <GlassStat
            label="Assets"
            value={totals ? `${totals.asset_count}` : '—'}
            loading={loading}
          />
        </div>

        {/* Sort controls + table */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/30">Top 20 by open interest</span>
          <div className="flex gap-1">
            {([['oi', 'By OI'], ['funding', 'By Funding']] as const).map(([id, lbl]) => (
              <button
                key={id}
                onClick={() => setSort(id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${sort === id ? 'bg-white/[0.1] text-white' : 'text-white/30 hover:text-white/60'}`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <GlassTableSkeleton rows={10} />
        ) : sorted.length === 0 ? (
          <EmptyState icon="📊" title="No open interest data available" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]">
                  <th className="text-left py-2 px-2 font-medium">Asset</th>
                  <th className="text-right py-2 px-2 font-medium">Open Interest</th>
                  <th className="text-right py-2 px-2 font-medium">Avg Funding</th>
                  <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Volume 24h</th>
                  <th className="text-right py-2 px-2 font-medium hidden md:table-cell">Markets</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((asset) => {
                  const fundingPct = asset.avg_funding_rate != null ? asset.avg_funding_rate * 100 : null;
                  const isHigh = fundingPct != null && fundingPct > 0.05;
                  const isLow = fundingPct != null && fundingPct < -0.03;
                  return (
                    <tr key={asset.base} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors">
                      <td className="py-1.5 px-2 text-white/80 text-xs font-bold">{asset.base}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs text-white/70">{fmtUsd(asset.total_open_interest_usd)}</td>
                      <td className={`py-1.5 px-2 text-right font-mono text-xs font-bold ${isHigh ? 'text-red-400' : isLow ? 'text-emerald-400' : 'text-white/40'}`}>
                        {fundingPct != null ? `${fundingPct >= 0 ? '+' : ''}${fundingPct.toFixed(4)}%` : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs text-white/30 hidden sm:table-cell">{fmtUsd(asset.total_volume_24h)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs text-white/25 hidden md:table-cell">{asset.market_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </GlassCard>
  );
});

// ── Liquidations Panel (estimated proxy) ─────────────────────
const WhaleLiquidationsPanel = memo(function WhaleLiquidationsPanel() {
  const { data, loading } = useDerivatives();
  const liq = data?.estimatedLiquidations ?? null;

  const longCount = liq?.elevated_long_squeeze_risk.length ?? 0;
  const shortCount = liq?.elevated_short_squeeze_risk.length ?? 0;
  const moderateCount = liq?.moderate_risk.length ?? 0;

  return (
    <GlassCard>
      <div className="space-y-4">
        {/* Estimated-proxy disclaimer banner */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">⚠️ Estimated — Liquidation Risk Proxy</span>
          </div>
          {liq && (
            <p className="text-[11px] text-amber-300/70 leading-relaxed">{liq.note}</p>
          )}
          {liq && (
            <p className="text-[11px] text-white/30 mt-1 leading-relaxed">Methodology: {liq.methodology}</p>
          )}
        </div>

        {/* Risk-tier stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassStat
            label="Long Squeeze Risk"
            value={loading ? '—' : `${longCount} assets`}
            icon={<span className="text-red-400">🔻</span>}
            loading={loading}
          />
          <GlassStat
            label="Short Squeeze Risk"
            value={loading ? '—' : `${shortCount} assets`}
            icon={<span className="text-emerald-400">🔺</span>}
            loading={loading}
          />
          <GlassStat
            label="Moderate Risk"
            value={loading ? '—' : `${moderateCount} assets`}
            icon={<span>⚠️</span>}
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Long squeeze */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-red-400/70 font-medium mb-2">Elevated Long Squeeze Risk</p>
            {loading ? (
              <GlassTableSkeleton rows={4} />
            ) : !liq || liq.elevated_long_squeeze_risk.length === 0 ? (
              <EmptyState icon="✅" title="None detected" />
            ) : (
              <div className="space-y-1.5">
                {liq.elevated_long_squeeze_risk.map((asset) => {
                  const detail = data?.assets.find(a => a.base === asset);
                  const fp = detail?.avg_funding_rate != null ? (detail.avg_funding_rate * 100).toFixed(4) : null;
                  return (
                    <div key={asset} className="flex items-center justify-between rounded-lg bg-red-500/[0.06] border border-red-500/10 px-3 py-1.5">
                      <span className="text-xs font-bold text-white/80">{asset}</span>
                      {fp && <span className="text-[11px] font-mono text-red-400">+{fp}%</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Short squeeze */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-emerald-400/70 font-medium mb-2">Elevated Short Squeeze Risk</p>
            {loading ? (
              <GlassTableSkeleton rows={4} />
            ) : !liq || liq.elevated_short_squeeze_risk.length === 0 ? (
              <EmptyState icon="✅" title="None detected" />
            ) : (
              <div className="space-y-1.5">
                {liq.elevated_short_squeeze_risk.map((asset) => {
                  const detail = data?.assets.find(a => a.base === asset);
                  const fp = detail?.avg_funding_rate != null ? (detail.avg_funding_rate * 100).toFixed(4) : null;
                  return (
                    <div key={asset} className="flex items-center justify-between rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10 px-3 py-1.5">
                      <span className="text-xs font-bold text-white/80">{asset}</span>
                      {fp && <span className="text-[11px] font-mono text-emerald-400">{fp}%</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {liq && liq.moderate_risk.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-amber-400/70 font-medium mb-2">Moderate Risk</p>
            <div className="flex flex-wrap gap-2">
              {liq.moderate_risk.map((asset) => (
                <span key={asset} className="px-2.5 py-1 rounded-lg bg-amber-500/[0.08] border border-amber-500/15 text-xs font-bold text-amber-300/80">
                  {asset}
                </span>
              ))}
            </div>
          </div>
        )}

        <SignalBadge
          signal="neutral"
          label="Risk Proxy Note"
          value="Estimated — not a real liquidation feed"
          description="Risk tiers are derived from funding rates. Actual forced liquidations depend on leverage, margin health, and exchange-specific rules unavailable without authenticated exchange data."
          icon="💡"
        />
      </div>
    </GlassCard>
  );
});

// ── On-Chain Panel ────────────────────────────────────────────
const WhaleOnChainPanel = memo(function WhaleOnChainPanel() {
  const { data, loading } = useOnChain();
  const supply = data?.stablecoinSupply ?? null;
  const topChains = data?.chains.slice(0, 10) ?? [];
  const topFees = data?.fees.filter(f => f.fees_24h != null).slice(0, 10) ?? [];

  return (
    <GlassCard>
      <div className="space-y-6">
        {/* Stablecoin supply summary */}
        <div>
          <SectionHeader title="⛓️ Stablecoin Supply" subtitle="Total circulating stablecoin supply across chains" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <GlassStat
              label="Total Circulating Supply"
              value={supply ? fmtUsd(supply.total_circulating_usd) : '—'}
              loading={loading}
            />
            <GlassStat
              label="24h Change"
              value={supply?.change_24h_pct != null
                ? `${supply.change_24h_pct >= 0 ? '+' : ''}${supply.change_24h_pct.toFixed(2)}%`
                : '—'}
              change={supply?.change_24h_pct ?? null}
              loading={loading}
            />
            <GlassStat
              label="Stablecoins Tracked"
              value={supply ? `${supply.top_count}` : '—'}
              loading={loading}
            />
          </div>
        </div>

        {/* Top chains by TVL */}
        <div>
          <SectionHeader title="🏦 Top Chains by TVL" subtitle="Total Value Locked in DeFi protocols per chain" />
          {loading ? (
            <GlassTableSkeleton rows={8} />
          ) : topChains.length === 0 ? (
            <EmptyState icon="⛓️" title="No chain data available" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Chain</th>
                    <th className="text-right py-2 px-2 font-medium">TVL</th>
                    <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Token</th>
                  </tr>
                </thead>
                <tbody>
                  {topChains.map((chain, idx) => (
                    <tr key={chain.name} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors">
                      <td className="py-1.5 px-2 text-white/20 text-xs font-mono">{idx + 1}</td>
                      <td className="py-1.5 px-2 text-white/80 text-xs font-bold">{chain.name}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs text-white/70">{fmtUsd(chain.tvl)}</td>
                      <td className="py-1.5 px-2 text-right text-xs text-white/30 hidden sm:table-cell">{chain.tokenSymbol ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top protocols by 24h fees */}
        <div>
          <SectionHeader title="💸 Top Protocols by 24h Fees" subtitle="Protocols generating the most fees in the last 24 hours" />
          {loading ? (
            <GlassTableSkeleton rows={8} />
          ) : topFees.length === 0 ? (
            <EmptyState icon="💸" title="No protocol fee data available" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Protocol</th>
                    <th className="text-right py-2 px-2 font-medium">Fees 24h</th>
                    <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Revenue 24h</th>
                    <th className="text-right py-2 px-2 font-medium hidden md:table-cell">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {topFees.map((proto, idx) => (
                    <tr key={proto.slug} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors">
                      <td className="py-1.5 px-2 text-white/20 text-xs font-mono">{idx + 1}</td>
                      <td className="py-1.5 px-2 text-white/80 text-xs font-bold">{proto.name}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs text-emerald-400">
                        {proto.fees_24h != null ? fmtUsd(proto.fees_24h) : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs text-white/40 hidden sm:table-cell">
                        {proto.revenue_24h != null ? fmtUsd(proto.revenue_24h) : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right text-xs text-white/30 hidden md:table-cell">{proto.category ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
});

const VALID = ['trades', 'walls', 'oi', 'liquidations', 'onchain'] as const;
type SignalId = (typeof VALID)[number];

const TABS = [
  { id: 'trades',       label: '🧱 Block Trades' },
  { id: 'walls',        label: '🧱 Order Book Walls' },
  { id: 'oi',           label: '📊 Open Interest' },
  { id: 'liquidations', label: '💧 Liquidations' },
  { id: 'onchain',      label: '⛓️ On-chain' },
];

export default function WhalesHub() {
  const navigate = useNavigate();
  const { signal } = useParams<{ signal: string }>();
  const active: SignalId = (VALID as readonly string[]).includes(signal ?? '')
    ? (signal as SignalId)
    : 'trades';

  // Single SSE connection owned at hub level — shared across tabs
  const stream = useWhaleStream({ enabled: true });

  return (
    <PageTemplate
      title="Block Trades"
      description="Large institutional block trades, order-book walls, open interest and liquidations — live"
      centered
    >
      <div className="space-y-4">
        {/* Tabs row with stream status pill */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <GlassTabs
            tabs={TABS}
            active={active}
            onChange={id => navigate(`/app/crypto/whales/${id}`)}
          />
          <StreamStatusPill status={stream.status} />
        </div>
        {active === 'trades' ? (
          <WhaleTradesPanel stream={stream} />
        ) : active === 'walls' ? (
          <OrderWallsPanel />
        ) : active === 'oi' ? (
          <WhaleOIPanel />
        ) : active === 'liquidations' ? (
          <WhaleLiquidationsPanel />
        ) : (
          <WhaleOnChainPanel />
        )}
      </div>
    </PageTemplate>
  );
}
