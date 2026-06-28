// src/components/copyTrading/CopyTradingDashboard.tsx
// ═══════════════════════════════════════════════════════════════
// Copy Trading Dashboard — Sprint #4a
// Leader dropdown, inline Ratio/Cross editing, FLATTEN double-check.
// ═══════════════════════════════════════════════════════════════

import { memo, useEffect, useMemo, useState } from 'react';
import { AlertOctagon, Crown, Plus, Search, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { usePortfolios } from '@/hooks/usePortfolios';
import { buildAccountGroups } from '@/components/journal/accountGrouping';
import { useCopyRules } from '@/hooks/useCopyRules';
import type { CopyRule } from '@/hooks/useCopyRules';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFlattenAll } from '@/features/automation/hooks/useFlattenAll';

// ─── Helpers ──────────────────────────────────────────────────

function parsePositiveNumber(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parsePositiveInt(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ─── Types ────────────────────────────────────────────────────

interface AccountRowData {
  id: string;
  connectionName: string;
  accountName: string;
  symbol: string;
  live: boolean;
  issue: boolean;
  position: number | null;
  balance: number | null;
  dayPnL: number | null;
  openPnL: number | null;
  qty: number | null;
  following: boolean;
  portfolioId: string | null;
}

interface InstrumentTab {
  id: string;
  symbol: string;
}

// ─── Popular futures contracts for autocomplete ───────────────

const POPULAR_CONTRACTS = [
  { symbol: 'NQ',  name: 'E-Mini Nasdaq 100' },
  { symbol: 'MNQ', name: 'Micro E-Mini Nasdaq 100' },
  { symbol: 'ES',  name: 'E-Mini S&P 500' },
  { symbol: 'MES', name: 'Micro E-Mini S&P 500' },
  { symbol: 'RTY', name: 'E-Mini Russell 2000' },
  { symbol: 'M2K', name: 'Micro E-Mini Russell 2000' },
  { symbol: 'YM',  name: 'E-Mini Dow' },
  { symbol: 'MYM', name: 'Micro E-Mini Dow' },
  { symbol: 'GC',  name: 'Gold Futures' },
  { symbol: 'MGC', name: 'Micro Gold' },
  { symbol: 'SI',  name: 'Silver Futures' },
  { symbol: 'SIL', name: 'Micro Silver' },
  { symbol: 'CL',  name: 'Crude Oil' },
  { symbol: 'MCL', name: 'Micro Crude Oil' },
  { symbol: 'NG',  name: 'Natural Gas' },
  { symbol: 'BTC', name: 'Bitcoin Futures' },
  { symbol: 'MBT', name: 'Micro Bitcoin' },
  { symbol: 'ETH', name: 'Ether Futures' },
] as const;

// ─── Table column grid (shared by header + rows) ──────────────
// 14 cols: leader-radio · follow · connection · account · symbol · ratio · cross · position · balance · dayPnL · openPnL · qty · actions

const GRID_COLS =
  'grid-cols-[56px_60px_120px_minmax(160px,1fr)_80px_80px_60px_90px_100px_100px_100px_60px_80px]';

// ─── Internal AccountRow ──────────────────────────────────────

const CopyAccountRow = memo(function CopyAccountRow({
  row,
  isLeader,
  hasLeader,
  rule,
  isCreating,
  isUpdating,
  onFollowToggle,
  onUpdateRule,
  onSelectLeader,
}: {
  row: AccountRowData;
  isLeader: boolean;
  hasLeader: boolean;
  rule: CopyRule | null;
  isCreating: boolean;
  isUpdating: boolean;
  onFollowToggle: (currentRatioDraft: number) => Promise<void>;
  onUpdateRule: (patch: Partial<CopyRule>) => Promise<void>;
  onSelectLeader: () => void;
}) {
  const isFollowing = rule?.is_active ?? false;

  // Local ratio draft — used as the value when creating a new rule, and kept
  // in sync with the persisted ratio when one exists.
  const [ratioDraft, setRatioDraft] = useState(String(rule?.ratio ?? 1));
  // Sync when the server-side rule changes (e.g. after a createRule resolves).
  useEffect(() => {
    setRatioDraft(String(rule?.ratio ?? 1));
  }, [rule?.ratio]);

  // Local max_contracts draft — empty string means "no cap" (null).
  const [maxDraft, setMaxDraft] = useState(
    rule?.max_contracts != null ? String(rule.max_contracts) : '',
  );
  useEffect(() => {
    setMaxDraft(rule?.max_contracts != null ? String(rule.max_contracts) : '');
  }, [rule?.max_contracts]);

  // Derive disabled / title for the Follow toggle.
  const followDisabled = !hasLeader || isLeader || isCreating || isUpdating;
  const followTitle = isLeader
    ? 'This account is the leader — it cannot follow itself'
    : !hasLeader
      ? 'Select a leader first (use the radio button)'
      : isCreating || isUpdating
        ? 'Saving…'
        : isFollowing
          ? 'Click to unfollow this leader'
          : 'Click to follow this leader';

  const isPending = isCreating || isUpdating;

  return (
    <div
      className={`grid ${GRID_COLS} gap-ds-2 px-ds-3 py-ds-3 border-b border-border-ds-subtle last:border-b-0 hover:bg-surface-2 transition-colors duration-base`}
    >
      {/* Leader radio col */}
      <div className="flex items-center justify-center gap-ds-1">
        <input
          type="radio"
          name="leader-select"
          checked={isLeader}
          onChange={onSelectLeader}
          title="Set as leader"
          aria-label={`Set ${row.accountName} as leader`}
          className="h-3.5 w-3.5 cursor-pointer accent-gold-primary"
        />
        {isLeader && <Crown className="w-3.5 h-3.5 text-gold-primary flex-shrink-0" />}
      </div>

      {/* Follow toggle */}
      <div className="flex items-center">
        {!isLeader && (
          <button
            disabled={followDisabled}
            onClick={() => onFollowToggle(parsePositiveNumber(ratioDraft, 1))}
            className={`relative w-9 h-5 rounded-full transition-colors duration-base ${
              isFollowing
                ? 'bg-status-success'
                : 'bg-status-offline border border-border-ds-default'
            } ${followDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${
              isPending ? 'animate-pulse' : ''
            }`}
            aria-label={`Follow toggle for ${row.accountName}`}
            title={followTitle}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 bg-ink-primary rounded-full transition-transform duration-base ${
                isFollowing ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        )}
      </div>

      {/* Connection */}
      <div className="text-sm text-ink-primary truncate">{row.connectionName}</div>

      {/* Account + status dot */}
      <div className="flex items-center gap-ds-2 min-w-0">
        <span
          className={`h-2 w-2 rounded-full flex-shrink-0 ${
            row.live
              ? 'bg-status-success animate-pulse'
              : row.issue
                ? 'bg-status-warning'
                : 'bg-status-offline border border-border-ds-default'
          }`}
        />
        <span className="text-sm text-ink-primary truncate">{row.accountName}</span>
      </div>

      {/* Symbol */}
      <div className="text-sm text-ink-primary truncate">
        {row.symbol ?? '—'}
      </div>

      {/* Ratio + max contracts — inline editable for non-leaders */}
      <div className="flex items-center gap-ds-1">
        {isLeader ? (
          <span className="text-sm text-ink-tertiary">—</span>
        ) : (
          <>
            <input
              type="text"
              inputMode="decimal"
              value={ratioDraft}
              onChange={(e) => setRatioDraft(e.target.value)}
              onBlur={async (e) => {
                const newRatio = parsePositiveNumber(e.target.value, 1);
                // Normalize display value even if not following yet.
                setRatioDraft(String(newRatio));
                if (isFollowing && rule) {
                  await onUpdateRule({ ratio: newRatio });
                }
              }}
              aria-label={`Copy ratio for ${row.accountName}`}
              title="Copy ratio from leader to this account (e.g. 0.5 = half size)"
              className="w-10 px-1 py-1 rounded-sm bg-surface-base border border-border-ds-subtle text-xs text-ink-primary text-center focus:border-gold-border outline-none"
            />
            {/* Max contracts — empty = no cap */}
            <div className="flex flex-col items-center" title="Max contracts cap (empty = no limit)">
              <span className="text-[9px] text-ink-tertiary leading-none mb-0.5">max</span>
              <input
                type="text"
                inputMode="numeric"
                value={maxDraft}
                placeholder="∞"
                onChange={(e) => setMaxDraft(e.target.value)}
                onBlur={async (e) => {
                  const parsed = parsePositiveInt(e.target.value.trim());
                  // Normalize display: empty if null.
                  setMaxDraft(parsed != null ? String(parsed) : '');
                  if (isFollowing && rule) {
                    await onUpdateRule({ max_contracts: parsed });
                  }
                }}
                aria-label={`Max contracts for ${row.accountName}`}
                className="w-8 px-1 py-1 rounded-sm bg-surface-base border border-border-ds-subtle text-xs text-ink-primary text-center focus:border-gold-border outline-none placeholder:text-ink-tertiary"
              />
            </div>
          </>
        )}
      </div>

      {/* Cross-to-micro toggle */}
      <div className="flex items-center">
        {isLeader ? (
          <span className="text-sm text-ink-tertiary">—</span>
        ) : (
          <button
            disabled={!isFollowing || isPending}
            onClick={async () => {
              if (rule) {
                await onUpdateRule({ cross_to_micro: !rule.cross_to_micro });
              }
            }}
            className={`relative w-9 h-5 rounded-full transition-colors duration-base ${
              rule?.cross_to_micro
                ? 'bg-status-success'
                : 'bg-status-offline border border-border-ds-default'
            } ${!isFollowing || isPending ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${isPending ? 'animate-pulse' : ''}`}
            aria-label="Cross-to-micro toggle"
            title={
              !isFollowing
                ? 'Follow this leader first to enable cross-to-micro (e.g. NQ→MNQ)'
                : rule?.cross_to_micro
                  ? 'Cross-to-micro ON — copies the leader\'s instrument as its micro contract (e.g. NQ→MNQ). Click to disable.'
                  : 'Cross-to-micro OFF — copies the same instrument as the leader. Click to enable (e.g. NQ→MNQ).'
            }
          >
            <span
              className={`absolute top-0.5 w-3 h-3 bg-ink-primary rounded-full transition-transform duration-base ${
                rule?.cross_to_micro ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        )}
      </div>

      {/* Position */}
      <div
        className={`text-sm text-right ${
          row.position != null && row.position < 0 ? 'text-num-negative' : 'text-ink-primary'
        }`}
      >
        {row.position ?? '—'}
      </div>

      {/* Balance */}
      <div className="text-sm text-right text-ink-primary">
        {row.balance != null ? `$${row.balance.toFixed(2)}` : '—'}
      </div>

      {/* Day PnL */}
      <div
        className={`text-sm text-right ${
          row.dayPnL != null && row.dayPnL < 0 ? 'text-num-negative' : 'text-ink-primary'
        }`}
      >
        {row.dayPnL != null
          ? (row.dayPnL >= 0 ? '$' : '−$') + Math.abs(row.dayPnL).toFixed(2)
          : '—'}
      </div>

      {/* Open PnL */}
      <div
        className={`text-sm text-right ${
          row.openPnL != null && row.openPnL < 0 ? 'text-num-negative' : 'text-ink-primary'
        }`}
      >
        {row.openPnL != null
          ? (row.openPnL >= 0 ? '$' : '−$') + Math.abs(row.openPnL).toFixed(2)
          : '—'}
      </div>

      {/* Qty */}
      <div className="text-sm text-right text-ink-primary">
        {row.qty ?? '—'}
      </div>

      {/* Actions — flatten runs via desktop agent */}
      <div className="flex items-center justify-start">
        <span className="text-xs text-ink-tertiary">via agent</span>
      </div>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────

export function CopyTradingDashboard() {
  // Show all journal broker connections — used for live status enrichment only.
  const { connections } = useBrokerConnections({ active: true });
  // liveCredentialIds: always empty — cloud engine session polling removed.
  const liveCredentialIds = useMemo(() => new Set<string>(), []);
  const { tradovatePortfolios, brokerPortfolios } = usePortfolios();
  const [instrumentTabs, setInstrumentTabs] = useState<InstrumentTab[]>([
    { id: 'asset-1', symbol: 'NQ' },
  ]);
  const [activeInstrumentTabId, setActiveInstrumentTabId] = useState('asset-1');
  const activeInstrumentTab = useMemo(
    () => instrumentTabs.find((tab) => tab.id === activeInstrumentTabId) ?? instrumentTabs[0],
    [activeInstrumentTabId, instrumentTabs],
  );
  const instrument = activeInstrumentTab?.symbol ?? 'NQ';
  const [instrumentDraft, setInstrumentDraft] = useState(instrument);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { rules, updateRule, isUpdating, createRule, isCreating } = useCopyRules();

  useEffect(() => {
    setInstrumentDraft(instrument);
  }, [instrument]);

  // Build account groups from portfolios — identical to the journal's AccountFilterDropdown.
  // Exclude manual portfolios (no broker = not copyable). This is the ONE source of truth.
  const accountGroups = useMemo(
    () => buildAccountGroups(tradovatePortfolios, brokerPortfolios, []),
    [tradovatePortfolios, brokerPortfolios],
  );

  // Flat list of all broker portfolios (no manual), preserving group order.
  const brokerAccountPortfolios = useMemo(
    () => accountGroups.flatMap((g) => g.portfolios),
    [accountGroups],
  );

  // Build a map from broker_connection_id / credential_id → connection for live-status lookup.
  const connectionById = useMemo(
    () => new Map(connections.map((c) => [c.id, c])),
    [connections],
  );

  // Leader: portfolio id — defaults to the first non-manual portfolio.
  const [leaderId, setLeaderId] = useState<string | null>(
    brokerAccountPortfolios[0]?.id ?? null,
  );

  // leaderPortfolioId is the same as leaderId (portfolios are the source of truth now).
  const leaderPortfolioId = leaderId;

  // Helper: find rule for a given follower portfolio
  function ruleFor(targetPortfolioId: string | null): CopyRule | null {
    if (!leaderPortfolioId || !targetPortfolioId) return null;
    return (
      rules.find(
        (r) =>
          r.source_portfolio_id === leaderPortfolioId &&
          r.target_portfolio_id === targetPortfolioId,
      ) ?? null
    );
  }

  // Build rows from portfolios (journal source of truth), grouped by connection.
  // Live position/balance columns come from the desktop agent — null until paired.
  const rows = useMemo<AccountRowData[]>(() => {
    return accountGroups.flatMap((group) =>
      group.portfolios.map((p) => {
        // Resolve the live broker_connection for status: credential_id for Tradovate,
        // broker_connection_id for non-Tradovate broker portfolios.
        const connId = p.credential_id ?? p.broker_connection_id;
        const conn = connId ? connectionById.get(connId) : undefined;

        const tokenExpired = conn?.token_expires_at
          ? new Date(conn.token_expires_at) < new Date()
          : false;
        // "live" = in a cloud engine session (always false — agent-based, no cloud polling).
        const live = Boolean(connId && liveCredentialIds.has(connId));
        const issue = !live && conn != null && conn.is_active && conn.status === 'connected' && tokenExpired;

        return {
          id:             p.id,
          connectionName: group.label,
          accountName:    p.name,
          symbol:         instrument,
          live,
          issue,
          // Live data supplied by desktop agent — null until agent is paired.
          position:  null,
          balance:   null,
          dayPnL:    null,
          openPnL:   null,
          qty:       null,
          following: p.is_active,
          portfolioId: p.id,
        };
      }),
    );
  }, [accountGroups, connectionById, liveCredentialIds, instrument]);

  // Summary bar
  const totalDayPnL        = rows.reduce((s, r) => s + (r.dayPnL  ?? 0), 0);
  const totalOpenPnL       = rows.reduce((s, r) => s + (r.openPnL ?? 0), 0);
  const totalBalance       = rows.reduce((s, r) => s + (r.balance ?? 0), 0);
  const openPositionsCount = rows.filter((r) => (r.position ?? 0) !== 0).length;

  // ── Contract autocomplete suggestions ─────────────────────────
  const normalizedDraftInstrument = instrumentDraft.trim().toUpperCase();
  const canAddInstrument =
    normalizedDraftInstrument.length > 0 &&
    normalizedDraftInstrument !== instrument;

  const filteredContracts = POPULAR_CONTRACTS.filter(
    (c) =>
      normalizedDraftInstrument.length === 0 ||
      c.symbol.toUpperCase().includes(normalizedDraftInstrument),
  ).slice(0, 8);

  const setActiveTabInstrument = (symbol: string) => {
    const nextSymbol = symbol.trim().toUpperCase();
    if (!nextSymbol) return;
    if (nextSymbol === instrument) {
      setInstrumentDraft(nextSymbol);
      setShowSuggestions(false);
      return;
    }
    setInstrumentTabs((current) =>
      current.map((tab) =>
        tab.id === activeInstrumentTabId
          ? { ...tab, symbol: nextSymbol }
          : tab,
      ),
    );
    setInstrumentDraft(nextSymbol);
    setShowSuggestions(false);
    toast.success(`Tracking ${nextSymbol} in this tab`);
  };

  const handleAddInstrumentToWatch = () => {
    setActiveTabInstrument(normalizedDraftInstrument);
  };

  const handleAddInstrumentTab = () => {
    const usedSymbols = new Set(instrumentTabs.map((tab) => tab.symbol));
    const nextSymbol =
      POPULAR_CONTRACTS.find((contract) => !usedSymbols.has(contract.symbol))?.symbol ?? 'NQ';
    const nextTab: InstrumentTab = {
      id: `asset-${Date.now()}`,
      symbol: nextSymbol,
    };

    setInstrumentTabs((current) => [...current, nextTab]);
    setActiveInstrumentTabId(nextTab.id);
    setInstrumentDraft(nextSymbol);
    setShowSuggestions(false);
  };

  const handleCloseInstrumentTab = (tabId: string) => {
    if (instrumentTabs.length <= 1) return;
    const closingIndex = instrumentTabs.findIndex((tab) => tab.id === tabId);
    const nextTabs = instrumentTabs.filter((tab) => tab.id !== tabId);
    const nextActiveTab =
      activeInstrumentTabId === tabId
        ? nextTabs[Math.max(0, closingIndex - 1)] ?? nextTabs[0]
        : activeInstrumentTab;

    setInstrumentTabs(nextTabs);
    if (nextActiveTab) {
      setActiveInstrumentTabId(nextActiveTab.id);
      setInstrumentDraft(nextActiveTab.symbol);
    }
    setShowSuggestions(false);
  };

  // Flatten is handled by the local desktop agent — no cloud-engine endpoints.

  // ── Flatten All ───────────────────────────────────────────────
  const { flattenAll, isFlattening } = useFlattenAll();
  const [showFlattenConfirm, setShowFlattenConfirm] = useState(false);

  const handleFlattenConfirm = async () => {
    setShowFlattenConfirm(false);
    const result = await flattenAll();
    if (result.status === 'sent') {
      toast.success('Flatten command sent to your agent.');
    } else if (result.status === 'no_agent') {
      toast.warning('No desktop agent is online — open the FINOTAUR Agent and pair a device.');
    } else {
      toast.error("Couldn't send flatten command. Try again.");
    }
  };

  return (
    <div className="min-h-[620px]">
      <div className="-mt-ds-6 mb-ds-4 flex items-end gap-ds-1 overflow-x-auto border-b border-gold-border/40 px-ds-3 pt-ds-1">
        {instrumentTabs.map((tab) => {
          const isActive = tab.id === activeInstrumentTabId;
          return (
            <div
              key={tab.id}
              className={`flex h-9 min-w-[92px] items-center gap-ds-1 rounded-t-md border border-b-0 px-ds-2 transition-colors ${
                isActive
                  ? 'border-gold-border bg-gold-primary/10 text-gold-primary shadow-[0_0_18px_rgba(201,166,70,0.10)]'
                  : 'border-gold-border/20 bg-gold-primary/[0.03] text-ink-secondary hover:bg-gold-primary/10 hover:text-gold-primary'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveInstrumentTabId(tab.id);
                  setInstrumentDraft(tab.symbol);
                  setShowSuggestions(false);
                }}
                className="min-w-0 flex-1 truncate text-left text-xs font-semibold"
              >
                {tab.symbol}
              </button>
              {instrumentTabs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleCloseInstrumentTab(tab.id)}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm text-ink-tertiary transition-colors hover:bg-white/10 hover:text-ink-primary"
                  aria-label={`Close ${tab.symbol} tab`}
                  title={`Close ${tab.symbol}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleAddInstrumentTab}
          className="mb-px flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-gold-border/30 bg-gold-primary/[0.05] text-gold-primary/80 transition-colors hover:border-gold-border hover:bg-gold-primary/10 hover:text-gold-primary"
          aria-label="Add asset tab"
          title="Add asset tab"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-ds-3 mb-ds-4">
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Total Day PnL
          </div>
          <div className="text-base font-semibold text-ink-primary mt-1">
            {totalDayPnL >= 0 ? '$' : '-$'}
            {Math.abs(totalDayPnL).toFixed(2)}
          </div>
        </div>
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Total Open PnL
          </div>
          <div
            className={`text-base font-semibold mt-1 ${
              totalOpenPnL < 0 ? 'text-num-negative' : 'text-ink-primary'
            }`}
          >
            {totalOpenPnL >= 0 ? '$' : '-$'}
            {Math.abs(totalOpenPnL).toFixed(2)}
          </div>
        </div>
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Total Balance
          </div>
          <div className="text-base font-semibold text-ink-primary mt-1">
            ${totalBalance.toFixed(2)}
          </div>
        </div>
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Open Positions
          </div>
          <div className="text-base font-semibold text-ink-primary mt-1">
            {openPositionsCount}
          </div>
        </div>
      </div>
      {/* ── 1. Asset selector + action bar ── */}
      <div className="relative z-20 flex items-center justify-between mb-ds-4 gap-ds-4">
        {/* ── Active Contract with typeahead ── */}
        <div className="flex items-center gap-ds-3">
          <div className="relative">
            <div className="flex h-11 min-w-[210px] items-center gap-ds-2 rounded-2xl border border-blue-500/35 bg-blue-500/10 px-ds-4 shadow-[0_0_22px_rgba(59,130,246,0.12)] transition-colors hover:border-blue-400/60">
              <Search className="h-4 w-4 text-blue-200/70" />
              <input
                type="text"
                value={instrumentDraft}
                onChange={(e) => {
                  setInstrumentDraft(e.target.value.toUpperCase());
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInstrumentToWatch();
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Search ticker..."
                className="w-36 border-0 bg-transparent text-sm font-semibold uppercase text-blue-100 outline-none placeholder:normal-case placeholder:text-blue-200/40"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAddInstrumentToWatch();
                }}
                disabled={!canAddInstrument}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-400/35 bg-blue-400/10 text-blue-100 transition-colors hover:border-blue-300/60 hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Set active tab ticker"
                title="Set active tab ticker"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {showSuggestions && filteredContracts.length > 0 && (
              <div className="absolute top-full mt-2 left-0 z-50 w-[280px] overflow-hidden rounded-xl border border-blue-500/35 bg-[#080b12] shadow-[0_18px_50px_rgba(0,0,0,0.85),0_0_24px_rgba(59,130,246,0.18)]">
                {filteredContracts.map((c) => (
                  <button
                    key={c.symbol}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveTabInstrument(c.symbol);
                    }}
                    className="w-full flex items-center justify-between px-ds-3 py-ds-2 hover:bg-blue-500/15 transition-colors duration-base text-left"
                  >
                    <span className="text-sm font-semibold text-white">
                      {c.symbol}
                    </span>
                    <span className="text-[11px] text-blue-100/65 truncate ml-ds-2">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FLATTEN ALL — customer-initiated, executed by the local desktop agent */}
        <button
          type="button"
          onClick={() => setShowFlattenConfirm(true)}
          disabled={isFlattening}
          className="flex items-center gap-ds-2 rounded-lg border border-red-600/60 bg-red-600/10 px-ds-4 py-ds-2 text-sm font-semibold text-red-400 shadow-[0_0_18px_rgba(220,38,38,0.10)] transition-colors hover:border-red-500 hover:bg-red-600/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Flatten all positions"
          title="Immediately closes every open position and cancels working orders via your desktop agent"
        >
          <AlertOctagon className="h-4 w-4 flex-shrink-0" />
          {isFlattening ? 'Sending…' : 'FLATTEN ALL'}
        </button>
      </div>

      {/* ── 2. Summary bar ── */}
      <div className="hidden">
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Total Day PnL
          </div>
          <div className="text-base font-semibold text-ink-primary mt-1">
            {totalDayPnL >= 0 ? '$' : '−$'}
            {Math.abs(totalDayPnL).toFixed(2)}
          </div>
        </div>
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Total Open PnL
          </div>
          <div
            className={`text-base font-semibold mt-1 ${
              totalOpenPnL < 0 ? 'text-num-negative' : 'text-ink-primary'
            }`}
          >
            {totalOpenPnL >= 0 ? '$' : '−$'}
            {Math.abs(totalOpenPnL).toFixed(2)}
          </div>
        </div>
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Total Balance
          </div>
          <div className="text-base font-semibold text-ink-primary mt-1">
            ${totalBalance.toFixed(2)}
          </div>
        </div>
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Open Positions
          </div>
          <div className="text-base font-semibold text-ink-primary mt-1">
            {openPositionsCount}
          </div>
        </div>
      </div>

      {/* ── 3. Account table ── */}
      <div className="rounded-lg bg-surface-1 border border-border-ds-subtle overflow-hidden">
        {/* Table header */}
        <div
          className={`grid ${GRID_COLS} gap-ds-2 px-ds-3 py-ds-2 border-b border-border-ds-subtle text-[10px] font-medium uppercase tracking-wider text-ink-secondary`}
        >
          <div>Leader</div>
          <div>Follow</div>
          <div>Connection</div>
          <div>Account</div>
          <div>Symbol</div>
          <div>Ratio</div>
          <div>Cross</div>
          <div className="text-right">Position</div>
          <div className="text-right">Balance</div>
          <div className="text-right">Day PnL</div>
          <div className="text-right">Open PnL</div>
          <div className="text-right">Qty</div>
          <div>Actions</div>
        </div>

        {/* Rows */}
        {rows.map((row) => {
          const rule = ruleFor(row.portfolioId);
          const isLeader = row.id === leaderId;
          return (
            <CopyAccountRow
              key={row.id}
              row={row}
              isLeader={isLeader}
              hasLeader={leaderPortfolioId != null}
              rule={rule}
              isCreating={isCreating}
              isUpdating={isUpdating}
              onSelectLeader={() => setLeaderId(row.id)}
              onFollowToggle={async (currentRatioDraft) => {
                if (!leaderPortfolioId || !row.portfolioId || isLeader) return;
                if (rule?.is_active) {
                  // Unfollow: set is_active false (hook will remove the target).
                  await updateRule({ id: rule.id, patch: { is_active: false } });
                } else {
                  // Follow: create the rule (or re-activate if a stale rule exists).
                  await createRule({
                    source_portfolio_id: leaderPortfolioId,
                    target_portfolio_id: row.portfolioId,
                    ratio:               currentRatioDraft,
                    is_active:           true,
                  });
                }
              }}
              onUpdateRule={async (patch) => {
                if (rule) {
                  await updateRule({ id: rule.id, patch });
                }
                // If not yet following, patches are held locally in the row's
                // draft state (ratio/max) and applied when the user enables Follow.
              }}
            />
          );
        })}

        {/* Empty state */}
        {rows.length === 0 && (
          <div className="px-ds-5 py-ds-7 flex flex-col items-center justify-center gap-ds-2">
            <Users className="w-8 h-8 text-ink-tertiary" />
            <p className="text-sm text-ink-secondary">
              No connected accounts. Connect a broker in the Connections tab.
            </p>
          </div>
        )}
      </div>

      {/* ── Flatten All confirm modal ── */}
      <Dialog open={showFlattenConfirm} onOpenChange={setShowFlattenConfirm}>
        <DialogContent className="max-w-md border-red-600/40 bg-[#0d0f14]">
          <DialogTitle className="flex items-center gap-ds-2 text-red-400">
            <AlertOctagon className="h-5 w-5 flex-shrink-0" />
            Flatten ALL
          </DialogTitle>

          <p className="text-sm text-ink-secondary leading-relaxed">
            This immediately closes <span className="font-semibold text-ink-primary">every open position</span> and
            cancels <span className="font-semibold text-ink-primary">all working orders</span> on your copied accounts,
            executed locally by your desktop agent.
          </p>

          <div className="mt-ds-2 flex justify-end gap-ds-3">
            <button
              type="button"
              onClick={() => setShowFlattenConfirm(false)}
              className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 text-sm text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFlattenConfirm}
              className="flex items-center gap-ds-2 rounded-md border border-red-600/60 bg-red-600/15 px-ds-4 py-ds-2 text-sm font-semibold text-red-400 transition-colors hover:border-red-500 hover:bg-red-600/25 hover:text-red-300"
            >
              <AlertOctagon className="h-4 w-4 flex-shrink-0" />
              Yes, Flatten All
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default CopyTradingDashboard;
