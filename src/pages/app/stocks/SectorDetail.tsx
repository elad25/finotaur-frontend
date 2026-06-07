// src/pages/app/stocks/SectorDetail.tsx
// Sector detail page — factual data only. No AI text, no verdicts, no signals.

import React, { memo, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SectionSpinner } from '@/components/ds/Spinner';
import {
  useSectorDetail,
  useSectorHoldings,
  type Sector,
  type SectorVsMarketEntry,
  type Holding,
} from '@/hooks/stocks/useSectors';

// ─── Helpers (same pure fns as Sectors.tsx — kept local to avoid shared mutable state) ───

type Period = '1D' | '1W' | '1M' | 'YTD' | '1Y';
const PERIODS: Period[] = ['1D', '1W', '1M', 'YTD', '1Y'];

function perfFor(sector: Sector, period: Period): number | null {
  if (!sector.vsMarket) return null;
  const entry = sector.vsMarket.find((v: SectorVsMarketEntry) => v.period === period);
  return entry?.sectorReturn ?? null;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '−';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function fmtPrice(v: number | string | null | undefined): string {
  if (v == null) return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n as number)) return '—';
  return `$${n.toFixed(2)}`;
}

function fmtVolume(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** 0 / null → "—", otherwise format as number with fixed decimals. */
function fmtNum(
  n: number | null | undefined,
  opts: { decimals?: number; suffix?: string } = {}
): string {
  if (n == null || n === 0) return '—';
  const { decimals = 2, suffix = '' } = opts;
  return `${n.toFixed(decimals)}${suffix}`;
}

function numColor(n: number | null | undefined): string {
  if (n == null) return 'text-ink-secondary';
  return n >= 0 ? 'text-ink-primary' : 'text-num-negative';
}

// ─── Simple SVG sparkline from series data (1M sectorReturn) ─────────────────

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

const Sparkline = memo(function Sparkline({ values, width = 120, height = 36 }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const lastVal = values[values.length - 1];
  const strokeColor = lastVal >= 0 ? '#C9A646' : '#E24B4A';
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
    >
      <polyline points={pts} stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
    </svg>
  );
});

// ─── Cards ────────────────────────────────────────────────────────────────────

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5">
      <h2 className="text-xs uppercase tracking-widest text-ink-secondary mb-4 font-medium">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Performance vs S&P 500 card ─────────────────────────────────────────────

const PerformanceCard = memo(function PerformanceCard({ sector }: { sector: Sector }) {
  // Try to build sparkline from 1M series
  const series1M = useMemo(() => {
    const entry = sector.vsMarket?.find((v) => v.period === '1M');
    return entry?.series?.map((s) => s.sectorReturn) ?? [];
  }, [sector.vsMarket]);

  return (
    <CardShell title="Performance vs S&P 500">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-ds-subtle">
              <th className="text-left text-[11px] uppercase tracking-wider text-ink-secondary pb-2 pr-4">
                Period
              </th>
              <th className="text-right text-[11px] uppercase tracking-wider text-ink-secondary pb-2 pr-4">
                Sector
              </th>
              <th className="text-right text-[11px] uppercase tracking-wider text-ink-secondary pb-2 pr-4">
                SPY
              </th>
              <th className="text-right text-[11px] uppercase tracking-wider text-ink-secondary pb-2">
                Alpha
              </th>
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => {
              const entry = sector.vsMarket?.find((v) => v.period === period);
              const sectorRet = entry?.sectorReturn ?? null;
              const spyRet = entry?.spyReturn ?? null;
              const alpha = entry?.alpha ?? null;
              return (
                <tr key={period} className="border-b border-border-ds-subtle last:border-0">
                  <td className="py-2 pr-4 text-ink-secondary font-mono text-xs">{period}</td>
                  <td className={`py-2 pr-4 text-right font-mono tabular-nums text-sm ${numColor(sectorRet)}`}>
                    {fmtPct(sectorRet)}
                  </td>
                  <td className={`py-2 pr-4 text-right font-mono tabular-nums text-sm ${numColor(spyRet)}`}>
                    {fmtPct(spyRet)}
                  </td>
                  <td className={`py-2 text-right font-mono tabular-nums text-sm ${numColor(alpha)}`}>
                    {fmtPct(alpha)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {series1M.length >= 2 && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[10px] text-ink-secondary uppercase tracking-wider">1M trend</span>
          <Sparkline values={series1M} />
        </div>
      )}
    </CardShell>
  );
});

// ─── Fundamentals card ────────────────────────────────────────────────────────

const FundamentalsCard = memo(function FundamentalsCard({ sector }: { sector: Sector }) {
  const f = sector.fundamentals;
  if (!f) return null;

  const rows = [
    { label: 'Revenue Growth', value: fmtNum(f.revGrowth, { suffix: '%' }) },
    { label: 'Earnings Growth', value: fmtNum(f.earningsGrowth, { suffix: '%' }) },
    { label: 'P/E vs S&P Avg', value: fmtNum(f.peVsSpAvg, { suffix: '%' }) },
    { label: 'EV/EBITDA', value: fmtNum(f.evEbitda, { decimals: 1 }) },
    { label: 'Forward P/E', value: fmtNum(f.peForward, { decimals: 1 }) },
  ];

  return (
    <CardShell title="Fundamentals">
      <dl className="space-y-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <dt className="text-sm text-ink-secondary">{label}</dt>
            <dd className="font-mono tabular-nums text-sm text-ink-primary">{value}</dd>
          </div>
        ))}
      </dl>
    </CardShell>
  );
});

// ─── Correlations card ────────────────────────────────────────────────────────

const CorrelationsCard = memo(function CorrelationsCard({ sector }: { sector: Sector }) {
  const corrs = sector.correlations;
  if (!corrs || corrs.length === 0) return null;

  return (
    <CardShell title="Correlations">
      <div className="space-y-2">
        {corrs.map(({ ticker, correlation }) => (
          <div key={ticker} className="flex items-center gap-3">
            <span className="font-mono text-xs text-ink-secondary w-10 flex-shrink-0">{ticker}</span>
            {/* Bar */}
            <div className="flex-1 h-1.5 rounded-full bg-surface-base overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.abs(correlation) * 100}%`,
                  backgroundColor: 'rgba(201,166,70,0.7)',
                }}
              />
            </div>
            <span className="font-mono tabular-nums text-xs text-ink-primary w-10 text-right flex-shrink-0">
              {correlation.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </CardShell>
  );
});

// ─── Macro sensitivity card ───────────────────────────────────────────────────

function sensitivityStyle(s: string): { label: string; className: string } {
  const lower = s.toLowerCase();
  if (lower === 'high') return { label: 'High', className: 'text-gold-primary' };
  if (lower === 'medium') return { label: 'Medium', className: 'text-ink-secondary' };
  return { label: 'Low', className: 'text-ink-secondary opacity-50' };
}

const MacroSensitivityCard = memo(function MacroSensitivityCard({ sector }: { sector: Sector }) {
  const items = sector.macroSensitivity;
  if (!items || items.length === 0) return null;

  return (
    <CardShell title="Macro Sensitivity">
      <div className="space-y-3">
        {items.map(({ factor, sensitivity, impact }) => {
          const { label, className } = sensitivityStyle(sensitivity);
          return (
            <div key={factor}>
              <div className="flex items-center justify-between gap-3 mb-0.5">
                <span className="text-sm text-ink-primary">{factor}</span>
                <span className={`text-xs font-mono font-medium ${className}`}>{label}</span>
              </div>
              {impact && (
                <p className="text-xs text-ink-secondary leading-relaxed">{impact}</p>
              )}
            </div>
          );
        })}
      </div>
    </CardShell>
  );
});

// ─── ETFs card ────────────────────────────────────────────────────────────────

const EtfsCard = memo(function EtfsCard({ sector }: { sector: Sector }) {
  const etfs = sector.etfs;
  if (!etfs || etfs.length === 0) return null;

  return (
    <CardShell title="ETFs">
      <div className="space-y-2">
        {etfs.map(({ ticker, name, aum }) => (
          <div key={ticker} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded border border-border-ds-subtle text-ink-secondary mr-2">
                {ticker}
              </span>
              <span className="text-sm text-ink-primary truncate">{name}</span>
            </div>
            {aum != null && aum > 0 && (
              <span className="text-xs font-mono tabular-nums text-ink-secondary flex-shrink-0">
                {fmtVolume(aum)} AUM
              </span>
            )}
          </div>
        ))}
      </div>
    </CardShell>
  );
});

// ─── Holdings table ───────────────────────────────────────────────────────────

const HoldingsTable = memo(function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) {
    return (
      <CardShell title="Top Holdings">
        <p className="text-sm text-ink-secondary">Holdings data updating.</p>
      </CardShell>
    );
  }

  return (
    <CardShell title="Top Holdings">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[360px]">
          <thead>
            <tr className="border-b border-border-ds-subtle">
              <th className="text-left text-[11px] uppercase tracking-wider text-ink-secondary pb-2 pr-4">
                Ticker
              </th>
              <th className="text-right text-[11px] uppercase tracking-wider text-ink-secondary pb-2 pr-4">
                Price
              </th>
              <th className="text-right text-[11px] uppercase tracking-wider text-ink-secondary pb-2 pr-4">
                1D%
              </th>
              <th className="text-right text-[11px] uppercase tracking-wider text-ink-secondary pb-2">
                Volume
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.ticker} className="border-b border-border-ds-subtle last:border-0">
                <td className="py-2 pr-4 font-mono text-xs text-ink-primary font-medium">
                  {h.ticker}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums text-sm text-ink-primary">
                  {fmtPrice(h.price)}
                </td>
                <td
                  className={`py-2 pr-4 text-right font-mono tabular-nums text-sm ${numColor(
                    h.change_percent
                  )}`}
                >
                  {fmtPct(h.change_percent)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-sm text-ink-secondary">
                  {fmtVolume(h.volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardShell>
  );
});

// ─── Stat chip (header) ───────────────────────────────────────────────────────

function StatChip({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] uppercase tracking-widest text-ink-secondary">{label}</span>
      <span className={`font-mono tabular-nums font-semibold ${valueClass ?? 'text-ink-primary'}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SectorDetail = memo(function SectorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sector, isLoading: sLoading, error: sError } = useSectorDetail(id);
  const { data: holdings = [], isLoading: hLoading } = useSectorHoldings(id);

  const isLoading = sLoading || hLoading;

  if (isLoading) return <SectionSpinner />;

  if (sError || !sector) {
    return (
      <div className="p-ds-5">
        <button
          onClick={() => navigate('/app/stocks/sectors')}
          className="text-xs text-ink-secondary hover:text-gold-primary transition-colors mb-4 flex items-center gap-1"
        >
          ← Sectors
        </button>
        <p className="text-num-negative text-sm">Sector data unavailable — please try again later.</p>
      </div>
    );
  }

  const changePercent = sector.changePercent;
  const perf1D = perfFor(sector, '1D');

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Back link */}
      <button
        onClick={() => navigate('/app/stocks/sectors')}
        className="text-xs text-ink-secondary hover:text-gold-primary transition-colors flex items-center gap-1"
      >
        ← Sectors
      </button>

      {/* Header */}
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: name + description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-ink-primary leading-tight">{sector.name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded border border-gold-border text-gold-primary">
                {sector.ticker}
              </span>
            </div>
            {sector.description && (
              <p className="text-sm text-ink-secondary leading-relaxed max-w-2xl">
                {sector.description}
              </p>
            )}
          </div>

          {/* Right: key stats */}
          <div className="flex flex-wrap items-start gap-6">
            <StatChip label="Price" value={fmtPrice(sector.price)} />
            <StatChip
              label="1D Change"
              value={fmtPct(changePercent)}
              valueClass={numColor(changePercent)}
            />
            {sector.spWeight != null && (
              <StatChip label="S&P Weight" value={`${sector.spWeight.toFixed(1)}%`} />
            )}
            {sector.beta != null && (
              <StatChip label="Beta" value={sector.beta.toFixed(2)} />
            )}
          </div>
        </div>
      </div>

      {/* Performance card — full width */}
      {sector.vsMarket && sector.vsMarket.length > 0 && (
        <PerformanceCard sector={sector} />
      )}

      {/* Two-column grid: fundamentals + correlations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-ds-4">
        <FundamentalsCard sector={sector} />
        <CorrelationsCard sector={sector} />
      </div>

      {/* Two-column grid: macro sensitivity + ETFs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-ds-4">
        <MacroSensitivityCard sector={sector} />
        <EtfsCard sector={sector} />
      </div>

      {/* Holdings — full width */}
      <HoldingsTable holdings={holdings} />

      {/* Data attribution */}
      <p className="text-[11px] text-ink-secondary opacity-40 text-center">
        Market data may be delayed · Factual data only
      </p>
    </div>
  );
});

export default SectorDetail;
