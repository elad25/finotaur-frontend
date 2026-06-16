// ============================================================
// src/pages/app/stocks/Insiders.tsx
// Institutional holdings tracker — 13F filings
// Route: /app/stocks/insiders
// ============================================================

import { memo } from 'react';
import { ConsensusStrip } from './_insiders/ConsensusStrip';
import { ManagersGrid } from './_insiders/ManagersGrid';
import { useInstitutionalManagers } from './_insiders/hooks';
import { FinoExplains } from '@/components/fino/FinoExplains';

export default memo(function Insiders() {
  const { data, loading, error } = useInstitutionalManagers();

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6">
      {/* Page header */}
      <div className="relative">
        <h1 className="text-base font-semibold text-white/90">Insiders</h1>
        <p className="text-[11px] text-white/30 mt-0.5">
          Track the portfolios of the world's top investors — straight from SEC 13F filings.
        </p>
        <FinoExplains
          title="What is Insider & 13F?"
          className="mt-ds-4 lg:absolute lg:right-0 lg:top-0 lg:z-10 lg:mt-0 lg:w-auto"
        >
          Follow the smart money. Each quarter big institutions disclose their holdings in SEC
          13F filings — here you can track 28 top fund managers, see what they're buying and
          selling, and find the stocks they hold most.
        </FinoExplains>
      </div>

      {/* Consensus strip */}
      <section>
        <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2">
          Quarterly Consensus
        </p>
        <ConsensusStrip />
      </section>

      {/* Managers grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-wider text-white/25">
            Top Institutional Managers
          </p>
          {data?.quarter && (
            <span className="text-[10px] font-mono text-white/20">
              {data.quarter}
            </span>
          )}
        </div>
        <ManagersGrid
          managers={data?.managers ?? []}
          loading={loading}
          error={error}
        />
      </section>

      {/* Data attribution */}
      <div className="flex justify-end">
        <p className="text-[10px] text-white/20 font-mono">
          Data sourced from SEC 13F filings
        </p>
      </div>
    </div>
  );
});
