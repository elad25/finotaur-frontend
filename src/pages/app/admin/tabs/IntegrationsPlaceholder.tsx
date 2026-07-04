// src/pages/app/admin/tabs/IntegrationsPlaceholder.tsx
// ============================================
// Integrations — every external system FINOTAUR talks to.
// Phase 2: live health snapshot from existing RPCs + Matan dashboard
// quick-link to the finotaur-marketing project.
// ============================================

import { useEffect, useState } from 'react';
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Megaphone,
} from 'lucide-react';
import { PlaceholderShell, type PlannedFeature } from './PlaceholderShell';
import {
  getSubscriberStats,
  getAdminStats,
} from '@/services/adminService';
import type { SubscriberStats, AdminStats } from '@/types/admin';

type IntegrationStatus = 'live' | 'partial' | 'planned';

interface Integration {
  name: string;
  purpose: string;
  status: IntegrationStatus;
  note: string;
  url?: string;
}

const MARKETING_DASHBOARD_URL =
  (import.meta.env.VITE_MARKETING_DASHBOARD_URL as string | undefined) ??
  'http://localhost:4747';

const INTEGRATIONS: Integration[] = [
  {
    name: 'Whop',
    purpose: 'Subscription billing + entitlements',
    status: 'live',
    note: 'Webhook-driven, subscribers list filters by whop_membership_id.',
  },
  {
    name: 'Resend',
    purpose: 'Transactional + marketing email',
    status: 'live',
    note: 'Already used for password reset + invoices. Templates UI is Phase 2.',
  },
  {
    name: 'Supabase',
    purpose: 'Auth + Postgres + Edge Functions',
    status: 'live',
    note: 'The CRM itself reads from Supabase RPCs. No new wiring needed.',
  },
  {
    name: 'PostHog / GA4',
    purpose: 'Product analytics (consent-gated)',
    status: 'partial',
    note: 'Boots after cookie consent. Phase 5 adds the dashboard surface here.',
  },
  {
    name: 'Slack',
    purpose: 'Admin alerts (new $109 signup, churn risk spike, deploy)',
    status: 'planned',
    note: 'Webhook in Slack workspace -> server-side proxy -> channel.',
  },
  {
    name: 'Discord',
    purpose: 'Community + alerts',
    status: 'planned',
    note: 'Mirror of Slack alerts to the FINOTAUR Discord ops channel.',
  },
  {
    name: 'WhatsApp Business',
    purpose: 'Hebrew-speaking mentorship cohort',
    status: 'planned',
    note: 'Bulk + 1:1 messaging to Israeli paying customers.',
  },
  {
    name: 'Mixpanel (optional)',
    purpose: 'Cohort funnels at the user level',
    status: 'planned',
    note: 'Only adopt if PostHog gaps surface — avoid double-paying.',
  },
];

const FEATURES: PlannedFeature[] = [
  {
    label: 'Per-integration health pings',
    status: 'planned',
    detail: 'Last successful event timestamp, last failure, error rate.',
  },
  {
    label: 'One-click "send test event"',
    status: 'planned',
    detail: 'Verifies the integration without touching production data.',
  },
  {
    label: 'Webhook event log viewer',
    status: 'planned',
    detail: 'Last 100 Whop / Resend / Slack events with payload preview.',
  },
  {
    label: 'Secret rotation dashboard',
    status: 'planned',
    detail:
      'Surfaces age of each API key and prompts rotation. Never displays the secret value (per Lesson 10).',
  },
  {
    label: 'Per-environment toggles (dev / staging / prod)',
    status: 'planned',
  },
];

const STATUS_META: Record<
  IntegrationStatus,
  { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }
> = {
  live: { icon: CheckCircle2, cls: 'text-green-500', label: 'Live' },
  partial: { icon: AlertCircle, cls: 'text-yellow-500', label: 'Partial' },
  planned: { icon: Clock, cls: 'text-gray-500', label: 'Planned' },
};

interface LiveSnapshot {
  whopSubscribers: number;
  newWhopThisMonth: number;
  totalUsers: number;
  activeUsers: number;
}

export function IntegrationsPlaceholder() {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [subStats, adminStats] = await Promise.all([
          getSubscriberStats() as Promise<SubscriberStats>,
          getAdminStats() as Promise<AdminStats>,
        ]);
        if (cancelled) return;
        setSnapshot({
          whopSubscribers: subStats.activeSubscribers,
          newWhopThisMonth: subStats.newSubscribersThisMonth,
          totalUsers: adminStats.totalUsers,
          activeUsers: adminStats.activeUsers,
        });
      } catch (err) {
        if (cancelled) return;
        console.error('[IntegrationsPlaceholder] snapshot load failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PlaceholderShell
      title="Integrations"
      subtitle="Every external system FINOTAUR talks to, in one health view."
      icon={Plug}
      phase={5}
      intro="The platform already integrates with Whop, Resend, and Supabase in production. Phase 5 surfaces all of them here with health pings, recent event logs, and one-click test invocations — so when something silently breaks (cron failing, webhook 401, expired token), it's visible at a glance instead of buried in server logs."
      features={FEATURES}
      liveData={
        <div className="space-y-4 -mx-6">
          {/* Marketing dashboard quick-link card */}
          <div className="px-6">
            <a
              href={MARKETING_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#D4AF37]/[0.06] border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 rounded-lg p-4 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">
                      Matan Dashboard
                    </span>
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-[#D4AF37]">
                      External
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Marketing operations control plane — campaign performance,
                    ad spend, landing-page experiments. Lives in the
                    {' '}<code className="text-[#D4AF37] text-[10px]">../finotaur-marketing</code>{' '}
                    project.
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-[#D4AF37]/80 mt-2 group-hover:text-[#D4AF37]">
                    <span>{MARKETING_DASHBOARD_URL}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </a>
          </div>

          {/* Whop live snapshot — pulls from existing RPCs */}
          {snapshot && (
            <div className="px-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SnapshotCard
                label="Whop subscribers"
                value={snapshot.whopSubscribers.toLocaleString('en-US')}
                hint="active billing"
              />
              <SnapshotCard
                label="New this month"
                value={snapshot.newWhopThisMonth.toLocaleString('en-US')}
                hint="via Whop webhook"
              />
              <SnapshotCard
                label="Supabase users"
                value={snapshot.totalUsers.toLocaleString('en-US')}
                hint="auth.users total"
              />
              <SnapshotCard
                label="Active (30d)"
                value={snapshot.activeUsers.toLocaleString('en-US')}
                hint="last_login window"
              />
            </div>
          )}

          {/* Existing list */}
          <ul className="divide-y divide-gray-800">
            {INTEGRATIONS.map((integration) => {
              const meta = STATUS_META[integration.status];
              const StatusIcon = meta.icon;
              return (
                <li
                  key={integration.name}
                  className="px-6 py-3 flex items-start gap-3"
                >
                  <StatusIcon className={`w-4 h-4 shrink-0 mt-0.5 ${meta.cls}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">
                        {integration.name}
                      </span>
                      <span className="text-gray-500 text-xs">·</span>
                      <span className="text-gray-400 text-xs">
                        {integration.purpose}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wide font-semibold ml-auto ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {integration.note}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      }
      whyItMatters={
        <>
          The cron-failed-silently-for-6-weeks incident (Lesson 9) happened
          because no human ever looked at the health of an integration after
          the original wiring. This tab is the antidote — a single place to
          see "is everything still talking?" without grep-ing logs.
        </>
      }
    />
  );
}

function SnapshotCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-[#0E0E0E] border border-gray-800 rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-lg font-semibold text-white mt-1">{value}</div>
      <div className="text-[10px] text-gray-600 mt-0.5">{hint}</div>
    </div>
  );
}
