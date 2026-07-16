import React, { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Building2,
  Crown,
  Lock,
  PieChart,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useMarketStatus, type MarketStatusResult } from '@/lib/marketStatus';
import type { Sector, SentimentType } from '../types';

const gold = '#C9A646';
const green = '#22C55E';
const red = '#EF4444';
const amber = '#F59E0B';

type VsMarketSeriesPoint = {
  date?: string;
  label?: string;
  sectorReturn: number;
  spyReturn: number;
  alpha?: number;
};

type VsMarketRow = {
  period: string;
  sectorReturn: number;
  spyReturn: number;
  alpha?: number;
  source?: string;
  asOf?: string;
  refreshCadence?: string;
  series?: VsMarketSeriesPoint[];
};

type CachedSectorAnalysis = {
  vs_market?: VsMarketRow[];
  vsMarket?: VsMarketRow[];
  data_timestamp?: string;
  updated_at?: string;
} | null;

type PerformanceRange = '1D' | '1W' | '1M' | 'YTD' | '1Y';
const performanceRanges: PerformanceRange[] = ['1D', '1W', '1M', 'YTD', '1Y'];

// =====================================================
// Defensive display helpers for market-closed periods.
// When the US equity market is closed and the cron snapshot didn't write
// a meaningful spot price (`price === 0` is what the snapshot writes on
// weekends/holidays via `?? 0` in snapshotToSector), we render an em-dash
// instead of misleading "$0.00" / "+0.00%". The market-status pill above
// the price provides the "Showing Friday's Close" context.
// =====================================================
const formatPriceOrDash = (value: number, marketOpen: boolean): string =>
  !marketOpen && (!Number.isFinite(value) || value === 0) ? '—' : `$${value.toFixed(2)}`;

const formatPercentOrDash = (value: number, marketOpen: boolean): string => {
  if (!marketOpen && (!Number.isFinite(value) || value === 0)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const isMissingWhenClosed = (value: number, marketOpen: boolean): boolean =>
  !marketOpen && (!Number.isFinite(value) || value === 0);

const sentimentLabel = (sentiment: SentimentType) => (
  sentiment === 'bullish' ? 'Bullish' : sentiment === 'bearish' ? 'Bearish' : 'Neutral'
);

const sentimentColor = (sentiment: SentimentType) => (
  sentiment === 'bullish' ? green : sentiment === 'bearish' ? red : amber
);

const MiniPerfBar = memo<{ label: string; value: number; marketOpen: boolean }>(({ label, value, marketOpen }) => {
  const missing = isMissingWhenClosed(value, marketOpen);
  const positive = value >= 0;
  const width = missing ? 0 : Math.min(Math.abs(value) * 18, 90);
  const barColor = missing ? 'rgba(183,189,199,0.35)' : positive ? green : red;
  return (
    <div className="grid grid-cols-[28px_1fr_64px] items-center gap-3">
      <span className="text-xs text-[#B7BDC7]">{label}</span>
      <div className="h-1 rounded-full bg-white/[0.08]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: barColor }}
        />
      </div>
      <span
        className="text-right text-xs font-bold tabular-nums"
        style={{ color: missing ? '#8E96A3' : positive ? green : red }}
      >
        {formatPercentOrDash(value, marketOpen)}
      </span>
    </div>
  );
});
MiniPerfBar.displayName = 'MiniPerfBar';

// =====================================================
// Derive 1W / 1M / YTD period returns from cachedAnalysis.vs_market when
// available — these are Polygon-sourced daily-bar returns, real values
// that survive weekends. Falls back to sector.weekChange/monthChange/
// ytdChange (which are bogus etfChange*N approximations from the cron
// and end up 0 outside market hours).
// =====================================================
function deriveBarValue(
  period: 'W' | 'M' | 'YTD',
  sector: Sector,
  cachedAnalysis?: CachedSectorAnalysis,
): number {
  const rows = ((cachedAnalysis?.vsMarket || cachedAnalysis?.vs_market || sector.vsMarket || []) as VsMarketRow[])
    .filter((row) => Number.isFinite(row.sectorReturn));
  const periodKey = period === 'W' ? '1W' : period === 'M' ? '1M' : 'YTD';
  const row = rows.find((r) => r.period === periodKey);
  if (row && Number.isFinite(row.sectorReturn)) return row.sectorReturn;
  // Fallback to (bogus, weekend-zero) snapshot approximation
  if (period === 'W') return sector.weekChange ?? 0;
  if (period === 'M') return sector.monthChange ?? 0;
  return sector.ytdChange ?? 0;
}

const PerformanceChart = memo<{ sector: Sector; cachedAnalysis?: CachedSectorAnalysis }>(({ sector, cachedAnalysis }) => {
  const [range, setRange] = useState<PerformanceRange>('YTD');
  // Index of the data point currently hovered by the user (null = no hover).
  // Drives the crosshair + tooltip rendering at the bottom of the SVG.
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const chart = useMemo(() => {
    const rows = ((cachedAnalysis?.vsMarket || cachedAnalysis?.vs_market || sector.vsMarket || []) as VsMarketRow[])
      .filter((row) => Number.isFinite(row.sectorReturn) && Number.isFinite(row.spyReturn));
    const selected = rows.find((row) => row.period === range) || rows.find((row) => row.period === 'YTD') || rows.at(-1);
    const seriesSource = selected?.series?.length
      ? selected.series
      : selected
        ? [
          { label: 'Start', sectorReturn: 0, spyReturn: 0, alpha: 0 },
          {
            label: selected.period,
            sectorReturn: selected.sectorReturn,
            spyReturn: selected.spyReturn,
            alpha: selected.alpha ?? selected.sectorReturn - selected.spyReturn,
          },
        ]
        : [];

    const series = seriesSource
      .filter((point) => Number.isFinite(point.sectorReturn) && Number.isFinite(point.spyReturn))
      .slice(-72);

    if (series.length < 2) {
      const fallbackByRange: Record<PerformanceRange, number> = {
        '1D': sector.changePercent,
        '1W': sector.weekChange,
        '1M': sector.monthChange,
        YTD: sector.ytdChange,
        '1Y': sector.ytdChange,
      };
      const fallbackReturn = fallbackByRange[range];
      const fallback = [
        { label: 'Start', sectorReturn: 0, spyReturn: 0, alpha: 0 },
        { label: range, sectorReturn: fallbackReturn, spyReturn: 0, alpha: fallbackReturn },
      ];
      return { rows, selected, series: fallback, source: 'Static fallback', hasPolygon: false };
    }

    return { rows, selected, series, source: selected?.source === 'polygon' ? 'Polygon' : 'Cached', hasPolygon: selected?.source === 'polygon' };
  }, [cachedAnalysis?.vsMarket, cachedAnalysis?.vs_market, range, sector.changePercent, sector.monthChange, sector.vsMarket, sector.weekChange, sector.ytdChange]);

  const paths = useMemo(() => {
    const width = 330;
    const left = 24;
    const right = 314;
    const top = 24;
    const bottom = 134;
    const values = chart.series.flatMap((point) => [point.sectorReturn, point.spyReturn]);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const pad = Math.max((max - min) * 0.15, 2);
    const lo = min - pad;
    const hi = max + pad;
    const scaleY = (value: number) => bottom - ((value - lo) / (hi - lo || 1)) * (bottom - top);
    const scaleX = (index: number) => left + (index * (right - left)) / Math.max(chart.series.length - 1, 1);
    const sectorPoints = chart.series.map((point, i) => `${scaleX(i)},${scaleY(point.sectorReturn)}`).join(' ');
    const spyPoints = chart.series.map((point, i) => `${scaleX(i)},${scaleY(point.spyReturn)}`).join(' ');
    const area = `${sectorPoints} ${right},${bottom} ${left},${bottom}`;
    const zeroY = scaleY(0);
    const last = chart.series.at(-1);
    const lastX = scaleX(chart.series.length - 1);
    // Per-point coordinates the tooltip layer needs to draw crosshair + dots.
    const pointCoords = chart.series.map((point, i) => ({
      x: scaleX(i),
      sectorY: scaleY(point.sectorReturn),
      spyY: scaleY(point.spyReturn),
    }));

    return {
      sectorPoints,
      spyPoints,
      area,
      zeroY,
      lastX,
      left,
      right,
      top,
      bottom,
      width,
      lastSectorY: last ? scaleY(last.sectorReturn) : bottom,
      lastSpyY: last ? scaleY(last.spyReturn) : bottom,
      ticks: [hi - pad, (hi + lo) / 2, lo + pad].map((value) => ({ value, y: scaleY(value) })),
      labels: chart.series.length > 8
        ? [
          { label: chart.series[0]?.label || '', x: left },
          { label: chart.series[Math.floor(chart.series.length / 2)]?.label || '', x: width / 2 },
          { label: chart.series.at(-1)?.label || '', x: right - 24 },
        ]
        : chart.series.map((point, i) => ({ label: point.label || '', x: scaleX(i) - 8 })),
      pointCoords,
    };
  }, [chart.series]);

  // =====================================================
  // Hover tracking — translates pointer X (in client space) into the
  // SVG's viewBox coordinate system, then picks the nearest series index.
  // The SVG uses viewBox="0 0 330 165"; we scale clientX to that range
  // via getBoundingClientRect so the math stays correct at any width.
  // =====================================================
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (chart.series.length < 2 || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * paths.width;
    // Map svgX back to a series index by inverting scaleX().
    const span = paths.right - paths.left;
    const rel = (svgX - paths.left) / Math.max(span, 1);
    const rawIndex = rel * Math.max(chart.series.length - 1, 1);
    const idx = Math.max(0, Math.min(chart.series.length - 1, Math.round(rawIndex)));
    setHoverIndex(idx);
  };
  const handleMouseLeave = () => setHoverIndex(null);

  // The active point — what the tooltip is rendering values for.
  const hovered = hoverIndex != null ? chart.series[hoverIndex] : null;
  const hoveredCoord = hoverIndex != null ? paths.pointCoords[hoverIndex] : null;
  // Tooltip bubble position: flip to left side if cursor is past the chart's midpoint
  // so the bubble never escapes the canvas. Width budget ~104 px.
  const bubbleW = 104;
  const bubbleH = 56;
  const tipX = hoveredCoord
    ? hoveredCoord.x > paths.width / 2
      ? Math.max(paths.left, hoveredCoord.x - bubbleW - 10)
      : Math.min(paths.right - bubbleW, hoveredCoord.x + 10)
    : 0;
  const tipY = hoveredCoord
    ? Math.max(paths.top, Math.min(hoveredCoord.sectorY - bubbleH - 6, paths.bottom - bubbleH - 4))
    : 0;

  const latest = chart.selected || chart.rows.at(-1);
  const latestSector = latest?.sectorReturn ?? chart.series.at(-1)?.sectorReturn ?? sector.ytdChange;
  const latestSpy = latest?.spyReturn ?? chart.series.at(-1)?.spyReturn ?? 0;
  const alpha = latest?.alpha ?? latestSector - latestSpy;
  const positive = latestSector >= 0;

  return (
    <div className="fin-dark-card relative min-h-[244px] overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(34,197,94,0.10),transparent_30%),radial-gradient(circle_at_18%_90%,rgba(201,166,70,0.08),transparent_36%)]" />
      <div className="relative mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Performance vs S&amp;P 500</p>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="text-2xl font-bold tabular-nums" style={{ color: positive ? green : red }}>
              {latestSector >= 0 ? '+' : ''}{latestSector.toFixed(2)}%
            </span>
            <span className="pb-1 text-[11px] text-[#8E96A3]">vs</span>
            <span className="pb-1 text-[11px] text-[#B7BDC7]">
              {latestSpy >= 0 ? '+' : ''}{latestSpy.toFixed(2)}% S&amp;P 500
            </span>
            <span className="mb-0.5 rounded-full border border-[#C9A646]/20 bg-[#C9A646]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#D8BE68]">
              alpha {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex max-w-[188px] flex-wrap justify-end gap-1.5 text-right">
          {performanceRanges.map((item) => {
            const active = range === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className="rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-all duration-200"
                style={{
                  color: active ? '#07100B' : '#CDD3DD',
                  background: active ? '#C9A646' : 'rgba(255,255,255,0.035)',
                  borderColor: active ? 'rgba(244,217,123,0.70)' : 'rgba(255,255,255,0.08)',
                  boxShadow: active ? '0 0 18px rgba(201,166,70,0.22)' : 'none',
                }}
              >
                {item === '1D' ? 'Today' : item}
              </button>
            );
          })}
          <p className="mt-3 w-full text-[10px] uppercase tracking-[0.12em] text-[#7F8794]">
            {chart.source} / 2x daily
          </p>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 330 165"
        className="relative h-[165px] w-full overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="sectorPerfArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,197,94,0.26)" />
            <stop offset="100%" stopColor="rgba(34,197,94,0)" />
          </linearGradient>
          <filter id="sectorPerfGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {paths.ticks.map((tick, i) => (
          <g key={i}>
            <line x1="22" x2="316" y1={tick.y} y2={tick.y} stroke="rgba(255,255,255,0.07)" />
            <text x="0" y={tick.y + 4} fill="#7F8794" fontSize="9">{tick.value.toFixed(0)}%</text>
          </g>
        ))}
        <line x1="22" x2="316" y1={paths.zeroY} y2={paths.zeroY} stroke="rgba(201,166,70,0.16)" strokeDasharray="4 6" />
        <polygon points={paths.area} fill="url(#sectorPerfArea)" opacity="0.85" />
        <polyline points={paths.spyPoints} fill="none" stroke="rgba(205,211,221,0.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <motion.polyline
          key={range}
          points={paths.sectorPoints}
          fill="none"
          stroke="#22C55E"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#sectorPerfGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.15, ease: 'easeOut' }}
        />
        <circle cx={paths.lastX} cy={paths.lastSpyY} r="3.2" fill="#B7BDC7" opacity="0.8" />
        <circle cx={paths.lastX} cy={paths.lastSectorY} r="4" fill="#22C55E" stroke="#07100B" strokeWidth="2" />
        {paths.labels.map((item, i) => (
          <text key={`${item.label}-${i}`} x={item.x} y="158" fill="#8E96A3" fontSize="10">{item.label}</text>
        ))}
        {/* ===== Hover crosshair + tooltip (only while hovering) ===== */}
        {hovered && hoveredCoord && (
          <g pointerEvents="none">
            {/* Vertical crosshair line */}
            <line
              x1={hoveredCoord.x}
              x2={hoveredCoord.x}
              y1={paths.top - 4}
              y2={paths.bottom + 4}
              stroke="rgba(244,217,123,0.45)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            {/* Highlight dots */}
            <circle cx={hoveredCoord.x} cy={hoveredCoord.spyY} r="3.5" fill="#B7BDC7" stroke="#07100B" strokeWidth="1.5" />
            <circle cx={hoveredCoord.x} cy={hoveredCoord.sectorY} r="4.5" fill="#22C55E" stroke="#07100B" strokeWidth="1.8" />
            {/* Tooltip bubble */}
            <g transform={`translate(${tipX} ${tipY})`}>
              <rect
                width={bubbleW}
                height={bubbleH}
                rx="6"
                fill="rgba(8,12,18,0.96)"
                stroke="rgba(201,166,70,0.35)"
                strokeWidth="1"
              />
              <text x="8" y="13" fill="#8E96A3" fontSize="8" fontWeight="600" letterSpacing="0.4">
                {((hovered.label || ('date' in hovered ? hovered.date : '') || '—') as string).toUpperCase()}
              </text>
              <text x="8" y="27" fill="#22C55E" fontSize="10" fontWeight="700" fontFamily="ui-monospace, monospace">
                {sector.ticker} {hovered.sectorReturn >= 0 ? '+' : ''}{hovered.sectorReturn.toFixed(2)}%
              </text>
              <text x="8" y="40" fill="#B7BDC7" fontSize="10" fontWeight="600" fontFamily="ui-monospace, monospace">
                SPY {hovered.spyReturn >= 0 ? '+' : ''}{hovered.spyReturn.toFixed(2)}%
              </text>
              <text x="8" y="51" fill="#D8BE68" fontSize="9" fontWeight="700" fontFamily="ui-monospace, monospace">
                α {((hovered.alpha ?? hovered.sectorReturn - hovered.spyReturn) >= 0 ? '+' : '')}
                {(hovered.alpha ?? hovered.sectorReturn - hovered.spyReturn).toFixed(2)}%
              </text>
            </g>
          </g>
        )}
      </svg>

      <div className="relative mt-1 flex items-center justify-between text-[10px] text-[#8E96A3]">
        <span className="flex items-center gap-2"><i className="h-1.5 w-5 rounded-full bg-[#22C55E]" />{sector.ticker}</span>
        <span className="flex items-center gap-2"><i className="h-1.5 w-5 rounded-full bg-[#B7BDC7]/70" />SPY</span>
        <span>{chart.hasPolygon ? `as of ${latest?.asOf || 'latest close'}` : 'waiting for Polygon snapshot'}</span>
      </div>
    </div>
  );
});
PerformanceChart.displayName = 'PerformanceChart';

const AIOutlook = memo<{ sector: Sector }>(({ sector }) => {
  const color = sentimentColor(sector.sentiment);
  const confidence = Math.min(Math.max(Math.round((sector.momentum + sector.relativeStrength) / 2), 30), 92);
  const metrics = [
    ['Capital Strength', Math.max(48, Math.min(90, sector.relativeStrength + 17)), green],
    ['Profitability Trend', Math.max(42, Math.min(86, sector.momentum + 17)), '#8DE05F'],
    ['Growth Momentum', Math.max(38, Math.min(84, sector.momentum + 10)), amber],
    ['Risk Outlook', Math.max(34, Math.min(82, 100 - Math.abs(sector.beta - 1) * 36)), amber],
  ] as const;

  return (
    <div className="fin-dark-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">AI Outlook</p>
        <span className="rounded-lg px-8 py-2 text-sm font-bold" style={{ color, background: `${color}12` }}>
          {sentimentLabel(sector.sentiment)}
        </span>
      </div>
      <div className="space-y-3">
        {metrics.map(([label, value, metricColor]) => (
          <div key={label} className="grid grid-cols-[136px_34px_1fr] items-center gap-2">
            <span className="text-xs text-[#B7BDC7]">{label}</span>
            <span className="text-right text-xs font-bold tabular-nums" style={{ color: metricColor }}>{value}</span>
            <div className="h-1 rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full" style={{ width: `${value}%`, background: metricColor }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-5 border-t border-white/[0.07] pt-5">
        <div className="relative flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full border border-[#F59E0B]/30">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(245,158,11,0.18)" strokeWidth="4" />
            <motion.circle
              cx="32"
              cy="32"
              r="27"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="169.65"
              initial={{ strokeDashoffset: 169.65 }}
              animate={{ strokeDashoffset: 169.65 - (169.65 * confidence) / 100 }}
            />
          </svg>
          <span className="text-sm font-bold text-[#F4D97B]">{confidence}%</span>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-[#C9A646]">AI Confidence</p>
          <p className="text-xs leading-relaxed text-[#AAB2BF]">AI models detect {sector.sentiment} sector momentum with risk-adjusted outlook.</p>
        </div>
      </div>
    </div>
  );
});
AIOutlook.displayName = 'AIOutlook';

const MetricCard = memo<{ label: string; value: string; icon: React.ComponentType<{ className?: string }>; color?: string }>(({ label, value, icon: Icon, color = '#F4F6FA' }) => (
  <div className="fin-dark-card flex min-h-[74px] items-center gap-4 px-4 py-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A646]/15 bg-[#C9A646]/8 text-[#C9A646]">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8E96A3]">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  </div>
));
MetricCard.displayName = 'MetricCard';

const RangePanel = memo<{ sector: Sector; marketOpen: boolean }>(({ sector, marketOpen }) => {
  const priceMissing = isMissingWhenClosed(sector.price, marketOpen);
  const low = sector.price * (1 - Math.abs(sector.ytdChange) / 100 - 0.15);
  const high = sector.price * (1 + Math.abs(sector.ytdChange) / 100 + 0.08);
  const position = priceMissing
    ? 50
    : Math.min(Math.max(((sector.price - low) / (high - low)) * 100, 4), 96);
  return (
    <div className="fin-dark-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold uppercase text-[#AAB2BF]">52-Week Range</p>
        <p className="text-sm font-bold text-[#C9A646]">
          {priceMissing ? 'Awaiting next session' : `${Math.round(((sector.price - low) / low) * 100)}% from low`}
        </p>
      </div>
      <div
        className="relative h-1.5 rounded-full bg-gradient-to-r from-[#EF4444] via-[#FACC15] to-[#22C55E]"
        style={{ opacity: priceMissing ? 0.35 : 1 }}
      >
        <motion.div
          initial={{ left: '4%' }}
          animate={{ left: `calc(${position}% - 5px)` }}
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[#F4D97B] shadow-[0_0_22px_rgba(244,217,123,0.65)]"
          style={{ opacity: priceMissing ? 0.4 : 1 }}
        />
      </div>
      <div className="mt-4 flex justify-between text-xs font-semibold text-white">
        <span>{priceMissing ? '—' : `$${low.toFixed(2)}`}</span>
        <span>{priceMissing ? '—' : `$${high.toFixed(2)}`}</span>
      </div>
    </div>
  );
});
RangePanel.displayName = 'RangePanel';

const BottomPanels = memo<{ sector: Sector }>(({ sector }) => {
  const rating = sector.verdict?.rating ?? Math.round((sector.momentum + sector.relativeStrength) / 2);
  const signal = sector.verdict?.signal ?? 'NEUTRAL';
  const heatmap = (sector.subSectors?.slice(0, 4) ?? [
    { name: sector.topHoldings[0]?.ticker ?? 'Leaders', ytd: sector.weekChange },
    { name: sector.topHoldings[1]?.ticker ?? 'Quality', ytd: sector.monthChange },
    { name: sector.topHoldings[2]?.ticker ?? 'Momentum', ytd: sector.changePercent },
    { name: sector.topHoldings[3]?.ticker ?? 'Breadth', ytd: -Math.abs(sector.beta - 1) },
  ]).map((item) => ({ name: item.name, value: 'ytd' in item ? item.ytd : 0 }));

  return (
    <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr_0.8fr]">
      <div className="fin-dark-card flex items-center gap-5 p-5">
        <Award className="h-5 w-5 shrink-0 text-[#C9A646]" />
        <p className="text-sm font-bold text-white">FINOTAUR Sector Rating</p>
        <div className="relative flex h-[70px] w-[70px] shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="29" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle cx="36" cy="36" r="29" fill="none" stroke="#C9A646" strokeWidth="5" strokeLinecap="round" strokeDasharray="182.2" strokeDashoffset={182.2 - (182.2 * rating) / 100} />
          </svg>
          <span className="text-xl font-bold text-white">{rating}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg font-bold text-[#22C55E]">{signal}</span>
            <span className="text-xs text-[#AAB2BF]">vs S&amp;P 500</span>
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-[#CDD3DD]">{sector.verdict?.summary}</p>
        </div>
      </div>
      <div className="fin-dark-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Sector Heatmap</p>
          <button className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-[#AAB2BF]">View All</button>
        </div>
        <div className="space-y-2">
          {heatmap.map((item) => {
            const positive = item.value >= 0;
            return (
              <div key={item.name} className="grid grid-cols-[112px_1fr_54px] items-center gap-3">
                <span className="truncate text-xs text-[#CDD3DD]">{item.name}</span>
                <div className="h-1 rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(item.value) * 14 + 22, 96)}%`, background: positive ? green : red }} />
                </div>
                <span className="text-right text-xs tabular-nums" style={{ color: positive ? green : red }}>{positive ? '+' : ''}{item.value.toFixed(2)}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="fin-dark-card p-5">
        <p className="mb-4 text-sm font-semibold text-[#EF4444]">Risks to Watch</p>
        <div className="space-y-3">
          {(sector.risks?.slice(0, 3) ?? []).map((risk) => (
            <div key={risk.risk} className="flex items-center gap-3 text-xs text-[#CDD3DD]">
              <Target className="h-3.5 w-3.5 text-[#EF4444]" />
              <span>{risk.risk}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
BottomPanels.displayName = 'BottomPanels';

const STATUS_DOT_COLOR: Record<MarketStatusResult['status'], string> = {
  'open': '#22C55E',
  'closed-after-hours': '#F59E0B',
  'closed-pre-market': '#F59E0B',
  'closed-weekend': '#C9A646',
  'closed-holiday': '#C9A646',
};

const STATUS_TEXT_COLOR: Record<MarketStatusResult['status'], string> = {
  'open': green,
  'closed-after-hours': amber,
  'closed-pre-market': amber,
  'closed-weekend': '#C9A646',
  'closed-holiday': '#C9A646',
};

const statusHeadline = (status: MarketStatusResult): string => {
  switch (status.status) {
    case 'open': return 'Market Open';
    case 'closed-after-hours': return 'After Hours';
    case 'closed-pre-market': return 'Markets Closed';
    case 'closed-weekend': return 'Closed — Weekend';
    case 'closed-holiday': return `Closed — ${status.holidayName ?? 'Holiday'}`;
  }
};

export const SectorHeader = memo<{ sector: Sector; onBack: () => void; cachedAnalysis?: CachedSectorAnalysis }>(({ sector, cachedAnalysis }) => {
  const marketStatus = useMarketStatus();
  const marketOpen = marketStatus.isOpen;
  const priceMissing = isMissingWhenClosed(sector.price, marketOpen);
  const changeMissing = isMissingWhenClosed(sector.changePercent, marketOpen);
  const isPositive = sector.changePercent >= 0;
  const statusDot = STATUS_DOT_COLOR[marketStatus.status];
  const statusColor = STATUS_TEXT_COLOR[marketStatus.status];
  const headline = statusHeadline(marketStatus);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="mb-6"
    >
      <div className="relative overflow-hidden rounded-[20px] border border-[#C9A646]/18 bg-[#060B0F] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(201,166,70,0.10),transparent_28%),radial-gradient(circle_at_75%_18%,rgba(34,197,94,0.07),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:54px_54px]" />

        <div className="relative grid gap-3">
          <div className="grid gap-3 xl:grid-cols-[0.95fr_1.18fr_0.95fr]">
            <div className="p-1">
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: statusDot }} />
                  <span className="text-xs font-semibold" style={{ color: statusColor }}>{headline}</span>
                </span>
                {!marketOpen && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A646]/25 bg-[#C9A646]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#D8BE68]">
                    <Lock className="h-3 w-3" />
                    Showing {marketStatus.lastTradingDayLabel}
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">
                {sector.name} <span className="text-[#C9A646]">{sector.ticker}</span>
              </h1>
              <p className="mt-3 text-base text-[#CDD3DD]">{sector.description}</p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <span
                  className="text-5xl font-bold tracking-tight"
                  style={{ color: priceMissing ? '#8E96A3' : '#FFFFFF' }}
                  title={priceMissing ? `Last close pending — markets closed (${marketStatus.reason})` : undefined}
                >
                  {formatPriceOrDash(sector.price, marketOpen)}
                </span>
                <span
                  className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold"
                  style={
                    changeMissing
                      ? { color: '#8E96A3', background: 'rgba(142,150,163,0.10)', borderColor: 'rgba(142,150,163,0.24)' }
                      : { color: isPositive ? green : red, background: `${isPositive ? green : red}12`, borderColor: `${isPositive ? green : red}24` }
                  }
                >
                  {!changeMissing && (isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />)}
                  {formatPercentOrDash(sector.changePercent, marketOpen)}
                </span>
                <span className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold capitalize" style={{ color: sentimentColor(sector.sentiment), background: `${sentimentColor(sector.sentiment)}12`, borderColor: `${sentimentColor(sector.sentiment)}24` }}>
                  <TrendingUp className="h-4 w-4" />
                  {sentimentLabel(sector.sentiment)}
                </span>
              </div>
              <div className="mt-7 max-w-[370px] space-y-4">
                <MiniPerfBar label="1W"  value={deriveBarValue('W',   sector, cachedAnalysis)} marketOpen={marketOpen} />
                <MiniPerfBar label="1M"  value={deriveBarValue('M',   sector, cachedAnalysis)} marketOpen={marketOpen} />
                <MiniPerfBar label="YTD" value={deriveBarValue('YTD', sector, cachedAnalysis)} marketOpen={marketOpen} />
              </div>
            </div>

            <PerformanceChart sector={sector} cachedAnalysis={cachedAnalysis} />
            <AIOutlook sector={sector} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Market Cap" value={sector.marketCap} icon={PieChart} />
            <MetricCard label="S&P Weight" value={`${sector.spWeight}%`} icon={BarChart3} />
            <MetricCard label="Beta" value={sector.beta.toFixed(2)} icon={Activity} color={sector.beta > 1 ? amber : green} />
            <MetricCard label="# of Companies" value={sector.companies.toString()} icon={Users} />
            <MetricCard label="Momentum" value={sector.momentum.toString()} icon={Zap} color={sector.momentum >= 50 ? green : amber} />
            <MetricCard label="Rel. Strength" value={sector.relativeStrength.toString()} icon={Shield} color={sector.relativeStrength >= 50 ? green : amber} />
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.55fr_0.95fr]">
            <RangePanel sector={sector} marketOpen={marketOpen} />
            <div className="fin-dark-card grid grid-cols-2 gap-3 p-5">
              <div>
                <p className="mb-3 text-sm font-semibold text-white">Key Drivers</p>
                <div className="space-y-2 text-xs text-[#CDD3DD]">
                  {(sector.industryTrends?.slice(0, 3) ?? []).map((trend) => (
                    <div key={trend.trend} className="flex items-center gap-2">
                      <Crown className="h-3.5 w-3.5 text-[#22C55E]" />
                      <span>{trend.trend}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-white">Institutional Lens</p>
                <div className="space-y-2 text-xs text-[#CDD3DD]">
                  <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-[#C9A646]" /> {sector.etfs?.[0]?.ticker ?? sector.ticker} liquidity stable</div>
                  <div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-[#C9A646]" /> Beta {sector.beta.toFixed(2)} regime</div>
                  <div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-[#C9A646]" /> {sector.topHoldings?.[0]?.ticker ?? sector.ticker} leadership</div>
                </div>
              </div>
            </div>
          </div>

          <BottomPanels sector={sector} />
        </div>
      </div>
    </motion.div>
  );
});

SectorHeader.displayName = 'SectorHeader';
export default SectorHeader;
