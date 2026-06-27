// src/features/automation/components/CopierPremiumGate.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wraps any automation tab. If the user is not Premium, shows a branded
// lock panel instead of the tab content.
// Gold #C9A646 + zinc palette to match AutomationShell / AgentStatusTab.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ds/Button';

interface CopierPremiumGateProps {
  children: React.ReactNode;
}

export function CopierPremiumGate({ children }: CopierPremiumGateProps) {
  const { isPremium, isLoading } = useSubscription();
  const navigate = useNavigate();

  // While the subscription status is resolving, render nothing (avoids flash).
  if (isLoading) return null;

  // Premium (and admin / lifetime, which isPremium covers) — pass through.
  if (isPremium) return <>{children}</>;

  // Non-premium: branded lock panel.
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
          Upgrade to Premium to connect the desktop agent and copy your trades across
          accounts.
        </p>
      </div>

      {/* gold CTA — same destination as UpgradeLimitDialog */}
      <Button
        variant="gold"
        size="default"
        showArrow={false}
        onClick={() => navigate('/app/journal/pricing')}
      >
        Upgrade to Premium
      </Button>
    </div>
  );
}

export default CopierPremiumGate;
