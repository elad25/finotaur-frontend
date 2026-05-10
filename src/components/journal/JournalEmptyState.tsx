import { Button } from '@/components/ds/Button';

type Variant = 'no-broker' | 'no-trades';

interface JournalEmptyStateProps {
  variant: Variant;
  onConnectBroker?: () => void;
}

const COPY: Record<Variant, { title: string; body: string; cta: string | null }> = {
  'no-broker': {
    title: 'Connect Tradovate to start',
    body: 'Once connected, your trades sync automatically every 5 minutes — no upload, no manual entry.',
    cta: 'Connect broker',
  },
  'no-trades': {
    title: 'Your first trade is on the way',
    body: 'Trades sync every 5 minutes. They will appear here as soon as Tradovate confirms.',
    cta: null,
  },
};

export function JournalEmptyState({ variant, onConnectBroker }: JournalEmptyStateProps) {
  const copy = COPY[variant];

  return (
    <div className="flex flex-col items-center justify-center py-ds-9 text-center">
      <h2 className="font-serif text-3xl text-ink-primary mb-ds-3">{copy.title}</h2>
      <p className="text-ink-secondary max-w-md mb-ds-5">{copy.body}</p>
      {copy.cta && onConnectBroker && (
        <Button variant="gold" size="lg" onClick={onConnectBroker}>
          {copy.cta}
        </Button>
      )}
    </div>
  );
}

export default JournalEmptyState;
