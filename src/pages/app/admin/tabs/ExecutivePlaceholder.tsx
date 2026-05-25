// src/pages/app/admin/tabs/ExecutivePlaceholder.tsx
// Tab 12 — Executive Dashboard. Planned in Phase 5.
// Extension of the Phase-0 Overview with forecasting + anomaly detection.

import { TrendingUp } from 'lucide-react';
import { PlaceholderShell, type PlannedFeature } from './PlaceholderShell';

const FEATURES: PlannedFeature[] = [
  {
    label: 'MRR / ARR / Active-user 30-day forecast',
    status: 'planned',
    detail:
      'Linear + seasonal trend on recent values. Confidence band, not a single number.',
  },
  {
    label: 'Anomaly alerts',
    status: 'planned',
    detail:
      'Flag week-over-week swings beyond ±20%: signup spikes, AI cost spikes, churn spikes, support volume spikes.',
  },
  {
    label: 'Goal progress vs target',
    status: 'planned',
    detail:
      'Manually set a quarterly MRR / paying-user goal; track delta in real time.',
  },
  {
    label: 'Per-feature cost vs revenue ratio',
    status: 'planned',
    detail:
      'Polygon, Perplexity, OpenAI, Anthropic — what each user is costing in API spend vs what they pay.',
  },
  {
    label: 'Health-Score distribution (depends on Users tab Phase 1.5)',
    status: 'planned',
    detail:
      'How many users are At-Risk, Power-User, VIP today? Trend over time.',
  },
  {
    label: 'Today\'s priorities ("if you read one thing")',
    status: 'planned',
    detail:
      'A 3-bullet summary at the top of the page generated from the above signals.',
  },
];

export function ExecutivePlaceholder() {
  return (
    <PlaceholderShell
      title="Executive Dashboard"
      subtitle="The one screen to read on a Monday morning before deciding what to work on."
      icon={TrendingUp}
      phase={5}
      intro="The Overview tab answers 'what is true right now?'. The Executive Dashboard will answer 'what is changing, and what should I do about it?'. It wraps forecasting, anomaly detection, goal tracking, and per-feature cost/revenue around the same data — the goal is to never need to dig through tabs to know whether the business is in trouble or accelerating."
      features={FEATURES}
      whyItMatters={
        <>
          Solo founders run out of attention before they run out of work.
          The Executive Dashboard exists so that 5 minutes of reading
          replaces 30 minutes of grepping dashboards. If a metric isn't
          screaming for attention, the page should be quiet — and when it
          isn't quiet, the user should know exactly what to do next.
        </>
      }
    />
  );
}
