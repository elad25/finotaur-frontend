import { Fragment, useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { GlassCard, GlassTabs, GlassTableSkeleton, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';
import { useCot } from './_shared/hooks';
import type { CotMarket } from './_shared/types';

// ── helpers ──────────────────────────────────────────────────────────────────

const SECTOR_ORDER: Record<string, number> = { energy: 0, metals: 1, agriculture: 2 };
const SECTOR_LABELS: Record<string, string> = {
  energy: 'Energy',
  metals: 'Metals',
  agriculture: 'Agriculture',
};

function formatNet(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US');
  if (value >= 0) return `+${abs}`;
  return `−${abs}`; // U+2212 proper minus
}

// ── tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'cot', label: 'COT Positioning' },
  { id: 'inventories', label: 'Inventories' },
  { id: 'term-structure', label: 'Term Structure' },
];

// ── COT table ────────────────────────────────────────────────────────────────

function CotTable({ markets, reportDate }: { markets: CotMarket[]; reportDate: string | null }) {
  const sorted = [...markets].sort((a, b) => {
    const sA = SECTOR_ORDER[a.sector] ?? 99;
    const sB = SECTOR_ORDER[b.sector] ?? 99;
    if (sA !== sB) return sA - sB;
    return a.name.localeCompare(b.name);
  });

  // Group by sector
  const groups: { sector: string; rows: CotMarket[] }[] = [];
  for (const m of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.sector === m.sector) {
      last.rows.push(m);
    } else {
      groups.push({ sector: m.sector, rows: [m] });
    }
  }

  return (
    <div className="space-y-4">
      {/* as-of line */}
      {reportDate && (
        <p className="text-xs text-white/40">
          As of {reportDate}
        </p>
      )}

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2 pr-4 text-[11px] uppercase tracking-wider text-white/40 font-medium">
                Commodity
              </th>
              <th className="text-right py-2 px-4 text-[11px] uppercase tracking-wider text-white/40 font-medium">
                Managed Money Net
              </th>
              <th className="text-right py-2 px-4 text-[11px] uppercase tracking-wider text-white/40 font-medium">
                Producer / Merchant Net
              </th>
              <th className="text-right py-2 pl-4 text-[11px] uppercase tracking-wider text-white/40 font-medium">
                Open Interest
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ sector, rows }) => (
              <Fragment key={sector}>
                <tr>
                  <td
                    colSpan={4}
                    className="pt-4 pb-1.5 text-[10px] uppercase tracking-widest text-white/30 font-semibold"
                  >
                    {SECTOR_LABELS[sector] ?? sector}
                  </td>
                </tr>
                {rows.map((m) => {
                  const mmNeg = m.managedMoney.net < 0;
                  const pmNeg = m.producerMerchant.net < 0;
                  return (
                    <tr
                      key={m.symbol}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 pr-4 text-white/80 font-medium">
                        {m.name}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono tabular-nums ${mmNeg ? 'text-red-400' : 'text-white/80'}`}>
                        {formatNet(m.managedMoney.net)}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono tabular-nums ${pmNeg ? 'text-red-400' : 'text-white/80'}`}>
                        {formatNet(m.producerMerchant.net)}
                      </td>
                      <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-white/50">
                        {m.openInterest.toLocaleString('en-US')}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* caption */}
      <p className="text-[11px] text-white/30 leading-relaxed border-t border-white/[0.04] pt-3">
        CFTC Commitments of Traders — net futures positioning (contracts).
        Managed Money ≈ speculators; Producer/Merchant ≈ hedgers. Weekly, Tuesday data.
      </p>
    </div>
  );
}

// ── COT tab ──────────────────────────────────────────────────────────────────

function CotTab() {
  const { data, loading } = useCot();

  if (loading) {
    return (
      <GlassCard>
        <GlassTableSkeleton rows={10} />
      </GlassCard>
    );
  }

  if (!data || data.markets.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          title="No COT data available"
          description="CFTC Commitments of Traders data could not be loaded. Please try again later."
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <CotTable markets={data.markets} reportDate={data.reportDate} />
      {data.attribution && data.attribution.length > 0 && (
        <p className="text-[10px] text-white/20 mt-3">
          Source: {data.attribution.join(', ')}
        </p>
      )}
    </GlassCard>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function CommoditiesPositioning() {
  const [tab, setTab] = useState(TABS[0].id);

  return (
    <PageTemplate
      title="Positioning & Supply"
      description="Trader positioning, government inventory data and futures term structure."
    >
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'cot' && <CotTab />}

        {tab === 'inventories' && (
          <GlassCard>
            <EmptyState
              title="Inventories — coming soon"
              description="EIA crude & natural-gas storage. Pending EIA data access."
            />
          </GlassCard>
        )}

        {tab === 'term-structure' && (
          <GlassCard>
            <EmptyState
              title="Term structure — not available"
              description="Futures forward curves require licensed exchange data; not available from free redistribution-safe sources."
            />
          </GlassCard>
        )}
      </div>
    </PageTemplate>
  );
}
