// src/components/routes/JournalFeatureGate.tsx
// =====================================================
// 🔒 JOURNAL FEATURE GATE — Free-tier lockdown
// =====================================================
// Blocks FREE-plan journal users from specific premium journal features
// (Shadow / Revenge Radar) with a full-page upsell rendered IN PLACE of
// the feature. The route itself stays reachable and the sidebar entry
// stays visible — this is a content-level gate, not a route-level one
// (that's what JournalRoute already handles for premiumOnly routes).
//
// Paid / basic / trial / admin users pass straight through to children.
// =====================================================

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, GitCompare, Flame, Check } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { Button } from '@/components/ds/Button';

type GatedFeature = 'shadow' | 'revenge-radar';

interface JournalFeatureGateProps {
  feature: GatedFeature;
  children: ReactNode;
}

interface FeatureCopy {
  icon: typeof GitCompare;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
}

const FEATURE_COPY: Record<GatedFeature, FeatureCopy> = {
  shadow: {
    icon: GitCompare,
    title: 'Shadow — What-If Analysis',
    description: 'Replay your trades with different exits and sizing to see the true cost of your decisions.',
    bullets: [
      'Replay any closed trade with a different exit or position size',
      'See the P&L you left on the table — or avoided losing',
      'Turn hindsight into a repeatable rule for your next trade',
    ],
    cta: 'Upgrade to unlock Shadow',
  },
  'revenge-radar': {
    icon: Flame,
    title: 'Revenge Radar',
    description: 'Automatically detect revenge-trading patterns before they wreck your account.',
    bullets: [
      'Flags clusters of trades taken right after a loss',
      'Shows exactly what revenge trading has cost you in real dollars',
      'Builds the self-awareness to break the cycle',
    ],
    cta: 'Upgrade to unlock Revenge Radar',
  },
};

export function JournalFeatureGate({ feature, children }: JournalFeatureGateProps) {
  const navigate = useNavigate();
  const { isFreeJournal, isLoading } = useSubscription();

  // Loading — reuse the same fallback JournalRoute uses so the transition
  // into a gated feature never flashes an unstyled/blank frame.
  if (isLoading) {
    return <RouteSkeleton />;
  }

  if (!isFreeJournal) {
    return <>{children}</>;
  }

  const copy = FEATURE_COPY[feature];
  const Icon = copy.icon;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full text-center">
        <div
          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
            border: '1px solid rgba(201,166,70,0.3)',
          }}
        >
          <Icon className="w-8 h-8" style={{ color: '#C9A646' }} />
          <div
            className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: '#0A0A0A',
              border: '1px solid rgba(201,166,70,0.4)',
            }}
          >
            <Lock className="w-3 h-3" style={{ color: '#C9A646' }} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">{copy.title}</h2>
        <p className="text-[#8B8B8B] text-sm mb-6">{copy.description}</p>

        <ul className="space-y-3 mb-8 text-left inline-block">
          {copy.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div
                className="w-4 h-4 rounded-full bg-[#C9A646]/15 flex items-center justify-center shrink-0 mt-0.5"
                style={{ border: '1px solid rgba(201,166,70,0.3)' }}
              >
                <Check className="h-2.5 w-2.5 text-[#C9A646]" />
              </div>
              <span className="text-sm text-[#D4C9A8] leading-tight">{bullet}</span>
            </li>
          ))}
        </ul>

        <div>
          <Button variant="gold" size="lg" onClick={() => navigate('/app/upgrade')}>
            {copy.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default JournalFeatureGate;
