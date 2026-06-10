import { useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { Change } from '@/components/ds/NumberDisplay';
import {
  GlassCard,
  GlassTabs,
  GlassTableSkeleton,
  EmptyState,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useCommoditiesSnapshot } from './_shared/hooks';
import { formatCommodityPrice } from './_shared/formatters';
import type { CommodityQuote } from './_shared/types';

type SectorTab = 'all' | 'energy' | 'metals' | 'agriculture';

const TABS: { id: SectorTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'energy', label: 'Energy' },
  { id: 'metals', label: 'Metals' },
  { id: 'agriculture', label: 'Agriculture' },
];

const SECTOR_SORT_ORDER: Record<string, number> = { energy: 0, metals: 1, agriculture: 2 };

function sortRows(rows: CommodityQuote[]): CommodityQuote[] {
  return [...rows].sort((a, b) => {
    const sectorDiff = (SECTOR_SORT_ORDER[a.sector] ?? 99) - (SECTOR_SORT_ORDER[b.sector] ?? 99);
    if (sectorDiff !== 0) return sectorDiff;
    return a.name.localeCompare(b.name);
  });
}

export default function CommoditiesMarkets() {
  const [tab, setTab] = useState<SectorTab>('all');
  const { data, loading } = useCommoditiesSnapshot();

  const rows: CommodityQuote[] = data
    ? sortRows(tab === 'all' ? data.commodities : data.commodities.filter(c => c.sector === tab))
    : [];

  return (
    <PageTemplate
      title="Commodities Markets"
      description="Prices, screener and per-commodity analysis across energy, metals and agriculture."
    >
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={id => setTab(id as SectorTab)} />

        <GlassCard>
          {loading ? (
            <GlassTableSkeleton rows={8} />
          ) : !data ? (
            <EmptyState title="Unable to load commodities" description="Please try again later." />
          ) : rows.length === 0 ? (
            <EmptyState title="No data for this sector" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-white/30 border-b border-white/[0.05]">
                    <th className="text-left pb-2 font-medium">Name</th>
                    {tab === 'all' && (
                      <th className="text-left pb-2 font-medium hidden sm:table-cell">Sector</th>
                    )}
                    <th className="text-right pb-2 font-medium">Price</th>
                    <th className="text-right pb-2 font-medium">Change</th>
                    <th className="text-right pb-2 font-medium hidden sm:table-cell">As Of</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map(q => (
                    <tr key={q.symbol} className="group">
                      <td className="py-2.5 pr-4">
                        <span className="text-white/80 font-medium">{q.name}</span>
                      </td>
                      {tab === 'all' && (
                        <td className="py-2.5 pr-4 hidden sm:table-cell">
                          <span className="text-[11px] capitalize text-white/40">{q.sector}</span>
                        </td>
                      )}
                      <td className="py-2.5 pr-4 text-right font-mono text-white/70 tabular-nums">
                        {formatCommodityPrice(q.price, q.unit)}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {q.changePct == null
                          ? <span className="text-white/30">—</span>
                          : <Change value={q.changePct} format="percent" decimals={2} />
                        }
                      </td>
                      <td className="py-2.5 text-right text-[11px] text-white/30 hidden sm:table-cell">
                        {q.asOf ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
