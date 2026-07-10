// src/pages/app/reports/MarketsReportPage.tsx
// =====================================================
// FINO REPORTS — Markets Report (/app/reports/markets)
// =====================================================
// Open to every tier. A single scrollable page (not a slide carousel like
// Journal/Portfolio) — a headline card plus one card per server-provided
// section (Indices, Sectors, Calendar, Crypto). Entirely server-driven
// narrative text; if the call fails the page shows a warming-up state
// instead of a broken screen. This surface is intentionally left
// un-gated today — a future INVESTOR-tier gate can wrap this component
// without touching its internals.
// =====================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, TrendingUp, Layers, CalendarDays, Bitcoin, Newspaper, type LucideIcon } from 'lucide-react';
import { Spinner } from '@/components/ds/Spinner';
import { Eyebrow } from '@/components/ds/Card';
import { useMarketStatus } from '@/lib/marketStatus';
import { fetchMarketsReport } from '@/lib/reports/reportApi';
import type { MarketsReportPayload } from '@/lib/reports/reportTypes';

const SECTION_ICON: Record<string, LucideIcon> = {
  indices: TrendingUp,
  sectors: Layers,
  calendar: CalendarDays,
  crypto: Bitcoin,
};

export default function MarketsReportPage() {
  const navigate = useNavigate();
  const marketStatus = useMarketStatus();
  const [report, setReport] = useState<MarketsReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMarketsReport()
      .then((res) => {
        if (cancelled) return;
        if (res?.report) {
          setReport(res.report);
          setFailed(false);
        } else {
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-base">
      <div className="flex flex-shrink-0 items-center justify-between px-ds-5 py-ds-4">
        <Eyebrow>Markets Today</Eyebrow>
        <button
          type="button"
          onClick={() => navigate('/app/home')}
          aria-label="Close report"
          className="flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] border-border-ds-subtle text-ink-secondary transition-colors duration-base ease-out hover:border-border-ds-default hover:text-ink-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-ds-5 pb-ds-8">
        {loading ? (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-ds-3">
            <Spinner size="lg" />
            <p className="text-xs uppercase tracking-[0.14em] text-ink-tertiary">Loading markets report...</p>
          </div>
        ) : failed || !report ? (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-ds-3 text-center">
            <Spinner size="lg" />
            <p className="text-sm text-ink-secondary">Market report is warming up — check back in a minute.</p>
          </div>
        ) : (
          <div className="space-y-ds-4 py-ds-4">
            {/* Headline card */}
            <div className="rounded-xl border-[0.5px] border-gold-border bg-surface-1 p-ds-6">
              {!marketStatus.isOpen && (
                <span className="mb-ds-2 inline-block rounded-sm border border-gold-border bg-surface-base px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] text-gold-primary">
                  Market Closed — Showing {marketStatus.lastTradingDayLabel}
                </span>
              )}
              <h1 className="text-2xl font-semibold text-ink-primary">{report.headline}</h1>
              <p className="mt-ds-2 font-mono text-xs tabular-nums text-ink-tertiary">
                As of {new Date(report.asOf).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>

            {/* Section cards */}
            {report.sections.map((section) => {
              const Icon = SECTION_ICON[section.key] ?? Newspaper;
              return (
                <div key={section.key} className="rounded-xl border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5">
                  <div className="mb-ds-2 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-surface-base border border-border-ds-subtle text-gold-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-base font-semibold text-ink-primary">{section.title}</h2>
                  </div>
                  <ul className="space-y-2 text-sm leading-[1.6] text-ink-secondary">
                    {(section.bullets ?? []).map((bullet, i) => (
                      <li key={i} className="flex gap-ds-3">
                        <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-gold-primary" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
