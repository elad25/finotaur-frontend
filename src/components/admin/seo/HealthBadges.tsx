// src/components/admin/seo/HealthBadges.tsx
// ==========================================
// Horizontal row of status badges for SEO infrastructure health.
// Renders at the top of SeoAnalyticsPage.

import type { AnalyticsStatus } from '@/lib/seo/analyticsTypes';

interface HealthBadgesProps {
  status: AnalyticsStatus;
  generatedAt?: string;
}

type DotColor = 'green' | 'yellow' | 'blue' | 'gray';

interface BadgeProps {
  dot: DotColor;
  children: React.ReactNode;
}

const dotClasses: Record<DotColor, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-400',
  gray: 'bg-gray-500',
};

function Badge({ dot, children }: BadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 whitespace-nowrap">
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[dot]}`}
      />
      {children}
    </span>
  );
}

function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return 'unknown';
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function HealthBadges({ status, generatedAt }: HealthBadgesProps) {
  const posthogLive = status === 'live';
  const freshnessLabel = generatedAt
    ? `Updated ${formatTimeAgo(generatedAt)}`
    : 'Freshness unknown';

  return (
    <div className="flex flex-wrap gap-2">
      <Badge dot="green">Sitemap submitted ✓</Badge>
      <Badge dot="green">Prerender live ✓</Badge>
      <Badge dot="blue">
        <a
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Check GSC →
        </a>
      </Badge>
      <Badge dot={posthogLive ? 'green' : 'yellow'}>
        PostHog tracking: {posthogLive ? 'live' : 'mock data'}
      </Badge>
      <Badge dot={posthogLive ? 'green' : 'gray'}>
        {freshnessLabel}
      </Badge>
    </div>
  );
}

export default HealthBadges;
