// src/pages/app/journal/finotaur-ai/components/UpsellGate.tsx
// Free-tier gate — zero API calls. Pure static UI.
// One gold CTA max (upgrade). No green. Sentence case CTAs.

import * as React from 'react';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';

export function UpsellGate() {
  return (
    <Card variant="featured" padding="spacious" className="max-w-2xl">
      <Eyebrow>AI COACH</Eyebrow>

      <h2 className="mt-ds-3 font-sans text-h2 font-medium text-ink-primary">
        Your AI Trading Coach
      </h2>

      <div className="mt-ds-3 flex flex-col gap-ds-2">
        <p className="font-sans text-body text-ink-secondary">
          Premium members get a personalized FINOTAUR Score — a single number that
          distills your win rate, risk management, consistency, and recovery into one
          performance benchmark that improves every session.
        </p>
        <p className="font-sans text-body text-ink-secondary">
          Your AI coach reviews every trade, spots recurring patterns, and delivers
          daily briefings with ranked insights — telling you what to work on first,
          not just what happened. It can propose trade edits, add missing context, and
          update your journal with your confirmation.
        </p>
        <p className="font-sans text-body text-ink-secondary">
          No guesswork. No noise. A coach that learns your edge and holds you to it.
        </p>
      </div>

      <div className="mt-ds-6">
        <Button variant="gold" size="default" asChild>
          <a href="/pricing">Upgrade to Premium</a>
        </Button>
      </div>

      <p className="mt-ds-3 font-sans text-small text-ink-tertiary">
        Cancel anytime. 14-day money back guarantee.
      </p>
    </Card>
  );
}
