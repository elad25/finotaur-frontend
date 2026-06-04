import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PageTemplate } from '@/components/PageTemplate';
import {
  GlassCard,
  GlassTabs,
  GlassTableSkeleton,
  EmptyState,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useSeasonality } from './_shared/hooks';

// ── Symbol selector config ────────────────────────────────────────────────────

const SEASONALITY_SYMBOLS: { id: string; label: string }[] = [
  { id: 'WTI',      label: 'WTI Crude'    },
  { id: 'BRENT',    label: 'Brent'        },
  { id: 'NATGAS',   label: 'Natural Gas'  },
  { id: 'GOLD',     label: 'Gold'         },
  { id: 'SILVER',   label: 'Silver'       },
  { id: 'COPPER',   label: 'Copper'       },
  { id: 'CORN',     label: 'Corn'         },
  { id: 'WHEAT',    label: 'Wheat'        },
  { id: 'SOYBEANS', label: 'Soybeans'     },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Custom tooltip ────────────────────────────────────────────────────────────

interface TooltipEntry {
  dataKey: string;
  name: string;
  value: number | null;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function SeasonalityTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div
      dir="ltr"
      className="bg-black/85 border border-white/[0.08] rounded-lg p-3 text-xs shadow-xl"
    >
      <p className="text-white/60 mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        entry.value != null && (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-white/50">{entry.name}:</span>
            <span className="text-white/90 font-mono tabular-nums ml-auto pl-3">
              {entry.value.toFixed(2)}%
            </span>
          </div>
        )
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CommoditiesSeasonality() {
  const [selected, setSelected] = useState('WTI');
  const { data, loading } = useSeasonality(selected);

  // Build 12-row chart dataset
  const chartData = MONTHS.map((month, i) => ({
    month,
    seasonal: data?.monthlyAvgPct[i] ?? null,
    thisYear: data?.currentYearPct[i] ?? null,
  }));

  const allNull =
    !loading &&
    data != null &&
    data.monthlyAvgPct.every((v) => v == null) &&
    data.currentYearPct.every((v) => v == null);

  return (
    <PageTemplate
      title="Seasonality"
      description="Average seasonal price path by month vs the current year."
    >
      <div className="space-y-4">
        {/* Symbol selector */}
        <div className="overflow-x-auto pb-1">
          <GlassTabs
            tabs={SEASONALITY_SYMBOLS}
            active={selected}
            onChange={setSelected}
          />
        </div>

        {/* Chart card */}
        <GlassCard>
          {loading ? (
            <GlassTableSkeleton rows={6} />
          ) : allNull || !data ? (
            <EmptyState
              title="No seasonal data"
              description="Seasonal history is not yet available for this commodity."
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#A0A0A0', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    tick={{ fill: '#A0A0A0', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    content={<SeasonalityTooltip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value: string) => (
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="seasonal"
                    name="Seasonal Average"
                    stroke="#C9A646"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="thisYear"
                    name="This Year"
                    stroke="#7AA2F7"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-3 text-[11px] text-white/30 leading-relaxed">
                Cumulative average % path from January across available history, vs the current year.
                Useful for spotting seasonal strength and inflection points.
              </p>
            </>
          )}
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
