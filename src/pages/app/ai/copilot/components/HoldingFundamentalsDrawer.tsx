// src/pages/app/ai/copilot/components/HoldingFundamentalsDrawer.tsx
// Drill-down modal for a single holding's fundamentals snapshot.
// Reuses FundamentalsGradeBadge tiering logic; renders margins, ROE, D/E,
// 52w range, and the 4 grade bars. Links to Stock Analyzer for full analysis.

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import { routeForSuggest } from '@/lib/tickerRouting';
import type { FundamentalsSnapshot, FundamentalsGrades } from '@/services/copilotFundamentalsApi';

function fmtNum(n: number | null | undefined, decimals = 2): string {
  return n == null ? '—' : n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined): string {
  return n == null ? '—' : `${n.toFixed(2)}%`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString('en-US')}`;
}

function GradeBar({ label, value }: { label: string; value: number | null }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const barClass =
    value == null
      ? 'bg-white/10'
      : value >= 70
        ? 'bg-gold-primary'
        : value >= 40
          ? 'bg-[#f5a623]'
          : 'bg-num-negative';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-tertiary">{label}</span>
        <span className="font-mono tabular-nums text-ink-secondary">
          {value == null ? '—' : value}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn('h-full rounded-full transition-all duration-base', barClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-[11px] text-ink-tertiary">{label}</span>
      <span className="font-mono text-[12px] tabular-nums text-ink-primary">{value}</span>
    </div>
  );
}

interface Props {
  snapshot: FundamentalsSnapshot | null;
  /** Fallback symbol shown while snapshot is still loading / unavailable. */
  fallbackSymbol: string;
  onClose: () => void;
}

export function HoldingFundamentalsDrawer({ snapshot, fallbackSymbol, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const symbol = snapshot?.symbol ?? fallbackSymbol;
  const grades: FundamentalsGrades | null = snapshot?.grades ?? null;
  const analysisHref = routeForSuggest(symbol, 'unknown');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-ds-4" role="dialog" aria-modal="true" aria-label={`${symbol} fundamentals`}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <Card variant="featured" padding="default" className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="mb-ds-4 flex items-start justify-between gap-ds-3">
          <div>
            <h3 className="text-base font-semibold text-ink-primary">{symbol}</h3>
            <p className="mt-0.5 text-xs text-ink-tertiary">
              {snapshot?.companyName ?? 'Fundamentals snapshot'}
              {snapshot?.sector ? ` · ${snapshot.sector}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close fundamentals panel"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-border-ds-subtle bg-white/[0.03] text-ink-tertiary transition-colors duration-base hover:border-border-ds-default hover:text-ink-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {!snapshot ? (
          <p className="text-sm text-ink-tertiary">No fundamentals data available for {symbol}.</p>
        ) : (
          <div className="space-y-ds-4">
            {/* Grades */}
            <div className="grid grid-cols-2 gap-ds-3">
              <GradeBar label="Valuation" value={grades?.valuation ?? null} />
              <GradeBar label="Growth" value={grades?.growth ?? null} />
              <GradeBar label="Profitability" value={grades?.profitability ?? null} />
              <GradeBar label="Health" value={grades?.health ?? null} />
            </div>

            {/* Valuation + growth */}
            <div className="rounded-[8px] border border-border-ds-subtle p-ds-3">
              <p className="mb-ds-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
                Valuation &amp; Growth
              </p>
              <StatRow label="P/E (TTM)" value={fmtNum(snapshot.peRatio)} />
              <StatRow label="Forward P/E" value={fmtNum(snapshot.forwardPe)} />
              <StatRow label="PEG" value={fmtNum(snapshot.pegRatio)} />
              <StatRow label="P/S" value={fmtNum(snapshot.psRatio)} />
              <StatRow label="P/B" value={fmtNum(snapshot.pbRatio)} />
              <StatRow label="EV/EBITDA" value={fmtNum(snapshot.evEbitda)} />
              <StatRow label="Revenue (TTM)" value={fmtMoney(snapshot.revenueTTM)} />
              <StatRow label="Revenue growth YoY" value={fmtPct(snapshot.revenueGrowthYoy)} />
              <StatRow label="EPS growth YoY" value={fmtPct(snapshot.epsGrowthYoy)} />
            </div>

            {/* Margins + profitability */}
            <div className="rounded-[8px] border border-border-ds-subtle p-ds-3">
              <p className="mb-ds-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
                Margins &amp; Returns
              </p>
              <StatRow label="Gross margin" value={fmtPct(snapshot.grossMargin)} />
              <StatRow label="Operating margin" value={fmtPct(snapshot.operatingMargin)} />
              <StatRow label="Net margin" value={fmtPct(snapshot.netMargin)} />
              <StatRow label="ROE" value={fmtPct(snapshot.roe)} />
              <StatRow label="ROA" value={fmtPct(snapshot.roa)} />
              <StatRow label="ROIC" value={fmtPct(snapshot.roic)} />
              <StatRow label="FCF yield" value={fmtPct(snapshot.fcfYield)} />
            </div>

            {/* Health */}
            <div className="rounded-[8px] border border-border-ds-subtle p-ds-3">
              <p className="mb-ds-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
                Financial Health
              </p>
              <StatRow label="Debt/Equity" value={fmtNum(snapshot.debtToEquity)} />
              <StatRow label="Current ratio" value={fmtNum(snapshot.currentRatio)} />
              <StatRow label="Dividend yield" value={fmtPct(snapshot.dividendYield)} />
              <StatRow
                label="52-week range"
                value={
                  snapshot.low52w != null && snapshot.high52w != null
                    ? `$${snapshot.low52w.toFixed(2)} – $${snapshot.high52w.toFixed(2)}`
                    : '—'
                }
              />
            </div>

            <p className="text-[10px] text-ink-tertiary">
              As of {snapshot.asOf ? new Date(snapshot.asOf).toLocaleString('en-US') : '—'}
            </p>
          </div>
        )}

        <Link
          to={analysisHref}
          className="mt-ds-4 flex h-10 items-center justify-center rounded-[12px] border border-gold-primary/30 bg-gold-primary/[0.08] text-[12px] font-semibold text-gold-primary transition-colors duration-base hover:bg-gold-primary/[0.14]"
        >
          View full analysis
        </Link>
      </Card>
    </div>
  );
}
