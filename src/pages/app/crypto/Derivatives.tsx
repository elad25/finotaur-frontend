// ============================================================
// PAGE 4/7: DERIVATIVES — All Futures & Derivatives Data
// Consolidates: Funding Rates, Liquidations, OI, Long/Short
// ============================================================

import { memo, useMemo, useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { useFundingRates, useDerivatives } from './_shared/hooks';
import { GlassCard, GlassStat, GlassTabs, SectionHeader, SignalBadge, GlassTableSkeleton, EmptyState } from './_shared/GlassUI';
import type { DerivativeAsset } from './_shared/types';

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
            return <tr key={r.symbol} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors"><td className="py-1.5 px-2 text-white/60 text-xs font-medium">{r.symbol}</td><td className={`py-1.5 px-2 text-right font-mono text-xs font-bold ${isH ? 'text-red-400' : isL ? 'text-emerald-400' : 'text-white/40'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(4)}%</td><td className={`py-1.5 px-2 text-right font-mono text-xs ${Math.abs(ann) > 30 ? 'text-amber-400' : 'text-white/25'}`}>{ann >= 0 ? '+' : ''}{ann.toFixed(1)}%</td><td className="py-1.5 px-2 text-right font-mono text-xs text-white/30 hidden sm:table-cell">${r.markPrice?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '—'}</td><td className="py-1.5 px-2 text-center">{isH ? <span className="text-red-400 text-[10px]">⚠️ HIGH</span> : isL ? <span className="text-emerald-400 text-[10px]">🟢 LOW</span> : <span className="text-white/15 text-[10px]">—</span>}</td></tr>;
          })}
        </tbody></table></div>
      )}
    </div>
  );
});

// ── Liquidations Tab ─────────────────────────────────────────
const LiquidationsTab = memo(function LiquidationsTab() {
  const { data, loading } = useDerivatives();
  const liq = data?.estimatedLiquidations ?? null;

  const longCount = liq?.elevated_long_squeeze_risk.length ?? 0;
  const shortCount = liq?.elevated_short_squeeze_risk.length ?? 0;
  const moderateCount = liq?.moderate_risk.length ?? 0;

  return (
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

      {/* Risk-tier stat row */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Long squeeze candidates */}
        <GlassCard glow="red">
          <SectionHeader
            title="🔴 Elevated Long Squeeze Risk"
            subtitle="High positive funding — longs at risk of forced unwind"
          />
          {loading ? (
            <GlassTableSkeleton rows={5} />
          ) : !liq || liq.elevated_long_squeeze_risk.length === 0 ? (
            <EmptyState icon="✅" title="No elevated long squeeze risk detected" />
          ) : (
            <div className="space-y-1.5">
              {liq.elevated_long_squeeze_risk.map((asset) => {
                const detail = data?.assets.find(a => a.base === asset);
                const fundingPct = detail?.avg_funding_rate != null ? (detail.avg_funding_rate * 100).toFixed(4) : null;
                return (
                  <div key={asset} className="flex items-center justify-between rounded-lg bg-red-500/[0.06] border border-red-500/10 px-3 py-2">
                    <span className="text-sm font-bold text-white/80">{asset}</span>
                    <div className="flex items-center gap-3">
                      {fundingPct && (
                        <span className="text-xs font-mono text-red-400">+{fundingPct}% funding</span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-red-400/70 font-medium">Long Risk</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Short squeeze candidates */}
        <GlassCard glow="emerald">
          <SectionHeader
            title="🟢 Elevated Short Squeeze Risk"
            subtitle="High negative funding — shorts at risk of forced unwind"
          />
          {loading ? (
            <GlassTableSkeleton rows={5} />
          ) : !liq || liq.elevated_short_squeeze_risk.length === 0 ? (
            <EmptyState icon="✅" title="No elevated short squeeze risk detected" />
          ) : (
            <div className="space-y-1.5">
              {liq.elevated_short_squeeze_risk.map((asset) => {
                const detail = data?.assets.find(a => a.base === asset);
                const fundingPct = detail?.avg_funding_rate != null ? (detail.avg_funding_rate * 100).toFixed(4) : null;
                return (
                  <div key={asset} className="flex items-center justify-between rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10 px-3 py-2">
                    <span className="text-sm font-bold text-white/80">{asset}</span>
                    <div className="flex items-center gap-3">
                      {fundingPct && (
                        <span className="text-xs font-mono text-emerald-400">{fundingPct}% funding</span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-medium">Short Risk</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Moderate risk list */}
      {liq && liq.moderate_risk.length > 0 && (
        <GlassCard glow="amber">
          <SectionHeader title="🟡 Moderate Risk" subtitle="Elevated funding — watch for potential position unwinds" />
          <div className="flex flex-wrap gap-2">
            {liq.moderate_risk.map((asset) => (
              <span key={asset} className="px-2.5 py-1 rounded-lg bg-amber-500/[0.08] border border-amber-500/15 text-xs font-bold text-amber-300/80">
                {asset}
              </span>
            ))}
          </div>
        </GlassCard>
      )}

      <SignalBadge
        signal="neutral"
        label="Risk Proxy Note"
        value="Estimated — not a real liquidation feed"
        description="This panel derives risk tiers from funding rates as a proxy. Actual forced liquidations depend on leverage levels, margin health, and exchange-specific rules not available without authenticated exchange data."
        icon="💡"
      />
    </div>
  );
});

// ── Helpers ───────────────────────────────────────────────────
function fmtUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// ── Open Interest Tab ────────────────────────────────────────
const OITab = memo(function OITab() {
  const { data, loading } = useDerivatives();
  const [sort, setSort] = useState<'oi' | 'volume' | 'funding'>('oi');

  const sorted = useMemo((): DerivativeAsset[] => {
    if (!data?.assets) return [];
    const s = [...data.assets];
    if (sort === 'volume') s.sort((a, b) => b.total_volume_24h - a.total_volume_24h);
    else if (sort === 'funding') s.sort((a, b) => Math.abs(b.avg_funding_rate ?? 0) - Math.abs(a.avg_funding_rate ?? 0));
    else s.sort((a, b) => b.total_open_interest_usd - a.total_open_interest_usd);
    return s;
  }, [data, sort]);

  const totals = data?.totals ?? null;
  const avgFundingPct = totals?.avg_funding_rate != null ? totals.avg_funding_rate * 100 : null;

  return (
    <div className="space-y-4">
      {/* Aggregate stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassStat
          label="Total Open Interest"
          value={totals ? fmtUsd(totals.total_open_interest_usd) : '—'}
          loading={loading}
        />
        <GlassStat
          label="Avg Funding Rate"
          value={avgFundingPct != null ? `${avgFundingPct >= 0 ? '+' : ''}${avgFundingPct.toFixed(4)}%` : '—'}
          loading={loading}
        />
        <GlassStat
          label="Total Volume 24h"
          value={totals ? fmtUsd(totals.total_volume_24h) : '—'}
          loading={loading}
        />
        <GlassStat
          label="Assets Tracked"
          value={totals ? `${totals.asset_count}` : '—'}
          loading={loading}
        />
      </div>

      {/* Per-asset OI table */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="Open Interest by Asset" subtitle="Sorted futures markets by derivative exposure" />
          <div className="flex gap-1 absolute right-5">
            {([['oi', 'By OI'], ['volume', 'By Volume'], ['funding', 'By Funding']] as const).map(([id, lbl]) => (
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
          <GlassTableSkeleton rows={12} />
        ) : sorted.length === 0 ? (
          <EmptyState icon="📊" title="No derivatives data available" description="Data loads on the next polling cycle." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]">
                  <th className="text-left py-2 px-2 font-medium">#</th>
                  <th className="text-left py-2 px-2 font-medium">Asset</th>
                  <th className="text-right py-2 px-2 font-medium">Open Interest</th>
                  <th className="text-right py-2 px-2 font-medium">Avg Funding</th>
                  <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Volume 24h</th>
                  <th className="text-right py-2 px-2 font-medium hidden md:table-cell">Markets</th>
                  <th className="text-center py-2 px-2 font-medium hidden sm:table-cell">Risk</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((asset, idx) => {
                  const fundingPct = asset.avg_funding_rate != null ? asset.avg_funding_rate * 100 : null;
                  const isHighFunding = fundingPct != null && fundingPct > 0.05;
                  const isLowFunding = fundingPct != null && fundingPct < -0.03;
                  const riskColor: Record<string, string> = {
                    extreme_long: 'text-red-400',
                    extreme_short: 'text-emerald-400',
                    moderate: 'text-amber-400',
                    neutral: 'text-white/20',
                  };
                  const riskLabel: Record<string, string> = {
                    extreme_long: '⚠️ LONG',
                    extreme_short: '⚠️ SHORT',
                    moderate: '〜 MOD',
                    neutral: '—',
                  };
                  const risk = asset.liquidation_risk ?? 'neutral';
                  return (
                    <tr key={asset.base} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors">
                      <td className="py-1.5 px-2 text-white/20 text-xs font-mono">{idx + 1}</td>
                      <td className="py-1.5 px-2 text-white/80 text-xs font-bold">{asset.base}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs text-white/70">{fmtUsd(asset.total_open_interest_usd)}</td>
                      <td className={`py-1.5 px-2 text-right font-mono text-xs font-bold ${isHighFunding ? 'text-red-400' : isLowFunding ? 'text-emerald-400' : 'text-white/40'}`}>
                        {fundingPct != null ? `${fundingPct >= 0 ? '+' : ''}${fundingPct.toFixed(4)}%` : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs text-white/30 hidden sm:table-cell">{fmtUsd(asset.total_volume_24h)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs text-white/25 hidden md:table-cell">{asset.market_count}</td>
                      <td className={`py-1.5 px-2 text-center text-[10px] hidden sm:table-cell ${riskColor[risk]}`}>
                        {riskLabel[risk]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
});

// ── Main ─────────────────────────────────────────────────────
export default function CryptoDerivatives() {
  const [tab, setTab] = useState('funding');
  return (
    <PageTemplate title="Derivatives" description="Funding rates, liquidations, and open interest" centered>
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
