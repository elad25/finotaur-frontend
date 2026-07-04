// src/pages/app/admin/tabs/LeadsPlaceholder.tsx
// Tab 6 — Leads & Funnel. Planned in Phase 2.
// Today we already have free-user counts; show those as "what we can see"
// so the page isn't empty.

import { useEffect, useState } from 'react';
import { Sprout } from 'lucide-react';
import { PlaceholderShell, type PlannedFeature } from './PlaceholderShell';
import { getAdminStats } from '@/services/adminService';
import type { AdminStats } from '@/types/admin';

const FEATURES: PlannedFeature[] = [
  {
    label: 'Free / signed-up user list (the lead pool)',
    status: 'partial',
    detail:
      'Today: filter the Users tab for `account_type = free`. Phase 2 surfaces this as a dedicated tab with scoring.',
  },
  {
    label: 'Lead source attribution',
    status: 'planned',
    detail:
      'Tag where each lead came from: Whop, organic, affiliate code, campaign UTM, Hebrew mentorship referral, YouTube, Twitter.',
  },
  {
    label: 'Lead scoring (0-100)',
    status: 'planned',
    detail:
      'Composite score: pages visited, AI queries run, broker connection attempt, time spent, return visits.',
  },
  {
    label: 'Conversion funnel (Free → Trial → Paid)',
    status: 'partial',
    detail:
      'Today: `trialToPayingConversionRate` exists in Overview. Phase 2 adds full step-by-step drop-off view.',
  },
  {
    label: 'Cohort analysis by sign-up month',
    status: 'planned',
    detail: 'Track how each month\'s cohort converts and retains.',
  },
  {
    label: 'Lead → Paid time-to-convert distribution',
    status: 'planned',
  },
  {
    label: 'Bulk re-engagement campaigns (link to Communication tab)',
    status: 'planned',
  },
];

export function LeadsPlaceholder() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PlaceholderShell
      title="Leads & Funnel"
      subtitle="Track everyone who registered but hasn't paid yet — the real top of the funnel."
      icon={Sprout}
      phase={2}
      intro="Today FINOTAUR's free users are invisible in the admin view by design — the Users tab filters to Whop-verified subscribers only. That leaves the lead pool unmanaged. This tab will surface every signed-up user, score them by intent, and tag the source they came from, so you can run targeted re-engagement instead of guessing."
      features={FEATURES}
      liveData={
        error ? (
          <p className="text-sm text-red-400">Failed to load: {error}</p>
        ) : !stats ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <LiveStat label="Free users (lead pool)" value={stats.freeUsers} />
            <LiveStat label="Trial users" value={stats.trialUsers} />
            <LiveStat
              label="New this week"
              value={stats.newUsersThisWeek}
            />
            <LiveStat
              label="Free → Paid conversion"
              value={`${stats.freeToPayingConversionRate.toFixed(1)}%`}
            />
          </div>
        )
      }
      whyItMatters={
        <>
          Every free user is a paid customer who hasn't decided yet.
          The North Star is "paying customer + recurring revenue" —
          and the cheapest lever to pull is converting people already
          inside the product, not buying new traffic.
        </>
      }
    />
  );
}

function LiveStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-md p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-xl font-bold text-white mt-1">
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
      </p>
    </div>
  );
}
