// src/components/broker/AddBrokerPopup.tsx
// Premium broker connection modal for the journal dashboard.

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Brain,
  Check,
  ExternalLink,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { BROKER_CONFIGS, BrokerName } from '@/lib/brokers/types';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { useTradovate } from '@/hooks/useTradovate';
import BinanceConnectionPopup from '@/components/brokers/BinanceConnectionPopup';
import { UpgradeLimitDialog } from '@/components/upgrade/UpgradeLimitDialog';

const CONNECTION_NAME_MAX = 32;
const NINJATRADER_AFFILIATE_URL = 'https://ninjatraderdomesticvendor.sjv.io/c/7301959/3069488/37581';

const STRIP_BROKERS: BrokerName[] = [
  'tradovate',
  'ninja_trader',
  'mt5',
  'interactive_brokers',
  'tradingview',
  'binance',
];

// NinjaTrader Web accounts run on Tradovate cloud (post-2022 acquisition),
// so we route the NinjaTrader credentials form through the same Tradovate
// edge function. From the user's perspective the two tiles behave the same.
const TRADOVATE_AUTH_BROKERS: BrokerName[] = ['tradovate', 'ninja_trader'];

const BROKER_MARKS: Partial<Record<BrokerName, string>> = {
  tradovate: '/brokers/tradovate-mark.svg',
  ninja_trader: '/brokers/ninjatrader-mark.svg',
  mt5: '/brokers/metatrader5-mark.svg',
  interactive_brokers: '/brokers/ibkr-mark.svg',
  tradingview: '/brokers/tradingview-mark.svg',
  binance: '/brokers/binance.svg',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the user is redirected here after a successful OAuth round-trip
   *  instead of landing on /app/journal/overview. Must start with /app/. */
  returnTo?: string;
  /** Called instead of starting a connect flow when a FREE-plan user (who may
   *  not connect a broker at all) reaches the Connect button. If omitted, the
   *  popup closes itself and shows its own upgrade dialog. */
  onUpgradeRequired?: () => void;
}

function BrokerMark({ broker }: { broker: BrokerName }) {
  const config = BROKER_CONFIGS[broker];
  const [errored, setErrored] = useState(false);
  const mark = BROKER_MARKS[broker] ?? config.logo;

  if (errored || !mark) {
    return (
      <div
        className="flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold"
        style={{ background: `${config.color}1f`, color: config.color }}
      >
        {config.displayName.substring(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={mark}
      alt={config.displayName}
      className="h-8 w-8 object-contain"
      onError={() => setErrored(true)}
    />
  );
}

function BrokerTile({
  broker,
  selected,
  onSelect,
}: {
  broker: BrokerName;
  selected: boolean;
  onSelect: () => void;
}) {
  const config = BROKER_CONFIGS[broker];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'relative flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-[9px] border px-1.5 py-2',
        'bg-[#0A0A0A]/80 text-center transition-all duration-200',
        selected
          ? 'border-[#C9A646] shadow-[0_0_26px_rgba(201,166,70,0.24)]'
          : 'border-[#C9A646]/15 hover:border-[#C9A646]/35 hover:bg-[#C9A646]/[0.035]',
      ].join(' ')}
      aria-pressed={selected}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-gold text-ink-on-gold shadow-btn-gold">
          <Check className="h-3 w-3" />
        </span>
      )}
      <div className="flex h-8 w-full items-center justify-center">
        <BrokerMark broker={broker} />
      </div>
      <div className="flex min-h-[24px] items-center text-[11px] font-semibold leading-tight text-ink-primary">
        {config.displayName === 'Interactive Brokers' ? 'Interactive Brokers' : config.displayName}
      </div>
      <span
        className={[
          'rounded-sm border px-2 py-0.5 text-[8px] uppercase tracking-wider',
          selected
            ? 'border-[#C9A646]/45 bg-[#C9A646]/10 text-[#E8C766]'
            : 'border-white/10 bg-white/[0.025] text-ink-secondary',
        ].join(' ')}
      >
        Live
      </span>
    </button>
  );
}

function SecurityCard({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[9px] border border-[#C9A646]/15 bg-[#0A0A0A]/55 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mx-auto mb-1 flex h-5 w-5 items-center justify-center text-[#E8C766]">
        {icon}
      </div>
      <h4 className="text-[10px] font-medium leading-tight text-ink-primary">{title}</h4>
    </div>
  );
}

export default function AddBrokerPopup({ open, onOpenChange, returnTo, onUpgradeRequired }: Props) {
  const { user } = useAuth();
  const { isLoading } = useTradovate();
  // Defensive gate: FREE-plan users may not connect a broker at all. The
  // primary gate lives in the caller (Overview.tsx openAddBrokerPopup), but
  // this popup can also be opened via other entry points (e.g. the legacy
  // Tradovate-modal handoff), so re-check here before any connect flow starts.
  const { isFreeJournal } = useSubscription();

  const [selectedBroker, setSelectedBroker] = useState<BrokerName>('tradovate');
  const [connectionName, setConnectionName] = useState('');
  const [error, setError] = useState('');
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [showBinancePopup, setShowBinancePopup] = useState(false);
  // Self-contained fallback dialog, used only when the caller doesn't pass
  // onUpgradeRequired.
  const [showUpgradeFallback, setShowUpgradeFallback] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedBroker('tradovate');
      setConnectionName('');
      setError('');
      setRiskAcknowledged(false);
      setShowBinancePopup(false);
    }
  }, [open]);

  const config = BROKER_CONFIGS[selectedBroker];
  const isNinjaTrader = selectedBroker === 'ninja_trader';
  const usesTradovateAuth = TRADOVATE_AUTH_BROKERS.includes(selectedBroker);
  const isOAuth = usesTradovateAuth || config.features.oauth;

  const canSubmit = useMemo(() => {
    if (!riskAcknowledged) return false;
    if (selectedBroker === 'binance') {
      return Boolean(user);
    }
    if (usesTradovateAuth) {
      return Boolean(user) && !isLoading && connectionName.trim().length > 0;
    }
    if (selectedBroker === 'interactive_brokers') {
      return Boolean(user) && !isLoading;
    }
    return false;
  }, [riskAcknowledged, selectedBroker, usesTradovateAuth, isLoading, user, connectionName]);

  const handleConnect = async () => {
    setError('');

    // Defensive gate: FREE-plan users may not start ANY connect flow
    // (OAuth, IBKR, or Binance API-key) — see field comment above.
    if (isFreeJournal) {
      onOpenChange(false);
      if (onUpgradeRequired) {
        onUpgradeRequired();
      } else {
        setShowUpgradeFallback(true);
      }
      return;
    }

    // Binance uses a dedicated API-key popup (not OAuth redirect).
    if (selectedBroker === 'binance' && user) {
      setShowBinancePopup(true);
      return;
    }

    if (usesTradovateAuth && user) {
      try {
        const { getTradovateAuthorizationUrl } = await import(
          '@/lib/brokers/tradovate/tradovate-oauth'
        );
        // Persist the user-typed name so we can apply it after the OAuth
        // redirect completes and the user lands back on the journal page.
        // The pending entry is consumed (and removed) by useTradovate's
        // post-connect effect. TTL: 15 minutes — stale entries are ignored.
        localStorage.setItem(
          'pending_tradovate_connection_name',
          JSON.stringify({ name: connectionName.trim(), ts: Date.now() }),
        );
        // If the caller wants to return somewhere other than the journal overview
        // after OAuth, persist the target path so useOAuthReturnRedirect can pick
        // it up on the way back (sessionStorage survives the same-tab redirect).
        if (returnTo) {
          sessionStorage.setItem('finotaur_oauth_return_to', returnTo);
        }
        // The chosen env is now cosmetic — the OAuth callback auto-detects the
        // real live/demo environment from the token, so the authorize URL just
        // needs a valid starting point for Tradovate's single shared portal.
        window.location.href = await getTradovateAuthorizationUrl('live');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Tradovate OAuth failed. Try again or contact support.');
      }
      return;
    }

    if (selectedBroker === 'interactive_brokers' && user) {
      try {
        const { getIBAuthorizationUrl } = await import('@/lib/brokers/ib/ib-oauth');
        window.location.href = getIBAuthorizationUrl(user.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'IBKR is not configured yet. Please try Tradovate.');
      }
    }
  };

  const handlePickBroker = (broker: BrokerName) => {
    setSelectedBroker(broker);
    setError('');
    setConnectionName('');
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[96dvh] w-[calc(100vw-24px)] max-w-[560px] overflow-hidden rounded-[9px] border border-[#C9A646]/18 bg-[#070707] p-0 text-ink-primary shadow-[0_0_42px_rgba(201,166,70,0.16)] [&>button]:hidden"
      >
        <div className="relative flex max-h-[96dvh] flex-col overflow-hidden rounded-[9px] bg-[radial-gradient(circle_at_12%_0%,rgba(201,166,70,0.13),transparent_28%),radial-gradient(circle_at_92%_92%,rgba(201,166,70,0.08),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.032),rgba(255,255,255,0.008))]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-ink-primary transition-colors hover:border-[#C9A646]/40 hover:text-[#E8C766]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 pt-4">
          <div className="mb-3 flex items-center gap-3 pr-10">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A646]/25 bg-[#0A0A0A]/70 shadow-[0_0_22px_rgba(201,166,70,0.14)]">
              <div className="absolute inset-0 rounded-full border-t-2 border-[#E8C766]" />
              <Link2 className="h-5 w-5 text-[#E8C766]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-normal text-ink-primary">
                Connect Your Broker
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-ink-secondary">
                Sync trades, portfolio analytics & AI insights in real time.
              </DialogDescription>
            </div>
          </div>

          {isNinjaTrader && (
            <a
              href={NINJATRADER_AFFILIATE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mb-3 inline-flex items-center gap-2 rounded-[8px] border border-[#C9A646]/16 bg-[#C9A646]/[0.045] px-2.5 py-1.5 text-[11px] text-[#E8C766] transition-all duration-200 hover:border-[#C9A646]/34 hover:bg-[#C9A646]/[0.075] hover:text-[#F4D97B]"
            >
              No NinjaTrader account?
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <div className="mb-3">
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-ink-secondary">
              Connection Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value.slice(0, CONNECTION_NAME_MAX))}
                placeholder="e.g. My Tradovate Live"
                autoComplete="off"
                className="h-10 w-full rounded-[12px] border border-[#C9A646]/18 bg-[#050505] px-4 pr-16 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-muted focus:border-[#C9A646]/45"
              />
              <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center">
                <span className="text-xs text-ink-secondary">
                  {connectionName.length}/{CONNECTION_NAME_MAX}
                </span>
              </div>
            </div>
            {usesTradovateAuth && connectionName.trim().length === 0 && (
              <p className="mt-1 text-[11px] text-ink-muted">
                Enter a connection name to continue.
              </p>
            )}
          </div>

          <div className="mb-3">
            <label className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-ink-secondary">
              Select Broker
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {STRIP_BROKERS.map((broker) => (
                <BrokerTile
                  key={broker}
                  broker={broker}
                  selected={selectedBroker === broker}
                  onSelect={() => handlePickBroker(broker)}
                />
              ))}
            </div>
          </div>

          <div className="mb-3">
            <h3 className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-secondary">
              Your Security Is Our Priority
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <SecurityCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Read-only access"
              />
              <SecurityCard
                icon={<Lock className="h-5 w-5" />}
                title="AES-256 encrypted"
              />
              <SecurityCard
                icon={<Zap className="h-5 w-5" />}
                title="Real-time sync"
              />
              <SecurityCard
                icon={<Brain className="h-5 w-5" />}
                title="AI-ready analytics"
              />
            </div>
          </div>

          <div className="mb-2.5 rounded-[12px] border border-[#C9A646]/18 bg-[#050505]/86 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-secondary">
                {`${config.displayName} Credentials`}
              </h3>
            </div>

            {selectedBroker === 'interactive_brokers' && (
              <div className="rounded-[12px] border border-white/10 bg-[#101010]/70 p-5 text-sm leading-relaxed text-ink-secondary">
                Click Connect to authenticate with Interactive Brokers via OAuth. You will be redirected to IBKR and brought back here.
              </div>
            )}

            {selectedBroker === 'binance' && (
              <div className="rounded-[12px] border border-white/10 bg-[#101010]/70 p-5 text-sm leading-relaxed text-ink-secondary">
                Click Connect to enter your Binance read-only API key and secret. Your credentials are encrypted in Vault — Finotaur cannot execute trades.
              </div>
            )}

            {!usesTradovateAuth && selectedBroker !== 'interactive_brokers' && selectedBroker !== 'binance' && (
              <div className="rounded-[12px] border border-white/10 bg-[#101010]/70 p-5 text-sm leading-relaxed text-ink-secondary">
                {config.displayName} is prepared in the broker ecosystem UI. Live credential exchange will be enabled in a later broker-activation pass.
              </div>
            )}

            {isNinjaTrader && (
              <div className="mt-2.5 rounded-[10px] border border-[#C9A646]/15 bg-[#0A0A0A]/70 p-2.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-24 items-center justify-center rounded-md bg-white/[0.035] px-3">
                      <img
                        src="/brokers/Kinetick_Logo.png"
                        alt="Kinetick"
                        className="max-h-5 w-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ink-primary">
                        Professional market data powered by Kinetick.
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-secondary">
                        Real-time futures data available
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-sm border border-status-success/25 bg-status-success/10 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-status-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
                    Available
                  </span>
                </div>
              </div>
            )}
          </div>

          <label
            className={[
              'mb-2.5 flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-2 transition-all duration-200',
              riskAcknowledged
                ? 'border-[#C9A646]/38 bg-[#C9A646]/[0.075] shadow-[0_0_18px_rgba(201,166,70,0.12)]'
                : 'border-[#C9A646]/14 bg-[#0A0A0A]/72 hover:border-[#C9A646]/28',
            ].join(' ')}
          >
            <input
              type="checkbox"
              checked={riskAcknowledged}
              onChange={(event) => setRiskAcknowledged(event.target.checked)}
              className="sr-only"
            />
            <span
              className={[
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-all duration-200',
                riskAcknowledged
                  ? 'border-[#E8C766] bg-gradient-gold text-ink-on-gold shadow-[0_0_16px_rgba(201,166,70,0.26)]'
                  : 'border-[#C9A646]/30 bg-[#050505] text-transparent',
              ].join(' ')}
              aria-hidden="true"
            >
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className={riskAcknowledged ? 'text-[10px] leading-snug text-ink-primary' : 'text-[10px] leading-snug text-ink-secondary'}>
              I understand and acknowledge the above. I am the account holder and authorize Finotaur to access this account on a read-only basis.
            </span>
          </label>

          {error && (
            <div className="mb-3 flex items-start gap-3 rounded-[12px] border border-num-negative/30 bg-num-negative/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-num-negative" />
              <p className="text-sm text-num-negative">{error}</p>
            </div>
          )}
          </div>

          <div className="shrink-0 border-t border-white/[0.05] bg-[#070707]/85 px-6 pb-4 pt-3 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[0.75fr_1fr]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-[11px] border border-white/15 bg-white/[0.025] text-sm font-medium text-ink-primary transition-colors hover:border-[#C9A646]/35"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConnect}
              disabled={!canSubmit}
              className="flex h-10 items-center justify-center gap-2 rounded-[11px] bg-gradient-gold text-sm font-semibold text-ink-on-gold shadow-btn-gold transition-all duration-300 hover:scale-[1.01] hover:shadow-btn-gold-hover disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : isOAuth ? (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Connect via OAuth
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  {isNinjaTrader ? 'Connect NinjaTrader' : 'Connect'}
                </>
              )}
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/[0.08] pt-1.5 text-[9px] text-ink-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-2.5 w-2.5" />
              Secure connection
            </span>
              <Link to="/legal/risk-disclosure" target="_blank" rel="noopener noreferrer" className="hover:text-[#E8C766]">
                Futures Risk Disclosure
              </Link>
              <Link to="/legal/disclaimer" target="_blank" rel="noopener noreferrer" className="hover:text-[#E8C766]">
                CFTC Hypothetical Performance Disclaimer
              </Link>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {showBinancePopup && (
        <BinanceConnectionPopup
          onClose={() => {
            setShowBinancePopup(false);
            onOpenChange(false);
          }}
          onSuccess={() => {
            setShowBinancePopup(false);
            onOpenChange(false);
          }}
        />
      )}

      {!onUpgradeRequired && (
        <UpgradeLimitDialog
          open={showUpgradeFallback}
          onOpenChange={setShowUpgradeFallback}
          reason="broker-free-locked"
        />
      )}
    </>
  );
}
