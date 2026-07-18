// src/pages/app/ai/copilot/components/PortfolioSnapshotCard.tsx
// =====================================================
// PORTFOLIO SNAPSHOT card — total value, 1M return, cash/day-change/buying-power rows.
// Uses the same PremiumFrame + useValuePrivacy pattern as PortfolioValuePanel.
// =====================================================

import { useState } from 'react';
import { Eye, EyeOff, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PremiumFrame } from '../brief/PremiumFrame';
import { useValuePrivacy } from '../hooks/useValuePrivacy';
import type { PortfolioDataResult } from '../hooks/usePortfolioData';
import ManualPortfolioPopup from '@/components/brokers/ManualPortfolioPopup';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDollar(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 10_000)    return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioDataResult;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PortfolioSnapshotCard({ snapshot, className }: Props) {
  const [hideValues, toggleHideValues] = useValuePrivacy();
  const [showEditPopup, setShowEditPopup] = useState(false);
  const isManualSource = snapshot.sourceBroker === 'manual';

  const mask = '**********';

  // 1M return from snapshot.changeAbs / changePercent (already range-aware for '1M').
  const returnPositive = snapshot.changeAbs >= 0;

  // Cash: sum all CASH-class holdings.
  const cashValue = snapshot.holdings
    .filter((h) => (h.assetClass ?? '').toUpperCase() === 'CASH')
    .reduce((s, h) => s + h.marketValue, 0);
  const cashPct = snapshot.totalValue > 0 ? (cashValue / snapshot.totalValue) * 100 : 0;

  // Day change from live-quote layer.
  const dayChangeAbs = snapshot.dayChangeAbs ?? 0;
  const dayChangePct = snapshot.dayChangePercent ?? 0;
  const dayPositive  = dayChangeAbs >= 0;

  // Buying power — IB account summary exposes net liquidation minus positions.
  // We approximate it here as cash (no direct IB buying power field in the snapshot).
  // The real buying power field is not surfaced through usePortfolioData, so we show cash.
  const buyingPower    = cashValue;
  const buyingPowerPct = cashPct;

  return (
    <>
    <PremiumFrame className={`flex flex-col min-h-[380px] ${className ?? ''}`}>
      {/* pb-14 reserves space for the absolute footer button */}
      <div className="flex flex-col flex-1 p-5 pb-14">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.12em] text-gold-primary font-semibold">
            PORTFOLIO SNAPSHOT
          </p>
          <div className="flex items-center gap-1">
            {isManualSource && (
              <button
                type="button"
                onClick={() => setShowEditPopup(true)}
                title="Update Portfolio"
                className="rounded p-0.5 text-ink-tertiary transition-colors hover:text-gold-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary/50"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleHideValues}
              title={hideValues ? 'Show values' : 'Hide values'}
              className="rounded p-0.5 text-ink-tertiary transition-colors hover:text-gold-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary/50"
            >
              {hideValues ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* TOTAL VALUE label + big gold number */}
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">TOTAL VALUE</p>
          <p className="mt-1 font-mono text-[36px] font-light leading-none tracking-tight text-gold-primary">
            {hideValues ? mask : fmtDollar(snapshot.totalValue)}
          </p>
        </div>

        {/* 1M RETURN */}
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">1M RETURN</p>
          {snapshot.hasHistoricalSeries ? (
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-sm font-semibold ${returnPositive ? 'text-status-success' : 'text-status-error'}`}>
                {hideValues ? mask : fmtPct(snapshot.changePercent)}
              </span>
              <span className={`text-xs ${returnPositive ? 'text-status-success' : 'text-status-error'}`}>
                {hideValues ? '' : fmtDollar(snapshot.changeAbs)}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-ink-tertiary">Building history…</p>
          )}
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-white/[0.06]" />

        {/* Three metric rows */}
        <div className="flex flex-col gap-3">
          {/* Cash */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#4F9D6B] flex-none" />
              <span className="text-[12px] text-ink-secondary">Cash</span>
            </div>
            <div className="text-right">
              <span className="text-[12px] font-medium text-white">
                {hideValues ? mask : fmtDollar(cashValue)}
              </span>
              <span className="ml-2 text-[11px] text-ink-tertiary">
                {cashPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Day Change */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full flex-none ${dayPositive ? 'bg-[#4F9D6B]' : 'bg-[#C25450]'}`} />
              <span className="text-[12px] text-ink-secondary">Day Change</span>
            </div>
            <div className="text-right">
              <span className={`text-[12px] font-medium ${dayPositive ? 'text-status-success' : 'text-status-error'}`}>
                {hideValues ? mask : fmtDollar(dayChangeAbs)}
              </span>
              <span className={`ml-2 text-[11px] ${dayPositive ? 'text-status-success' : 'text-status-error'}`}>
                {hideValues ? '' : fmtPct(dayChangePct)}
              </span>
            </div>
          </div>

          {/* Buying Power */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#4F7FCC] flex-none" />
              <span className="text-[12px] text-ink-secondary">Buying Power</span>
            </div>
            <div className="text-right">
              <span className="text-[12px] font-medium text-white">
                {hideValues ? mask : fmtDollar(buyingPower)}
              </span>
              <span className="ml-2 text-[11px] text-ink-tertiary">
                {buyingPowerPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <Link
        to="/copilot/holdings"
        className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/20 bg-gold-primary/[0.06] text-[11px] uppercase text-gold-primary transition-colors hover:bg-gold-primary/15 hover:text-gold-bright"
      >
        View Portfolio <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
    {showEditPopup && <ManualPortfolioPopup onClose={() => setShowEditPopup(false)} />}
    </>
  );
}
