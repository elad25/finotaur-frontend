// src/components/copyTrading/CopyTradingDashboard.tsx
// ═══════════════════════════════════════════════════════════════
// Copy Trading Dashboard — Sprint #4a
// Leader dropdown, inline Ratio/Cross editing, FLATTEN double-check.
// ═══════════════════════════════════════════════════════════════

import { memo, useEffect, useMemo, useState } from 'react';
import { AlertOctagon, Crown, Plus, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { useAgentAccountSnapshots } from '@/features/automation/hooks/useAgentAccountSnapshots';

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
// 14 cols: leader-radio · follow · connection · account · symbol · ratio · cross · options · position · balance · dayPnL · openPnL · qty · actions

const GRID_COLS =
  'grid-cols-[56px_60px_120px_minmax(160px,1fr)_80px_120px_64px_64px_90px_100px_100px_100px_64px_80px] min-w-[1340px]';

// ─── Options popover sub-component ───────────────────────────

function RowOptionsPopover({
  rule,
  isFollowing,
  onUpdateRule,
}: {
  rule: CopyRule | null;
  isFollowing: boolean;
  onUpdateRule: (patch: Partial<CopyRule>) => Promise<void>;
}) {
  const copyOpens  = rule?.copy_opens  ?? true;
  const copyCloses = rule?.copy_closes ?? true;
  const reverse    = rule?.reverse     ?? false;

  // Non-default if any flag differs from its default value.
  const hasNonDefault = !copyOpens || !copyCloses || reverse;

  function Toggle({
    label,
    value,
    disabled,
    title,
    onChange,
  }: {
    label: string;
    value: boolean;
    disabled: boolean;
    title?: string;
    onChange: () => void;
  }) {
    return (
      <div className="flex items-center justify-between gap-ds-3" title={title}>
        <span className={`text-xs ${disabled ? 'text-ink-tertiary' : 'text-ink-secondary'}`}>
          {label}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={onChange}
          className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors duration-base ${
            value
              ? 'bg-status-success'
              : 'bg-status-offline border border-border-ds-default'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label={label}
        >
          <span
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-base ${
              value ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`relative flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-base ${
            hasNonDefault
              ? 'border-gold-border/60 bg-gold-primary/10 text-gold-primary'
              : 'border-border-ds-subtle bg-surface-base text-ink-tertiary hover:border-border-ds-default hover:text-ink-secondary'
          }`}
          aria-label="Copy options"
          title="Copy options"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {hasNonDefault && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-gold-primary" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 border-border-ds-subtle bg-surface-1 p-ds-3"
      >
        <p className="mb-ds-3 text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
          Copy Options
        </p>
        <p className="mb-ds-3 text-[11px] text-ink-tertiary">
          These apply to all accounts following this leader.
        </p>
        {!isFollowing && (
          <p className="mb-ds-3 text-xs text-ink-tertiary">
            Follow this leader first to enable options.
          </p>
        )}
        <div className="flex flex-col gap-ds-3">
          <Toggle
            label="Copy entries"
            value={copyOpens}
            disabled={!isFollowing}
            title="Copy the leader's position opens (entries) to this account"
            onChange={() => void onUpdateRule({ copy_opens: !copyOpens })}
          />
          <Toggle
            label="Copy exits"
            value={copyCloses}
            disabled={!isFollowing}
            title="Copy the leader's position closes (exits) to this account"
            onChange={() => void onUpdateRule({ copy_closes: !copyCloses })}
          />
          <Toggle
            label="Reverse"
            value={reverse}
            disabled={!isFollowing}
            title="Mirror the opposite side — leader buys → this account sells"
            onChange={() => void onUpdateRule({ reverse: !reverse })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

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

  // Local max_contracts draft — empty string means "no cap" (null).
  const [maxDraft, setMaxDraft] = useState(
    rule?.max_contracts != null ? String(rule.max_contracts) : '',
  );
  useEffect(() => {
    setMaxDraft(rule?.max_contracts != null ? String(rule.max_contracts) : '');
  }, [rule?.max_contracts]);

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
      <div className="flex items-center justify-center gap-ds-3">
        {isLeader ? (
          <span className="text-sm text-ink-tertiary">—</span>
        ) : (
          <>
            {/* Copy ratio */}
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
            {/* Max contracts — empty = no cap */}
            <div className="flex flex-col items-center" title="Max contracts cap (empty = no limit)">
              <span className="text-[9px] uppercase tracking-wide text-ink-tertiary leading-none mb-0.5">max</span>
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
                className="w-11 px-1 py-1 rounded-sm bg-surface-base border border-border-ds-subtle text-xs text-ink-primary text-center focus:border-gold-border outline-none placeholder:text-ink-tertiary"
              />
            </div>
          </>
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

      {/* Options popover — copy_opens / copy_closes / reverse */}
      <div className="flex items-center justify-center">
        {isLeader ? (
          <span className="text-sm text-ink-tertiary">—</span>
        ) : (
          <RowOptionsPopover
            rule={rule}
            isFollowing={isFollowing}
            onUpdateRule={onUpdateRule}
          />
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
          dayPnL:   snap?.dayPnl   ?? null,
          openPnL:  snap?.openPnl  ?? null,
          qty:      snap != null ? snap.qty : null,
          following: p.is_active,
          portfolioId: p.id,
        };
      }),
    );
  }, [accountGroups, connectionById, liveCredentialIds, instrument, snapshotByAccountName]);

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
      <div className="rounded-lg bg-surface-1 border border-border-ds-subtle overflow-x-auto">
        {/* Table header */}
        <div
          className={`grid ${GRID_COLS} gap-ds-2 px-ds-3 py-ds-2 border-b border-border-ds-subtle text-[10px] font-medium uppercase tracking-wider text-ink-secondary`}
        >
          <div className="text-center">Leader</div>
          <div className="text-center">Follow</div>
          <div>Connection</div>
          <div>Account</div>
          <div>Symbol</div>
          <div className="text-center">Ratio</div>
          <div className="text-center">Cross</div>
          <div className="text-center">Options</div>
          <div className="text-right">Position</div>
          <div className="text-right">Balance</div>
          <div className="text-right">Day PnL</div>
          <div className="text-right">Open PnL</div>
          <div className="text-right">Qty</div>
          <div className="text-center">Actions</div>
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
