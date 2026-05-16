// src/components/broker/AddBrokerPopup.tsx
// Premium broker connection modal for the journal dashboard.

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Brain,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  User,
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
import { useTradovate, type TradovateEnv } from '@/hooks/useTradovate';

const CONNECTION_NAME_MAX = 32;
const NINJATRADER_AFFILIATE_URL = 'https://ninjatrader.com/';

const STRIP_BROKERS: BrokerName[] = [
  'tradovate',
  'ninja_trader',
  'mt5',
  'interactive_brokers',
  'tradingview',
];

const BROKER_MARKS: Partial<Record<BrokerName, string>> = {
  tradovate: '/brokers/tradovate-mark.svg',
  ninja_trader: '/brokers/ninjatrader-mark.svg',
  mt5: '/brokers/metatrader5-mark.svg',
  interactive_brokers: '/brokers/ibkr-mark.svg',
  tradingview: '/brokers/tradingview-mark.svg',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function EnvironmentToggle({
  value,
  onChange,
}: {
  value: TradovateEnv;
  onChange: (value: TradovateEnv) => void;
}) {
  return (
    <div className="grid w-full grid-cols-2 rounded-[9px] border border-[#C9A646]/15 bg-[#070707] p-0.5 sm:w-[180px]">
      {(['live', 'demo'] as TradovateEnv[]).map((env) => (
        <button
          key={env}
          type="button"
          onClick={() => onChange(env)}
          className={[
            'rounded-[7px] px-4 py-1 text-xs font-medium capitalize transition-all duration-200',
            value === env
              ? 'bg-[#C9A646]/20 text-[#E8C766] shadow-[inset_0_0_0_1px_rgba(201,166,70,0.45)]'
              : 'text-ink-secondary hover:text-ink-primary',
          ].join(' ')}
        >
          {env}
        </button>
      ))}
    </div>
  );
}

function CredentialInput({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex min-h-[34px] items-center gap-2.5 border-b border-white/10 px-3.5 last:border-b-0">
      <div className="text-ink-secondary">{icon}</div>
      <label className="w-[120px] shrink-0 text-[11px] text-ink-secondary">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="min-w-0 flex-1 bg-transparent text-[11px] text-ink-primary outline-none placeholder:text-ink-muted"
      />
      {trailing}
    </div>
  );
}

export default function AddBrokerPopup({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { connect, isLoading } = useTradovate();

  const [selectedBroker, setSelectedBroker] = useState<BrokerName>('tradovate');
  const [connectionName, setConnectionName] = useState('');
  const [env, setEnv] = useState<TradovateEnv>('live');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedBroker('tradovate');
      setConnectionName('');
      setEnv('live');
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setError('');
      setRiskAcknowledged(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || connectionName) return;
    const config = BROKER_CONFIGS[selectedBroker];
    const suffix = selectedBroker === 'tradovate' || selectedBroker === 'ninja_trader'
      ? ` (${env})`
      : '';
    setConnectionName(`${config.displayName}${suffix}`.slice(0, CONNECTION_NAME_MAX));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBroker, env, open]);

  const config = BROKER_CONFIGS[selectedBroker];
  const isOAuth = config.features.oauth && selectedBroker !== 'tradovate';
  const isNinjaTrader = selectedBroker === 'ninja_trader';

  const canSubmit = useMemo(() => {
    if (!riskAcknowledged) return false;
    if (selectedBroker === 'tradovate' || selectedBroker === 'ninja_trader') {
      return Boolean(username.trim() && password.trim() && !isLoading);
    }
    if (selectedBroker === 'interactive_brokers') {
      return Boolean(user) && !isLoading;
    }
    return false;
  }, [riskAcknowledged, selectedBroker, username, password, isLoading, user]);

  const handleConnect = async () => {
    setError('');

    if (selectedBroker === 'tradovate') {
      const result = await connect(env, username.trim(), password, connectionName);
      if (result.success) {
        onOpenChange(false);
      } else {
        setError(result.error || 'Connection failed. Check your credentials.');
      }
      return;
    }

    if (selectedBroker === 'ninja_trader') {
      setError('NinjaTrader secure vault provisioning is ready in the UI. Backend credential exchange still needs to be enabled before live connection.');
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
    setUsername('');
    setPassword('');
    setConnectionName(`${BROKER_CONFIGS[broker].displayName}${broker === 'tradovate' || broker === 'ninja_trader' ? ` (${env})` : ''}`.slice(0, CONNECTION_NAME_MAX));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[96vh] w-[calc(100vw-24px)] max-w-[560px] overflow-hidden rounded-[9px] border border-[#C9A646]/18 bg-[#070707] p-0 text-ink-primary shadow-[0_0_42px_rgba(201,166,70,0.16)] [&>button]:hidden"
      >
        <div className="relative overflow-hidden rounded-[9px] bg-[radial-gradient(circle_at_12%_0%,rgba(201,166,70,0.13),transparent_28%),radial-gradient(circle_at_92%_92%,rgba(201,166,70,0.08),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.032),rgba(255,255,255,0.008))] px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-ink-primary transition-colors hover:border-[#C9A646]/40 hover:text-[#E8C766]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

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
              אין חשבון בנינג'ה?
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
                placeholder={`${config.displayName} (${env})`}
                autoComplete="off"
                className="h-10 w-full rounded-[12px] border border-[#C9A646]/18 bg-[#050505] px-4 pr-20 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-muted focus:border-[#C9A646]/45"
              />
              <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <span className="text-xs text-ink-secondary">
                  {connectionName.length}/{CONNECTION_NAME_MAX}
                </span>
                <CheckCircle2 className="h-4 w-4 text-status-success" />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-ink-secondary">
              Select Broker
            </label>
            <div className="grid grid-cols-5 gap-2">
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
                {isNinjaTrader ? 'NinjaTrader Credentials' : `${config.displayName} Credentials`}
              </h3>
              {(selectedBroker === 'tradovate' || selectedBroker === 'ninja_trader') && (
                <EnvironmentToggle value={env} onChange={setEnv} />
              )}
            </div>

            {(selectedBroker === 'tradovate' || selectedBroker === 'ninja_trader') && (
              <div className="overflow-hidden rounded-[12px] border border-white/10 bg-[#101010]/70">
                <CredentialInput
                  icon={<User className="h-5 w-5" />}
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  placeholder={isNinjaTrader ? 'NinjaTrader username' : 'your@email.com or username'}
                  autoComplete="username"
                />
                <CredentialInput
                  icon={<Lock className="h-5 w-5" />}
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="************"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-ink-secondary transition-colors hover:text-[#E8C766]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />
              </div>
            )}

            {selectedBroker === 'interactive_brokers' && (
              <div className="rounded-[12px] border border-white/10 bg-[#101010]/70 p-5 text-sm leading-relaxed text-ink-secondary">
                Click Connect to authenticate with Interactive Brokers via OAuth. You will be redirected to IBKR and brought back here.
              </div>
            )}

            {selectedBroker !== 'tradovate' && selectedBroker !== 'ninja_trader' && selectedBroker !== 'interactive_brokers' && (
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
                        src="/brokers/kinetick-official.svg"
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
            <div className="mb-5 flex items-start gap-3 rounded-[12px] border border-num-negative/30 bg-num-negative/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-num-negative" />
              <p className="text-sm text-num-negative">{error}</p>
            </div>
          )}

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
      </DialogContent>
    </Dialog>
  );
}
