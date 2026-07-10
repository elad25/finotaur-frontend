// src/components/routes/JournalFeatureGate.tsx
// =====================================================
// 🔒 JOURNAL FEATURE GATE — Free-tier PREVIEW mode
// =====================================================
// FREE-plan journal users get the real premium feature (Shadow / Revenge
// Radar / Trade Copier / Risk Management) filled with sample/demo data,
// under a persistent gold banner explaining it's a preview. The route
// stays reachable and the sidebar entry stays visible — this is a
// content-level gate, not a route-level one (that's what JournalRoute
// already handles for premiumOnly routes).
//
// Data hooks (useTradesData, useCopierDemoMode, PropRiskPage, ...) read
// isPreview via useJournalPreview() and substitute demo data accordingly.
//
// Paid / basic / trial / admin users pass straight through to children —
// completely unchanged, no banner, no context flip.
// =====================================================

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { Button } from '@/components/ds/Button';
import { JournalPreviewContext } from '@/contexts/JournalPreviewContext';

type GatedFeature = 'shadow' | 'revenge-radar' | 'trade-copier' | 'risk-management' | 'ai-summary';

interface JournalFeatureGateProps {
  feature: GatedFeature;
  children: ReactNode;
}

interface FeatureCopy {
  title: string;
}

const FEATURE_COPY: Record<GatedFeature, FeatureCopy> = {
  shadow: {
    title: 'Shadow — What-If Analysis',
  },
  'revenge-radar': {
    title: 'Revenge Radar',
  },
  'trade-copier': {
    title: 'Trade Copier',
  },
  'risk-management': {
    title: 'Risk Management',
  },
  'ai-summary': {
    title: 'AI Summary — Leak Detector',
  },
};

function PreviewBanner({ feature }: { feature: GatedFeature }) {
  const navigate = useNavigate();
  const copy = FEATURE_COPY[feature];

  return (
    <div className="w-full border-b border-gold-primary/20 bg-gold-primary/10 px-4 py-2.5 flex flex-wrap items-center justify-center gap-3 text-center">
      <p className="text-xs md:text-sm text-ink-secondary">
        <span className="font-semibold text-gold-primary">{copy.title} — Preview</span>
        {" · You're viewing sample data. This is a paid feature — live data requires a broker connection."}
      </p>
      <Button variant="gold" size="sm" onClick={() => navigate('/app/upgrade')}>
        Upgrade to unlock
      </Button>
    </div>
  );
}

export function JournalFeatureGate({ feature, children }: JournalFeatureGateProps) {
  const { isFreeJournal, isLoading } = useSubscription();

  // Loading — reuse the same fallback JournalRoute uses so the transition
  // into a gated feature never flashes an unstyled/blank frame.
  if (isLoading) {
    return <RouteSkeleton />;
  }

  if (!isFreeJournal) {
    return <>{children}</>;
  }

  return (
    <JournalPreviewContext.Provider value={{ isPreview: true }}>
      <PreviewBanner feature={feature} />
      {children}
    </JournalPreviewContext.Provider>
  );
}

export default JournalFeatureGate;
