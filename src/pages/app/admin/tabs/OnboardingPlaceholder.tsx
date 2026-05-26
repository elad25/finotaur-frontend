// src/pages/app/admin/tabs/OnboardingPlaceholder.tsx
// Tab 7 — Onboarding. Planned in Phase 3.
// References the now-removed OnboardingGuard / OnboardingWizard so future
// work can find them in git history.

import { Rocket } from 'lucide-react';
import { PlaceholderShell, type PlannedFeature } from './PlaceholderShell';

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
      'Most likely: first broker connected → first trade synced → first AI Stock Analyzer query. Lock the milestone before instrumenting.',
  },
  {
    label: 'Activation funnel — step drop-off chart',
    status: 'planned',
    detail:
      'Signup → email verified → onboarding step 1 → broker connect → first AI query → first journal trade → upgrade prompt.',
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
  return (
    <PlaceholderShell
      title="Onboarding"
      subtitle="Track activation milestones and find where new users get stuck."
      icon={Rocket}
      phase={3}
      intro="Onboarding is currently in flux — OnboardingGuard.tsx and OnboardingWizard.tsx exist in git history but were removed in the apex-oauth WIP. Phase 3 brings the flow back in a measurable form: every step is instrumented, drop-off shows up here, and we can compare retention between users who completed onboarding and users who skipped it. The end goal is shrinking time-to-value for paying customers."
      features={FEATURES}
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
