// src/pages/app/admin/tabs/OnboardingPlaceholder.tsx
// Tab 7 — Onboarding. Planned in Phase 3.
// Phase 2 enhancement: wire the activation snapshot we can already
// build from AdminStats so the page isn't a pure roadmap. The deeper
// funnel + per-user checklist still belong to Phase 3.

import { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';
import { PlaceholderShell, type PlannedFeature } from './PlaceholderShell';
import { getAdminStats } from '@/services/adminService';
import type { AdminStats } from '@/types/admin';

const FEATURES: PlannedFeature[] = [
  {
    label: 'Restore OnboardingGuard + OnboardingWizard',
    status: 'spec-ready',
    detail:
      'Both files were removed in the apex-oauth WIP branch — recover from git history and re-introduce as a controlled flow.',
  },
  {
    label: 'Define the Aha moment per persona',
    status: 'planned',
    detail:
      'Most likely: first broker connected -> first trade synced -> first AI Stock Analyzer query. Lock the milestone before instrumenting.',
  },
  {
    label: 'Activation funnel — step drop-off chart',
    status: 'planned',
    detail:
      'Signup -> email verified -> onboarding step 1 -> broker connect -> first AI query -> first journal trade -> upgrade prompt.',
  },
  {
    label: 'Time-to-Value distribution',
    status: 'planned',
    detail:
      'How long does it take a paid user to reach their Aha moment? Median + p90.',
  },
  {
    label: 'Per-user onboarding checklist (in-app)',
    status: 'planned',
    detail:
      'Visible to the user inside the app and to the admin in the User Details tab.',
  },
  {
    label: 'Welcome-series email drip (link to Communication tab)',
    status: 'partial',
    detail:
      'Resend integration already exists. Phase 3 wires it to a sequence triggered by signup + milestone events.',
  },
  {
    label: 'Cohort retention by onboarding completion',
    status: 'planned',
    detail:
      'Compare 30d / 60d / 90d retention for users who completed onboarding vs skipped it.',
  },
];

export function OnboardingPlaceholder() {
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
      title="Onboarding"
      subtitle="Track activation milestones and find where new users get stuck."
      icon={Rocket}
      phase={3}
      intro="Onboarding is currently in flux — OnboardingGuard.tsx and OnboardingWizard.tsx exist in git history but were removed in the apex-oauth WIP. Phase 3 brings the flow back in a measurable form: every step is instrumented, drop-off shows up here, and we can compare retention between users who completed onboarding and users who skipped it. The end goal is shrinking time-to-value for paying customers."
      features={FEATURES}
      liveData={
        error ? (
          <p className="text-sm text-red-400">Failed to load: {error}</p>
        ) : !stats ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              We can already see the top of the activation curve from
              {' '}<code className="text-[#D4AF37]">admin_get_stats</code>{' '}—
              full per-step drop-off needs the Phase 3 instrumentation.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <LiveStat label="New today" value={stats.newUsersToday} />
              <LiveStat label="New this week" value={stats.newUsersThisWeek} />
              <LiveStat label="New this month" value={stats.newUsersThisMonth} />
              <LiveStat label="Currently in trial" value={stats.trialUsers} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <LiveStat
                label="Trial -> Paid"
                value={`${stats.trialToPayingConversionRate.toFixed(1)}%`}
              />
              <LiveStat
                label="Avg trades / user"
                value={stats.averageTradesPerUser.toFixed(1)}
                hint="activation proxy"
              />
              <LiveStat
                label="Daily active users"
                value={stats.dailyActiveUsers}
              />
            </div>
          </div>
        )
      }
      whyItMatters={
        <>
          Tree #1 of the North Star is "Trade Journal + Copier" — a paying
          user has to connect a broker, see their trades, and trust the
          journal within 24-48 hours. Onboarding is the layer that makes
          that happen reliably instead of by accident. Right now we don't
          know which step kills new users, because we don't instrument any
          of them.
        </>
      }
    />
  );
}

function LiveStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-md p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-xl font-bold text-white mt-1">
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
      </p>
      {hint && <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>}
    </div>
  );
}
