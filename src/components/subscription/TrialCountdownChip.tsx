// src/components/subscription/TrialCountdownChip.tsx
// =====================================================
// Compact TopNav pill showing the app-granted 14-day trial countdown.
// Rendered only for isAppTrial users. Subtle gold-outline while there's
// plenty of runway left; gold-filled emphasis once the trial is about to
// end, matching the SubscriptionBadge / PromoOfferChip gold design tokens.
// =====================================================

import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

export function TrialCountdownChip() {
  const navigate = useNavigate();
  const { isAppTrial, appTrialDaysRemaining } = useSubscription();

  if (!isAppTrial) return null;

  const daysLeft = appTrialDaysRemaining ?? 0;
  const isUrgent = daysLeft <= 3;
  const label = daysLeft <= 0 ? 'Trial · ends today' : `Trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

  return (
    <button
      type="button"
      onClick={() => navigate('/app/upgrade')}
      aria-label={`${label} — click to upgrade`}
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-transform hover:scale-[1.02]"
      style={
        isUrgent
          ? {
              backgroundImage: 'linear-gradient(135deg, #F4D97B 0%, #C9A646 50%, #A88838 100%)',
              color: '#1A1A1A',
              boxShadow: '0 2px 10px rgba(201,166,70,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
            }
          : {
              color: '#E8C766',
              background: 'rgba(201,166,70,0.08)',
              border: '1px solid rgba(201,166,70,0.35)',
            }
      }
    >
      <Clock className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export default TrialCountdownChip;
