// ============================================================
// src/pages/app/forex/Pair.tsx
// FOREX Pair Detail — intraday chart + technical snapshot
// Route: /app/forex/pair/:symbol  (e.g. EURUSD, GBPJPY)
// ============================================================

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PageTemplate } from '@/components/PageTemplate';
import { useForexIntraday } from './_shared/hooks';
import { GlassCard, GlassStat, GlassStatSkeleton, SectionHeader, Sparkline, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';
import type { ForexIntradayBar } from './_shared/types';

// ── Valid major symbols ──────────────────────────────────────
const VALID_SYMBOLS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'EURCHF', 'EURCAD', 'EURAUD', 'EURNZD',
  'GBPJPY', 'GBPCHF', 'GBPCAD', 'GBPAUD', 'GBPNZD',
  'AUDJPY', 'AUDCAD', 'AUDCHF', 'AUDNZD',
  'CADJPY', 'CADCHF',
  'CHFJPY', 'NZDJPY', 'NZDCAD',
]);

/** Format "EURUSD" → "EUR/USD" */
function fmtPair(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.length === 6) return `${s.slice(0, 3)}/${s.slice(3)}`;
  return s;
}

function isJpy(symbol: string): boolean {
  return symbol.toUpperCase().includes('JPY');
}

function fmtPrice(price: number, symbol: string): string {
  return price.toFixed(isJpy(symbol) ? 3 : 5);
}

/** U+2212 for negative values */
function fmtSigned(n: number, decimals: number): string {
  const abs = Math.abs(n).toFixed(decimals);
  return n >= 0 ? `+${abs}` : `−${abs}`;
}

function fmtPct(n: number): string {
  const abs = Math.abs(n).toFixed(3);
  return n >= 0 ? `+${abs}%` : `−${abs}%`;
}

// ── Compute stats from bars ──────────────────────────────────
interface TechStats {
  lastPrice: number;
  open: number;
  high: number;
  low: number;
  range: number;
  change: number;
  changePct: number;
  trend: 'bullish' | 'bearish' | 'flat';
  avgVol: number;
  lastVol: number;
  barCount: number;
}

function computeStats(bars: ForexIntradayBar[], symbol: string): TechStats {
  const first = bars[0];
  const last = bars[bars.length - 1];
  const high = Math.max(...bars.map((b) => b.h));
  const low = Math.min(...bars.map((b) => b.l));
  const open = first.o;
  const close = last.c;
  const change = close - open;
  const changePct = open !== 0 ? (change / open) * 100 : 0;
  const range = high - low;
  const totalVol = bars.reduce((s, b) => s + b.v, 0);
  const avgVol = totalVol / bars.length;
  const trend = changePct > 0.05 ? 'bullish' : changePct < -0.05 ? 'bearish' : 'flat';

  return {
    lastPrice: close,
    open,
    high,
    low,
    range,
    change,
    changePct,
    trend,
    avgVol,
    lastVol: last.v,
    barCount: bars.length,
  };
}

// ── Intraday line chart (SVG polyline) ───────────────────────
function IntradayChart({
  bars,
  symbol,
}: {
  bars: ForexIntradayBar[];
  symbol: string;
}) {
  const closes = bars.map((b) => b.c);
  const isUp = closes[closes.length - 1] >= closes[0];
  const color = isUp ? '#34d399' : '#f87171'; // emerald-400 / red-400

  if (closes.length < 2) return null;

  const W = 600;
  const H = 120;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const pts = closes
    .map((c, i) => {
      const x = (i / (closes.length - 1)) * W;
      const y = H - ((c - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Gradient fill under the line
  const fillPts = `0,${H} ${pts} ${W},${H}`;
  const gradId = `grad-${symbol}`;

  return (
    <div className="w-full overflow-hidden rounded-xl">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: 140 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Fill area */}
        <polygon points={fillPts} fill={`url(#${gradId})`} />
        {/* Line */}
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function ForexPair() {
  const { symbol } = useParams<{ symbol: string }>();
  const upperSymbol = symbol?.toUpperCase() ?? '';

  const isValid = VALID_SYMBOLS.has(upperSymbol);
  const { data, loading } = useForexIntraday(isValid ? upperSymbol : '');

  const stats = useMemo<TechStats | null>(
    () => (data?.bars && data.bars.length > 1 ? computeStats(data.bars, upperSymbol) : null),
    [data, upperSymbol],
  );

  const closes = useMemo(
    () => (data?.bars ? data.bars.map((b) => b.c) : []),
    [data],
  );

  const displayPair = fmtPair(upperSymbol || 'UNKNOWN');

  // Invalid symbol guard
  if (!isValid) {
    return (
      <PageTemplate
        title={displayPair}
        description="Intraday chart and technical snapshot."
      >
        <EmptyState
          icon="⚠️"
          title={`"${upperSymbol}" is not a recognised major pair`}
          description="Please select a valid symbol from the Pairs page."
        />
      </PageTemplate>
    );
  }

  const chpColor = stats
    ? stats.changePct >= 0
      ? 'text-emerald-400'
      : 'text-red-400'
    : '';

  return (
    <PageTemplate
      title={displayPair}
      description="Intraday chart and technical snapshot."
    >
      <div className="space-y-4">
        {/* Price hero */}
        <GlassCard padding="md">
          <div className="flex flex-wrap items-end gap-4">
            {loading ? (
              <>
                <GlassStatSkeleton />
                <GlassStatSkeleton />
              </>
            ) : stats ? (
              <>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/35 mb-0.5">
                    Last Price
                  </p>
                  <p className="text-3xl font-bold font-mono text-white/90">
                    {fmtPrice(stats.lastPrice, upperSymbol)}
                  </p>
                </div>
                <div>
                  <p className={`text-lg font-semibold font-mono ${chpColor}`}>
                    {fmtSigned(stats.change, isJpy(upperSymbol) ? 3 : 5)}&nbsp;
                    ({fmtPct(stats.changePct)})
                  </p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {data?.range.label ?? 'Intraday'} · {stats.barCount} bars ·{' '}
                    {data?.interval}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/40">Price data unavailable</p>
            )}
          </div>
        </GlassCard>

        {/* Intraday chart */}
        <GlassCard padding="md">
          <SectionHeader
            title="Intraday Chart"
            subtitle={data?.range.label ?? ''}
          />
          {loading && (
            <div className="animate-pulse h-[140px] w-full rounded-xl bg-white/[0.05]" />
          )}
          {!loading && closes.length >= 2 && (
            <IntradayChart bars={data!.bars} symbol={upperSymbol} />
          )}
          {!loading && closes.length < 2 && (
            <EmptyState icon="📉" title="Not enough bars to render chart" />
          )}
        </GlassCard>

        {/* Technical snapshot */}
        <GlassCard padding="md">
          <SectionHeader
            title="Technical Snapshot"
            subtitle="Client-side metrics derived from intraday bars"
          />
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <GlassStatSkeleton key={i} />)}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <GlassStat
                label="Open"
                value={fmtPrice(stats.open, upperSymbol)}
              />
              <GlassStat
                label="Day High"
                value={fmtPrice(stats.high, upperSymbol)}
                change={null}
              />
              <GlassStat
                label="Day Low"
                value={fmtPrice(stats.low, upperSymbol)}
                change={null}
              />
              <GlassStat
                label="Range"
                value={fmtPrice(stats.range, upperSymbol)}
              />
              <GlassStat
                label="Trend"
                value={
                  stats.trend === 'bullish' ? '▲ Bullish' :
                  stats.trend === 'bearish' ? '▼ Bearish' : '◆ Flat'
                }
                className={
                  stats.trend === 'bullish'
                    ? '[&_p:last-child]:text-emerald-400'
                    : stats.trend === 'bearish'
                    ? '[&_p:last-child]:text-red-400'
                    : ''
                }
              />
              <GlassStat
                label="Bar Count"
                value={String(stats.barCount)}
                subValue={data?.interval}
              />
            </div>
          ) : (
            <EmptyState icon="📊" title="Snapshot unavailable" description="Intraday data could not be loaded." />
          )}
        </GlassCard>

        {/* Mini sparkline card */}
        {!loading && closes.length >= 2 && (
          <GlassCard padding="sm" className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">
                Price Path
              </p>
              <Sparkline data={closes} width={200} height={36} />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/25">First bar</p>
              <p className="text-xs font-mono text-white/55">{fmtPrice(closes[0], upperSymbol)}</p>
              <p className="text-[10px] text-white/25 mt-1">Last bar</p>
              <p className="text-xs font-mono text-white/55">{fmtPrice(closes[closes.length - 1], upperSymbol)}</p>
            </div>
          </GlassCard>
        )}
      </div>
    </PageTemplate>
  );
}
