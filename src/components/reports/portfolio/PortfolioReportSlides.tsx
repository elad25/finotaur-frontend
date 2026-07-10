/**
 * PortfolioReportSlides — content for the 4 Portfolio Report slides.
 * Consumed by PortfolioReportPage.tsx, each wrapped in <ReportSlideFrame>.
 * Pure presentation over `PortfolioReportData` (src/lib/reports/portfolioReportData.ts).
 */
import { AlertTriangle } from 'lucide-react';
import { Change } from '@/components/ds/NumberDisplay';
import { cn } from '@/lib/utils';
import type { AllocationSlice, PortfolioReportData, SymbolEdgeRow } from '@/lib/reports/reportTypes';

export const PORTFOLIO_SLIDE_PILLS: Record<string, string> = {
  allocation: 'ALLOCATION',
  'long-short': 'EXPOSURE',
  concentration: 'CONCENTRATION RISK',
  'symbol-edge': 'SYMBOL EDGE',
};

// Gold / white / grey only — no other chart colors on this report per DS.
const BAR_COLORS = ['#C9A646', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.22)'];

function AllocationBarList({ items }: { items: AllocationSlice[] }) {
  const maxShare = Math.max(1, ...items.map((i) => i.tradeShare));
  return (
    <div className="space-y-ds-2">
      {items.map((item, i) => (
        <div key={item.key} className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-3">
          <div className="flex items-center justify-between gap-ds-2">
            <span className="truncate text-sm text-ink-primary">{item.label}</span>
            <div className="flex flex-shrink-0 items-center gap-ds-3">
              <span className="font-mono text-xs tabular-nums text-ink-tertiary">{item.tradeShare}% &middot; {item.tradeCount} trades</span>
              <Change value={item.pnl} format="currency" decimals={0} />
            </div>
          </div>
          <div className="mt-ds-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.tradeShare / maxShare) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Allocation
// ---------------------------------------------------------------------------

export function AllocationSlideContent({ data }: { data: PortfolioReportData }) {
  return (
    <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-2">
      <div>
        <p className="mb-ds-2 text-xs text-ink-secondary">By asset class</p>
        <AllocationBarList items={data.byAssetClass} />
      </div>
      <div>
        <p className="mb-ds-2 text-xs text-ink-secondary">Top symbols</p>
        <AllocationBarList items={data.topSymbols.slice(0, 6)} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Long vs Short
// ---------------------------------------------------------------------------

export function LongShortSlideContent({ data }: { data: PortfolioReportData }) {
  if (data.direction.length === 0) {
    return <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-5 text-center text-sm text-ink-secondary">No directional data available yet.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-ds-4 sm:grid-cols-2">
      {data.direction.map((d) => (
        <div key={d.direction} className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4">
          <p className="text-xs font-medium uppercase tracking-[1px] text-gold-muted">{d.direction}</p>
          <p className="mt-ds-2 font-mono text-2xl tabular-nums text-ink-primary">{d.trades} trades</p>
          <div className="mt-ds-3 space-y-ds-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Win rate</span>
              <span className="font-mono tabular-nums text-ink-primary">{d.winRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Net P&amp;L</span>
              <Change value={d.netPnl} format="currency" decimals={0} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Expectancy</span>
              <span className="font-mono tabular-nums text-ink-primary">{d.expectancy.toFixed(2)}R</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Concentration
// ---------------------------------------------------------------------------

export function ConcentrationSlideContent({ data }: { data: PortfolioReportData }) {
  const { symbols, top5SharePct, warning } = data.concentration;
  return (
    <div className="space-y-ds-4">
      {warning && (
        <div className="flex items-center gap-ds-2 rounded-[8px] border-[0.5px] border-num-negative/30 bg-num-negative/[0.07] px-ds-3 py-ds-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-num-negative" aria-hidden="true" />
          <p className="text-xs text-ink-secondary">
            Your top 5 symbols make up <span className="text-num-negative font-semibold">{top5SharePct}%</span> of your trade volume — a concentrated book.
          </p>
        </div>
      )}
      <div className="space-y-ds-2">
        {symbols.map((s, i) => (
          <div key={s.symbol} className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-3">
            <div className="flex items-center justify-between gap-ds-2">
              <span className="text-sm text-ink-primary">{s.symbol}</span>
              <span className="font-mono text-xs tabular-nums text-ink-tertiary">{s.volumeSharePct}% &middot; {s.tradeCount} trades</span>
            </div>
            <div className="mt-ds-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.volumeSharePct)}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Symbol Edge
// ---------------------------------------------------------------------------

function SymbolEdgeList({ rows, emptyLabel }: { rows: SymbolEdgeRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-xs text-ink-tertiary">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-ds-2">
      {rows.map((r) => (
        <div key={r.symbol} className="flex items-center justify-between rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-base px-ds-3 py-ds-2">
          <div>
            <p className="text-sm text-ink-primary">{r.symbol}</p>
            <p className="text-[11px] text-ink-tertiary">{r.trades} trades &middot; {r.winRate.toFixed(1)}% win</p>
          </div>
          <span className={cn('font-mono text-sm tabular-nums', r.expectancy < 0 ? 'text-num-negative' : 'text-num-positive')}>
            {r.expectancy >= 0 ? '+' : '−'}{Math.abs(r.expectancy).toFixed(2)}R
          </span>
        </div>
      ))}
    </div>
  );
}

export function SymbolEdgeSlideContent({ data }: { data: PortfolioReportData }) {
  const { best, worst } = data.symbolEdge;
  if (best.length === 0 && worst.length === 0) {
    return (
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-5 text-center text-sm text-ink-secondary">
        Log at least 5 trades on a symbol to see its edge here.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-2">
      <div>
        <p className="mb-ds-2 text-xs text-ink-secondary">Best edge</p>
        <SymbolEdgeList rows={best} emptyLabel="No qualifying symbols yet (min. 5 trades each)." />
      </div>
      <div>
        <p className="mb-ds-2 text-xs text-ink-secondary">Needs attention</p>
        <SymbolEdgeList rows={worst} emptyLabel="No qualifying symbols yet (min. 5 trades each)." />
      </div>
    </div>
  );
}
