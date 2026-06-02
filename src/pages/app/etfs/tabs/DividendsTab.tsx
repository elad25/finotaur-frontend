// src/pages/app/etfs/tabs/DividendsTab.tsx
// =====================================================
// ETF ANALYZER — Dividends Tab
// =====================================================
// Shows: header KPIs (yield, frequency, latest dates),
// dividend history table (ex-date, pay-date, cash amt),
// sorted desc by exDate, top 20.
// dividendYield from API is a DECIMAL → ×100 before fmtPct.
// =====================================================

import { Card } from '@/components/ds/Card';
import type { EtfData, EtfDividend } from '@/types/etf.types';
import { fmtPct, fmtDate } from '../format';

// ─── Derive distribution frequency label ─────────────────────────────────────

function frequencyLabel(freq: string | null | undefined): string {
  if (!freq) return '—';
  const n = parseInt(freq, 10);
  if (isNaN(n)) return freq; // pass through if already a string label
  if (n === 12) return 'Monthly';
  if (n === 4)  return 'Quarterly';
  if (n === 2)  return 'Semi-Annual';
  if (n === 1)  return 'Annual';
  if (n === 0)  return '—';
  return freq;
}

// ─── Header KPIs ─────────────────────────────────────────────────────────────

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

export function DividendsTab({ data }: Props) {
  const { dividends, dividendYield } = data;

  // Sort desc by exDate, take top 20
  const sorted: EtfDividend[] = [...dividends]
    .sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime())
    .slice(0, 20);

  const latest = sorted[0] ?? null;

  return (
    <div className="space-y-ds-6">

      {/* ── Header KPIs ───────────────────────────────────────────────── */}
      <Card padding="default">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
          Distribution Summary
        </p>
        <div className="grid grid-cols-2 gap-ds-3 sm:grid-cols-4">
          <KpiCell
            label="Dividend Yield (TTM)"
            value={
              dividendYield !== null && dividendYield !== undefined
                ? fmtPct(dividendYield * 100, 2)
                : '—'
            }
          />
          <KpiCell
            label="Frequency"
            value={frequencyLabel(latest?.frequency)}
          />
          <KpiCell
            label="Latest Ex-Date"
            value={fmtDate(latest?.exDate)}
          />
          <KpiCell
            label="Latest Pay-Date"
            value={fmtDate(latest?.payDate)}
          />
        </div>
      </Card>

      {/* ── Dividend History ──────────────────────────────────────────── */}
      <Card padding="default">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
          Distribution History
        </p>

        {sorted.length === 0 ? (
          <p className="text-small text-ink-tertiary">No distribution history available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-ds-subtle">
                  <th className="pb-ds-2 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
                    Ex-Date
                  </th>
                  <th className="pb-ds-2 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
                    Pay-Date
                  </th>
                  <th className="pb-ds-2 text-right text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
                    Cash Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d, i) => (
                  <tr
                    key={`${d.exDate}-${i}`}
                    className="border-b border-border-ds-subtle/50 last:border-0 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="py-ds-2 font-data text-[12px] text-ink-secondary tabular-nums">
                      {fmtDate(d.exDate)}
                    </td>
                    <td className="py-ds-2 font-data text-[12px] text-ink-secondary tabular-nums">
                      {fmtDate(d.payDate)}
                    </td>
                    <td className="py-ds-2 text-right font-data text-[12px] font-medium text-ink-primary tabular-nums">
                      ${d.cashAmount.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
}
