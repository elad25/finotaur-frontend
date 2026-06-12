// src/pages/app/ai/copilot/components/RiskAlertsCard.tsx
// =====================================================
// RISK ALERTS card — top 3 risk drivers from portfolioRisk util.
// Eyebrow "RISK ALERTS" + shield icon.  Severity badge: HIGH=red, MEDIUM=amber.
// =====================================================

import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import type { PortfolioSnapshot } from '../hooks/usePortfolioData';
import { computeRiskAnalysis } from '../utils/portfolioRisk';
import type { RiskDriver } from '../utils/portfolioRisk';

// ─── Badge ────────────────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: RiskDriver['level'] }) {
  if (level === 'High') {
    return (
      <span className="inline-flex items-center rounded-[4px] border border-[#C25450]/40 bg-[#C25450]/15 px-2 py-0.5 text-[9px] uppercase font-semibold text-[#E87070]">
        HIGH
      </span>
    );
  }
  if (level === 'Medium') {
    return (
      <span className="inline-flex items-center rounded-[4px] border border-gold-primary/35 bg-gold-primary/10 px-2 py-0.5 text-[9px] uppercase font-semibold text-gold-primary">
        MEDIUM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-[4px] border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[9px] uppercase font-semibold text-ink-tertiary">
      LOW
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioSnapshot;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RiskAlertsCard({ snapshot, className }: Props) {
  const risk = computeRiskAnalysis(snapshot.holdings, snapshot.totalValue);
  const drivers = risk.drivers.slice(0, 3);

  const isEmpty = snapshot.holdings.length === 0 || snapshot.totalValue <= 0;

  return (
    <PremiumFrame className={`flex flex-col min-h-[280px] ${className ?? ''}`}>
      {/* pb-14 reserves space for footer */}
      <div className="flex flex-col flex-1 p-5 pb-14">
        {/* Header */}
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-gold-primary flex-none" />
          <p className="text-[10px] uppercase tracking-[0.12em] text-gold-primary font-semibold">
            RISK ALERTS
          </p>
        </div>

        {/* Rows */}
        <div className="mt-4 flex flex-col gap-3">
          {isEmpty ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center">
              Connect a broker to see risk alerts.
            </p>
          ) : drivers.length === 0 ? (
            <p className="text-[11px] text-ink-tertiary py-4 text-center">
              No risk drivers to display.
            </p>
          ) : (
            drivers.map((driver) => (
              <div
                key={driver.label}
                className="flex items-start justify-between gap-3 rounded-[6px] px-2 py-2 hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white leading-snug">{driver.label}</p>
                  <p className="text-[11px] text-ink-tertiary leading-snug truncate mt-0.5">
                    {driver.text}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-none">
                  <SeverityBadge level={driver.level} />
                  <span className="text-[10px] font-mono text-ink-tertiary">
                    {driver.progress.toFixed(0)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <Link
        to="/copilot/risks"
        className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.055] text-[11px] uppercase text-gold-primary transition-colors hover:bg-gold-primary/15"
      >
        View All Risks <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}
