// src/pages/app/admin/tabs/IntegrationsPlaceholder.tsx
// Tab 10 — Integrations. Planned in Phase 5.
// Shows what's already wired (Whop, Resend) and what's planned (Slack,
// Discord, WhatsApp, optional analytics).

import { Plug, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { PlaceholderShell, type PlannedFeature } from './PlaceholderShell';

type IntegrationStatus = 'live' | 'partial' | 'planned';

interface Integration {
  name: string;
  purpose: string;
  status: IntegrationStatus;
  note: string;
}

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
    note: 'Webhook in Slack workspace → server-side proxy → channel.',
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

export function IntegrationsPlaceholder() {
  return (
    <PlaceholderShell
      title="Integrations"
      subtitle="Every external system FINOTAUR talks to, in one health view."
      icon={Plug}
      phase={5}
      intro="The platform already integrates with Whop, Resend, and Supabase in production. Phase 5 surfaces all of them here with health pings, recent event logs, and one-click test invocations — so when something silently breaks (cron failing, webhook 401, expired token), it's visible at a glance instead of buried in server logs."
      features={FEATURES}
      liveData={
        <ul className="divide-y divide-gray-800 -mx-6">
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
