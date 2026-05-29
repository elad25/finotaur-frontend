// src/components/admin/seo/MetricTiles.tsx
// ==========================================
// 4 summary metric cards for SEO Analytics.
// Responsive grid: 1 col mobile / 2 cols sm / 4 cols lg.

import { Card, Eyebrow } from '@/components/ds/Card';
import type { AnalyticsSummary } from '@/lib/seo/analyticsTypes';

interface MetricTilesProps {
  summary: AnalyticsSummary;
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

interface TileProps {
  label: string;
  value: string;
  subLabel: string;
}

function Tile({ label, value, subLabel }: TileProps) {
  return (
    <Card variant="default" padding="default">
      <Eyebrow className="mb-3">{label}</Eyebrow>
      <p className="text-3xl font-mono font-bold text-white leading-none mb-2">
        {value}
      </p>
      <p className="text-xs text-gray-500">{subLabel}</p>
    </Card>
  );
}

export function MetricTiles({ summary }: MetricTilesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Tile
        label="Page Views (7d)"
        value={formatNumber(summary.totalViews7d)}
        subLabel="Last 7 days"
      />
      <Tile
        label="Page Views (30d)"
        value={formatNumber(summary.totalViews30d)}
        subLabel="Last 30 days"
      />
      <Tile
        label="Unique Visitors (7d)"
        value={formatNumber(summary.uniqueVisitors7d)}
        subLabel="Last 7 days"
      />
      <Tile
        label="Avg Time on Page"
        value={formatSeconds(summary.avgTimeOnPageSeconds)}
        subLabel="Per session, all pages"
      />
    </div>
  );
}

export default MetricTiles;
