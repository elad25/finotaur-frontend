import { Button } from '@/components/ds/Button';

type Variant = 'no-broker' | 'no-trades';

interface JournalEmptyStateProps {
  variant: Variant;
  /** Free path — opens manual trade entry. Required for no-broker variant. */
  onAddManualTrade?: () => void;
  /** Premium path — opens broker connection modal (Tradovate auto-sync). */
  onConnectBroker?: () => void;
}

/**
 * Journal empty-state component.
 *
 * The no-broker variant leads with a single CTA — "Connect broker" — which
 * opens the broker connection modal (Tradovate auto-sync). Manual trade
 * entry still exists elsewhere in the journal, but the first-run empty state
 * now points users to the broker connection as the primary path.
 *
 * `onAddManualTrade` is retained on the props for backward compatibility but
 * is no longer rendered here.
 */
export function JournalEmptyState({
  variant,
  onConnectBroker,
}: JournalEmptyStateProps) {
  if (variant === 'no-trades') {
    return (
      <div className="flex flex-col items-center justify-center py-ds-9 text-center">
        <h2 className="font-serif text-3xl text-ink-primary mb-ds-3">
          Your first trade is on the way
        </h2>
        <p className="text-ink-secondary max-w-md mb-ds-5">
          Trades sync every 5 minutes. They will appear here as soon as
          Tradovate confirms.
        </p>
      </div>
    );
  }

  // no-broker variant — Free-friendly: manual first, broker second.
  return (
    <div className="flex flex-col items-center justify-center py-ds-9 text-center">
      <img
        src="/logo.png"
        alt="FINOTAUR"
        className="h-32 w-auto mb-ds-5"
        style={{
          maskImage:
            'radial-gradient(ellipse at center, black 55%, transparent 90%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 55%, transparent 90%)',
        }}
      />
      <h2 className="font-serif text-3xl text-ink-primary mb-ds-3">
        FINOTAUR · Trading Journal
      </h2>
      <p className="text-ink-secondary max-w-md mb-ds-5">
        Connect your broker to sync every trade automatically — your journal
        fills itself and stays up to date every 5 minutes.
      </p>

      <div className="flex flex-col items-center gap-ds-3 mb-ds-5">
        {onConnectBroker && (
          <Button variant="gold" size="lg" onClick={onConnectBroker}>
            Connect broker
          </Button>
        )}
      </div>

      <p className="text-xs text-ink-tertiary max-w-md">
        Free: 15 lifetime trades · Premium: unlimited journal + backtest +
        trade copier + AI
      </p>
    </div>
  );
}

export default JournalEmptyState;
