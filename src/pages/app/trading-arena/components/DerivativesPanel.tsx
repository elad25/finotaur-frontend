/**
 * DerivativesPanel — Trading Arena "Crypto Derivatives" panel v1.
 *
 * Compact Coinglass-style data panel (NOT a liquidation-heatmap chart, per
 * the v1 scope decision): mark price, funding rate + next-funding countdown,
 * open interest with a 4h sparkline, and a live liquidations feed with
 * burst-aggregated rows and a rolling 5-minute longs/shorts summary.
 *
 * Crypto-only — callers (LiquidityTab.tsx / CvdTab.tsx) mount this ONLY for
 * `assetClass === 'crypto'`; this component itself does not gate on asset
 * class, it just renders whatever `symbol` it's given via useDerivatives.
 *
 * Self-contained right-side rail, independent of PaperTradeRailShell (own
 * localStorage collapse key 'finotaur:arena:derivs:v1', own fixed width) —
 * deliberately NOT sharing PaperTradeRailShell's 'finotaur:arena:tradeRail:v1'
 * state, since collapsing the trade rail and collapsing this data panel are
 * unrelated user preferences.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDerivatives } from '../derivatives/useDerivatives';
import type { LiquidationRow } from '../derivatives/binanceDerivs';

// ── Collapse persistence — own key per the task spec, own hook (component-
// scoped concern, doesn't warrant a shared hooks/ file like the trade rail's
// usePaperTradeRailCollapse.ts since nothing else consumes this state). ────
const DERIVS_COLLAPSE_STORAGE_KEY = 'finotaur:arena:derivs:v1';
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 32;

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DERIVS_COLLAPSE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStoredCollapsed(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DERIVS_COLLAPSE_STORAGE_KEY, String(value));
  } catch {
    // Storage full / blocked — non-fatal, collapse state just won't persist.
  }
}

function useDerivsPanelCollapse() {
  const [collapsed, setCollapsed] = useState<boolean>(readStoredCollapsed);
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeStoredCollapsed(next);
      return next;
    });
  }, []);
  return { collapsed, toggle };
}

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

function formatBaseQty(n: number): string {
  if (Math.abs(n) >= 1000) return formatCompact(n);
  return n.toFixed(n < 10 ? 4 : 2);
}

function baseAssetSuffix(symbol: string): string {
  return symbol.toUpperCase().replace(/(USDT|BUSD|USDC|USD)$/, '') || symbol;
}

function formatFundingPct(rate: number): string {
  const pct = rate * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(4)}%`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = totalSec % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Tiny inline sparkline (no chart lib) ────────────────────────────────────

function OiSparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return <div className="h-5 w-16 flex-shrink-0" aria-hidden="true" />;
  }
  const w = 64;
  const h = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const path = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ');
  const trendUp = points[points.length - 1] >= points[0];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="flex-shrink-0"
      role="img"
      aria-label="Open interest, last 4 hours"
    >
      <path d={path} fill="none" stroke={trendUp ? '#22c55e' : '#ef4444'} strokeWidth={1.25} />
    </svg>
  );
}

// ── Liquidations feed ────────────────────────────────────────────────────

function LiquidationsFeed({ symbol, liquidations }: { symbol: string; liquidations: LiquidationRow[] }) {
  // Ticks once a second purely to keep the rolling 5-minute summary window
  // moving — the feed itself re-renders on every new liquidation regardless.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const { longsUsd, shortsUsd } = useMemo(() => {
    const cutoff = nowTick - 5 * 60_000;
    let longs = 0;
    let shorts = 0;
    for (const row of liquidations) {
      if (row.time < cutoff) continue;
      if (row.side === 'LONG_LIQ') longs += row.notionalUsd;
      else shorts += row.notionalUsd;
    }
    return { longsUsd: longs, shortsUsd: shorts };
  }, [liquidations, nowTick]);

  const base = baseAssetSuffix(symbol);
  // Newest first for the scrolling list.
  const rows = useMemo(() => [...liquidations].reverse(), [liquidations]);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Liquidations</span>
      </div>
      <div className="px-2.5 pb-1.5 text-[10px] text-white/40">
        Last 5m:{' '}
        <span className="text-red-400 font-medium">${formatCompact(longsUsd)} longs</span>
        {' / '}
        <span className="text-emerald-400 font-medium">${formatCompact(shortsUsd)} shorts</span>
      </div>

      {rows.length === 0 ? (
        <div className="px-2.5 py-3 text-[10px] text-white/30">No liquidations yet — watching the stream…</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2 space-y-0.5">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-1.5 text-[10px] leading-tight py-0.5">
              <span className="text-white/30 font-mono flex-shrink-0">{formatClock(row.time)}</span>
              <span
                className={cn(
                  'flex-shrink-0 rounded px-1 py-px font-semibold',
                  row.side === 'LONG_LIQ' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400',
                )}
              >
                {row.side === 'LONG_LIQ' ? 'LONG LIQ' : 'SHORT LIQ'}
              </span>
              <span className="text-white/60 font-mono truncate">
                {formatBaseQty(row.qty)} {base} @ {row.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className="ml-auto text-white/40 font-mono flex-shrink-0">${formatCompact(row.notionalUsd)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────

interface DerivativesPanelProps {
  symbol: string;
}

export function DerivativesPanel({ symbol }: DerivativesPanelProps) {
  const state = useDerivatives(symbol);
  const { collapsed, toggle } = useDerivsPanelCollapse();

  // Ticks once a second to keep the funding countdown live.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const fundingColor =
    state.fundingRate === null ? 'text-white/40' : state.fundingRate >= 0 ? 'text-[#C9A646]' : 'text-red-400';

  const oiHistoryValues = useMemo(() => state.oiHistory.map((p) => p.openInterest), [state.oiHistory]);

  return (
    <div
      className="relative flex-shrink-0 border-l border-white/10 bg-[#0A0A0A] transition-all duration-200 ease-in-out flex flex-col"
      style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand derivatives panel' : 'Collapse derivatives panel'}
        title={collapsed ? 'Expand derivatives panel' : 'Collapse derivatives panel'}
        className="flex h-7 w-full flex-shrink-0 items-center justify-center border-b border-white/10 text-white/40 hover:text-[#C9A646] transition-colors"
      >
        {collapsed ? <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>

      {collapsed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <span
            className="text-[10px] font-bold tracking-[0.15em] text-white/40 select-none"
            style={{ writingMode: 'vertical-rl' }}
          >
            DERIVS
          </span>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-white/10 flex-shrink-0">
            <Activity className="h-3 w-3 text-[#C9A646]" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-[#C9A646]">Derivatives</span>
            <span className="text-[10px] text-white/30">· Binance Perp</span>
            <span
              className={cn(
                'ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0',
                state.status === 'live' ? 'bg-emerald-400' : state.status === 'unavailable' ? 'bg-white/20' : 'bg-white/30 animate-pulse',
              )}
              aria-hidden="true"
            />
          </div>

          {state.status === 'connecting' && (
            <div className="px-2.5 py-4 text-[11px] text-white/40">Connecting to Binance futures…</div>
          )}

          {state.status === 'unavailable' && (
            <div className="px-2.5 py-4 text-[11px] text-white/40">
              Unavailable — no Binance perpetual market for {symbol}.
            </div>
          )}

          {state.status === 'live' && (
            <>
              {/* Stat tiles */}
              <div className="flex-shrink-0 divide-y divide-white/5 border-b border-white/10">
                {/* Mark price */}
                <div className="px-2.5 py-2">
                  <div className="text-[9px] uppercase tracking-wide text-white/30">Mark Price</div>
                  <div className="text-[13px] font-mono font-semibold text-white/90">
                    {state.markPrice !== null ? state.markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </div>
                </div>

                {/* Funding rate */}
                <div className="px-2.5 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wide text-white/30">Funding Rate</span>
                    {state.nextFundingTimeMs !== null && (
                      <span className="text-[9px] text-white/30">in {formatCountdown(state.nextFundingTimeMs - nowTick)}</span>
                    )}
                  </div>
                  <div className={cn('text-[13px] font-mono font-semibold', fundingColor)}>
                    {state.fundingRate !== null ? formatFundingPct(state.fundingRate) : '—'}
                  </div>
                </div>

                {/* Open interest */}
                <div className="px-2.5 py-2">
                  <div className="text-[9px] uppercase tracking-wide text-white/30">Open Interest</div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-mono font-semibold text-white/90">
                        {state.openInterestBase !== null ? `${formatBaseQty(state.openInterestBase)} ${baseAssetSuffix(symbol)}` : '—'}
                      </div>
                      <div className="text-[10px] font-mono text-white/40">
                        {state.openInterestUsd !== null ? `$${formatCompact(state.openInterestUsd)}` : ''}
                      </div>
                    </div>
                    <OiSparkline points={oiHistoryValues} />
                  </div>
                </div>
              </div>

              {/* Liquidations feed */}
              <LiquidationsFeed symbol={symbol} liquidations={state.liquidations} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
