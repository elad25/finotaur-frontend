// src/components/broker/AddBrokerPopup.tsx
// ─────────────────────────────────────────────────────────────────────
// Sub-Session B redesign — single merged modal:
//   • Top: header + description + connection-count indicator
//   • Connection Name input (user-given label) with char counter
//   • Horizontal broker logo strip (selected = highlighted, others = muted)
//   • Dynamic credentials section that renders the right form for the
//     selected broker (Tradovate username/password; IBKR OAuth redirect;
//     coming-soon brokers show a disabled message)
//   • Cancel / Connect buttons at bottom
//
// Replaces the prior picker→form swap design that mounted TradovateConnectModal
// as a sibling. TradovateConnectModal stays in the codebase for the "Manage"
// view (rename / disconnect / sync-now) reachable from the popover.
// ─────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Shield,
  Zap,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { BROKER_CONFIGS, BrokerName } from '@/lib/brokers/types';
import { useAuth } from '@/providers/AuthProvider';
import { useTradovate, type TradovateEnv } from '@/hooks/useTradovate';

const BORDER_LIGHT = 'rgba(255, 215, 0, 0.08)';
const GOLD = '#C9A646';
const CONNECTION_NAME_MAX = 32;

// Brokers shown in the logo strip. Order matters: most-used first.
// We keep coming_soon brokers visible (disabled) so users see the roadmap.
const STRIP_BROKERS: BrokerName[] = [
  'tradovate',
  'interactive_brokers',
  'ninja_trader',
  'mt5',
  'tradingview',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Single broker logo with initials fallback ─────────────────────────
function BrokerLogo({
  broker,
  selected,
  disabled,
}: {
  broker: BrokerName;
  selected: boolean;
  disabled: boolean;
}) {
  const config = BROKER_CONFIGS[broker];
  const [errored, setErrored] = useState(false);

  const opacity = disabled ? 0.4 : 1;

  if (errored || !config.logo) {
    return (
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono flex-shrink-0"
        style={{
          background: `${config.color}20`,
          color: config.color,
          opacity,
          border: selected ? `1.5px solid ${GOLD}` : '1px solid transparent',
        }}
      >
        {config.displayName.substring(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.04] p-1.5 flex-shrink-0"
      style={{
        opacity,
        border: selected
          ? `1.5px solid ${GOLD}`
          : `1px solid ${BORDER_LIGHT}`,
      }}
    >
      <img
        src={config.logo}
        alt={config.displayName}
        className="w-full h-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function AddBrokerPopup({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const {
    credentials,
    liveCredential,
    demoCredential,
    connect,
    isLoading,
  } = useTradovate();

  const [selectedBroker, setSelectedBroker] = useState<BrokerName>('tradovate');
  const [connectionName, setConnectionName] = useState('');
  const [env, setEnv] = useState<TradovateEnv>('live');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Reset transient state on close
  useEffect(() => {
    if (!open) {
      setSelectedBroker('tradovate');
      setConnectionName('');
      setEnv('live');
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setError('');
    }
  }, [open]);

  // Pre-populate connection name as a sensible default when broker / env change
  useEffect(() => {
    if (!open) return;
    if (connectionName) return; // user already typed
    const config = BROKER_CONFIGS[selectedBroker];
    const suffix = selectedBroker === 'tradovate' ? ` (${env})` : '';
    setConnectionName(`${config.displayName}${suffix}`.slice(0, CONNECTION_NAME_MAX));
    // intentionally only seeds once per open/broker change; user edits override
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBroker, env, open]);

  const config = BROKER_CONFIGS[selectedBroker];
  const isComingSoon = config.status === 'coming_soon';
  const isOAuth = config.features.oauth && selectedBroker !== 'tradovate';
  const usedConnectionsCount = credentials.length;

  const docHref = config.documentation;

  const canSubmit = useMemo(() => {
    if (isComingSoon) return false;
    if (selectedBroker === 'tradovate') {
      return Boolean(username.trim() && password.trim() && !isLoading);
    }
    if (selectedBroker === 'interactive_brokers') {
      return Boolean(user) && !isLoading;
    }
    return false;
  }, [selectedBroker, username, password, isLoading, isComingSoon, user]);

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
    if (selectedBroker === 'interactive_brokers' && user) {
      try {
        const { getIBAuthorizationUrl } = await import('@/lib/brokers/ib/ib-oauth');
        window.location.href = getIBAuthorizationUrl(user.id);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'IBKR is not configured yet. Please try Tradovate.',
        );
      }
    }
  };

  const handlePickBroker = (b: BrokerName) => {
    setSelectedBroker(b);
    setError('');
    // Reset broker-specific fields when switching
    if (b !== 'tradovate') {
      setUsername('');
      setPassword('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#141414] border rounded-[20px] max-w-md p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ borderColor: BORDER_LIGHT }}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(201,166,70,0.1)' }}
            >
              <Plus className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[#F4F4F4] text-sm font-semibold">
                Add Connection
              </DialogTitle>
              <DialogDescription className="text-[10px] text-[#A0A0A0] font-light leading-snug">
                A connection links your broker login to Finotaur so trades sync
                automatically.
              </DialogDescription>
            </div>
          </div>

          {/* Connection-count indicator (informational only, no enforcement yet) */}
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(usedConnectionsCount * 25, 100)}%`,
                  background: GOLD,
                }}
              />
            </div>
            <span className="text-[10px] text-[#A0A0A0] font-light">
              {usedConnectionsCount} connection
              {usedConnectionsCount === 1 ? '' : 's'}
            </span>
          </div>

          {/* Help link */}
          {docHref && (
            <a
              href={docHref}
              target="_blank"
              rel="noreferrer noopener"
              className="mb-4 flex items-center gap-1.5 text-[10px] text-[#A0A0A0] hover:text-[#F4F4F4] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              How to add a {config.displayName} connection
            </a>
          )}

          {/* Connection Name */}
          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-1.5">
              Connection Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={connectionName}
                onChange={(e) =>
                  setConnectionName(e.target.value.slice(0, CONNECTION_NAME_MAX))
                }
                placeholder="My Tradovate (live)"
                autoComplete="off"
                className="w-full bg-[#0A0A0A] border rounded-xl px-3 py-2 pr-12 text-sm text-[#F4F4F4] placeholder-[#5A5A5A] focus:outline-none transition-colors"
                style={{ borderColor: BORDER_LIGHT }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#A0A0A0]">
                {connectionName.length}/{CONNECTION_NAME_MAX}
              </span>
            </div>
          </div>

          {/* Broker logo strip */}
          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-wider text-[#A0A0A0] mb-1.5">
              Select Broker
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STRIP_BROKERS.map((b) => {
                const cfg = BROKER_CONFIGS[b];
                const disabled = cfg.status === 'coming_soon';
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handlePickBroker(b)}
                    disabled={false}
                    className="flex flex-col items-center gap-1 group focus:outline-none flex-shrink-0"
                    title={disabled ? `${cfg.displayName} — coming soon` : cfg.displayName}
                  >
                    <BrokerLogo
                      broker={b}
                      selected={selectedBroker === b}
                      disabled={disabled}
                    />
                    <span
                      className="text-[9px] font-medium transition-colors max-w-[56px] truncate"
                      style={{
                        color:
                          selectedBroker === b
                            ? GOLD
                            : disabled
                            ? '#5A5A5A'
                            : '#A0A0A0',
                      }}
                    >
                      {cfg.displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Credentials section — dynamic per-broker */}
          <div
            className="rounded-xl p-3 mb-4"
            style={{ background: '#0A0A0A', border: `1px solid ${BORDER_LIGHT}` }}
          >
            <div className="text-[11px] font-semibold text-[#F4F4F4] mb-2">
              {config.displayName} Credentials
            </div>

            {selectedBroker === 'tradovate' && (
              <div className="space-y-2.5">
                {/* Environment toggle */}
                <div className="flex gap-1.5">
                  {(['live', 'demo'] as TradovateEnv[]).map((e) => {
                    const cred = e === 'live' ? liveCredential : demoCredential;
                    const isConnected = cred?.status === 'connected';
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEnv(e)}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={{
                          background:
                            env === e ? `${GOLD}1a` : 'transparent',
                          color: env === e ? GOLD : '#A0A0A0',
                          border:
                            env === e
                              ? `1px solid ${GOLD}66`
                              : `1px solid ${BORDER_LIGHT}`,
                        }}
                      >
                        <span className="capitalize">{e}</span>
                        {isConnected && (
                          <span className="ml-1 text-emerald-400">●</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-[10px] text-[#A0A0A0] mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your@email.com or username"
                    autoComplete="off"
                    className="w-full bg-[#141414] border rounded-lg px-3 py-2 text-sm text-[#F4F4F4] placeholder-[#5A5A5A] focus:outline-none"
                    style={{ borderColor: BORDER_LIGHT }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] text-[#A0A0A0] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canSubmit) handleConnect();
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full bg-[#141414] border rounded-lg px-3 py-2 pr-9 text-sm text-[#F4F4F4] placeholder-[#5A5A5A] focus:outline-none"
                      style={{ borderColor: BORDER_LIGHT }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5A5A5A] hover:text-[#A0A0A0]"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Security note */}
                <div className="flex items-center gap-1.5 text-[9px] text-emerald-400/80">
                  <Shield className="w-3 h-3" />
                  Encrypted with AES-256. We never store plaintext passwords.
                </div>
              </div>
            )}

            {selectedBroker === 'interactive_brokers' && (
              <div className="space-y-2 text-[11px] text-[#A0A0A0] leading-relaxed">
                <p>
                  Click <span className="text-[#F4F4F4]">Connect</span> to
                  authenticate with Interactive Brokers via OAuth.
                </p>
                <p>You will be redirected to IBKR and brought back here.</p>
              </div>
            )}

            {isComingSoon && (
              <div className="text-[11px] text-[#A0A0A0] leading-relaxed">
                {config.displayName} is coming soon. Pick another broker
                meanwhile.
              </div>
            )}
          </div>

          {/* Error */}
          {error && (() => {
            const lower = error.toLowerCase();
            const isCredentialError =
              lower.includes('credential') ||
              lower.includes('invalid') ||
              lower.includes('password') ||
              lower.includes('username') ||
              lower.includes('errortext') ||
              lower.includes('401');
            return (
              <div className="mb-3 flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-[1px]" />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-red-400 block">{error}</span>
                  {isCredentialError && selectedBroker === 'tradovate' && (
                    <span className="text-[10px] text-[#A0A0A0] block mt-1">
                      Double-check your Tradovate username and password. Account locked? Reset at{' '}
                      <a
                        href="https://trader.tradovate.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-[#C9A646]"
                      >
                        trader.tradovate.com
                      </a>
                      .
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-medium text-[#A0A0A0] hover:text-[#F4F4F4] transition-colors"
              style={{ border: `1px solid ${BORDER_LIGHT}` }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConnect}
              disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canSubmit
                  ? `linear-gradient(135deg, ${GOLD}, #E5C158)`
                  : '#3A3A3A',
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Connecting…
                </>
              ) : isOAuth ? (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  Connect via OAuth
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Connect
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
