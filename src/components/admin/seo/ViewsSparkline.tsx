// src/components/admin/seo/ViewsSparkline.tsx
// ==========================================
// Area chart — 30-day page views trend.
// Uses recharts (already in dependencies).

import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ViewsPerDayRow } from '@/lib/seo/analyticsTypes';

interface ViewsSparklineProps {
  data: ViewsPerDayRow[];
}

interface TooltipPayloadEntry {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function formatDateLabel(isoDate: string): string {
  // "2026-05-01" → "05/01"
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  return `${parts[1]}/${parts[2]}`;
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

export function ViewsSparkline({ data }: ViewsSparklineProps) {
  // Show last 30 days, oldest first
  const chartData = data
    .slice(-30)
    .map((row) => ({ date: formatDateLabel(row.date), views: row.views }));

  if (chartData.length < 2) {
    return (
      <div className="flex items-center justify-center h-[180px]">
        <p className="text-sm text-gray-500">
          Not enough data yet — check back in a few days.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        >
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C9A646" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#C9A646" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#C9A646', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey="views"
            stroke="#C9A646"
            strokeWidth={2}
            fill="url(#goldGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#C9A646', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ViewsSparkline;
