// ============================================================
// src/pages/app/stocks/_insiders/ManagerDetail.tsx
// Manager detail view — header + holdings table
// ============================================================

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/pages/app/crypto/_shared/GlassUI';
import { SectionSpinner } from '@/components/ds/Spinner';
import { formatCompact } from '@/pages/app/crypto/_shared/formatters';
import { useManagerDetail } from './hooks';
import { HoldingsTable } from './HoldingsTable';
import { ArrowLeft } from 'lucide-react';

// ── ManagerDetail ─────────────────────────────────────────────
interface ManagerDetailProps {
  slug: string;
}

export const ManagerDetail = memo(function ManagerDetail({ slug }: ManagerDetailProps) {
  const navigate = useNavigate();
  const { data, loading, error } = useManagerDetail(slug);

  function handleBack() {
    navigate('/app/stocks/insiders');
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        All Managers
      </button>

      {loading && !data ? (
        <GlassCard padding="sm">
          <SectionSpinner />
        </GlassCard>
      ) : error && !data ? (
        <GlassCard padding="sm">
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-[11px] text-white/25">Failed to load manager data</p>
            <button
              onClick={() => window.location.reload()}
              className="text-[11px] text-white/40 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:text-white/60 hover:border-white/[0.15] transition-colors"
            >
              Retry
            </button>
          </div>
        </GlassCard>
      ) : data ? (
        <>
          {/* Manager header card */}
          <GlassCard padding="sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white/90">{data.manager.name}</h2>
                <p className="text-[11px] text-white/35 mt-0.5">{data.manager.fundName}</p>
              </div>
              <div className="flex flex-wrap gap-4 sm:text-right">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/25">Portfolio Value</p>
                  <p className="text-sm font-mono font-semibold text-white/80 mt-0.5">
                    {formatCompact(data.manager.portfolioValueUsd)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/25">Holdings</p>
                  <p className="text-sm font-mono font-semibold text-white/80 mt-0.5">
                    {data.manager.holdingsCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/25">Quarter</p>
                  <p className="text-sm font-mono font-semibold text-white/80 mt-0.5">
                    {data.quarter}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Holdings table */}
          <GlassCard padding="sm">
            <HoldingsTable
              holdings={data.holdings}
              loading={false}
              error={null}
            />
          </GlassCard>
        </>
      ) : null}
    </div>
  );
});
