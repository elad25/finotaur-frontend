import * as React from 'react';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import type { PendingToolCall } from '../types';

interface ToolCallCardProps {
  pendingToolCall: PendingToolCall;
  onReview: (p: PendingToolCall) => void;
  onDiscard: () => void;
}

export default function ToolCallCard({
  pendingToolCall,
  onReview,
  onDiscard,
}: ToolCallCardProps): JSX.Element {
  return (
    <Card
      variant="default"
      padding="compact"
      className="border-l-2 border-l-gold-primary p-ds-4"
    >
      {/* Top row: eyebrow + summary */}
      <div className="flex flex-col gap-ds-2 mb-ds-3">
        <Eyebrow>AI proposes</Eyebrow>
        <p className="text-sm text-ink-primary">{pendingToolCall.summary}</p>
      </div>

      {/* Bottom row: actions right-aligned */}
      <div className="flex justify-end items-center gap-ds-2">
        <Button
          variant="ghost"
          size="compact"
          showArrow={false}
          onClick={onDiscard}
        >
          Discard
        </Button>
        <Button
          variant="goldOutline"
          size="compact"
          showArrow={false}
          onClick={() => onReview(pendingToolCall)}
        >
          Review
        </Button>
      </div>
    </Card>
  );
}
