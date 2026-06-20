// src/pages/app/journal/TradeCompare.tsx
// =====================================================
// JOURNAL — Trade Compare (What-If Analysis)
// =====================================================
// Route: /app/journal/trade-compare
// Loads user's closed trades, lets them select one, runs
// analyzeWhatIf() from whatIfEngine, and renders:
//   - A price chart: real close-path when bars exist, else 2-point schematic
//   - MFE/MAE markers (green/red dots) overlaid when bars are available
//   - Scenario cards grid (plan, best_possible, held_stop vs actual)
//   - Insight strip with a lightbulb icon
//   - Confidence/sample guard note when confidence is not 'high'
// =====================================================

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { Card } from '@/components/ds/Card';
import { useTrades } from '@/hooks/useTradesData';
import type { Trade } from '@/hooks/useTradesData';
import { analyzeWhatIf } from '@/lib/journal/whatIfEngine';
import type { WhatIfScenario, WhatIfResult, PriceBar } from '@/lib/journal/whatIfEngine';
import { useTradeReconcile, useTradeBars } from '@/hooks/useTradeBars';
import { Lightbulb, Info } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

/** DS palette — matches stocks/Compare.tsx SERIES_COLORS convention */
const COLOR_GOLD   = '#C9A646';
const COLOR_GREEN  = '#4AD295';
const COLOR_RED    = '#F87171';
const COLOR_BLUE   = '#60A5FA';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtPnl(pnl: number): string {
  const abs = Math.abs(pnl);
  const sign = pnl >= 0 ? '+' : '-';
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDelta(delta: number): string {
  const abs = Math.abs(delta);
  const sign = delta >= 0 ? '+' : '-';
  return `${sign}$${Math.round(abs).toLocaleString('en-US')} vs your exit`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function fmtPrice(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Trade selector ───────────────────────────────────────────────────────────

interface TradeSelectorProps {
  trades: Trade[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function TradeSelector({ trades, selectedId, onSelect }: TradeSelectorProps) {
  return (
    <Card padding="compact">
      <p className="text-[11px] font-medium tracking-[1.2px] uppercase text-ink-tertiary mb-ds-3">
        Select a closed trade
      </p>
      <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
        {trades.map((t) => {
          const isSelected = t.id === selectedId;
          const pnl = t.pnl ?? 0;
          const positive = pnl >= 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`flex w-full items-center gap-ds-3 rounded-[8px] px-ds-3 py-ds-2 text-left transition-colors ${
                isSelected
                  ? 'bg-gold-primary/15 ring-1 ring-[#C9A646]/40'
                  : 'hover:bg-surface-2'
              }`}
            >
              {/* Color dot: LONG=blue, SHORT=red */}
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: t.side === 'LONG' ? COLOR_BLUE : COLOR_RED }}
              />
              <span className="flex-1 min-w-0">
                <span className="font-data font-semibold text-sm text-ink-primary">
                  {t.symbol}
                </span>
                <span className="ml-1.5 text-xs text-ink-tertiary">
                  {t.side}
                </span>
                <span className="ml-1.5 text-xs text-ink-muted">
                  {fmtDate(t.close_at ?? t.open_at)}
                </span>
              </span>
              <span
                className={`font-data text-xs font-semibold tabular-nums flex-shrink-0 ${
                  positive ? 'text-[#4AD295]' : 'text-[#F87171]'
                }`}
              >
                {fmtPnl(pnl)}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Price chart (schematic OR real bars) ────────────────────────────────────

interface PriceChartProps {
  trade: Trade;
  bars: PriceBar[];
  mfe: WhatIfResult['mfe'];
  mae: WhatIfResult['mae'];
}

/** Custom tooltip for the price chart */
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

function SchematicTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-lg space-y-1">
      <p className="text-ink-tertiary mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }} className="font-data font-semibold">
            {p.name}
          </span>
          <span className="font-data text-ink-primary tabular-nums">
            {fmtPrice(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PriceChart({ trade, bars, mfe, mae }: PriceChartProps) {
  const hasBars = bars.length > 0;

  const stopPrice = trade.stop_price && trade.stop_price > 0 ? trade.stop_price : null;
  const tpPrice   = trade.take_profit_price && trade.take_profit_price > 0
    ? trade.take_profit_price
    : null;

  // ── Build chart data ────────────────────────────────────────────────────────
  // Real path: one point per bar using close price, x-axis = formatted time.
  // Schematic: 2-point entry → exit.
  const chartData: Array<{ time: string; price: number }> = hasBars
    ? bars.map((b) => ({
        time: new Date(b.t).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        price: b.c,
      }))
    : [
        { time: fmtDate(trade.open_at),  price: trade.entry_price },
        { time: fmtDate(trade.close_at ?? trade.open_at), price: trade.exit_price ?? trade.entry_price },
      ];

  // ── Y-axis domain: all relevant prices + padding ────────────────────────────
  const allPrices: number[] = [
    trade.entry_price,
    trade.exit_price ?? trade.entry_price,
    ...(stopPrice ? [stopPrice] : []),
    ...(tpPrice   ? [tpPrice]   : []),
    ...(mfe       ? [mfe.price] : []),
    ...(mae       ? [mae.price] : []),
    ...(hasBars   ? bars.map((b) => b.h) : []),
    ...(hasBars   ? bars.map((b) => b.l) : []),
  ].filter((v): v is number => typeof v === 'number' && v > 0);
  const yMin = Math.min(...allPrices);
  const yMax = Math.max(...allPrices);
  const yPad = (yMax - yMin) * 0.1 || yMax * 0.05;
  const domain: [number, number] = [yMin - yPad, yMax + yPad];

  // ── MFE / MAE x-axis positions (index into chartData) ──────────────────────
  // We locate the bar index where the extreme close occurred.
  let mfeIndex: number | null = null;
  let maeIndex: number | null = null;
  if (hasBars && mfe) {
    // Find the bar whose high equals the MFE price (LONG) or low (SHORT).
    const isLong = trade.side === 'LONG';
    for (let i = 0; i < bars.length; i++) {
      if (isLong && bars[i].h === mfe.price)  { mfeIndex = i; break; }
      if (!isLong && bars[i].l === mfe.price) { mfeIndex = i; break; }
    }
  }
  if (hasBars && mae) {
    const isLong = trade.side === 'LONG';
    for (let i = 0; i < bars.length; i++) {
      if (isLong && bars[i].l === mae.price)  { maeIndex = i; break; }
      if (!isLong && bars[i].h === mae.price) { maeIndex = i; break; }
    }
  }
  const mfeLabel = chartData[mfeIndex ?? -1]?.time ?? null;
  const maeLabel = chartData[maeIndex ?? -1]?.time ?? null;

  return (
    <Card padding="default">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-ds-4">
        <span className="text-[11px] text-ink-tertiary uppercase tracking-wider">
          {hasBars ? 'Price path — close per bar' : 'Trade schematic — entry to exit'}
        </span>
        <div className="flex items-center gap-ds-3 text-[11px] text-ink-tertiary flex-wrap justify-end">
          {hasBars && mfe && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#4AD295]" />
              MFE {fmtPrice(mfe.price)}
            </span>
          )}
          {hasBars && mae && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F87171]" />
              MAE {fmtPrice(mae.price)}
            </span>
          )}
          {stopPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-px w-4 border-t-2 border-dashed border-[#F87171]" />
              Stop {fmtPrice(stopPrice)}
            </span>
          )}
          {tpPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-px w-4 border-t-2 border-dashed border-[#4AD295]" />
              Target {fmtPrice(tpPrice)}
            </span>
          )}
        </div>
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="time"
              tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              // When bars are many, show only a subset of ticks to avoid crowding.
              interval={hasBars && chartData.length > 10 ? Math.floor(chartData.length / 6) : 0}
            />
            <YAxis
              domain={domain}
              tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              width={72}
            />

            {/* Stop loss — dashed red reference line */}
            {stopPrice && (
              <ReferenceLine
                y={stopPrice}
                stroke={COLOR_RED}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: 'Stop', fill: COLOR_RED, fontSize: 10, position: 'right' }}
              />
            )}
            {/* Take profit — dashed green reference line */}
            {tpPrice && (
              <ReferenceLine
                y={tpPrice}
                stroke={COLOR_GREEN}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: 'Target', fill: COLOR_GREEN, fontSize: 10, position: 'right' }}
              />
            )}
            {/* Entry level — subtle reference line */}
            <ReferenceLine
              y={trade.entry_price}
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />

            {/* MFE marker — green dot with label (bars mode only) */}
            {hasBars && mfe && mfeLabel && (
              <ReferenceDot
                x={mfeLabel}
                y={mfe.price}
                r={6}
                fill={COLOR_GREEN}
                stroke="var(--color-surface-1, #111)"
                strokeWidth={2}
                label={{ value: 'MFE', fill: COLOR_GREEN, fontSize: 10, position: 'top' }}
              />
            )}
            {/* MAE marker — red dot with label (bars mode only) */}
            {hasBars && mae && maeLabel && (
              <ReferenceDot
                x={maeLabel}
                y={mae.price}
                r={6}
                fill={COLOR_RED}
                stroke="var(--color-surface-1, #111)"
                strokeWidth={2}
                label={{ value: 'MAE', fill: COLOR_RED, fontSize: 10, position: 'bottom' }}
              />
            )}

            <Tooltip content={<SchematicTooltip />} />

            {/* Price line — gold */}
            <Line
              type={hasBars ? 'monotone' : 'linear'}
              dataKey="price"
              name="Price"
              stroke={COLOR_GOLD}
              strokeWidth={hasBars ? 1.5 : 2.5}
              dot={hasBars
                ? false
                : (props: { cx?: number; cy?: number; index?: number }) => {
                    const { cx, cy, index } = props;
                    if (cx == null || cy == null) return <g key={`dot-${index}`} />;
                    if (index === 0) {
                      return (
                        <circle
                          key={`entry-dot-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill="transparent"
                          stroke={COLOR_GOLD}
                          strokeWidth={2}
                        />
                      );
                    }
                    return (
                      <circle
                        key={`exit-dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={COLOR_GOLD}
                        stroke="var(--color-surface-1, #111)"
                        strokeWidth={2}
                      />
                    );
                  }
              }
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Footer note ─────────────────────────────────────────────────────── */}
      {!hasBars && (
        <p className="mt-ds-2 text-[11px] text-ink-muted">
          This is a schematic showing entry and exit prices only. Enable price tracking to see
          the full intra-trade path and unlock all what-if scenarios.
        </p>
      )}
    </Card>
  );
}

// ─── Scenario card ────────────────────────────────────────────────────────────

interface ScenarioCardProps {
  scenario: WhatIfScenario;
  isBaseline: boolean;
  hasBars: boolean;
}

function ScenarioCard({ scenario, isBaseline, hasBars }: ScenarioCardProps) {
  const pnlPositive = (scenario.pnl ?? 0) >= 0;
  const deltaPositive = (scenario.deltaVsActual ?? 0) >= 0;

  return (
    <div
      className={`rounded-[12px] border p-ds-4 flex flex-col gap-ds-2 transition-colors ${
        !scenario.available
          ? 'border-border-ds-subtle bg-surface-1 opacity-50'
          : isBaseline
            ? 'border-2 border-[#60A5FA]/60 bg-surface-1'
            : 'border-[0.5px] border-border-ds-subtle bg-surface-1 hover:border-border-ds-default'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-ds-2">
        <p className="text-xs font-semibold text-ink-secondary leading-snug">
          {scenario.label}
        </p>
        {isBaseline && (
          <span className="flex-shrink-0 rounded-[4px] bg-[#60A5FA]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#60A5FA]">
            Baseline
          </span>
        )}
      </div>

      {/* P&L */}
      {scenario.available && scenario.pnl != null ? (
        <p
          className={`font-data text-lg font-bold tabular-nums ${
            pnlPositive ? 'text-[#4AD295]' : 'text-[#F87171]'
          }`}
        >
          {fmtPnl(scenario.pnl)}
        </p>
      ) : (
        <p className="font-data text-lg font-bold text-ink-muted">—</p>
      )}

      {/* Delta vs actual badge */}
      {!isBaseline && scenario.available && scenario.deltaVsActual != null && (
        <span
          className={`self-start rounded-[6px] px-2 py-0.5 text-[11px] font-medium ${
            deltaPositive
              ? 'bg-[#4AD295]/10 text-[#4AD295]'
              : 'bg-[#F87171]/10 text-[#F87171]'
          }`}
        >
          {fmtDelta(scenario.deltaVsActual)}
        </span>
      )}

      {/* Detail / unavailability note */}
      <p className="text-[11px] text-ink-tertiary leading-relaxed">
        {scenario.detail}
        {/* Only show the "Needs price tracking" hint when bars are genuinely absent.
            When bars exist the engine computes the scenario — the card lights up. */}
        {!scenario.available && scenario.requires && !hasBars && (
          <span className="block mt-1 text-ink-muted italic">
            {scenario.requires === 'bars'
              ? 'Needs price tracking'
              : 'Needs order history'}
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TradeCompare() {
  // Reconcile excursions once on mount — best-effort, no error surfacing.
  useTradeReconcile();

  const { data: allTrades, isLoading } = useTrades();

  // Closed trades only: exit_price must be present
  const closedTrades = useMemo<Trade[]>(() => {
    if (!allTrades) return [];
    return allTrades.filter(
      (t) => t.exit_price != null && t.exit_price > 0 && t.close_at != null,
    );
  }, [allTrades]);

  // Default to the most recent closed trade
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const effectiveId: string | null = selectedId ?? (closedTrades[0]?.id ?? null);

  const selectedTrade = useMemo<Trade | null>(
    () => closedTrades.find((t) => t.id === effectiveId) ?? null,
    [closedTrades, effectiveId],
  );

  // Fetch real price bars for the selected trade (disabled when no trade selected).
  const { bars, isLoading: barsLoading } = useTradeBars(effectiveId ?? undefined);
  const hasBars = bars.length > 0;

  // Run the what-if engine — passes real bars when available.
  const whatIfResult = useMemo(() => {
    if (!selectedTrade || !selectedTrade.exit_price) return null;
    return analyzeWhatIf(
      {
        side: selectedTrade.side,
        entry_price: selectedTrade.entry_price,
        exit_price: selectedTrade.exit_price,
        quantity: selectedTrade.quantity,
        multiplier: selectedTrade.multiplier,
        symbol: selectedTrade.symbol,
        stop_price: selectedTrade.stop_price,
        take_profit_price: selectedTrade.take_profit_price ?? null,
        open_at: selectedTrade.open_at,
        close_at: selectedTrade.close_at ?? selectedTrade.open_at,
      },
      hasBars ? bars : undefined,
    );
  }, [selectedTrade, bars, hasBars]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[960px] py-ds-7 px-ds-4 flex flex-col gap-ds-5">
      {/* Header */}
      <div className="space-y-ds-1">
        <span className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
          Trade Journal
        </span>
        <h1 className="text-h2 font-medium text-ink-primary">Trade Compare</h1>
        <p className="text-body text-ink-secondary">
          See what your trades could have been.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card padding="default">
          <p className="text-center text-sm text-ink-tertiary py-8">Loading your trades…</p>
        </Card>
      )}

      {/* Empty state — no closed trades */}
      {!isLoading && closedTrades.length === 0 && (
        <Card padding="default">
          <div className="flex flex-col items-center gap-ds-3 py-12 text-center">
            <Info className="h-8 w-8 text-ink-muted" />
            <p className="text-sm font-medium text-ink-secondary">No closed trades yet</p>
            <p className="text-xs text-ink-tertiary max-w-[320px]">
              Add and close trades in your journal to unlock what-if analysis here.
            </p>
          </div>
        </Card>
      )}

      {!isLoading && closedTrades.length > 0 && (
        <>
          {/* Two-column layout on md+: selector left, chart right */}
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-ds-4">
            <TradeSelector
              trades={closedTrades}
              selectedId={effectiveId}
              onSelect={(id) => setSelectedId(id)}
            />
            {selectedTrade && (
              <PriceChart
                trade={selectedTrade}
                bars={bars}
                mfe={whatIfResult?.mfe ?? null}
                mae={whatIfResult?.mae ?? null}
              />
            )}
          </div>

          {/* Bars loading indicator (subtle — chart stays visible) */}
          {barsLoading && (
            <p className="text-[11px] text-ink-muted flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              Loading price bars…
            </p>
          )}

          {/* Insight strip */}
          {whatIfResult && (
            <Card padding="compact">
              <div className="flex items-start gap-ds-3">
                <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C9A646]" />
                <p className="text-sm font-medium text-ink-primary leading-relaxed">
                  {whatIfResult.insight}
                </p>
              </div>
            </Card>
          )}

          {/* Confidence guard — only shown when bars are absent */}
          {whatIfResult && whatIfResult.confidence !== 'high' && !hasBars && (
            <p className="text-xs text-ink-muted flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              Estimate based on planned levels. Enable price tracking for exact what-if.
            </p>
          )}

          {/* Scenario cards */}
          {whatIfResult && (
            <div className="flex flex-col gap-ds-3">
              <span className="text-[11px] font-medium tracking-[1.2px] uppercase text-ink-tertiary">
                What-if scenarios
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-ds-3">
                {whatIfResult.scenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.key}
                    scenario={scenario}
                    isBaseline={scenario.key === 'actual'}
                    hasBars={hasBars}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
