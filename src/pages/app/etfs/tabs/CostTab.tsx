// src/pages/app/etfs/tabs/CostTab.tsx
// =====================================================
// ETF ANALYZER — Cost & Efficiency Tab
// =====================================================
// Shows: expense block (net/gross ratio, AUM, NAV),
// fund flows block (YTD / 1M / 3M).
// Gate: if fundamentals===null && flows===null → empty-state.
// Note: premium/discount and tracking-difference not sourced.
// =====================================================

import { Card } from '@/components/ds/Card';
import type { EtfData } from '@/types/etf.types';
import { fmtExpenseRatio, fmtMoney, fmtPrice } from '../format';

// ─── KpiCell ──────────────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: EtfData;
}

export function CostTab({ data }: Props) {
  const { fundamentals, flows } = data;

  // Gate: no entitlement data at all → empty-state
  if (fundamentals === null && flows === null) {
    return (
      <Card padding="spacious">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-2">
          Cost &amp; Efficiency
        </p>
        <p className="text-sm font-medium text-ink-secondary mb-ds-1">
          Cost &amp; efficiency data unavailable
        </p>
        <p className="text-small text-ink-tertiary">
          Expense ratio, AUM and fund-flow data require an upgraded data provider entitlement.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-ds-6">

      {/* ── Expense & Fund Details ────────────────────────────────────── */}
      {fundamentals !== null && (
        <Card padding="default">
          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
            Expense &amp; Fund Details
          </p>
          <div className="grid grid-cols-2 gap-ds-3 sm:grid-cols-4">
            <KpiCell
              label="Net Expense Ratio"
              value={fmtExpenseRatio(fundamentals.expenseRatioNet)}
            />
            <KpiCell
              label="Gross Expense Ratio"
              value={fmtExpenseRatio(fundamentals.expenseRatioGross)}
            />
            <KpiCell
              label="AUM"
              value={fmtMoney(fundamentals.aum)}
            />
            <KpiCell
              label="NAV"
              value={fmtPrice(fundamentals.nav)}
            />
          </div>
        </Card>
      )}

      {/* ── Fund Flows ────────────────────────────────────────────────── */}
      {flows !== null && (
        <Card padding="default">
          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
            Fund Flows
          </p>
          <div className="grid grid-cols-3 gap-ds-3">
            <KpiCell
              label="YTD Flow"
              value={fmtMoney(flows.ytd)}
            />
            <KpiCell
              label="1-Month Flow"
              value={fmtMoney(flows.oneMonth)}
            />
            <KpiCell
              label="3-Month Flow"
              value={fmtMoney(flows.threeMonth)}
            />
          </div>
        </Card>
      )}

      {/* ── Availability note ─────────────────────────────────────────── */}
      <p className="text-[11px] text-ink-tertiary px-ds-1">
        Note: Premium/discount and tracking-difference metrics are not yet available.
      </p>

    </div>
  );
}
