// ============================================================
// src/pages/app/forex/components/ForexUpsellGate.tsx
// Premium paywall for advanced forex features.
// Zero API calls — pure static UI. Gold-on-black, English only.
// ============================================================

import { ArrowRight, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';

interface ForexUpsellGateProps {
  feature?: string;
}

export default function ForexUpsellGate({ feature }: ForexUpsellGateProps) {
  const heading = feature ? feature : 'Advanced Forex Analysis';

  return (
    <Card variant="featured" padding="spacious">
      {/* Heading */}
      <div className="flex items-center gap-ds-3">
        <Crown className="h-6 w-6 text-gold-primary shrink-0" />
        <h2 className="text-h2 font-semibold text-ink-primary">{heading}</h2>
      </div>
      <div className="mt-ds-2 h-[3px] w-12 rounded-full bg-gold-primary" />

      {/* Description */}
      <p className="mt-ds-4 text-body leading-relaxed text-ink-secondary">
        Unlock central-bank rate tracking, COT positioning, correlation analysis,
        and AI macro cockpits with{' '}
        <span className="font-medium text-gold-primary">FINOTAUR Premium</span>.
      </p>

      {/* CTA */}
      <div className="mt-ds-6">
        <Button variant="gold" size="default" asChild>
          <Link to="/pricing" className="inline-flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Upgrade to Premium
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
