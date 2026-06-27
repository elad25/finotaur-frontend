// src/pages/app/journal/TradeCopier.tsx
// ═══════════════════════════════════════════════════════════════
// Trade Copier — FINOTAUR design
//   1. Broker Connection Status (Tradovate live/demo)
//   2. Copy Panel: Leader + Instrument (smart futures) + Followers table
//   3. Trade Copier History (audit log)
// Premium-only page. Consistent glassmorphism design.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, memo, useMemo, useRef, useEffect } from 'react';
import {
  Link2, RefreshCw,
  Copy, History, Zap, Shield,
  AlertOctagon, ArrowLeftRight, Search, X, Plus,
  MoreVertical, ChevronDown, ChevronRight, Crown,
  Download, Filter, Trash2,
} from 'lucide-react';
import { useTradovate } from '@/hooks/useTradovate';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useCopyTradeLog } from '@/hooks/useCopyTradeLog';
import AddBrokerPopup from '@/components/broker/AddBrokerPopup';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { JournalAccountsOverview } from '@/features/automation/components/JournalAccountsOverview';
import { JournalAccountPicker } from '@/features/automation/components/JournalAccountPicker';
import { CopierPremiumGate } from '@/features/automation/components/CopierPremiumGate';
import { useCopierRoutes } from '@/features/automation/hooks/useCopierRoutes';
import RiskRulesTab from '@/features/automation/tabs/RiskRulesTab';
import AgentStatusTab from '@/features/automation/tabs/AgentStatusTab';
import InstallAgentTab from '@/features/automation/tabs/InstallAgentTab';
import { BROKER_CONFIGS } from '@/lib/brokers/types';
import type { BrokerConnection } from '@/lib/brokers/types';
import type { JournalAccount, CopierRouteTargetInput } from '@/features/automation/lib/automationTypes';
import { useLocation, useNavigate, Link } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// FUTURES CONTRACT EXPIRY LOGIC
// Tradovate/TradingView month codes: F=Jan G=Feb H=Mar J=Apr
// K=May M=Jun N=Jul Q=Aug U=Sep V=Oct X=Nov Z=Dec
// ─────────────────────────────────────────────────────────────
const MONTH_CODES = ['F','G','H','J','K','M','N','Q','U','V','X','Z'] as const;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Most CME equity index futures expire quarterly: Mar/Jun/Sep/Dec
const QUARTERLY = [2, 5, 8, 11]; // 0-indexed

// Roll window: switch to next contract ~1 week before 3rd Friday expiry
const ROLL_DAYS_BEFORE_EXPIRY = 7;

// 9-month forward window for contract suggestions
const CONTRACT_WINDOW_MONTHS = 9;

interface ContractSlot {
  root: string;
  code: string;       // month letter e.g. "M"
  full: string;       // e.g. "M26"
  ticker: string;     // e.g. "NQM26"
  monthName: string;  // e.g. "Jun"
  year: number;
  label: string;      // e.g. "Jun 2026"
  expiryDate: Date;
  isFront: boolean;   // is this the currently active front month?
}

function getThirdFriday(year: number, month: number): Date {
  const d = new Date(year, month, 1);
  let fridays = 0;
  while (fridays < 3) {
    if (d.getDay() === 5) fridays++;
    if (fridays < 3) d.setDate(d.getDate() + 1);
  }
  return d;
}

// Returns front month only (used for badge display and active ticker)
function getFrontMonth(contractMonths: number[]): { code: string; label: string; full: string } {
  const now = new Date();
  const year = now.getFullYear();
  for (let offset = 0; offset < 24; offset++) {
    const testDate = new Date(year, now.getMonth() + offset, 1);
    const m = testDate.getMonth();
    const y = testDate.getFullYear();
    if (!contractMonths.includes(m)) continue;
    const expiry   = getThirdFriday(y, m);
    const rollDate = new Date(expiry);
    rollDate.setDate(rollDate.getDate() - ROLL_DAYS_BEFORE_EXPIRY);
    if (now <= rollDate) {
      const code = MONTH_CODES[m];
      return { code, label: `${MONTH_NAMES[m]} ${y}`, full: `${code}${String(y).slice(-2)}` };
    }
  }
  const m = contractMonths[0];
  return { code: MONTH_CODES[m], label: MONTH_NAMES[m], full: `${MONTH_CODES[m]}${String(year).slice(-2)}` };
}

// Returns all contract slots within the 9-month window (front + upcoming)
function getUpcomingContracts(root: string, contractMonths: number[]): ContractSlot[] {
  const now      = new Date();
  const year     = now.getFullYear();
  const slots: ContractSlot[] = [];
  let frontFound = false;

  for (let offset = 0; offset < CONTRACT_WINDOW_MONTHS + 12; offset++) {
    const testDate = new Date(year, now.getMonth() + offset, 1);
    const m = testDate.getMonth();
    const y = testDate.getFullYear();
    if (!contractMonths.includes(m)) continue;

    const expiry   = getThirdFriday(y, m);
    const rollDate = new Date(expiry);
    rollDate.setDate(rollDate.getDate() - ROLL_DAYS_BEFORE_EXPIRY);

    // Skip contracts already rolled off
    if (now > rollDate) continue;

    // Check if this is within 9-month window from now
    const monthsAhead = (y - year) * 12 + m - now.getMonth();
    if (monthsAhead > CONTRACT_WINDOW_MONTHS) break;

    const code = MONTH_CODES[m];
    const isFront = !frontFound;
    frontFound = true;

    slots.push({
      root,
      code,
      full:       `${code}${String(y).slice(-2)}`,
      ticker:     `${root}${code}${String(y).slice(-2)}`,
      monthName:  MONTH_NAMES[m],
      year:       y,
      label:      `${MONTH_NAMES[m]} ${y}`,
      expiryDate: expiry,
      isFront,
    });
  }

  return slots;
}

// ─── Instrument catalogue ─────────────────────────────────────
interface FuturesInstrument {
  root: string;
  name: string;
  exchange: string;
  contractMonths: number[];
  micro?: string; // cross-instrument counterpart
}

const FUTURES_CATALOGUE: FuturesInstrument[] = [
  { root: 'NQ',  name: 'Nasdaq-100 Futures',        exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'MNQ' },
  { root: 'MNQ', name: 'Micro Nasdaq-100 Futures',  exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'NQ'  },
  { root: 'ES',  name: 'E-mini S&P 500 Futures',    exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'MES' },
  { root: 'MES', name: 'Micro E-mini S&P 500',      exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'ES'  },
  { root: 'RTY', name: 'Russell 2000 Futures',      exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'M2K' },
  { root: 'M2K', name: 'Micro Russell 2000',        exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'RTY' },
  { root: 'YM',  name: 'Dow Jones Futures',         exchange: 'CBOT',  contractMonths: QUARTERLY,                  micro: 'MYM' },
  { root: 'MYM', name: 'Micro Dow Jones Futures',   exchange: 'CBOT',  contractMonths: QUARTERLY,                  micro: 'YM'  },
  { root: 'CL',  name: 'Crude Oil Futures',         exchange: 'NYMEX', contractMonths: [0,1,2,3,4,5,6,7,8,9,10,11] },
  { root: 'QM',  name: 'Micro Crude Oil',           exchange: 'NYMEX', contractMonths: [0,1,2,3,4,5,6,7,8,9,10,11] },
  { root: 'NG',  name: 'Natural Gas Futures',       exchange: 'NYMEX', contractMonths: [0,1,2,3,4,5,6,7,8,9,10,11] },
  { root: 'GC',  name: 'Gold Futures',              exchange: 'COMEX', contractMonths: [1,3,5,7,9,11],             micro: 'MGC' },
  { root: 'MGC', name: 'Micro Gold Futures',        exchange: 'COMEX', contractMonths: [1,3,5,7,9,11],             micro: 'GC'  },
  { root: 'SI',  name: 'Silver Futures',            exchange: 'COMEX', contractMonths: [2,4,6,8,11] },
  { root: 'HG',  name: 'Copper Futures',            exchange: 'COMEX', contractMonths: [2,4,6,8,11] },
  { root: 'ZB',  name: '30-Year T-Bond Futures',   exchange: 'CBOT',  contractMonths: QUARTERLY },
  { root: 'ZN',  name: '10-Year T-Note Futures',   exchange: 'CBOT',  contractMonths: QUARTERLY },
  { root: 'ZF',  name: '5-Year T-Note Futures',    exchange: 'CBOT',  contractMonths: QUARTERLY },
  { root: 'ZT',  name: '2-Year T-Note Futures',    exchange: 'CBOT',  contractMonths: QUARTERLY },
  { root: '6E',  name: 'Euro FX Futures',           exchange: 'CME',   contractMonths: QUARTERLY },
  { root: '6J',  name: 'Japanese Yen Futures',      exchange: 'CME',   contractMonths: QUARTERLY },
  { root: '6B',  name: 'British Pound Futures',     exchange: 'CME',   contractMonths: QUARTERLY },
  { root: '6A',  name: 'Australian Dollar Futures', exchange: 'CME',   contractMonths: QUARTERLY },
  { root: 'BTC', name: 'Bitcoin Futures',           exchange: 'CME',   contractMonths: QUARTERLY },
  { root: 'ETH', name: 'Ether Futures',             exchange: 'CME',   contractMonths: QUARTERLY },
];

// Build cross-instrument map from catalogue
const CROSS_MAP: Record<string, string> = {};
FUTURES_CATALOGUE.forEach(f => { if (f.micro) CROSS_MAP[f.root] = f.micro; });

// Get active contract ticker: root + month code + 2-digit year (e.g. "NQM25")
function getActiveTicker(root: string): string {
  const instr = FUTURES_CATALOGUE.find(f => f.root === root);
  if (!instr) return root;
  return `${root}${getFrontMonth(instr.contractMonths).full}`;
}

// Ratio presets
const RATIO_PRESETS = [25, 50, 75, 100, 200];


// ─── Section Card wrapper ─────────────────────────────────────
const SectionCard = memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`
    relative overflow-hidden bg-surface-glass backdrop-blur-md
    border border-gold-border rounded-xl p-ds-6
    shadow-[0_18px_60px_rgba(0,0,0,0.48),0_0_48px_rgba(201,166,70,0.08)]
    hover:border-gold-primary/35 transition-all duration-300
    ${className}
  `}>
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
    <div className="pointer-events-none absolute -top-24 left-1/2 h-44 w-[72%] -translate-x-1/2 rounded-full bg-gold-primary/[0.08] blur-3xl" />
    {children}
  </div>
));

// ─── Sync Status Badge ────────────────────────────────────────
const SyncBadge = memo(({ type, label }: { type: string; label: string }) => {
  const configs = {
    connected:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
    disconnected: { bg: 'bg-zinc-800/60',    border: 'border-zinc-700/40',    text: 'text-zinc-500',    dot: 'bg-zinc-600' },
    error:        { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     dot: 'bg-red-400' },
    pending:      { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   dot: 'bg-amber-400 animate-pulse' },
  };
  const c = configs[type as keyof typeof configs] ?? configs.disconnected;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
});



// ─── Instrument Search Input ──────────────────────────────────
// Smart typeahead: suggests futures from catalogue, shows active contract month.
// Accepts root (NQ) or full ticker (NQM25) — auto-extracts root from full ticker.
// SystemStatusRow removed — cloud copy-engine health polling eliminated.
// The header already shows "Auto-syncing — no manual refresh needed" as static text.

function formatLastSync(value?: string | null): string {
  if (!value) return 'Never';
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isConnectionActive(connection: BrokerConnection, liveCredentialIds: Set<string>): boolean {
  const tokenExpired = connection.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false;
  return connection.is_active && connection.status === 'connected' && !tokenExpired;
}

const ConnectionsStatusDot = memo(function ConnectionsStatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`h-2 w-2 rounded-full ${active ? 'bg-status-success' : 'bg-status-warning'}`}
      aria-hidden="true"
    />
  );
});

const ConnectionDetailsTable = memo(function ConnectionDetailsTable({
  connections,
  liveCredentialIds,
}: {
  connections: BrokerConnection[];
  liveCredentialIds: Set<string>;
}) {
  const first = connections[0];
  const activeCount = connections.filter((conn) => isConnectionActive(conn, liveCredentialIds)).length;
  const brokerName = first ? (BROKER_CONFIGS[first.broker]?.displayName ?? first.broker) : 'Broker';
  const connectionName = first?.connection_name ?? first?.account_name ?? brokerName;
  const statusActive = activeCount > 0 || Boolean(first && isConnectionActive(first, liveCredentialIds));

  return (
    <div className="overflow-hidden rounded-lg border border-border-ds-subtle bg-surface-1">
      <div className="grid grid-cols-[150px_190px_150px_190px_180px_150px_64px] border-b border-border-ds-subtle bg-surface-2 px-ds-4 py-ds-3 text-[11px] uppercase text-ink-secondary max-xl:grid-cols-[130px_1.1fr_120px_150px_150px_120px_56px] max-lg:hidden">
        <span>Status</span>
        <span>Connection Name</span>
        <span>Username</span>
        <span>Platform</span>
        <span>Active Accounts</span>
        <span>Used Slots</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="grid min-h-[54px] grid-cols-[150px_190px_150px_190px_180px_150px_64px] items-center px-ds-4 py-ds-3 text-sm text-ink-primary max-xl:grid-cols-[130px_1.1fr_120px_150px_150px_120px_56px] max-lg:grid-cols-1 max-lg:gap-ds-2">
        <div className="flex items-center gap-ds-2">
          <ConnectionsStatusDot active={statusActive} />
          <span>{statusActive ? 'Connected' : 'Needs attention'}</span>
        </div>
        <span className="truncate">{connectionName}</span>
        <span className="font-mono text-xs tracking-[0.18em] text-ink-primary">••••••••</span>
        <span>{brokerName}</span>
        <span>{activeCount} / 5</span>
        <span>{connections.length} / 20</span>
        <button
          type="button"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-gold-primary transition-colors hover:bg-gold-primary/10"
          aria-label="Connection actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

const AccountsTable = memo(function AccountsTable({
  connections,
  liveCredentialIds,
}: {
  connections: BrokerConnection[];
  liveCredentialIds: Set<string>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-ds-subtle bg-surface-1">
      <div className="grid grid-cols-[42px_120px_150px_1fr_150px_150px_120px_130px_64px] border-b border-border-ds-subtle bg-surface-2 px-ds-4 py-ds-3 text-[11px] uppercase text-ink-secondary max-xl:grid-cols-[42px_110px_130px_1fr_130px_120px_110px_110px_56px] max-lg:hidden">
        <span />
        <span>Status</span>
        <span>Account ID</span>
        <span>Name</span>
        <span>Broker</span>
        <span>Balance</span>
        <span>Role</span>
        <span>Last Sync</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="divide-y divide-border-ds-subtle">
        {connections.map((connection, index) => {
          const active = isConnectionActive(connection, liveCredentialIds);
          const brokerName = BROKER_CONFIGS[connection.broker]?.displayName ?? connection.broker;
          const accountName = connection.account_name ?? connection.connection_name ?? 'MFFU';
          const accountId = connection.account_id ?? connection.id.slice(0, 9);
          const role = index === 0 ? 'Leader' : 'Follower';

          return (
            <div
              key={connection.id}
              className="grid min-h-[48px] grid-cols-[42px_120px_150px_1fr_150px_150px_120px_130px_64px] items-center px-ds-4 py-ds-2 text-sm text-ink-primary transition-colors hover:bg-surface-2 max-xl:grid-cols-[42px_110px_130px_1fr_130px_120px_110px_110px_56px] max-lg:grid-cols-[32px_1fr_40px] max-lg:gap-ds-2"
            >
              <label className="flex h-5 w-5 items-center justify-center rounded-sm border border-border-ds-default">
                <input type="checkbox" className="sr-only" aria-label={`Select ${accountName}`} />
              </label>

              <div className="flex items-center gap-ds-2">
                <ConnectionsStatusDot active={active} />
                <span className={active ? 'text-status-success' : 'text-status-warning'}>
                  {active ? 'Active' : 'Attention'}
                </span>
              </div>

              <span className="font-mono text-sm text-ink-primary max-lg:hidden">{accountId}</span>
              <span className="truncate max-lg:col-start-2 max-lg:row-start-2">{accountName}</span>
              <span className="max-lg:hidden">{brokerName}</span>
              <span className="font-mono text-sm max-lg:hidden">$0.00</span>
              <span className="max-lg:hidden">
                <span className={`rounded-sm border px-ds-2 py-1 text-xs ${
                  role === 'Leader'
                    ? 'border-gold-border text-gold-primary'
                    : 'border-border-ds-default text-ink-secondary'
                }`}>
                  {role}
                </span>
              </span>
              <span className="text-ink-secondary max-lg:hidden">
                {formatLastSync(connection.last_successful_sync_at ?? connection.last_sync_at)}
              </span>
              <button
                type="button"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-gold-primary transition-colors hover:bg-gold-primary/10 max-lg:col-start-3 max-lg:row-span-2"
                aria-label={`${accountName} actions`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const ConnectionsAccordion = memo(function ConnectionsAccordion({
  connections,
  liveCredentialIds,
  expandedConnectionIds,
  disabledConnectionIds,
  onToggleConnection,
  onToggleEnabled,
  onReconnect,
  reconnectingId,
}: {
  connections: BrokerConnection[];
  liveCredentialIds: Set<string>;
  expandedConnectionIds: Set<string>;
  disabledConnectionIds: Set<string>;
  onToggleConnection: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onReconnect: (conn: BrokerConnection) => void;
  reconnectingId: string | null;
}) {
  const activeCount = connections.filter((conn) => isConnectionActive(conn, liveCredentialIds)).length;

  return (
    <div className="overflow-hidden rounded-lg border border-border-ds-subtle bg-surface-1">
      <div className="grid grid-cols-[44px_1.25fr_150px_110px_160px_120px_120px_92px] border-b border-border-ds-subtle bg-surface-2 px-ds-4 py-ds-3 text-[11px] uppercase text-ink-secondary max-xl:grid-cols-[36px_1.1fr_130px_96px_130px_110px_110px_84px] max-lg:hidden">
        <span />
        <span>Connection Name</span>
        <span>Status</span>
        <span>Enabled</span>
        <span>Platform</span>
        <span>Accounts</span>
        <span>Last Ping</span>
        <span>Details</span>
      </div>

      <div className="divide-y divide-border-ds-subtle">
        {connections.map((connection) => {
          const active = isConnectionActive(connection, liveCredentialIds);
          const expanded = expandedConnectionIds.has(connection.id);
          const enabled = active && !disabledConnectionIds.has(connection.id);
          const brokerName = BROKER_CONFIGS[connection.broker]?.displayName ?? connection.broker;
          const connectionName = connection.connection_name ?? connection.account_name ?? brokerName;

          return (
            <div key={connection.id}>
              <div className="grid min-h-[44px] grid-cols-[44px_1.25fr_150px_110px_160px_120px_120px_92px] items-center px-ds-4 py-ds-2 text-sm text-ink-primary transition-colors hover:bg-surface-2 max-xl:grid-cols-[36px_1.1fr_130px_96px_130px_110px_110px_84px] max-lg:grid-cols-[32px_1fr_86px] max-lg:gap-ds-2">
                <span className="text-ink-tertiary">#</span>
                <span className="truncate font-medium">{connectionName}</span>
                <div className="flex items-center gap-ds-2">
                  <ConnectionsStatusDot active={active} />
                  <span className={active ? 'text-status-success' : 'text-status-warning'}>{active ? 'Connected' : 'Attention'}</span>
                  {!active && (
                    <button
                      type="button"
                      onClick={() => onReconnect(connection)}
                      disabled={reconnectingId === connection.id}
                      className="ml-ds-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gold-border bg-transparent text-gold-primary transition-colors hover:border-gold-primary hover:bg-gold-primary/10 disabled:opacity-50 disabled:cursor-wait"
                      aria-label={`Reconnect ${connection.connection_name ?? connection.account_name ?? connection.broker}`}
                      title="Reconnect"
                    >
                      <RefreshCw className={`h-3 w-3 ${reconnectingId === connection.id ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${connectionName} enabled`}
                  onClick={() => onToggleEnabled(connection.id)}
                  className="max-lg:hidden"
                >
                  <span className={`inline-flex h-5 w-9 items-center rounded-full border px-0.5 transition-colors ${enabled ? 'border-blue-500/50 bg-blue-500/20' : 'border-border-ds-default bg-surface-2'}`}>
                    <span className={`h-4 w-4 rounded-full transition-transform ${enabled ? 'translate-x-4 bg-blue-400' : 'bg-ink-muted'}`} />
                  </span>
                </button>
                <span className="max-lg:hidden">{brokerName}</span>
                <span className="max-lg:hidden">{active ? 1 : 0} / 20</span>
                <span className="text-status-success max-lg:hidden">
                  {formatLastSync(connection.last_successful_sync_at ?? connection.last_sync_at)}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleConnection(connection.id)}
                  className="inline-flex items-center gap-ds-1 text-sm font-medium text-ink-primary transition-colors hover:text-gold-primary max-lg:justify-end"
                  aria-expanded={expanded}
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Details
                </button>
              </div>

              {expanded && (
                <div className="border-t border-border-ds-subtle bg-surface-base/45 px-ds-4 py-ds-3">
                  <AccountsTable connections={[connection]} liveCredentialIds={liveCredentialIds} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

const InstrumentSearch = memo(({
  value,
  onChange,
}: {
  value: string;    // currently selected root (e.g. "NQ")
  onChange: (root: string) => void;
}) => {
  // ── All hooks must be declared before any early returns ──
  const [query, setQuery]                   = useState(value);
  const [open, setOpen]                     = useState(false);
  const [focused, setFocused]               = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>(() =>
    value ? getActiveTicker(value) : ''
  );
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep display in sync when value changes externally
  useEffect(() => { setQuery(value); }, [value]);

  // Keep selectedTicker in sync when value changes externally
  useEffect(() => {
    if (value) setSelectedTicker(getActiveTicker(value));
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filtered instrument matches based on query (root level)
  const matchedInstruments = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return FUTURES_CATALOGUE.slice(0, 6);
    return FUTURES_CATALOGUE.filter(f =>
      f.root.startsWith(q) ||
      f.name.toUpperCase().includes(q) ||
      f.root === q.replace(/[FGHJKMNQUVXZ]\d{2}$/, '')
    ).slice(0, 8);
  }, [query]);

  // For each matched instrument, compute upcoming contract slots (9-month window)
  const suggestionGroups = useMemo(() =>
    matchedInstruments.map(f => ({
      instrument: f,
      contracts: getUpcomingContracts(f.root, f.contractMonths),
    })),
    [matchedInstruments],
  );

  // Currently selected instrument + front month badge
  const selectedInstr = FUTURES_CATALOGUE.find(f => f.root === value);
  const frontMonth    = selectedInstr ? getFrontMonth(selectedInstr.contractMonths) : null;

  function selectContract(slot: ContractSlot) {
    onChange(slot.root);
    setSelectedTicker(slot.ticker);
    setQuery(slot.root);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleInput(raw: string) {
    setQuery(raw);
    setOpen(true);
    const upper = raw.trim().toUpperCase();

    // Full ticker e.g. "NQM26" → extract root
    const fullMatch = upper.match(/^([A-Z0-9]{1,4})[FGHJKMNQUVXZ]\d{2}$/);
    if (fullMatch) {
      const root = fullMatch[1];
      if (FUTURES_CATALOGUE.find(f => f.root === root)) { onChange(root); return; }
    }
    // Exact root match
    if (FUTURES_CATALOGUE.find(f => f.root === upper)) onChange(upper);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
        Instrument
      </label>

      {/* Search input */}
      <div className={`
        flex items-center gap-2 bg-zinc-900/80 border rounded-xl px-3 py-2.5
        transition-all duration-150
        ${focused
          ? 'border-[#C9A646]/50 shadow-[0_0_0_1px_rgba(201,166,70,0.12)]'
          : 'border-zinc-700/60'
        }
      `}>
        <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Search symbol… (NQ, ES, NQM26)"
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none uppercase"
          spellCheck={false}
          autoComplete="off"
        />
        {query && (
          <button
            onMouseDown={e => {
              e.preventDefault();
              setQuery('');
              onChange('');
              setSelectedTicker('');
              setOpen(true);
            }}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Active contract badge */}
      {selectedTicker && frontMonth && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-600">Active contract:</span>
          <span className="text-[10px] font-bold text-[#C9A646] bg-[#C9A646]/10 px-1.5 py-0.5 rounded">
            {selectedTicker}
          </span>
          <span className="text-[10px] text-zinc-600">· {frontMonth.label}</span>
        </div>
      )}

      {/* Suggestions dropdown — grouped by instrument, expanded contract list */}
      {open && suggestionGroups.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50
          bg-[#161616] border border-zinc-800 rounded-xl
          shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden max-h-80 overflow-y-auto
          scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
        >
          {suggestionGroups.map(({ instrument: f, contracts }) => {
            const isSelectedRoot = f.root === value;
            return (
              <div key={f.root}>
                {/* ── Instrument header row ── */}
                <div className={`
                  flex items-center gap-3 px-3 py-2 border-b border-zinc-800/60
                  ${isSelectedRoot ? 'bg-[#C9A646]/[0.04]' : 'bg-zinc-900/30'}
                `}>
                  <span className={`w-10 text-right flex-shrink-0 text-xs font-bold ${isSelectedRoot ? 'text-[#C9A646]' : 'text-white'}`}>
                    {f.root}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-zinc-400 truncate">{f.name}</span>
                    <span className="text-[10px] text-zinc-600 ml-2">{f.exchange}</span>
                  </div>
                  {f.micro && (
                    <span className="text-[9px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      ↔ {f.micro}
                    </span>
                  )}
                </div>

                {/* ── Contract rows: front + upcoming within 9-month window ── */}
                {contracts.length === 0 ? (
                  <div className="px-4 py-2 text-[10px] text-zinc-600">No contracts in window</div>
                ) : (
                  contracts.map(slot => {
                    const isSelectedContract = slot.ticker === selectedTicker;
                    return (
                      <button
                        key={slot.ticker}
                        onMouseDown={e => { e.preventDefault(); selectContract(slot); }}
                        className={`
                          w-full flex items-center gap-3 pl-[52px] pr-3 py-2 text-left
                          transition-colors duration-100 hover:bg-zinc-800/50
                          ${isSelectedContract
                            ? 'bg-[#C9A646]/[0.08] border-l-2 border-[#C9A646]'
                            : 'border-l-2 border-transparent'
                          }
                        `}
                      >
                        {/* Contract ticker */}
                        <span className={`text-xs font-bold font-mono flex-shrink-0 ${
                          isSelectedContract ? 'text-[#C9A646]' : 'text-zinc-200'
                        }`}>
                          {slot.ticker}
                        </span>

                        {/* Month label */}
                        <span className="text-[10px] text-zinc-500 flex-shrink-0">{slot.label}</span>

                        {/* Expiry info */}
                        <span className="text-[10px] text-zinc-700 ml-auto flex-shrink-0">
                          exp {format(slot.expiryDate, 'MMM d')}
                        </span>

                        {/* Front month badge */}
                        {slot.isFront && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">
                            FRONT
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ─── Follower Row ─────────────────────────────────────────────
const FollowerRow = memo(({
  name,
  enabled,
  ratio,
  crossEnabled,
  crossLabel,
  onToggle,
  onRatioChange,
  onCrossToggle,
  onFlatten,
  isLoading,
}: {
  name: string;
  enabled: boolean;
  ratio: number;
  crossEnabled: boolean;
  crossLabel?: string;
  onToggle: () => void;
  onRatioChange: (r: number) => void;
  onCrossToggle: () => void;
  onFlatten: () => void;
  isLoading: boolean;
}) => (
  <div
    className={`
      grid items-center px-4 py-3 transition-all duration-200
      ${enabled
        ? 'bg-zinc-900/20 hover:bg-zinc-900/40'
        : 'bg-zinc-900/5 hover:bg-zinc-900/20 opacity-55'
      }
    `}
    style={{ gridTemplateColumns: '1fr 80px 1fr 96px 80px' }}
  >
    {/* Account name */}
    <div className="flex items-center gap-2.5 min-w-0 pr-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
        enabled
          ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
          : 'bg-zinc-600'
      }`} />
      <span className="text-sm text-white font-medium truncate">{name}</span>
    </div>

    {/* ON/OFF toggle */}
    <div className="flex justify-center">
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`
          px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 disabled:opacity-50
          ${enabled
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
            : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
          }
        `}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>

    {/* Ratio presets */}
    <div className="flex justify-center">
      <div className="flex items-center gap-1">
        {RATIO_PRESETS.map(p => (
          <button
            key={p}
            onClick={() => onRatioChange(p)}
            className={`
              w-8 h-6 rounded text-[10px] font-bold transition-all active:scale-95
              ${ratio === p
                ? 'bg-[#C9A646] text-black shadow-[0_0_8px_rgba(201,166,70,0.4)]'
                : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-500 hover:border-[#C9A646]/30 hover:text-[#C9A646]'
              }
            `}
          >
            {p === 200 ? '2×' : `${p}%`}
          </button>
        ))}
      </div>
    </div>

    {/* Cross-instrument toggle */}
    <div className="flex justify-center">
      {crossLabel ? (
        <button
          onClick={onCrossToggle}
          title={`Route to ${crossLabel} instead of leader instrument`}
          className={`
            flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold
            transition-all duration-150 active:scale-95
            ${crossEnabled
              ? 'bg-violet-500/20 border border-violet-500/40 text-violet-400 hover:bg-violet-500/30'
              : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600'
            }
          `}
        >
          <ArrowLeftRight className="w-3 h-3" />
          {crossLabel}
        </button>
      ) : (
        <span className="text-[10px] text-zinc-700">—</span>
      )}
    </div>

    {/* Per-account FLATTEN */}
    <div className="flex justify-center">
      <button
        onClick={onFlatten}
        className="px-2.5 py-1.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-600/25 hover:border-red-500/50 active:scale-95 transition-all duration-150"
      >
        FLATTEN
      </button>
    </div>
  </div>
));

// ─── Flatten Confirm Modal ────────────────────────────────────
const FlattenConfirmModal = memo(({ target, onConfirm, onCancel }: {
  target: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="max-w-sm w-full mx-4 bg-[#111] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-[0_8px_40px_rgba(239,68,68,0.2)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertOctagon className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Confirm Flatten</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">This action closes all open positions</p>
        </div>
      </div>
      <p className="text-sm text-zinc-300">
        Are you sure you want to{' '}
        <span className="text-red-400 font-semibold">flatten {target}</span>?
        All open positions will be closed immediately.
      </p>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 active:scale-95 transition-all"
        >
          Yes, Flatten Now
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
));

// ─── Copy Panel ───────────────────────────────────────────────
// Rewired to use automation_copier_routes (local agent tables) instead of
// the legacy portfolio_copy_rules / server engine.
const CopyPanel = memo(() => {
  const { routes, isLoading, upsertRoute, deleteRoute } = useCopierRoutes();
  const { tradovatePortfolios } = usePortfolios();

  // Only accounts with a numeric tradovate_account_id can be routed by the agent.
  const tradeablePortfolios = useMemo(
    () => tradovatePortfolios.filter(p => p.is_active && p.tradovate_account_id != null),
    [tradovatePortfolios],
  );

  // Source account selection (for the "create new route" form)
  const [sourceAccount, setSourceAccount] = useState<JournalAccount | null>(null);
  // Target account selections (multi: set of account_ids)
  const [targetAccountId, setTargetAccountId] = useState<JournalAccount | null>(null);
  const [ratio, setRatio]                     = useState(100);
  const [maxContracts, setMaxContracts]       = useState<string>('');
  const [isSaving, setIsSaving]               = useState(false);
  const [flattenTarget, setFlattenTarget]     = useState<string | null>(null);

  const handleCreateRoute = useCallback(async () => {
    if (!sourceAccount || !targetAccountId) return;
    if (sourceAccount.account_id === targetAccountId.account_id) return;

    const target: CopierRouteTargetInput = {
      destination_account_id:   targetAccountId.account_id,
      destination_account_name: targetAccountId.account_name,
      destination_broker:       targetAccountId.broker,
      destination_environment:  targetAccountId.environment,
      scale_ratio:              ratio / 100,
      max_contracts:            maxContracts.trim() !== '' ? parseInt(maxContracts, 10) : null,
      is_active:                true,
    };

    setIsSaving(true);
    await upsertRoute({
      sourceAccount,
      label: sourceAccount.account_name,
      symbolFilter: [],
      copyOpens: true,
      copyCloses: true,
      reverse: false,
      isActive: true,
      targets: [target],
    });
    setIsSaving(false);
    // Reset form after successful creation
    setSourceAccount(null);
    setTargetAccountId(null);
    setRatio(100);
    setMaxContracts('');
  }, [sourceAccount, targetAccountId, ratio, maxContracts, upsertRoute]);

  const flattenName = flattenTarget === 'ALL'
    ? 'ALL accounts'
    : (routes.find(r => r.id === flattenTarget)?.label ?? flattenTarget ?? '');

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center">
          <Copy className="w-4 h-4 text-[#C9A646]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Trade Copier Panel</h3>
          <p className="text-[11px] text-zinc-500">
            Create copy routes between your journal-connected broker accounts
          </p>
        </div>
      </div>

      {/* ── Create new route form ── */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 space-y-3">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">New route</p>

        <div className="grid grid-cols-[1fr,1fr,auto] gap-3 items-end">
          {/* Source account */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
              Copy From (Source)
            </label>
            <JournalAccountPicker
              value={sourceAccount?.account_id ?? null}
              onChange={setSourceAccount}
              placeholder="Select source account"
              className="bg-zinc-900/80 border-zinc-700/60 rounded-xl h-[42px] text-sm"
            />
          </div>

          {/* Target account */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
              Copy To (Target)
            </label>
            <JournalAccountPicker
              value={targetAccountId?.account_id ?? null}
              onChange={setTargetAccountId}
              placeholder="Select target account"
              className="bg-zinc-900/80 border-zinc-700/60 rounded-xl h-[42px] text-sm"
            />
          </div>

          {/* Ratio */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
              Ratio %
            </label>
            <div className="flex items-center gap-1">
              {RATIO_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setRatio(p)}
                  className={`
                    w-9 h-[42px] rounded-lg text-[11px] font-bold transition-all active:scale-95
                    ${ratio === p
                      ? 'bg-[#C9A646] text-black shadow-[0_0_8px_rgba(201,166,70,0.4)]'
                      : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-500 hover:border-[#C9A646]/30 hover:text-[#C9A646]'
                    }
                  `}
                >
                  {p === 200 ? '2×' : `${p}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Max contracts + create button */}
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              Max contracts (optional)
            </label>
            <input
              type="number"
              min={1}
              value={maxContracts}
              onChange={e => setMaxContracts(e.target.value)}
              placeholder="No limit"
              className="w-32 bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A646]/50 placeholder-zinc-600"
            />
          </div>
          <button
            onClick={handleCreateRoute}
            disabled={isSaving || !sourceAccount || !targetAccountId || sourceAccount?.account_id === targetAccountId?.account_id}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl
              bg-[#C9A646]/15 border border-[#C9A646]/40 text-[#C9A646] text-sm font-semibold
              hover:bg-[#C9A646]/25 hover:border-[#C9A646]/60
              active:scale-95 transition-all duration-150
              disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <Plus className="w-4 h-4" />
            {isSaving ? 'Creating…' : 'Create Route'}
          </button>
        </div>

        {tradeablePortfolios.length < 2 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
            <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0" />
            Connect at least 2 Tradovate accounts in the journal to create copy routes.
          </div>
        )}
      </div>

      {/* ── Existing routes ── */}
      <div className="space-y-3">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Active routes</p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-14 bg-zinc-900/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : routes.length === 0 ? (
          <div className="flex items-center justify-center py-8 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
            <p className="text-sm text-zinc-500">No copy routes yet. Create one above.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
            <div
              className="bg-zinc-900/60 border-b border-zinc-800/60 px-4 py-2.5"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 48px' }}
            >
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Source</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Target(s)</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider text-center">Ratio</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider text-center">Status</span>
              <span />
            </div>

            <div className="divide-y divide-zinc-800/40">
              {routes.map(route => {
                const targets = route.automation_copier_route_targets ?? [];
                const firstRatio = targets[0]?.scale_ratio ?? 1;
                return (
                  <div
                    key={route.id}
                    className="grid items-center px-4 py-3 text-sm hover:bg-zinc-900/20 transition-colors"
                    style={{ gridTemplateColumns: '1fr 1fr 80px 80px 48px' }}
                  >
                    <span className="text-zinc-200 font-medium truncate">{route.source_account_name}</span>
                    <span className="text-zinc-400 truncate">
                      {targets.length === 0
                        ? '—'
                        : targets.map(t => t.destination_account_name).join(', ')}
                    </span>
                    <span className="text-center font-mono text-xs text-zinc-300">
                      {Math.round(firstRatio * 100)}%
                    </span>
                    <span className="flex justify-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        route.is_active
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {route.is_active ? 'Active' : 'Paused'}
                      </span>
                    </span>
                    <button
                      onClick={() => deleteRoute(route.id)}
                      className="flex items-center justify-center h-7 w-7 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label={`Delete route from ${route.source_account_name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-600 border-t border-zinc-800 mt-2 pt-2">
          Routes are executed locally by the Finotaur desktop agent. No orders are placed from this page.
        </p>
      </div>

      {/* ── Flatten confirm modal ── */}
      {flattenTarget && (
        <FlattenConfirmModal
          target={flattenName}
          onConfirm={() => {
            // TODO: wire to actual broker flatten API
            setFlattenTarget(null);
          }}
          onCancel={() => setFlattenTarget(null)}
        />
      )}
    </div>
  );
});


// ─── Live Positions / Orders / History Section ─────────────────
// Cloud copy-engine polling (/api/copy-engine/accounts) has been removed.
// Execution runs via the local desktop agent; positions & orders appear
// once the agent is paired and running.
const CopierActivitySection = memo(() => {
  return (
    <div className="space-y-ds-4">
      <div className="flex items-center gap-ds-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-border bg-gold-primary/10">
          <History className="h-4 w-4 text-gold-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">Live Copier Monitor</h3>
          <p className="text-[11px] text-ink-secondary">
            Positions, pending orders, and copy history
          </p>
        </div>
      </div>
      <div className="flex min-h-[184px] items-center justify-center rounded-lg border border-zinc-800/70 bg-zinc-950/35 px-6 py-8 text-center">
        <p className="text-sm text-zinc-500">
          Live positions &amp; P&amp;L appear here once your desktop agent is paired and running.
        </p>
      </div>
      <CopyHistorySection compact />
    </div>
  );
});

// ─── Copy History Section ─────────────────────────────────────
const CopyHistorySection = memo(({ compact = false }: { compact?: boolean }) => {
  const { log, isLoading, successCount, skippedCount, failedCount } = useCopyTradeLog(30);

  const historyRows = useMemo(() => {
    return log.map(entry => ({
      id:       entry.id,
      time:     format(new Date(entry.created_at), 'HH:mm:ss'),
      contract: entry.target_symbol || entry.source_symbol || 'NQ',
      type:     entry.action === 'close' ? 'Close' : 'Limit',
      side:     entry.action === 'close' ? 'Sell' : 'Buy',
      qty:      entry.copied_quantity ?? entry.original_quantity ?? 1,
      price:    null as number | null,
      status:   entry.status === 'success' ? 'Filled' : entry.status,
    }));
  }, [log]);

  const statusConfig = {
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    skipped: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10' },
  };

  return (
    <div className={compact ? 'min-h-[184px]' : 'space-y-4'}>
      {!compact && <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
            <History className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Copy History</h3>
            <p className="text-[11px] text-zinc-500">Last 30 copy actions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {successCount > 0 && (
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {successCount} copied
            </span>
          )}
          {skippedCount > 0 && (
            <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              {skippedCount} skipped
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
              {failedCount} failed
            </span>
          )}
        </div>
      </div>}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-zinc-900/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-end gap-2">
              <button className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
              <button className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-800/70 bg-zinc-950/35">
              <div className="grid grid-cols-[120px_1fr_120px_120px_80px_140px_100px] border-b border-zinc-800/70 bg-zinc-900/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <span>Time</span>
                <span>Contract</span>
                <span>Type</span>
                <span>Side</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">Status</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {historyRows.length === 0 ? (
                  <div className="px-3 py-8 text-center text-xs text-zinc-500">
                    No copy history yet — once a copied trade fires, it will appear here.
                  </div>
                ) : (
                  historyRows.map(order => (
                    <div key={order.id} className="grid min-h-[34px] grid-cols-[120px_1fr_120px_120px_80px_140px_100px] items-center px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900/50">
                      <span className="font-mono text-xs text-zinc-500">{order.time}</span>
                      <span className="font-mono text-xs font-semibold">{order.contract}</span>
                      <span className="text-xs text-zinc-400">{order.type}</span>
                      <span className={order.side === 'Buy' ? 'text-emerald-400' : 'text-red-400'}>
                        {order.side === 'Buy' ? 'up ' : 'down '}
                        {order.side}
                      </span>
                      <span className="text-right font-mono text-xs">{order.qty}</span>
                      <span className="text-right font-mono text-xs">{order.price != null ? order.price.toFixed(2) : '-'}</span>
                      <span className="text-right">
                        <span className="rounded-sm bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                          {order.status}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          {/* eslint-disable-next-line no-constant-binary-expression */}
          {false && (
            <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pr-1">
          {log.map(entry => {
            const cfg = statusConfig[entry.status as keyof typeof statusConfig] ?? statusConfig.failed;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/60 transition-all"
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${cfg.bg} ${cfg.color}`}>
                  {entry.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300">
                    {entry.original_quantity} → {entry.copied_quantity ?? 0} contracts
                    {entry.ratio_applied && (
                      <span className="text-zinc-600 ml-1">({Math.round(entry.ratio_applied * 100)}%)</span>
                    )}
                  </p>
                  {entry.error_message && (
                    <p className="text-[10px] text-red-400/70 truncate">{entry.error_message}</p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {format(new Date(entry.created_at), 'MMM d HH:mm')}
                </span>
              </div>
            );
          })}
            </div>
          )}
        </>
      )}
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────
export default function TradeCopier() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useSubscription();

  // Portfolios are the source of truth for account display (same as journal).
  const { portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const [showAddBroker, setShowAddBroker] = useState(false);

  // Tab selection is path-based: last path segment determines active tab.
  type ActiveTab = 'overview' | 'copier' | 'risk' | 'agent' | 'install';
  const activeTab: ActiveTab = (() => {
    const seg = location.pathname.split('/').pop() ?? '';
    if (seg === 'copier')  return 'copier';
    if (seg === 'risk')    return 'risk';
    if (seg === 'agent')   return 'agent';
    if (seg === 'install') return 'install';
    return 'overview';
  })();

  if (!isAdmin) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center mx-auto">
          <Zap className="w-8 h-8 text-[#C9A646]" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/25 text-[#C9A646] text-xs font-semibold tracking-wider uppercase">
          Private Beta
        </div>
        <h2 className="text-xl font-bold text-white">Trade Copier — Private Beta</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          We&apos;re fire-testing the copier with admin accounts before public release.
          Stay tuned — this will open to all Premium members soon.
        </p>
      </div>
    </div>
  );

  // Non-manual portfolios: the same accounts visible in the journal, used for
  // presence checks (e.g. the "Set a leader" banner).
  const brokerPortfolios = useMemo(
    () => (portfoliosLoading ? [] : portfolios.filter((p) => p.source !== 'manual')),
    [portfolios, portfoliosLoading],
  );

  return (
    <CopierPremiumGate>
    <div className="relative min-h-screen overflow-hidden bg-surface-base text-ink-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(201,166,70,0.08),transparent_70%)]" />

      <div className="relative w-full max-w-[1280px] mx-auto px-ds-5 py-ds-7 space-y-ds-6">

        {/* ── Tab: Accounts (overview) ── */}
        {activeTab === 'overview' && (
          <>
            {brokerPortfolios.length > 0 && (
              <div className="flex min-h-[56px] items-center justify-between gap-ds-4 rounded-lg border border-blue-500/25 bg-blue-500/10 px-ds-4">
                <div className="flex items-center gap-ds-3">
                  <Crown className="h-5 w-5 text-gold-primary" />
                  <span className="text-sm font-medium text-ink-primary">Set a leader account for copy trading</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app/copy-trade/copier')}
                  className="inline-flex items-center gap-ds-2 rounded-md bg-blue-500 px-ds-3 py-ds-2 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
                >
                  Set a leader
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <SectionCard>
            <div className="flex items-center gap-ds-3 mb-ds-4">
              <div className="w-9 h-9 rounded-lg bg-gold-primary/10 border border-gold-border flex items-center justify-center">
                <Link2 className="w-4 h-4 text-gold-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink-primary">Broker Connections</h2>
                <p className="text-[11px] text-ink-secondary">Auto-syncing — no manual refresh needed</p>
              </div>
            </div>

            {/* Journal-sourced accounts view — same portfolios/grouping as the trade journal */}
            <JournalAccountsOverview />
            </SectionCard>
          </>
        )}

        {/* ── Tab: Copier (route builder via local agent) ── */}
        {activeTab === 'copier' && (
          <SectionCard>
            <CopyPanel />
          </SectionCard>
        )}

        {/* ── Tab: Risk (agent-enforced risk rules) ── */}
        {/* No SectionCard: RiskRulesTab renders its own cards full-width. */}
        {activeTab === 'risk' && <RiskRulesTab />}

        {/* ── Tab: Agent (device pairing + status) ── */}
        {activeTab === 'agent' && <AgentStatusTab />}

        {/* ── Tab: Install (NinjaTrader agent setup guide) ── */}
        {activeTab === 'install' && <InstallAgentTab />}

      </div>

      {showAddBroker && (
        <AddBrokerPopup open={showAddBroker} onOpenChange={setShowAddBroker} />
      )}
    </div>
    </CopierPremiumGate>
  );
}
