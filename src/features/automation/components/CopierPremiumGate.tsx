// src/features/automation/components/CopierPremiumGate.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wraps any automation tab. Access model (GA 2026-07-03):
//   • Premium / admin / vip — full access, no limit.
//   • Free — trial of FREE_COPIER_TRADE_LIMIT mirrored executions; while the
//     trial lasts the tab renders with a usage banner, once exhausted the
//     branded Premium lock panel replaces the content.
// UX gate only — the hard stop is the DB trigger that disables
// automation_settings.master_enabled at the limit.
// Gold #C9A646 + zinc palette to match AutomationShell / AgentStatusTab.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useCopierTrial } from '@/features/automation/hooks/useCopierTrial';
import { Button } from '@/components/ds/Button';

interface CopierPremiumGateProps {
  children: React.ReactNode;
}

export function CopierPremiumGate({ children }: CopierPremiumGateProps) {
  const { isPremium, isLoading } = useSubscription();
  const trial = useCopierTrial();
  const navigate = useNavigate();

  // While the subscription status is resolving, render nothing (avoids flash).
  if (isLoading || trial.isLoading) return null;

  // Premium (and admin / lifetime, which isPremium covers) — pass through.
  if (isPremium) return <>{children}</>;

  // Free user inside the trial — render the tab with a usage banner on top.
  if (!trial.exhausted) {
    return (
      <>
        <div className="flex items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-lg bg-[#C9A646]/8 border border-[#C9A646]/20">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Zap className="h-4 w-4 text-[#C9A646]" aria-hidden="true" />
            <span>
              Free trial: <span className="font-semibold text-zinc-100">{trial.used} / {trial.limit}</span> copied
              trades used. Upgrade to Premium for unlimited copying.
            </span>
          </div>
          <Button variant="gold" size="sm" showArrow={false} onClick={() => navigate('/app/upgrade')}>
            Upgrade
          </Button>
        </div>
        {children}
      </>
    );
  }

  // Free user, trial exhausted: branded lock panel.
  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] gap-6 py-12">
      {/* lock icon badge */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30">
        <Lock className="h-6 w-6 text-[#C9A646]" aria-hidden="true" />
      </div>

      {/* copy */}
      <div className="text-center space-y-2 max-w-xs">
        <p className="text-base font-semibold text-zinc-100">
          Trade Copier is a Premium feature
        </p>
        <p className="text-sm text-zinc-500 leading-relaxed">
          You&apos;ve used all {trial.limit} free copied trades. Upgrade to Premium to
          keep copying your trades across accounts.
        </p>
      </div>

      {/* gold CTA — same destination as UpgradeLimitDialog */}
      <Button
        variant="gold"
        size="default"
        showArrow={false}
        onClick={() => navigate('/app/upgrade')}
      >
        Upgrade to Premium
      </Button>
    </div>
  );
}

export default CopierPremiumGate;
