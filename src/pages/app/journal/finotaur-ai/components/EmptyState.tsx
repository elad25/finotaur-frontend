// src/pages/app/journal/finotaur-ai/components/EmptyState.tsx
// Zero-trades state — shown when total_trades === 0 or score is null.
// No API calls in this component.

import * as React from 'react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';

export function EmptyState() {
  return (
    <Card variant="default" padding="spacious">
      <h2 className="font-sans text-h3 font-medium text-ink-primary">No trades yet</h2>
      <p className="mt-ds-2 font-sans text-body text-ink-secondary max-w-prose">
        Add at least 10 closed trades in the last 30 days to unlock your FINOTAUR Score and AI coaching.
      </p>
      <div className="mt-ds-5 flex flex-wrap gap-ds-3">
        <Button variant="gold" size="default" asChild>
          <a href="/app/journal/new">Add a trade</a>
        </Button>
        <Button variant="goldOutline" size="default" asChild>
          <a href="/app/journal/settings">Connect broker</a>
        </Button>
      </div>
    </Card>
  );
}
