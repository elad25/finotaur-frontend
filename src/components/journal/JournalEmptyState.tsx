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
 * Free users (no subscription) get 15 lifetime trades — added manually via
 * "Add your first trade". Basic ($19.99/mo) gets 25/month and can connect
 * a broker for auto-sync. Premium ($39.99/mo) gets unlimited + backtest +
 * trade copier. Tradovate auto-sync is gated to paid tiers; the manual
 * journal stays open to everyone.
 *
 * The no-broker variant therefore leads with the manual path (gold CTA,
 * works for every tier) and offers Tradovate as a secondary upgrade path.
 */
export function JournalEmptyState({
  variant,
  onAddManualTrade,
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
        Add trades manually to start tracking your performance — no broker
        required. Or connect Tradovate to sync automatically every 5 minutes.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-ds-3 mb-ds-5">
        {onAddManualTrade && (
          <Button variant="gold" size="lg" onClick={onAddManualTrade}>
            Add your first trade
          </Button>
        )}
        {onConnectBroker && (
          <button
            type="button"
            onClick={onConnectBroker}
            className="text-sm text-ink-secondary hover:text-ink-primary underline underline-offset-4 transition-colors"
          >
            Or connect Tradovate (auto-sync)
          </button>
        )}
      </div>

      <p className="text-xs text-ink-tertiary max-w-md">
        Free: 15 lifetime trades · Basic: 25 / month · Premium: unlimited +
        backtest + trade copier
      </p>
    </div>
  );
}

export default JournalEmptyState;
