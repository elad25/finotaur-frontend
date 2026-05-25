// src/components/copyTrading/ConnectCopierModal.tsx
// New copier-purpose broker connection modal. Mirrors AddConnectionModal layout,
// but explicitly sends purpose='copier' to tradovate-auth so the engine picks it
// up via bootstrapSessions(). Existing Journal connections are NOT affected —
// they live in a separate broker_connections row with purpose='journal'.

import { useState, memo, useEffect } from 'react';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { useTradovate, type TradovateEnv } from '@/hooks/useTradovate';
import { BROKER_CONFIGS, type BrokerName } from '@/lib/brokers/types';

interface ConnectCopierModalProps {
  onClose: () => void;
}

// External broker brand colors — DS tokens don't apply to 3rd-party identity.
const BROKER_LOGO: Record<string, { letter: string; bg: string; fg: string }> = {
  tradovate:           { letter: 'T',  bg: '#1d4ed8', fg: '#ffffff' },
  rithmic:             { letter: 'R',  bg: '#16a34a', fg: '#ffffff' },
  ninja_trader:        { letter: 'N',  bg: '#dc2626', fg: '#ffffff' },
  dxfeed:              { letter: 'D',  bg: '#f97316', fg: '#ffffff' },
  projectx:            { letter: 'X',  bg: '#7c3aed', fg: '#ffffff' },
  interactive_brokers: { letter: 'IB', bg: '#dc2626', fg: '#ffffff' },
  alpaca:              { letter: 'A',  bg: '#fbbf24', fg: '#0a0a0a' },
  tradingview:         { letter: 'TV', bg: '#1e293b', fg: '#ffffff' },
};

function BrokerLogo({ broker }: { broker: string }) {
  const cfg = BROKER_LOGO[broker] ?? {
    letter: broker[0]?.toUpperCase() ?? '?',
    bg: '#475569',
    fg: '#ffffff',
  };
  return (
    <div
      className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold"
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      {cfg.letter}
    </div>
  );
}

// Trade Copier surface: Tradovate is the only execution broker today.
// NinjaTrader (which auths via the same Tradovate cloud) is shown as a
// secondary option; other brokers render as coming-soon placeholders.
const GRID_BROKERS: BrokerName[] = [
  'tradovate',
  'ninja_trader',
  'interactive_brokers',
  'alpaca',
  'tradingview',
];

const FUNCTIONAL_BROKER: BrokerName = 'tradovate';
const COPIER_CONNECTION_LIMIT = 4;

// Prop-firm usernames (Apex, Topstep, MyFundedFutures, EarnFutures, Uprofit, LeeLoo)
// run on Tradovate LIVE even when the money is simulated — the prop firm pays
// for live-API access. Tradovate Demo is a separate environment where our app
// (CID) isn't registered for these accounts. Auto-route to Live so customers
// don't have to know this quirk.
const PROP_FIRM_USERNAME_RE = /^(APEX|TST|MFF|TOPSTEP|EARN|UPROFIT|LH)[_-]?\d+/i;
function isPropFirmUsername(u: string): boolean {
  return PROP_FIRM_USERNAME_RE.test(u.trim());
}

export const ConnectCopierModal = memo(function ConnectCopierModal({
  onClose,
}: ConnectCopierModalProps) {
  const { connections } = useBrokerConnections({ active: true, purpose: 'copier' });
  const { connect } = useTradovate();

  const [selectedBroker, setSelectedBroker] = useState<BrokerName>(FUNCTIONAL_BROKER);
  const [connectionName, setConnectionName] = useState('');
  const [environment, setEnvironment] = useState<TradovateEnv>('demo');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // API Key fields — customer generates these in Tradovate Web Trader → Application
  // Settings → API Access. Per the canonical architecture doc, copier-purpose
  // connections MUST use the customer's own API Key (cid + sec); OAuth is forbidden.
  const [apiKeyCid, setApiKeyCid] = useState('');
  const [apiKeySec, setApiKeySec] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedCount = connections.length;
  const isPropFirm = isPropFirmUsername(username);
  // Effective environment forces Live for prop-firm usernames (Apex etc.) —
  // the customer never sees the override, it just works.
  const effectiveEnvironment: TradovateEnv = isPropFirm ? 'live' : environment;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConnecting) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isConnecting, onClose]);

  const handleConnect = async () => {
    setError(null);
    if (selectedBroker !== FUNCTIONAL_BROKER) {
      setError(
        `${BROKER_CONFIGS[selectedBroker]?.displayName ?? selectedBroker} is not yet supported.`
      );
      return;
    }
    if (!username.trim() || !password.trim()) {
      setError('Username and dedicated API password are required.');
      return;
    }
    const cidNum = parseInt(apiKeyCid.trim(), 10);
    if (!Number.isFinite(cidNum) || cidNum <= 0) {
      setError('CID must be the numeric ID shown when you generated your API Key.');
      return;
    }
    if (!apiKeySec.trim()) {
      setError('API Secret is required (shown once when you generated your API Key).');
      return;
    }
    setIsConnecting(true);
    try {
      const result = await connect(
        effectiveEnvironment,
        username.trim(),
        password,
        connectionName.trim() || undefined,
        'tradovate',
        'copier',
        { cid: cidNum, sec: apiKeySec.trim() },
      );
      if (result && !result.success) {
        setError(result.error ?? 'Connection failed. Check your credentials and try again.');
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsConnecting(false);
    }
  };

  const visibleBrokers = GRID_BROKERS.filter((b) => b in BROKER_CONFIGS);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-base/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isConnecting) onClose(); }}
    >
      <div
        className="relative w-full max-w-[440px] mx-ds-4 rounded-lg bg-surface-1 border border-border-ds-subtle shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-ds-5 pt-ds-5 pb-ds-3">
          <h3 className="text-base font-semibold text-ink-primary">Connect Trade Copier</h3>
          <p className="text-xs text-ink-secondary mt-1">
            Connect via your personal Tradovate API Key — copies trades between your own accounts. Separate from Journal.
          </p>
          <div className="mt-ds-2 rounded-md border border-gold-border/40 bg-gold-primary/5 px-ds-3 py-ds-2">
            <p className="text-[11px] leading-snug text-ink-secondary">
              💡 Generate your API Key at <span className="text-gold-primary">Tradovate Web Trader → Application Settings → API Access</span>. You'll get a CID (number) and Secret (string). Use a <strong>dedicated API password</strong> — not your master password.
            </p>
          </div>
          {isPropFirm && (
            <div className="mt-ds-2 rounded-md border border-blue-500/30 bg-blue-500/5 px-ds-3 py-ds-2">
              <p className="text-[11px] leading-snug text-ink-secondary">
                ✓ Prop firm account detected — we'll connect through Tradovate Live automatically.
              </p>
            </div>
          )}
          <div className="text-[10px] text-ink-tertiary mt-ds-2 uppercase tracking-wider">
            {usedCount}/{COPIER_CONNECTION_LIMIT} copier connections used
          </div>
        </div>

        {/* Body */}
        <div className="px-ds-5 pb-ds-3 space-y-ds-3">
          {/* Connection Name */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-secondary mb-1">
              Connection Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value.slice(0, 32))}
                placeholder="e.g. Apex Copier Demo"
                className="w-full px-ds-3 py-ds-2 rounded-md bg-surface-base border border-border-ds-subtle text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-gold-border outline-none transition-colors duration-base pr-12"
              />
              <span className="absolute right-ds-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-tertiary pointer-events-none">
                {connectionName.length}/32
              </span>
            </div>
          </div>

          {/* Broker Grid */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-ink-secondary mb-ds-2">
              Select Broker
            </label>
            <div className="grid grid-cols-5 gap-ds-2">
              {visibleBrokers.map((broker) => {
                const config = BROKER_CONFIGS[broker];
                const isSupported = broker === FUNCTIONAL_BROKER;
                const isSelected = selectedBroker === broker;
                return (
                  <button
                    key={broker}
                    type="button"
                    onClick={() => isSupported && setSelectedBroker(broker)}
                    disabled={!isSupported}
                    title={isSupported ? config.displayName : `${config.displayName} — coming soon`}
                    className={[
                      'flex flex-col items-center justify-center gap-1 py-ds-3 px-1 rounded-md border transition-all duration-base',
                      isSelected
                        ? 'bg-gold-primary/10 border-gold-primary text-gold-primary'
                        : isSupported
                        ? 'bg-surface-base border-border-ds-subtle text-ink-secondary hover:border-border-ds-default hover:text-ink-primary'
                        : 'bg-surface-base/50 border-border-ds-subtle text-ink-muted opacity-40 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <BrokerLogo broker={broker} />
                    <span className="text-[10px] font-medium truncate w-full text-center leading-tight">
                      {config.displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tradovate credential form */}
          {selectedBroker === 'tradovate' && (
            <div className="space-y-ds-3 pt-ds-2 border-t border-border-ds-subtle">
              {/* Username — first so prop-firm detection drives the Environment field */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-secondary mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tradovate username"
                  autoComplete="username"
                  className="w-full px-ds-3 py-ds-2 rounded-md bg-surface-base border border-border-ds-subtle text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-gold-border outline-none transition-colors duration-base"
                />
              </div>

              {/* Environment — hidden for prop-firm usernames (auto-routes to Live) */}
              {!isPropFirm && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-ink-secondary mb-1">
                    Environment
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as TradovateEnv)}
                    className="w-full px-ds-3 py-ds-2 rounded-md bg-surface-base border border-border-ds-subtle text-sm text-ink-primary focus:border-gold-border outline-none transition-colors duration-base"
                  >
                    <option value="demo">Demo</option>
                    <option value="live">Live</option>
                  </select>
                </div>
              )}

              {/* Dedicated API Password */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-secondary mb-1">
                  Dedicated API Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="off"
                  className="w-full px-ds-3 py-ds-2 rounded-md bg-surface-base border border-border-ds-subtle text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-gold-border outline-none transition-colors duration-base"
                />
                <p className="text-[10px] text-ink-tertiary mt-1">
                  The password you set when generating the API Key — <strong>not</strong> your master password.
                </p>
              </div>

              {/* API Key CID */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-secondary mb-1">
                  API Key CID
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={apiKeyCid}
                  onChange={(e) => setApiKeyCid(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 12345"
                  autoComplete="off"
                  className="w-full px-ds-3 py-ds-2 rounded-md bg-surface-base border border-border-ds-subtle text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-gold-border outline-none transition-colors duration-base font-mono"
                />
                <p className="text-[10px] text-ink-tertiary mt-1">
                  Numeric ID shown when the API Key was created.
                </p>
              </div>

              {/* API Key Secret */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-ink-secondary mb-1">
                  API Key Secret
                </label>
                <input
                  type="password"
                  value={apiKeySec}
                  onChange={(e) => setApiKeySec(e.target.value)}
                  placeholder="Client secret string"
                  autoComplete="off"
                  onKeyDown={(e) => e.key === 'Enter' && !isConnecting && handleConnect()}
                  className="w-full px-ds-3 py-ds-2 rounded-md bg-surface-base border border-border-ds-subtle text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-gold-border outline-none transition-colors duration-base"
                />
                <p className="text-[10px] text-ink-tertiary mt-1">
                  Shown once at API Key generation. Cannot be retrieved later — regenerate the key if lost.
                </p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="rounded-md bg-num-negative/10 border border-num-negative/30 px-ds-3 py-ds-2">
              <p className="text-xs text-num-negative whitespace-pre-line">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-ds-5 py-ds-3 flex gap-ds-2 border-t border-border-ds-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={isConnecting}
            className="flex-1 px-ds-4 py-ds-2 rounded-md border border-border-ds-default text-sm text-ink-primary hover:bg-surface-2 transition-colors duration-base disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex-1 px-ds-4 py-ds-2 rounded-md bg-gold-primary hover:bg-[var(--gold-hover)] text-ink-on-gold text-sm font-semibold transition-colors duration-base disabled:opacity-50"
          >
            {isConnecting ? 'Connecting…' : 'Connect Copier'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ConnectCopierModal;
