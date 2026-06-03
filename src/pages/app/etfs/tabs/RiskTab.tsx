// src/pages/app/etfs/tabs/RiskTab.tsx
// =====================================================
// ETF ANALYZER — Risk Tab
// =====================================================
// Shows: KPI grid from data.risk.
// StdDev & MaxDrawdown are percent values.
// Beta/Sharpe/Sortino/R² are plain numbers → toFixed(2).
// 52-Week High/Low are prices.
// =====================================================

import { Card } from '@/components/ds/Card';
import type { EtfData } from '@/types/etf.types';
import { fmtPrice, fmtReturn } from '../format';

// ─── KpiCell ──────────────────────────────────────────────────────────────────

interface KpiCellProps {
  label: string;
  value: string;
  subLabel?: string;
}

function KpiCell({ label, value, subLabel }: KpiCellProps) {
  return (
    <div className="flex flex-col gap-1 rounded-[8px] bg-surface-2 p-ds-3">
      <span className="text-[11px] font-medium tracking-[1.2px] uppercase text-ink-tertiary">
        {label}
      </span>
      <span className="font-data text-base font-medium text-ink-primary">{value}</span>
      {subLabel && (
        <span className="text-[10px] text-ink-tertiary">{subLabel}</span>
      )}
    </div>
  );
}

// ─── Format helpers local to this tab ────────────────────────────────────────

function fmtPlain(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(2);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: EtfData;
}

export function RiskTab({ data }: Props) {
  const { risk } = data;

  return (
    <div className="space-y-ds-6">

      <Card padding="default">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
          Risk Metrics
        </p>

        <div className="grid grid-cols-2 gap-ds-3 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCell
            label="Beta"
            value={fmtPlain(risk.beta)}
            subLabel="vs SPY"
          />
          <KpiCell
            label="Std Dev (Ann.)"
            value={fmtReturn(risk.stdDev)}
          />
          <KpiCell
            label="Sharpe Ratio"
            value={fmtPlain(risk.sharpe)}
          />
          <KpiCell
            label="Sortino Ratio"
            value={fmtPlain(risk.sortino)}
          />
          <KpiCell
            label="Max Drawdown"
            value={fmtReturn(risk.maxDrawdown)}
          />
          <KpiCell
            label="R² (vs SPY)"
            value={fmtPlain(risk.rSquared)}
          />
          <KpiCell
            label="52-Week High"
            value={fmtPrice(risk.week52High)}
          />
          <KpiCell
            label="52-Week Low"
            value={fmtPrice(risk.week52Low)}
          />
        </div>

        <p className="mt-ds-4 text-[10px] text-ink-tertiary leading-relaxed">
          Risk metrics computed from up to 5Y of daily returns; beta/R² vs SPY.
        </p>
      </Card>

    </div>
  );
}
