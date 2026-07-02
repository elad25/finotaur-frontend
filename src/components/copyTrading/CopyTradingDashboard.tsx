// src/components/copyTrading/CopyTradingDashboard.tsx
// ═══════════════════════════════════════════════════════════════
// Copy Trading Dashboard — Sprint #4a
// Leader dropdown, inline Ratio/Cross editing, FLATTEN double-check.
// ═══════════════════════════════════════════════════════════════

import { memo, useEffect, useMemo, useState } from 'react';
import { AlertOctagon, Ban, ChevronDown, ChevronUp, Crown, Lock, LockOpen, Plus, Search, Users, X } from 'lucide-react';
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
import { useAgentCommand } from '@/features/automation/hooks/useAgentCommand';
import { useAgentAccountSnapshots } from '@/features/automation/hooks/useAgentAccountSnapshots';
import { AutomationMasterSwitch } from '@/features/automation/components/AutomationMasterSwitch';
import { useLockAllAccounts } from '@/features/automation/hooks/useLockAllAccounts';
import { useAccountRiskSummaries } from '@/features/automation/hooks/useAccountRiskSummaries';
import { EnforcementFeed } from '@/components/copyTrading/EnforcementFeed';

// ─── Helpers ──────────────────────────────────────────────────

function parsePositiveNumber(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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
  locked: boolean;
  riskSummaryLabel: string | null;
  riskSummaryTooltip: string | null;
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
// 13 cols: leader-radio · follow · connection · account · symbol · ratio · cross · position · balance · dayPnL · openPnL · qty · actions

const GRID_COLS =
  'grid-cols-[56px_60px_120px_minmax(230px,1.5fr)_80px_120px_64px_90px_100px_100px_100px_64px_80px] min-w-[1346px]';

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
  // ── Optimistic toggle overlays ──────────────────────────────
  // Reflect the user's click instantly; the overlay is dropped once the
  // server-backed rule catches up, and reverted by a safety timeout if the
  // write fails. This makes Follow / Cross feel immediate.
  const [optFollowing, setOptFollowing] = useState<boolean | null>(null);
  const [optCross, setOptCross]         = useState<boolean | null>(null);

  const realFollowing = rule?.is_active ?? false;
  const realCross     = rule?.cross_to_micro ?? false;
  const isFollowing   = optFollowing ?? realFollowing;
  const crossOn       = optCross ?? realCross;

  // Reconcile follow overlay: clear when reality matches, else revert after 6s.
  useEffect(() => {
    if (optFollowing === null) return;
    if (realFollowing === optFollowing) { setOptFollowing(null); return; }
    const t = setTimeout(() => setOptFollowing(null), 6000);
    return () => clearTimeout(t);
  }, [optFollowing, realFollowing]);

  // Reconcile cross overlay.
  useEffect(() => {
    if (optCross === null) return;
    if (realCross === optCross) { setOptCross(null); return; }
    const t = setTimeout(() => setOptCross(null), 6000);
    return () => clearTimeout(t);
  }, [optCross, realCross]);

  // Local ratio draft — used as the value when creating a new rule, and kept
  // in sync with the persisted ratio when one exists.
  const [ratioDraft, setRatioDraft] = useState(String(rule?.ratio ?? 1));
  // Sync when the server-side rule changes (e.g. after a createRule resolves).
  useEffect(() => {
    setRatioDraft(String(rule?.ratio ?? 1));
  }, [rule?.ratio]);

  // Derive disabled / title for the Follow toggle. Note: we intentionally do
  // NOT disable on the global isCreating/isUpdating — that froze every row while
  // one saved. Per-row double-fire is guarded via the optimistic overlay below.
  const followDisabled = !hasLeader || isLeader;
  const followTitle = isLeader
    ? 'This account is the leader — it cannot follow itself'
    : !hasLeader
      ? 'Select a leader first (use the radio button)'
      : isCreating || isUpdating
        ? 'Saving…'
        : isFollowing
          ? 'Click to unfollow this leader'
          : 'Click to follow this leader';

  return (
    <div
      className={`grid ${GRID_COLS} gap-ds-2 px-ds-3 py-ds-3 border-b border-border-ds-subtle last:border-b-0 hover:bg-surface-2 transition-colors duration-base`}
    >
      {/* Leader select col — empty gold-bordered square; crown marks the leader */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          role="radio"
          aria-checked={isLeader}
          onClick={onSelectLeader}
          title="Set as leader"
          aria-label={`Set ${row.accountName} as leader`}
          className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors duration-base ${
            isLeader
              ? 'border-gold-primary bg-gold-primary/10'
              : 'border-gold-border/50 hover:border-gold-primary/70'
          }`}
        >
          {isLeader && <Crown className="h-3.5 w-3.5 text-gold-primary" />}
        </button>
      </div>

      {/* Follow toggle */}
      <div className="flex items-center justify-center">
        {!isLeader && (
          <button
            disabled={followDisabled}
            onClick={() => {
              if (optFollowing !== null) return; // a write for this row is in flight
              setOptFollowing(!isFollowing);     // move instantly (optimistic)
              void onFollowToggle(parsePositiveNumber(ratioDraft, 1));
            }}
            className={`relative w-9 h-5 rounded-full transition-colors duration-base ${
              isFollowing
                ? 'bg-status-success'
                : 'bg-status-offline border border-border-ds-default'
            } ${followDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={`Follow toggle for ${row.accountName}`}
            title={followTitle}
          >
            <span
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-base ${
                isFollowing ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
        )}
      </div>

      {/* Connection */}
      <div className="text-sm text-ink-primary truncate">{row.connectionName}</div>

      {/* Account + status dot + lock badge + risk summary */}
      <div className="flex flex-col min-w-0 justify-center gap-0.5">
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
          <span title={row.accountName} className="text-xs text-ink-primary truncate">{row.accountName}</span>
          {row.locked && (
            <span
              title="Locked — copying disabled and account flattened until next session open"
              className="flex items-center gap-0.5 rounded-sm border border-status-danger/40 bg-status-danger/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-status-danger flex-shrink-0"
            >
              <Lock className="h-2.5 w-2.5" />
              Locked
            </span>
          )}
        </div>
        {row.riskSummaryLabel && (
          <span
            title={row.riskSummaryTooltip ?? undefined}
            className="ml-3.5 truncate text-[10px] text-ink-tertiary"
          >
            {row.riskSummaryLabel}
          </span>
        )}
      </div>

      {/* Symbol */}
      <div className="text-sm text-ink-primary truncate">
        {row.symbol ?? '—'}
      </div>

      {/* Ratio — inline editable for non-leaders */}
      <div className="flex items-center justify-center gap-ds-3">
        {isLeader ? (
          <span className="text-sm text-ink-tertiary">—</span>
        ) : (
          <div className="flex flex-col items-center" title="Copy ratio from leader to this account (e.g. 0.5 = half size)">
            <span className="text-[9px] uppercase tracking-wide text-ink-tertiary leading-none mb-0.5">ratio</span>
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
              className="w-11 px-1 py-1 rounded-sm bg-surface-base border border-border-ds-subtle text-xs text-ink-primary text-center focus:border-gold-border outline-none"
            />
          </div>
        )}
      </div>

      {/* Cross-to-micro toggle */}
      <div className="flex items-center justify-center">
        {isLeader ? (
          <span className="text-sm text-ink-tertiary">—</span>
        ) : (
          <button
            disabled={!isFollowing}
            onClick={() => {
              if (!rule || optCross !== null) return; // need a saved rule; guard double-fire
              setOptCross(!crossOn);                  // move instantly (optimistic)
              void onUpdateRule({ cross_to_micro: !crossOn });
            }}
            className={`relative w-9 h-5 rounded-full transition-colors duration-base ${
              crossOn
                ? 'bg-status-success'
                : 'bg-status-offline border border-border-ds-default'
            } ${!isFollowing ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label="Cross-to-micro toggle"
            title={
              !isFollowing
                ? 'Follow this leader first to enable cross-to-micro (e.g. NQ→MNQ)'
                : crossOn
                  ? 'Cross-to-micro ON — copies the leader\'s instrument as its micro contract (e.g. NQ→MNQ). Click to disable.'
                  : 'Cross-to-micro OFF — copies the same instrument as the leader. Click to enable (e.g. NQ→MNQ).'
            }
          >
            <span
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-base ${
                crossOn ? 'left-[18px]' : 'left-0.5'
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
          row.dayPnL == null
            ? 'text-ink-primary'
            : row.dayPnL > 0
            ? 'text-emerald-400'
            : row.dayPnL < 0
            ? 'text-num-negative'
            : 'text-ink-primary'
        }`}
      >
        {row.dayPnL != null
          ? (row.dayPnL >= 0 ? '$' : '−$') + Math.abs(row.dayPnL).toFixed(2)
          : '—'}
      </div>

      {/* Open PnL */}
      <div
        className={`text-sm text-right ${
          row.openPnL == null
            ? 'text-ink-primary'
            : row.openPnL > 0
            ? 'text-emerald-400'
            : row.openPnL < 0
            ? 'text-num-negative'
            : 'text-ink-primary'
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
      <div className="flex items-center justify-center">
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
  // Desktop agent snapshots — hydrates live balance/PnL/position columns.
  const { snapshotByAccountName } = useAgentAccountSnapshots();
  const { tradovatePortfolios, brokerPortfolios, portfolios } = usePortfolios();
  const { summaryByAccountId } = useAccountRiskSummaries();
  // Lookup: portfolio id -> kill_switch_active, sourced from the full
  // portfolios list (accountGroups only carries a subset of fields downstream).
  const killSwitchByPortfolioId = useMemo(
    () => new Map(portfolios.map((p) => [p.id, p.kill_switch_active ?? false])),
    [portfolios],
  );
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
  // Live balance/PnL/position columns are hydrated from the desktop agent snapshot.
  const rows = useMemo<AccountRowData[]>(() => {
    return accountGroups.flatMap((group) =>
      group.portfolios.map((p) => {
        // Resolve the live broker_connection for token-expiry status check.
        const connId = p.credential_id ?? p.broker_connection_id;
        const conn = connId ? connectionById.get(connId) : undefined;

        const tokenExpired = conn?.token_expires_at
          ? new Date(conn.token_expires_at) < new Date()
          : false;

        // Look up the agent snapshot for this account (case-insensitive).
        const snap = snapshotByAccountName(p.name);

        // "live" = agent has written a snapshot within the last 30 s.
        const live = snap?.online ?? false;
        // "issue" = token expired but agent is not actively reporting either
        // (keeps the amber dot for stale-token warnings from the broker connection).
        const issue = !live && conn != null && conn.is_active && conn.status === 'connected' && tokenExpired;

        // Net position for the active instrument tab: find the positions whose
        // symbol starts with or contains the active instrument (case-insensitive),
        // so a NQ snapshot entry covers NQ09-25, NQ SEP25, etc.
        const instrumentUpper = instrument.toUpperCase();
        const matchingPositions = (snap?.positions ?? []).filter((pos) =>
          pos.symbol.toUpperCase().includes(instrumentUpper),
        );
        const netPosition =
          matchingPositions.length > 0
            ? matchingPositions.reduce(
                (sum, pos) => sum + (pos.isLong ? pos.qty : -pos.qty),
                0,
              )
            : null;

        // Compact risk-rule summary, keyed by the Tradovate account id
        // (matches ManageRiskTab / automation_risk_rules.account_id).
        const riskSummary =
          p.tradovate_account_id != null
            ? summaryByAccountId.get(String(p.tradovate_account_id))
            : undefined;
        const riskParts: string[] = [];
        const riskTooltipParts: string[] = [];
        if (riskSummary?.dailyLossLimitUsd != null) {
          riskParts.push(`DL $${riskSummary.dailyLossLimitUsd}`);
          riskTooltipParts.push(`Daily loss limit: $${riskSummary.dailyLossLimitUsd}`);
        }
        if (riskSummary?.maxContracts != null) {
          riskParts.push(`MC ${riskSummary.maxContracts}`);
          riskTooltipParts.push(`Max contracts: ${riskSummary.maxContracts}`);
        }

        return {
          id:             p.id,
          connectionName: group.label,
          accountName:    p.name,
          symbol:         instrument,
          live,
          issue,
          // Live data from the desktop agent snapshot — null when no snapshot exists.
          position: netPosition,
          balance:  snap?.balance  ?? null,
          dayPnL:   snap?.dayPnlToday ?? null,
          openPnL:  snap?.openPnl  ?? null,
          qty:      snap != null ? snap.qty : null,
          following: p.is_active,
          portfolioId: p.id,
          locked: killSwitchByPortfolioId.get(p.id) ?? false,
          riskSummaryLabel: riskParts.length > 0 ? riskParts.join(' · ') : null,
          riskSummaryTooltip: riskTooltipParts.length > 0 ? riskTooltipParts.join(' · ') : null,
        };
      }),
    );
  }, [
    accountGroups,
    connectionById,
    liveCredentialIds,
    instrument,
    snapshotByAccountName,
    killSwitchByPortfolioId,
    summaryByAccountId,
  ]);

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

  // ── Sort state ───────────────────────────────────────────────
  const [sort, setSort] = useState<{
    key: 'account' | 'connection' | 'balance';
    dir: 'asc' | 'desc';
  } | null>(null);

  const toggleSort = (key: 'account' | 'connection' | 'balance') => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortedRows = useMemo<AccountRowData[]>(() => {
    if (sort === null) return rows;

    const { key, dir } = sort;
    const multiplier = dir === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      // Always keep the leader row(s) at the top regardless of sort direction.
      const aIsLeader = a.id === leaderId;
      const bIsLeader = b.id === leaderId;
      if (aIsLeader && !bIsLeader) return -1;
      if (!aIsLeader && bIsLeader) return 1;

      if (key === 'account') {
        return (
          multiplier *
          a.accountName.localeCompare(b.accountName, undefined, {
            sensitivity: 'base',
            numeric: true,
          })
        );
      }

      if (key === 'connection') {
        return (
          multiplier *
          a.connectionName.localeCompare(b.connectionName, undefined, {
            sensitivity: 'base',
            numeric: true,
          })
        );
      }

      // balance: nulls always sink to the bottom regardless of direction.
      if (key === 'balance') {
        const aNull = a.balance == null;
        const bNull = b.balance == null;
        if (aNull && bNull) return 0;
        if (aNull) return 1;
        if (bNull) return -1;
        return multiplier * ((a.balance as number) - (b.balance as number));
      }

      return 0;
    });
  }, [rows, sort, leaderId]);

  // Flatten is handled by the local desktop agent — no cloud-engine endpoints.

  // ── Lock all / Unlock all ───────────────────────────────────────
  const { lockAll, unlockAll, isLocking } = useLockAllAccounts();
  const [showLockAllConfirm, setShowLockAllConfirm] = useState(false);
  const [showUnlockAllConfirm, setShowUnlockAllConfirm] = useState(false);

  const handleLockAllConfirm = async () => {
    setShowLockAllConfirm(false);
    await lockAll();
  };

  const handleUnlockAllConfirm = async () => {
    setShowUnlockAllConfirm(false);
    await unlockAll();
  };

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

  // ── Cancel Orders ─────────────────────────────────────────────
  // Customer-initiated; executed by the local desktop agent.
  const { cancelOrders, flattenSymbol, isRunning: isCommandRunning } = useAgentCommand();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelOrdersConfirm = async () => {
    setShowCancelConfirm(false);
    const result = await cancelOrders();
    if (result.status === 'sent') {
      toast.success('Cancel orders command sent to your agent.');
    } else if (result.status === 'no_agent') {
      toast.warning('No desktop agent is online — open the FINOTAUR Agent and pair a device.');
    } else {
      toast.error("Couldn't send cancel command. Try again.");
    }
  };

  // ── Flatten Symbol ────────────────────────────────────────────
  // Customer-initiated; executed by the local desktop agent.
  const [showFlattenSymbolDialog, setShowFlattenSymbolDialog] = useState(false);
  const [flattenSymbolDraft, setFlattenSymbolDraft] = useState('');

  const handleFlattenSymbolConfirm = async () => {
    const sym = flattenSymbolDraft.trim().toUpperCase();
    if (!sym) return;
    setShowFlattenSymbolDialog(false);
    setFlattenSymbolDraft('');
    const result = await flattenSymbol(sym);
    if (result.status === 'sent') {
      toast.success(`Flatten ${sym} command sent to your agent.`);
    } else if (result.status === 'no_agent') {
      toast.warning('No desktop agent is online — open the FINOTAUR Agent and pair a device.');
    } else {
      toast.error("Couldn't send flatten symbol command. Try again.");
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
          <div
            className={`text-base font-semibold mt-1 ${
              totalDayPnL > 0
                ? 'text-emerald-400'
                : totalDayPnL < 0
                ? 'text-num-negative'
                : 'text-ink-primary'
            }`}
          >
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
              totalOpenPnL > 0
                ? 'text-emerald-400'
                : totalOpenPnL < 0
                ? 'text-num-negative'
                : 'text-ink-primary'
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
      {/* ── Automation control ── */}
      <div className="mb-ds-4">
        <div className="flex items-center justify-between gap-ds-3 mb-ds-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
            Automation control
          </p>
          <div className="flex items-center gap-ds-2">
            {/* Lock all accounts */}
            <button
              type="button"
              onClick={() => setShowLockAllConfirm(true)}
              disabled={isLocking}
              className="flex items-center gap-ds-2 rounded-lg border border-red-600/60 bg-red-600/10 px-ds-3 py-ds-2 text-sm font-semibold text-red-400 shadow-[0_0_14px_rgba(220,38,38,0.08)] transition-colors hover:border-red-500 hover:bg-red-600/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Lock all accounts"
              title="Flattens and locks every account until the next session open"
            >
              <Lock className="h-4 w-4 flex-shrink-0" />
              {isLocking ? 'Sending…' : 'Lock all accounts'}
            </button>

            {/* Unlock all accounts */}
            <button
              type="button"
              onClick={() => setShowUnlockAllConfirm(true)}
              disabled={isLocking}
              className="flex items-center gap-ds-2 rounded-lg border border-amber-600/60 bg-amber-600/10 px-ds-3 py-ds-2 text-sm font-semibold text-amber-400 shadow-[0_0_14px_rgba(217,119,6,0.08)] transition-colors hover:border-amber-500 hover:bg-amber-600/20 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Unlock all accounts"
              title="Re-enables copying and manual trading on every account"
            >
              <LockOpen className="h-4 w-4 flex-shrink-0" />
              {isLocking ? 'Sending…' : 'Unlock all accounts'}
            </button>
          </div>
        </div>
        <AutomationMasterSwitch />
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

        {/* Action buttons — customer-initiated, executed by the local desktop agent */}
        <div className="flex items-center gap-ds-2">
          {/* Cancel Orders */}
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            disabled={isCommandRunning}
            className="flex items-center gap-ds-2 rounded-lg border border-amber-600/60 bg-amber-600/10 px-ds-3 py-ds-2 text-sm font-semibold text-amber-400 shadow-[0_0_14px_rgba(217,119,6,0.08)] transition-colors hover:border-amber-500 hover:bg-amber-600/20 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cancel all working orders"
            title="Cancels all working/pending orders via your desktop agent"
          >
            <Ban className="h-4 w-4 flex-shrink-0" />
            {isCommandRunning ? 'Sending…' : 'Cancel Orders'}
          </button>

          {/* Flatten Symbol */}
          <button
            type="button"
            onClick={() => { setFlattenSymbolDraft(''); setShowFlattenSymbolDialog(true); }}
            disabled={isCommandRunning}
            className="flex items-center gap-ds-2 rounded-lg border border-orange-600/60 bg-orange-600/10 px-ds-3 py-ds-2 text-sm font-semibold text-orange-400 shadow-[0_0_14px_rgba(234,88,12,0.08)] transition-colors hover:border-orange-500 hover:bg-orange-600/20 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Flatten a specific symbol"
            title="Closes all positions for a specific symbol via your desktop agent"
          >
            <AlertOctagon className="h-4 w-4 flex-shrink-0" />
            Flatten Symbol
          </button>

          {/* Flatten ALL */}
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
      <div className="rounded-lg bg-surface-1 border border-border-ds-subtle overflow-x-auto">
        {/* Table header */}
        <div
          className={`grid ${GRID_COLS} gap-ds-2 px-ds-3 py-ds-2 border-b border-border-ds-subtle text-[10px] font-medium uppercase tracking-wider text-ink-secondary`}
        >
          <div className="text-center">Leader</div>
          <div className="text-center">Follow</div>
          <button
            type="button"
            onClick={() => toggleSort('connection')}
            className="flex items-center gap-ds-1 cursor-pointer select-none hover:text-ink-primary transition-colors duration-base text-left"
          >
            Connection
            {sort?.key === 'connection' ? (
              sort.dir === 'asc' ? (
                <ChevronUp className="h-3 w-3 text-gold-primary flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 text-gold-primary flex-shrink-0" />
              )
            ) : (
              <ChevronUp className="h-3 w-3 text-ink-tertiary/40 flex-shrink-0" />
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('account')}
            className="flex items-center gap-ds-1 cursor-pointer select-none hover:text-ink-primary transition-colors duration-base text-left"
          >
            Account
            {sort?.key === 'account' ? (
              sort.dir === 'asc' ? (
                <ChevronUp className="h-3 w-3 text-gold-primary flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 text-gold-primary flex-shrink-0" />
              )
            ) : (
              <ChevronUp className="h-3 w-3 text-ink-tertiary/40 flex-shrink-0" />
            )}
          </button>
          <div>Symbol</div>
          <div className="text-center">Ratio</div>
          <div className="text-center">Cross</div>
          <div className="text-right">Position</div>
          <button
            type="button"
            onClick={() => toggleSort('balance')}
            className="flex items-center justify-end gap-ds-1 cursor-pointer select-none hover:text-ink-primary transition-colors duration-base w-full"
          >
            {sort?.key === 'balance' ? (
              sort.dir === 'asc' ? (
                <ChevronUp className="h-3 w-3 text-gold-primary flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 text-gold-primary flex-shrink-0" />
              )
            ) : (
              <ChevronUp className="h-3 w-3 text-ink-tertiary/40 flex-shrink-0" />
            )}
            Balance
          </button>
          <div className="text-right">Day PnL</div>
          <div className="text-right">Open PnL</div>
          <div className="text-right">Qty</div>
          <div className="text-center">Actions</div>
        </div>

        {/* Rows */}
        {sortedRows.map((row) => {
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

      {/* ── Protection activity (observability) ── */}
      <div className="mt-ds-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary mb-ds-2">
          Recent risk enforcement
        </p>
        <EnforcementFeed />
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

      {/* ── Cancel Orders confirm modal ── */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md border-amber-600/40 bg-[#0d0f14]">
          <DialogTitle className="flex items-center gap-ds-2 text-amber-400">
            <Ban className="h-5 w-5 flex-shrink-0" />
            Cancel Orders
          </DialogTitle>

          <p className="text-sm text-ink-secondary leading-relaxed">
            This cancels <span className="font-semibold text-ink-primary">all working and pending orders</span> on
            your accounts. Open positions are <span className="font-semibold text-ink-primary">not</span> closed —
            use Flatten All if you want to close positions too. Executed locally by your desktop agent.
          </p>

          <div className="mt-ds-2 flex justify-end gap-ds-3">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 text-sm text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCancelOrdersConfirm}
              className="flex items-center gap-ds-2 rounded-md border border-amber-600/60 bg-amber-600/15 px-ds-4 py-ds-2 text-sm font-semibold text-amber-400 transition-colors hover:border-amber-500 hover:bg-amber-600/25 hover:text-amber-300"
            >
              <Ban className="h-4 w-4 flex-shrink-0" />
              Yes, Cancel Orders
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Flatten Symbol dialog ── */}
      <Dialog open={showFlattenSymbolDialog} onOpenChange={setShowFlattenSymbolDialog}>
        <DialogContent className="max-w-md border-orange-600/40 bg-[#0d0f14]">
          <DialogTitle className="flex items-center gap-ds-2 text-orange-400">
            <AlertOctagon className="h-5 w-5 flex-shrink-0" />
            Flatten Symbol
          </DialogTitle>

          <p className="text-sm text-ink-secondary leading-relaxed">
            Closes all open positions for a specific symbol, executed locally by your desktop agent.
            Enter the root symbol (e.g. <span className="font-semibold text-ink-primary">NQ</span>,{' '}
            <span className="font-semibold text-ink-primary">MES</span>).
          </p>

          <input
            type="text"
            autoFocus
            value={flattenSymbolDraft}
            onChange={(e) => setFlattenSymbolDraft(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && flattenSymbolDraft.trim()) {
                void handleFlattenSymbolConfirm();
              }
            }}
            placeholder="e.g. NQ"
            className="mt-ds-1 h-9 w-full rounded-md border border-border-ds-default bg-[#111] px-ds-3 text-sm font-semibold uppercase text-ink-primary placeholder:font-normal placeholder:normal-case placeholder:text-ink-tertiary outline-none focus:border-orange-500/60"
          />

          <div className="mt-ds-2 flex justify-end gap-ds-3">
            <button
              type="button"
              onClick={() => { setShowFlattenSymbolDialog(false); setFlattenSymbolDraft(''); }}
              className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 text-sm text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFlattenSymbolConfirm}
              disabled={!flattenSymbolDraft.trim()}
              className="flex items-center gap-ds-2 rounded-md border border-orange-600/60 bg-orange-600/15 px-ds-4 py-ds-2 text-sm font-semibold text-orange-400 transition-colors hover:border-orange-500 hover:bg-orange-600/25 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <AlertOctagon className="h-4 w-4 flex-shrink-0" />
              Flatten {flattenSymbolDraft.trim() || '—'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lock All confirm modal ── */}
      <Dialog open={showLockAllConfirm} onOpenChange={setShowLockAllConfirm}>
        <DialogContent className="max-w-md border-red-600/40 bg-[#0d0f14]">
          <DialogTitle className="flex items-center gap-ds-2 text-red-400">
            <Lock className="h-5 w-5 flex-shrink-0" />
            Lock All Accounts
          </DialogTitle>

          <p className="text-sm text-ink-secondary leading-relaxed">
            This immediately flattens <span className="font-semibold text-ink-primary">every account</span> and
            blocks <span className="font-semibold text-ink-primary">all new trades — including manual</span> — on
            each account until the next session open (5:00 PM CT), then auto-resets.
          </p>

          <div className="mt-ds-2 flex justify-end gap-ds-3">
            <button
              type="button"
              onClick={() => setShowLockAllConfirm(false)}
              className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 text-sm text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLockAllConfirm}
              className="flex items-center gap-ds-2 rounded-md border border-red-600/60 bg-red-600/15 px-ds-4 py-ds-2 text-sm font-semibold text-red-400 transition-colors hover:border-red-500 hover:bg-red-600/25 hover:text-red-300"
            >
              <Lock className="h-4 w-4 flex-shrink-0" />
              Yes, Lock All Accounts
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Unlock All confirm modal ── */}
      <Dialog open={showUnlockAllConfirm} onOpenChange={setShowUnlockAllConfirm}>
        <DialogContent className="max-w-md border-amber-600/40 bg-[#0d0f14]">
          <DialogTitle className="flex items-center gap-ds-2 text-amber-400">
            <LockOpen className="h-5 w-5 flex-shrink-0" />
            Unlock All Accounts
          </DialogTitle>

          <p className="text-sm text-ink-secondary leading-relaxed">
            This re-enables <span className="font-semibold text-ink-primary">copying and manual trading</span> on
            every account. Accounts still under a risk-breach lock will remain locked until their own condition
            clears.
          </p>

          <div className="mt-ds-2 flex justify-end gap-ds-3">
            <button
              type="button"
              onClick={() => setShowUnlockAllConfirm(false)}
              className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 text-sm text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUnlockAllConfirm}
              className="flex items-center gap-ds-2 rounded-md border border-amber-600/60 bg-amber-600/15 px-ds-4 py-ds-2 text-sm font-semibold text-amber-400 transition-colors hover:border-amber-500 hover:bg-amber-600/25 hover:text-amber-300"
            >
              <LockOpen className="h-4 w-4 flex-shrink-0" />
              Yes, Unlock All Accounts
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default CopyTradingDashboard;
