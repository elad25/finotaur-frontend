// src/components/admin/seo/SourceBreakdown.tsx
// ==========================================
// Horizontal bar chart — traffic source breakdown.
// Uses recharts (already in dependencies).

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SourceBreakdownRow } from '@/lib/seo/analyticsTypes';

interface SourceBreakdownProps {
  data: SourceBreakdownRow[];
}

interface TooltipPayloadEntry {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className="text-white font-semibold">
        {new Intl.NumberFormat('en-US').format(payload[0].value)} views
      </p>
    </div>
  );
}

export function SourceBreakdown({ data }: SourceBreakdownProps) {
  // Use label (human-readable) as the Y-axis key
  const chartData = data.map((row) => ({ label: row.label, views: row.views }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px]">
        <p className="text-sm text-gray-500">No traffic source data yet.</p>
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis
            type="number"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat('en-US', { notation: 'compact' }).format(v)
            }
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar
            dataKey="views"
            fill="#C9A646"
            fillOpacity={0.8}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SourceBreakdown;
