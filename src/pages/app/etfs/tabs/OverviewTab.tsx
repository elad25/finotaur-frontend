// src/pages/app/etfs/tabs/OverviewTab.tsx
// =====================================================
// ETF ANALYZER — Overview Tab (fully built)
// =====================================================
// Shows: profile description, key-stat grid, trailing
// returns row, and FINO Score badge.
// =====================================================

import { Card } from '@/components/ds/Card';
import { FinoScoreBadge } from '@/components/etf/FinoScoreBadge';
import type { EtfData } from '@/types/etf.types';
import { cn } from '@/lib/utils';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`;
}

function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  if (Math.abs(v) >= 1_000_000_000) {
    return `$${(v / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(v) >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(1)}M`;
  }
  return `$${v.toLocaleString()}`;
}

function fmtPrice(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—';
  return `$${v.toFixed(decimals)}`;
}

function fmtExpenseRatio(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  // Express as percentage: e.g. 0.0003 → 0.03%
  return `${(v * 100).toFixed(2)}%`;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function fmtReturn(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

// ─── KpiCell — DS-native stat box ────────────────────────────────────────────

interface KpiCellProps {
  label: string;
  value: string;
}

function KpiCell({ label, value }: KpiCellProps) {
  return (
    <div className="flex flex-col gap-1 rounded-[8px] bg-surface-2 p-ds-3">
      <span className="text-[11px] font-medium tracking-[1.2px] uppercase text-ink-tertiary">
        {label}
      </span>
      <span className="font-data text-base font-medium text-ink-primary">{value}</span>
    </div>
  );
}

// ─── ReturnCell — trailing return colored by direction ───────────────────────

interface ReturnCellProps {
  label: string;
  value: number | null | undefined;
}

function ReturnCell({ label, value }: ReturnCellProps) {
  const display = fmtReturn(value);
  const isNeg = value !== null && value !== undefined && value < 0;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-ink-tertiary uppercase tracking-wider">{label}</span>
      <span
        className={cn(
          'font-data text-sm font-semibold',
          // DS rule: color goes on the change (not the value).
          // Positive/flat = white (ink-primary), negative = num-negative.
          isNeg ? 'text-[#E24B4A]' : 'text-ink-primary',
        )}
      >
        {display}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OverviewTabProps {
  data: EtfData;
}

export function OverviewTab({ data }: OverviewTabProps) {
  const { profile, fundamentals, returns, dividendYield, risk, finoScore } = data;

  // Build 52-week range string
  const range52 =
    risk.week52High !== null && risk.week52Low !== null
      ? `${fmtPrice(risk.week52Low)} – ${fmtPrice(risk.week52High)}`
      : '—';

  return (
    <div className="space-y-ds-6">

      {/* ── Description ─────────────────────────────────────────────────── */}
      {profile?.description && (
        <Card padding="default">
          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-3">
            About
          </p>
          <p className="text-body text-ink-secondary leading-relaxed">
            {profile.description}
          </p>
        </Card>
      )}

      {/* ── Key stats grid ───────────────────────────────────────────────── */}
      <Card padding="default">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
          Key Statistics
        </p>
        <div className="grid grid-cols-2 gap-ds-3 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCell
            label="Expense Ratio"
            value={fmtExpenseRatio(fundamentals?.expenseRatioNet)}
          />
          <KpiCell
            label="AUM"
            value={fmtMoney(fundamentals?.aum)}
          />
          <KpiCell
            label="NAV"
            value={fmtPrice(fundamentals?.nav)}
          />
          <KpiCell
            label="Inception"
            value={fmtDate(fundamentals?.inceptionDate)}
          />
          <KpiCell
            label="Issuer"
            value={profile?.issuer ?? '—'}
          />
          <KpiCell
            label="Category"
            value={profile?.type ?? '—'}
          />
          <KpiCell
            label="Dividend Yield"
            value={
              dividendYield !== null && dividendYield !== undefined
                ? fmtPct(dividendYield * 100, 2)
                : '—'
            }
          />
          <KpiCell
            label="52-Week Range"
            value={range52}
          />
        </div>
      </Card>

      {/* ── Trailing returns ─────────────────────────────────────────────── */}
      <Card padding="default">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
          Trailing Returns
        </p>
        <div className="flex flex-wrap gap-x-ds-6 gap-y-ds-3">
          <ReturnCell label="YTD"   value={returns.ytd} />
          <ReturnCell label="1M"    value={returns.m1} />
          <ReturnCell label="3M"    value={returns.m3} />
          <ReturnCell label="6M"    value={returns.m6} />
          <ReturnCell label="1Y"    value={returns.y1} />
          <ReturnCell label="3Y"    value={returns.y3} />
          <ReturnCell label="5Y"    value={returns.y5} />
          {returns.sinceInception !== null && (
            <ReturnCell label="Since Inception" value={returns.sinceInception} />
          )}
        </div>
      </Card>

      {/* ── FINO Score ────────────────────────────────────────────────────── */}
      <Card variant="featured" padding="default">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
          FINO Score
        </p>
        <FinoScoreBadge finoScore={finoScore} size="full" />
      </Card>

    </div>
  );
}
