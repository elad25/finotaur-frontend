import { PageTemplate } from '@/components/PageTemplate';
import { Change } from '@/components/ds/NumberDisplay';
import {
  GlassCard,
  GlassStat,
  GlassTableSkeleton,
  EmptyState,
  SectionHeader,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useCommoditiesSnapshot } from './_shared/hooks';
import { formatCommodityPrice } from './_shared/formatters';
import type { CommodityQuote } from './_shared/types';

const SECTOR_ORDER: Array<{ key: 'energy' | 'metals' | 'agriculture'; label: string }> = [
  { key: 'energy', label: 'Energy' },
  { key: 'metals', label: 'Metals' },
  { key: 'agriculture', label: 'Agriculture' },
];

function MacroStrip({ dxy, realYield10y, breakeven10y, nominal10y, asOf }: {
  dxy: number | null;
  realYield10y: number | null;
  breakeven10y: number | null;
  nominal10y: number | null;
  asOf: string | null;
}) {
  const fmt = (v: number | null, suffix = '') =>
    v == null ? '—' : `${v.toFixed(2)}${suffix}`;

  return (
    <div className="space-y-2">
      <SectionHeader
        title="Macro Drivers"
        subtitle={asOf ? `as of ${asOf}` : undefined}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassStat label="US Dollar (DXY)" value={fmt(dxy)} />
        <GlassStat label="10Y Real Yield" value={fmt(realYield10y, '%')} />
        <GlassStat label="10Y Breakeven" value={fmt(breakeven10y, '%')} />
        <GlassStat label="10Y Treasury" value={fmt(nominal10y, '%')} />
      </div>
    </div>
  );
}

function SectorTable({ quotes }: { quotes: CommodityQuote[] }) {
  if (quotes.length === 0) return null;
  const asOf = quotes.find(q => q.asOf)?.asOf ?? null;

  return (
    <div className="overflow-x-auto">
      {asOf && (
        <p className="text-[11px] text-white/30 mb-2">as of {asOf}</p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-white/30 border-b border-white/[0.05]">
            <th className="text-left pb-2 font-medium">Name</th>
            <th className="text-right pb-2 font-medium">Price</th>
            <th className="text-right pb-2 font-medium">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {quotes.map(q => (
            <tr key={q.symbol} className="group">
              <td className="py-2.5 pr-4 text-white/80 font-medium">{q.name}</td>
              <td className="py-2.5 pr-4 text-right font-mono text-white/70 tabular-nums">
                {formatCommodityPrice(q.price, q.unit)}
              </td>
              <td className="py-2.5 text-right">
                {q.changePct == null
                  ? <span className="text-white/30">—</span>
                  : <Change value={q.changePct} format="percent" decimals={2} />
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CommoditiesOverview() {
  const { data, loading } = useCommoditiesSnapshot();

  return (
    <PageTemplate
      title="Commodities Dashboard"
      description="Live energy, metals and agricultural markets with macro drivers."
    >
      <div className="space-y-6">
        {/* Macro driver strip */}
        {loading ? (
          <GlassCard>
            <GlassTableSkeleton rows={2} />
          </GlassCard>
        ) : !data ? (
          <GlassCard>
            <EmptyState title="Unable to load macro data" description="Please try again later." />
          </GlassCard>
        ) : (
          <MacroStrip
            dxy={data.macro.dxy}
            realYield10y={data.macro.realYield10y}
            breakeven10y={data.macro.breakeven10y}
            nominal10y={data.macro.nominal10y}
            asOf={data.macro.asOf}
          />
        )}

        {/* Commodities board — one card per sector */}
        {loading ? (
          <GlassCard>
            <GlassTableSkeleton rows={8} />
          </GlassCard>
        ) : !data ? (
          <GlassCard>
            <EmptyState title="Unable to load commodities" description="Please try again later." />
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SECTOR_ORDER.map(({ key, label }) => {
              const rows = data.commodities.filter(c => c.sector === key);
              return (
                <GlassCard key={key}>
                  <SectionHeader title={label} />
                  <SectorTable quotes={rows} />
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
