// src/components/copyTrading/CopyTradingDashboard.tsx
// ═══════════════════════════════════════════════════════════════
// Copy Trading Dashboard — Sprint #4a
// Leader dropdown, inline Ratio/Cross editing, FLATTEN double-check.
// ═══════════════════════════════════════════════════════════════

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AlertOctagon, AlertTriangle, Ban, ChevronDown, ChevronUp, Crown, Lock, Pencil, Plus, Search, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { usePortfolios } from '@/hooks/usePortfolios';
import { buildAccountGroups } from '@/components/journal/accountGrouping';
import { useCopierRoutes } from '@/features/automation/hooks/useCopierRoutes';
import type { CopierRoute, CopierRouteTargetInput, JournalAccount } from '@/features/automation/lib/automationTypes';
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
import { MirroredOrdersPanel } from '@/components/copyTrading/MirroredOrdersPanel';
import { useCopierDemoMode } from '@/hooks/useCopierDemoMode';
import {
  getDemoBrokerConnections,
  getDemoPortfolios,
  getDemoCopierRoutes,
  demoSnapshotByAccountName,
  getDemoAccountRiskSummaries,
} from '@/utils/demoCopierData';

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
  /**
   * True when the account currently holds any open position across ALL
   * instruments (not just the active tab's `position` column, which is
   * filtered to the active instrument). Sourced from the same desktop-agent
   * snapshot (`positions[]`) that hydrates the live columns — used to warn
   * before an unfollow leaves exposure unmanaged.
   */
  hasAnyOpenPosition: boolean;
  /**
   * True when this account is a target in 2+ active groups (routes) — its
   * trades will be copied from multiple leaders simultaneously. Non-blocking
   * warning surfaced on the row.
   */
  isDuplicateFollower: boolean;
}

/**
 * Per-row copy config for the ACTIVE group only — derived directly from the
 * active route's `automation_copier_route_targets`, keyed by target row id.
 * Replaces the old cross-tab `CopyRule` (from useCopyRules), which assumed
 * one route per source account and would incorrectly merge writes across
 * independent groups sharing the same leader.
 */
interface RouteRule {
  id:             string; // target row id
  ratio:          number;
  is_active:      boolean;
  cross_to_micro: boolean;
}

/**
 * A tab = one active copier route ("group"). Derived from the loaded routes,
 * ordered by created_at (oldest first) — NOT stored in component state, so
 * tabs persist across refreshes. Only `activeRouteId` is client state.
 */
interface GroupTab {
  id:     string; // route id
  label:  string; // route.label — the group name
  symbol: string | null; // route.symbol_filter[0] ?? null (unset)
  route:  CopierRoute;
}

const ACTIVE_GROUP_STORAGE_KEY = 'copier.activeGroupId';

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
  demo,
  onFollowToggle,
  onRequestUnfollowWithExposure,
  onUpdateRule,
  onSelectLeader,
}: {
  row: AccountRowData;
  isLeader: boolean;
  hasLeader: boolean;
  rule: RouteRule | null;
  isCreating: boolean;
  isUpdating: boolean;
  /** True in Copier demo mode — controls render read-only sample state, no optimistic flip, no writes. */
  demo: boolean;
  onFollowToggle: (currentRatioDraft: number) => Promise<void>;
  /**
   * Called instead of `onFollowToggle` when the user clicks unfollow on an
   * account that currently has open exposure. The parent shows a confirm
   * dialog and, if the user proceeds, flips `resolveOptimistic` + calls
   * `onFollowToggle` itself.
   */
  onRequestUnfollowWithExposure: (resolveOptimistic: () => void) => void;
  onUpdateRule: (patch: Partial<Pick<RouteRule, 'ratio' | 'cross_to_micro'>>) => Promise<void>;
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
  // In demo mode the toggle is always inert — it only displays the seeded
  // following-state and never flips (no optimistic change, no write).
  const followDisabled = demo || !hasLeader || isLeader;
  const followTitle = demo
    ? 'Demo mode — connect a broker to follow a leader'
    : isLeader
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
          disabled={isCreating || isUpdating}
          onClick={onSelectLeader}
          title={isCreating || isUpdating ? 'Saving…' : 'Set as leader'}
          aria-label={`Set ${row.accountName} as leader`}
          className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors duration-base ${
            isLeader
              ? 'border-gold-primary bg-gold-primary/10'
              : 'border-gold-border/50 hover:border-gold-primary/70'
          } ${isCreating || isUpdating ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
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
              if (demo) return; // demo: no optimistic flip, no write — display only

              if (optFollowing !== null) return; // a write for this row is in flight

              // Unfollowing an account that still has open exposure would
              // silently leave it unmanaged — confirm with the user first
              // instead of flipping straight to optimistic + write.
              if (isFollowing && row.hasAnyOpenPosition) {
                onRequestUnfollowWithExposure(() => {
                  setOptFollowing(false);
                  void onFollowToggle(parsePositiveNumber(ratioDraft, 1));
                });
                return;
              }

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
          {row.isDuplicateFollower && (
            <span
              title="This account also follows another group — trades from both leaders will be copied."
              aria-label="This account also follows another group — trades from both leaders will be copied."
              className="flex-shrink-0"
            >
              <AlertTriangle className="h-3 w-3 text-amber-400" />
            </span>
          )}
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
              disabled={demo}
              onChange={(e) => {
                if (demo) return; // demo: display the seeded ratio, no draft edits
                setRatioDraft(e.target.value);
              }}
              onBlur={async (e) => {
                if (demo) return; // demo: no write, no draft normalization
                const newRatio = parsePositiveNumber(e.target.value, 1);
                // Normalize display value even if not following yet.
                setRatioDraft(String(newRatio));
                if (isFollowing && rule) {
                  await onUpdateRule({ ratio: newRatio });
                }
              }}
              aria-label={`Copy ratio for ${row.accountName}`}
              title={demo ? 'Demo mode — connect a broker to edit the copy ratio' : undefined}
              className={`w-11 px-1 py-1 rounded-sm bg-surface-base border border-border-ds-subtle text-xs text-ink-primary text-center focus:border-gold-border outline-none ${
                demo ? 'opacity-40 cursor-not-allowed' : ''
              }`}
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
            disabled={demo || !isFollowing}
            onClick={() => {
              if (demo) return; // demo: no optimistic flip, no write — display only

              if (!rule || optCross !== null) return; // need a saved rule; guard double-fire
              setOptCross(!crossOn);                  // move instantly (optimistic)
              void onUpdateRule({ cross_to_micro: !crossOn });
            }}
            className={`relative w-9 h-5 rounded-full transition-colors duration-base ${
              crossOn
                ? 'bg-status-success'
                : 'bg-status-offline border border-border-ds-default'
            } ${demo || !isFollowing ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label="Cross-to-micro toggle"
            title={
              demo
                ? 'Demo mode — connect a broker to edit cross-to-micro'
                : !isFollowing
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
  // Demo mode = viewing the Copier with zero active broker connections — every
  // data input below is swapped for deterministic sample data (demoCopierData.ts)
  // and every mutation handler becomes a no-op. Real hooks are still called
  // unconditionally (React hook rules); only their RESULTS are swapped.
  const { isDemo } = useCopierDemoMode();

  // Show all journal broker connections — used for live status enrichment only.
  const realConnections = useBrokerConnections({ active: true });
  const connections = isDemo ? getDemoBrokerConnections() : realConnections.connections;
  // liveCredentialIds: always empty — cloud engine session polling removed.
  const liveCredentialIds = useMemo(() => new Set<string>(), []);
  // Desktop agent snapshots — hydrates live balance/PnL/position columns.
  const realAgentSnapshots = useAgentAccountSnapshots();
  const snapshotByAccountName = isDemo ? demoSnapshotByAccountName : realAgentSnapshots.snapshotByAccountName;
  const realPortfolios = usePortfolios();
  const demoPortfolios = useMemo(() => (isDemo ? getDemoPortfolios() : null), [isDemo]);
  const portfolios = isDemo ? demoPortfolios! : realPortfolios.portfolios;
  const tradovatePortfolios = isDemo
    ? demoPortfolios!.filter((p) => p.source === 'tradovate')
    : realPortfolios.tradovatePortfolios;
  const brokerPortfolios = isDemo
    ? demoPortfolios!.filter((p) => p.source === 'broker')
    : realPortfolios.brokerPortfolios;
  const realRiskSummaries = useAccountRiskSummaries();
  const summaryByAccountId = isDemo ? getDemoAccountRiskSummaries() : realRiskSummaries.summaryByAccountId;
  // Lookup: portfolio id -> kill_switch_active, sourced from the full
  // portfolios list (accountGroups only carries a subset of fields downstream).
  const killSwitchByPortfolioId = useMemo(
    () => new Map(portfolios.map((p) => [p.id, p.kill_switch_active ?? false])),
    [portfolios],
  );
  // ── Routes (= groups) — one route per tab, source of truth for tabs ──────
  const { routes: realRoutesList, upsertRoute, deleteRoute } = useCopierRoutes();
  const routes = isDemo ? getDemoCopierRoutes() : realRoutesList;
  const [isSavingRoute, setIsSavingRoute] = useState(false);

  // Tabs are DERIVED from routes (ordered by created_at) — not stored in
  // component state — so they persist across refreshes.
  const groupTabs = useMemo<GroupTab[]>(
    () =>
      routes.map((route) => ({
        id: route.id,
        label: route.label?.trim() || route.source_account_name || 'Untitled group',
        symbol: route.symbol_filter?.[0]?.trim() || null,
        route,
      })),
    [routes],
  );

  // Active route id — client state, restored from localStorage if still valid.
  const [activeRouteId, setActiveRouteIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
  });

  const setActiveRouteId = (id: string | null) => {
    setActiveRouteIdState(id);
    if (id) localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, id);
    else localStorage.removeItem(ACTIVE_GROUP_STORAGE_KEY);
  };

  // Resolve the active tab: prefer the stored id if it still exists, else the
  // first tab (oldest route). Falls back to null when there are no routes.
  const activeGroupTab = useMemo<GroupTab | null>(() => {
    if (groupTabs.length === 0) return null;
    return groupTabs.find((t) => t.id === activeRouteId) ?? groupTabs[0];
  }, [groupTabs, activeRouteId]);

  // Keep the persisted active id in sync once tabs resolve (covers first load
  // and the case where the stored id no longer exists).
  useEffect(() => {
    if (activeGroupTab && activeGroupTab.id !== activeRouteId) {
      setActiveRouteId(activeGroupTab.id);
    }
  }, [activeGroupTab, activeRouteId]);

  const activeRoute = activeGroupTab?.route ?? null;
  const instrument = activeGroupTab?.symbol ?? '';
  const [instrumentDraft, setInstrumentDraft] = useState(instrument);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setInstrumentDraft(instrument);
  }, [instrument]);

  // ── New-group dialog ─────────────────────────────────────────────────
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSymbol, setNewGroupSymbol] = useState('');
  const [newGroupLeaderId, setNewGroupLeaderId] = useState<string | null>(null);
  const [showNewGroupSuggestions, setShowNewGroupSuggestions] = useState(false);

  // ── Rename active group ──────────────────────────────────────────────
  const [isRenamingGroup, setIsRenamingGroup] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  // ── Delete group confirm ─────────────────────────────────────────────
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<GroupTab | null>(null);

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

  // ── Portfolio ↔ tradovate account_id maps (routing is tradovate-only — ──
  // mirrors the same constraint the legacy useCopyRules adapter enforced).
  const portfolioByAccountId = useMemo(() => {
    const map = new Map<string, (typeof tradovatePortfolios)[number]>();
    for (const p of tradovatePortfolios) {
      if (p.tradovate_account_id == null) continue;
      map.set(String(p.tradovate_account_id), p);
    }
    return map;
  }, [tradovatePortfolios]);

  const portfolioIdByAccountId = useMemo(() => {
    const map = new Map<string, string>();
    for (const [accountId, p] of portfolioByAccountId) map.set(accountId, p.id);
    return map;
  }, [portfolioByAccountId]);

  const toJournalAccount = (portfolioId: string): JournalAccount | null => {
    const p = brokerAccountPortfolios.find((x) => x.id === portfolioId);
    if (!p || p.tradovate_account_id == null) return null;
    return {
      account_id:   String(p.tradovate_account_id),
      account_name: p.name,
      broker:       'tradovate',
      environment:  p.environment ?? null,
      label:        p.connection_label ?? undefined,
    };
  };

  // Leader: derived from the ACTIVE route's source_account_id — scoped per tab.
  const leaderId = activeRoute
    ? (portfolioIdByAccountId.get(activeRoute.source_account_id) ?? null)
    : null;
  const leaderPortfolioId = leaderId;

  // Target account ids that belong to the ACTIVE route only.
  const activeGroupTargetAccountIds = useMemo(
    () => new Set((activeRoute?.automation_copier_route_targets ?? []).map((t) => t.destination_account_id)),
    [activeRoute],
  );

  // Duplicate-follower detection: account_id → number of ACTIVE routes where it's a target.
  const followerAccountIdCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const route of routes) {
      for (const t of route.automation_copier_route_targets ?? []) {
        counts.set(t.destination_account_id, (counts.get(t.destination_account_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [routes]);

  // Helper: find the per-row rule (from the ACTIVE route's targets) for a follower portfolio.
  function ruleFor(targetPortfolioId: string | null): RouteRule | null {
    if (!activeRoute || !targetPortfolioId) return null;
    const p = brokerAccountPortfolios.find((x) => x.id === targetPortfolioId);
    if (!p || p.tradovate_account_id == null) return null;
    const targetAccountId = String(p.tradovate_account_id);
    const target = (activeRoute.automation_copier_route_targets ?? []).find(
      (t) => t.destination_account_id === targetAccountId,
    );
    if (!target) return null;
    return {
      id:             target.id,
      ratio:          target.scale_ratio,
      is_active:      activeRoute.is_active && target.is_active,
      cross_to_micro: target.cross_to_micro,
    };
  }

  /** Serializes an existing target row back into the RPC input shape. */
  function targetToInput(t: NonNullable<CopierRoute['automation_copier_route_targets']>[number]): CopierRouteTargetInput {
    return {
      destination_account_id:   t.destination_account_id,
      destination_account_name: t.destination_account_name,
      destination_broker:       t.destination_broker,
      destination_environment:  t.destination_environment,
      scale_ratio:              t.scale_ratio,
      max_contracts:            t.max_contracts,
      is_active:                t.is_active,
      cross_to_micro:           t.cross_to_micro,
    };
  }

  /** Persists a patched target list for the ACTIVE route via upsertRoute. */
  async function saveActiveRouteTargets(targets: CopierRouteTargetInput[]) {
    if (isDemo) return; // demo: no network, no DB write, no real toast
    if (!activeRoute) return;
    setIsSavingRoute(true);
    try {
      if (targets.length === 0) {
        // No followers left — keep the group itself (empty followers state),
        // do NOT delete the route just because it lost its last target.
        await upsertRoute({
          routeId:      activeRoute.id,
          sourceAccount: {
            account_id:   activeRoute.source_account_id,
            account_name: activeRoute.source_account_name,
            broker:       activeRoute.source_broker,
            environment:  activeRoute.source_environment,
          },
          label:        activeRoute.label,
          symbolFilter: activeRoute.symbol_filter ?? [],
          copyOpens:    activeRoute.copy_opens,
          copyCloses:   activeRoute.copy_closes,
          reverse:      activeRoute.reverse,
          isActive:     activeRoute.is_active,
          targets:      [],
        });
      } else {
        await upsertRoute({
          routeId:      activeRoute.id,
          sourceAccount: {
            account_id:   activeRoute.source_account_id,
            account_name: activeRoute.source_account_name,
            broker:       activeRoute.source_broker,
            environment:  activeRoute.source_environment,
          },
          label:        activeRoute.label,
          symbolFilter: activeRoute.symbol_filter ?? [],
          copyOpens:    activeRoute.copy_opens,
          copyCloses:   activeRoute.copy_closes,
          reverse:      activeRoute.reverse,
          isActive:     activeRoute.is_active,
          targets,
        });
      }
    } finally {
      setIsSavingRoute(false);
    }
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
          // Unlike `netPosition` above (filtered to the active instrument tab),
          // this checks across every symbol the agent last reported.
          hasAnyOpenPosition: (snap?.positions ?? []).some((pos) => pos.qty !== 0),
          // 2+ active routes target this account → trades copy from multiple leaders.
          isDuplicateFollower: p.tradovate_account_id != null
            ? (followerAccountIdCounts.get(String(p.tradovate_account_id)) ?? 0) >= 2
            : false,
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
    followerAccountIdCounts,
  ]);

  // Leader account name — used in the unfollow-with-exposure confirm copy.
  const leaderAccountName = rows.find((r) => r.id === leaderId)?.accountName ?? 'the leader';

  // Summary bar — scoped to the ACTIVE GROUP only: the leader + its targets.
  // (Not all connected accounts — each tab/group is fully independent.)
  // NOTE (by design, confirmed with Elad): this is ACCOUNT-scoped, not
  // symbol-scoped — PnL/position totals below cover every instrument on the
  // leader + target accounts, not just the group's tracked symbol. Do not
  // "fix" this to filter by `instrument`/`activeGroupTab.symbol`.
  const activeGroupRows = useMemo(
    () => rows.filter((r) => r.id === leaderId || activeGroupTargetAccountIds.has(
      (() => {
        const p = brokerAccountPortfolios.find((x) => x.id === r.id);
        return p?.tradovate_account_id != null ? String(p.tradovate_account_id) : '';
      })(),
    )),
    [rows, leaderId, activeGroupTargetAccountIds, brokerAccountPortfolios],
  );

  const totalDayPnL        = activeGroupRows.reduce((s, r) => s + (r.dayPnL  ?? 0), 0);
  const totalOpenPnL       = activeGroupRows.reduce((s, r) => s + (r.openPnL ?? 0), 0);
  const totalBalance       = activeGroupRows.reduce((s, r) => s + (r.balance ?? 0), 0);
  const openPositionsCount = activeGroupRows.filter((r) => (r.position ?? 0) !== 0).length;

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

  // Sets the ACTIVE GROUP's symbol — persists symbol_filter=[symbol] on its route.
  const setActiveTabInstrument = async (symbol: string) => {
    if (isDemo) return; // demo: no network, no DB write, no real toast
    const nextSymbol = symbol.trim().toUpperCase();
    if (!nextSymbol || !activeRoute) return;
    if (nextSymbol === instrument) {
      setInstrumentDraft(nextSymbol);
      setShowSuggestions(false);
      return;
    }
    setInstrumentDraft(nextSymbol);
    setShowSuggestions(false);
    setIsSavingRoute(true);
    try {
      await upsertRoute({
        routeId:      activeRoute.id,
        sourceAccount: {
          account_id:   activeRoute.source_account_id,
          account_name: activeRoute.source_account_name,
          broker:       activeRoute.source_broker,
          environment:  activeRoute.source_environment,
        },
        label:        activeRoute.label,
        symbolFilter: [nextSymbol],
        copyOpens:    activeRoute.copy_opens,
        copyCloses:   activeRoute.copy_closes,
        reverse:      activeRoute.reverse,
        isActive:     activeRoute.is_active,
        targets:      (activeRoute.automation_copier_route_targets ?? []).map(targetToInput),
      });
      toast.success(`Tracking ${nextSymbol} in ${activeGroupTab?.label ?? 'this group'}`);
    } finally {
      setIsSavingRoute(false);
    }
  };

  const handleAddInstrumentToWatch = () => {
    void setActiveTabInstrument(normalizedDraftInstrument);
  };

  // "+" tab button → opens the New Group dialog (see JSX below) instead of
  // silently creating a tab — a group needs a name + leader before it exists.
  const handleOpenNewGroupDialog = () => {
    setNewGroupName('');
    setNewGroupSymbol('');
    setNewGroupLeaderId(brokerAccountPortfolios[0]?.id ?? null);
    setShowNewGroupSuggestions(false);
    setShowNewGroupDialog(true);
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
  const { lockAll, isLocking } = useLockAllAccounts();
  const [showLockAllConfirm, setShowLockAllConfirm] = useState(false);

  const handleLockAllConfirm = async () => {
    setShowLockAllConfirm(false);
    if (isDemo) return; // demo: no agent command
    await lockAll();
  };

  // ── Flatten All ───────────────────────────────────────────────
  const { flattenAll, isFlattening } = useFlattenAll();
  const [showFlattenConfirm, setShowFlattenConfirm] = useState(false);

  const handleFlattenConfirm = async () => {
    setShowFlattenConfirm(false);
    if (isDemo) return; // demo: no agent command
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
    if (isDemo) return; // demo: no agent command
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

  // ── Unfollow-with-exposure confirm ──────────────────────────────
  // Guards against silently orphaning open exposure when a follower
  // account is unfollowed while it still holds a position and/or working
  // mirrored orders. Pure client-side warning — no flatten command exists
  // per-account on the agent, so this is informed consent, not automation.
  // Also reused by the leader re-point flow (`onSelectLeader`): re-pointing
  // the leader drops the target whose destination == the new leader
  // ("can't follow yourself") — if that dropped target has an open
  // position, it's the exact same unmanaged-exposure risk as a plain
  // unfollow, so it shares this same confirm dialog/state.
  const [unfollowConfirm, setUnfollowConfirm] = useState<{
    accountName: string;
    reason: 'unfollow' | 'leader-repoint';
    resolve: () => void;
  } | null>(null);

  const handleFlattenSymbolConfirm = async () => {
    const sym = flattenSymbolDraft.trim().toUpperCase();
    if (!sym) return;
    setShowFlattenSymbolDialog(false);
    setFlattenSymbolDraft('');
    if (isDemo) return; // demo: no agent command
    const result = await flattenSymbol(sym);
    if (result.status === 'sent') {
      toast.success(`Flatten ${sym} command sent to your agent.`);
    } else if (result.status === 'no_agent') {
      toast.warning('No desktop agent is online — open the FINOTAUR Agent and pair a device.');
    } else {
      toast.error("Couldn't send flatten symbol command. Try again.");
    }
  };

  // ── Group management: rename / delete / create ───────────────────────

  const handleRenameCommit = async (tab: GroupTab) => {
    setIsRenamingGroup(false);
    if (isDemo) return; // demo: no network, no DB write
    const nextLabel = renameDraft.trim();
    if (!nextLabel || nextLabel === tab.label) return;
    setIsSavingRoute(true);
    try {
      await upsertRoute({
        routeId:      tab.route.id,
        sourceAccount: {
          account_id:   tab.route.source_account_id,
          account_name: tab.route.source_account_name,
          broker:       tab.route.source_broker,
          environment:  tab.route.source_environment,
        },
        label:        nextLabel,
        symbolFilter: tab.route.symbol_filter ?? [],
        copyOpens:    tab.route.copy_opens,
        copyCloses:   tab.route.copy_closes,
        reverse:      tab.route.reverse,
        isActive:     tab.route.is_active,
        targets:      (tab.route.automation_copier_route_targets ?? []).map(targetToInput),
      });
    } finally {
      setIsSavingRoute(false);
    }
  };

  // "×" on a tab — never deletes silently. Surfaces the standard delete
  // confirm, PLUS the #1204-style exposure warning if any follower of that
  // group currently holds an open position.
  const groupHasOpenExposure = (tab: GroupTab): boolean => {
    const targetAccountIds = new Set(
      (tab.route.automation_copier_route_targets ?? []).map((t) => t.destination_account_id),
    );
    // Include the leader itself — exposure on the leader account also matters.
    targetAccountIds.add(tab.route.source_account_id);
    return rows.some((r) => {
      const p = brokerAccountPortfolios.find((x) => x.id === r.id);
      const accountId = p?.tradovate_account_id != null ? String(p.tradovate_account_id) : null;
      return accountId != null && targetAccountIds.has(accountId) && r.hasAnyOpenPosition;
    });
  };

  const handleDeleteGroupConfirmed = async (tab: GroupTab) => {
    setDeleteGroupConfirm(null);
    if (isDemo) return; // demo: no network, no DB write
    setIsSavingRoute(true);
    try {
      const result = await deleteRoute(tab.route.id);
      if (result.success && activeRouteId === tab.id) {
        // Move the active tab off the deleted route — the next render's
        // groupTabs will no longer contain it, so clear and let the
        // "restore or fall back to first tab" effect resolve it.
        setActiveRouteId(null);
      }
    } finally {
      setIsSavingRoute(false);
    }
  };

  const canCreateNewGroup =
    newGroupName.trim().length > 0 &&
    newGroupSymbol.trim().length > 0 &&
    newGroupLeaderId != null;

  // Synchronous re-entrancy latch: `isSavingRoute` state updates are async
  // and won't be visible to a second call fired in the same tick (e.g. a
  // fast double-Enter on the dialog's plain <input>s, which aren't wrapped
  // in a <form>). A ref flips instantly and closes that race.
  const isCreatingGroupRef = useRef(false);

  const handleCreateGroup = async () => {
    if (isDemo) return; // demo: no network, no DB write
    if (isSavingRoute || isCreatingGroupRef.current) return;
    if (!canCreateNewGroup || !newGroupLeaderId) return;
    const leaderAccount = toJournalAccount(newGroupLeaderId);
    if (!leaderAccount) {
      toast.error('Select a valid leader account (Tradovate only).');
      return;
    }
    isCreatingGroupRef.current = true;
    setIsSavingRoute(true);
    try {
      const result = await upsertRoute({
        sourceAccount: leaderAccount,
        label:         newGroupName.trim(),
        symbolFilter:  [newGroupSymbol.trim().toUpperCase()],
        copyOpens:     true,
        copyCloses:    true,
        reverse:       false,
        isActive:      true,
        targets:       [],
      });
      if (result.success && result.routeId) {
        setActiveRouteId(result.routeId);
        setShowNewGroupDialog(false);
      }
    } finally {
      setIsSavingRoute(false);
      isCreatingGroupRef.current = false;
    }
  };

  return (
    <div className="min-h-[620px]">
      <div className="-mt-ds-6 mb-ds-4 flex items-end gap-ds-1 overflow-x-auto border-b border-gold-border/40 px-ds-3 pt-ds-1">
        {groupTabs.map((tab) => {
          const isActive = tab.id === activeGroupTab?.id;
          const isRenamingThis = isActive && isRenamingGroup;
          return (
            <div
              key={tab.id}
              className={`flex h-9 min-w-[120px] items-center gap-ds-1 rounded-t-md border border-b-0 px-ds-2 transition-colors ${
                isActive
                  ? 'border-gold-border bg-gold-primary/10 text-gold-primary shadow-[0_0_18px_rgba(201,166,70,0.10)]'
                  : 'border-gold-border/20 bg-gold-primary/[0.03] text-ink-secondary hover:bg-gold-primary/10 hover:text-gold-primary'
              }`}
            >
              {isRenamingThis ? (
                <input
                  autoFocus
                  type="text"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => void handleRenameCommit(tab)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void handleRenameCommit(tab); }
                    if (e.key === 'Escape') { setIsRenamingGroup(false); }
                  }}
                  className="min-w-0 flex-1 border-0 bg-transparent text-xs font-semibold text-gold-primary outline-none"
                  aria-label="Group name"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveRouteId(tab.id)}
                  onDoubleClick={() => {
                    if (!isActive) return;
                    setRenameDraft(tab.label);
                    setIsRenamingGroup(true);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-ds-1 truncate text-left text-xs font-semibold"
                  title="Double-click to rename"
                >
                  <span className="truncate">{tab.label}</span>
                  {tab.symbol && (
                    <span className="flex-shrink-0 rounded-sm bg-gold-primary/15 px-1 py-0.5 text-[9px] uppercase tracking-wide text-gold-primary/80">
                      {tab.symbol}
                    </span>
                  )}
                </button>
              )}
              {isActive && !isRenamingThis && (
                <button
                  type="button"
                  onClick={() => { setRenameDraft(tab.label); setIsRenamingGroup(true); }}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm text-ink-tertiary transition-colors hover:bg-white/10 hover:text-ink-primary"
                  aria-label={`Rename ${tab.label}`}
                  title="Rename group"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeleteGroupConfirm(tab)}
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm text-ink-tertiary transition-colors hover:bg-white/10 hover:text-ink-primary"
                aria-label={`Delete ${tab.label}`}
                title={`Delete ${tab.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleOpenNewGroupDialog}
          className="mb-px flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-gold-border/30 bg-gold-primary/[0.05] text-gold-primary/80 transition-colors hover:border-gold-border hover:bg-gold-primary/10 hover:text-gold-primary"
          aria-label="Add group"
          title="Add group"
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
          </div>
        </div>
        <AutomationMasterSwitch demo={isDemo} />
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
                disabled={!activeRoute}
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
                placeholder={activeRoute ? 'Search ticker...' : 'Create a group first'}
                className="w-36 border-0 bg-transparent text-sm font-semibold uppercase text-blue-100 outline-none placeholder:normal-case placeholder:text-blue-200/40 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAddInstrumentToWatch();
                }}
                disabled={!canAddInstrument || !activeRoute}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-400/35 bg-blue-400/10 text-blue-100 transition-colors hover:border-blue-300/60 hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Set active group's symbol"
                title="Set active group's symbol"
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

        {/* Rows — only rendered when the active group has a leader (i.e. there IS an active route) */}
        {activeRoute && sortedRows.map((row) => {
          const rule = ruleFor(row.portfolioId);
          const isLeader = row.id === leaderId;
          return (
            <CopyAccountRow
              key={row.id}
              row={row}
              isLeader={isLeader}
              hasLeader={leaderPortfolioId != null}
              rule={rule}
              isCreating={isSavingRoute}
              isUpdating={isSavingRoute}
              demo={isDemo}
              onSelectLeader={async () => {
                if (isDemo) return; // demo: no network, no DB write
                if (isSavingRoute) return; // a route write is already in flight
                if (!activeRoute || row.portfolioId === leaderId) return;
                const nextLeader = toJournalAccount(row.portfolioId ?? '');
                if (!nextLeader) {
                  toast.error('Only Tradovate accounts can lead a copy group.');
                  return;
                }
                // Re-pointing the leader drops existing targets pointing at the
                // NEW leader account (can't follow yourself) — everything else
                // about the group (name, symbol, other targets) is preserved.
                const existingTargets = activeRoute.automation_copier_route_targets ?? [];
                const droppedTarget = existingTargets.find(
                  (t) => t.destination_account_id === nextLeader.account_id,
                );
                const remainingTargets = existingTargets
                  .filter((t) => t.destination_account_id !== nextLeader.account_id)
                  .map(targetToInput);

                const performRepoint = async () => {
                  setIsSavingRoute(true);
                  try {
                    await upsertRoute({
                      routeId:      activeRoute.id,
                      sourceAccount: nextLeader,
                      label:        activeRoute.label,
                      symbolFilter: activeRoute.symbol_filter ?? [],
                      copyOpens:    activeRoute.copy_opens,
                      copyCloses:   activeRoute.copy_closes,
                      reverse:      activeRoute.reverse,
                      isActive:     activeRoute.is_active,
                      targets:      remainingTargets,
                    });
                  } finally {
                    setIsSavingRoute(false);
                  }
                };

                // If the dropped target ("can't follow yourself") currently
                // holds an open position, re-pointing the leader would
                // silently leave it unmanaged — same risk the unfollow-
                // exposure confirm was built for. Warn first; only proceed
                // without a prompt when the dropped target is flat.
                if (droppedTarget) {
                  const droppedRow = rows.find((r) => {
                    const p = brokerAccountPortfolios.find((x) => x.id === r.id);
                    return p?.tradovate_account_id != null
                      && String(p.tradovate_account_id) === droppedTarget.destination_account_id;
                  });
                  if (droppedRow?.hasAnyOpenPosition) {
                    setUnfollowConfirm({
                      accountName: droppedTarget.destination_account_name,
                      reason: 'leader-repoint',
                      resolve: () => { void performRepoint(); },
                    });
                    return;
                  }
                }

                await performRepoint();
              }}
              onRequestUnfollowWithExposure={(resolveOptimistic) => {
                setUnfollowConfirm({ accountName: row.accountName, reason: 'unfollow', resolve: resolveOptimistic });
              }}
              onFollowToggle={async (currentRatioDraft) => {
                if (isDemo) return; // demo: no network, no DB write
                if (!activeRoute || !row.portfolioId || isLeader) return;
                const targetAccount = toJournalAccount(row.portfolioId);
                if (!targetAccount) {
                  toast.error('Only Tradovate accounts can follow a copy group.');
                  return;
                }
                const existingTargets = activeRoute.automation_copier_route_targets ?? [];

                if (rule?.is_active) {
                  // Unfollow: remove this target from the ACTIVE route only.
                  await saveActiveRouteTargets(
                    existingTargets
                      .filter((t) => t.destination_account_id !== targetAccount.account_id)
                      .map(targetToInput),
                  );
                } else {
                  // Follow: add (or re-activate) this target on the ACTIVE route only.
                  const alreadyPresent = existingTargets.some(
                    (t) => t.destination_account_id === targetAccount.account_id,
                  );
                  const newTarget: CopierRouteTargetInput = {
                    destination_account_id:   targetAccount.account_id,
                    destination_account_name: targetAccount.account_name,
                    destination_broker:       targetAccount.broker,
                    destination_environment:  targetAccount.environment,
                    scale_ratio:              currentRatioDraft,
                    max_contracts:            null,
                    is_active:                true,
                    cross_to_micro:           false,
                  };
                  const nextTargets: CopierRouteTargetInput[] = alreadyPresent
                    ? existingTargets.map((t) =>
                        t.destination_account_id === targetAccount.account_id
                          ? { ...targetToInput(t), scale_ratio: currentRatioDraft, is_active: true }
                          : targetToInput(t),
                      )
                    : [...existingTargets.map(targetToInput), newTarget];
                  await saveActiveRouteTargets(nextTargets);
                }
              }}
              onUpdateRule={async (patch) => {
                if (isDemo) return; // demo: no network, no DB write
                if (!activeRoute || !rule) return;
                const existingTargets = activeRoute.automation_copier_route_targets ?? [];
                const nextTargets = existingTargets.map((t) =>
                  t.id === rule.id
                    ? {
                        ...targetToInput(t),
                        scale_ratio:    patch.ratio          ?? t.scale_ratio,
                        cross_to_micro: patch.cross_to_micro ?? t.cross_to_micro,
                      }
                    : targetToInput(t),
                );
                await saveActiveRouteTargets(nextTargets);
                // If not yet following, patches are held locally in the row's
                // draft state (ratio) and applied when the user enables Follow.
              }}
            />
          );
        })}

        {/* Empty state: no accounts connected at all */}
        {activeRoute && rows.length === 0 && (
          <div className="px-ds-5 py-ds-7 flex flex-col items-center justify-center gap-ds-2">
            <Users className="w-8 h-8 text-ink-tertiary" />
            <p className="text-sm text-ink-secondary">
              No connected accounts. Connect a broker in the Connections tab.
            </p>
          </div>
        )}

        {/* Empty state: no groups exist yet — "Create your first copy group" */}
        {!activeRoute && (
          <div className="px-ds-5 py-ds-9 flex flex-col items-center justify-center gap-ds-3">
            <Users className="w-10 h-10 text-ink-tertiary" />
            <p className="text-sm font-semibold text-ink-primary">Create your first copy group</p>
            <p className="max-w-sm text-center text-xs text-ink-secondary">
              A copy group has one leader account and its own followers, symbol, and name — fully
              independent from any other group.
            </p>
            <button
              type="button"
              onClick={handleOpenNewGroupDialog}
              className="mt-ds-1 flex items-center gap-ds-2 rounded-lg border border-gold-border/60 bg-gold-primary/10 px-ds-4 py-ds-2 text-sm font-semibold text-gold-primary transition-colors hover:border-gold-border hover:bg-gold-primary/20"
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              New group
            </button>
          </div>
        )}
      </div>

      {/* ── Protection activity (observability) ── */}
      <div className="mt-ds-4 grid grid-cols-1 lg:grid-cols-2 gap-ds-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary mb-ds-2">
            Recent risk enforcement
          </p>
          <EnforcementFeed />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary mb-ds-2">
            Live mirrored orders
          </p>
          <MirroredOrdersPanel />
        </div>
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

      {/* ── Unfollow-with-exposure confirm modal ── */}
      <Dialog
        open={unfollowConfirm !== null}
        onOpenChange={(open) => { if (!open) setUnfollowConfirm(null); }}
      >
        <DialogContent className="max-w-md border-red-600/40 bg-[#0d0f14]">
          <DialogTitle className="flex items-center gap-ds-2 text-red-400">
            <AlertOctagon className="h-5 w-5 flex-shrink-0" />
            This account still has an open position
          </DialogTitle>

          {unfollowConfirm?.reason === 'leader-repoint' ? (
            <p className="text-sm text-ink-secondary leading-relaxed">
              <span className="font-semibold text-ink-primary">{unfollowConfirm?.accountName}</span> still has live
              exposure (open position and/or working orders). Making a different account the leader of this group
              requires removing <span className="font-semibold text-ink-primary">{unfollowConfirm?.accountName}</span>{' '}
              as a follower (an account can't follow itself) — it will no longer be managed by this group. Any open
              position and pending orders will remain on the account and will{' '}
              <span className="font-semibold text-ink-primary">NOT</span> be closed automatically. Close them yourself
              in your platform if you don't want them left unmanaged.
            </p>
          ) : (
            <p className="text-sm text-ink-secondary leading-relaxed">
              <span className="font-semibold text-ink-primary">{unfollowConfirm?.accountName}</span> is currently
              following <span className="font-semibold text-ink-primary">{leaderAccountName}</span> and still has live
              exposure (open position and/or working orders). Unfollowing stops the copier from managing it — any open
              position and pending orders will remain on the account and will{' '}
              <span className="font-semibold text-ink-primary">NOT</span> be closed automatically. Close them yourself
              in your platform if you don't want them left unmanaged.
            </p>
          )}

          <div className="mt-ds-2 flex justify-end gap-ds-3">
            <button
              type="button"
              onClick={() => setUnfollowConfirm(null)}
              className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 text-sm text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                unfollowConfirm?.resolve();
                setUnfollowConfirm(null);
              }}
              className="flex items-center gap-ds-2 rounded-md border border-red-600/60 bg-red-600/15 px-ds-4 py-ds-2 text-sm font-semibold text-red-400 transition-colors hover:border-red-500 hover:bg-red-600/25 hover:text-red-300"
            >
              <AlertOctagon className="h-4 w-4 flex-shrink-0" />
              {unfollowConfirm?.reason === 'leader-repoint' ? 'Change leader anyway' : 'Unfollow anyway'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── New Group dialog ── */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="max-w-md border-gold-border/40 bg-[#0d0f14]">
          <DialogTitle className="flex items-center gap-ds-2 text-gold-primary">
            <Plus className="h-5 w-5 flex-shrink-0" />
            New copy group
          </DialogTitle>

          <p className="text-sm text-ink-secondary leading-relaxed">
            A group has its own leader, followers, symbol, and name — fully independent from your
            other groups.
          </p>

          <div className="flex flex-col gap-ds-3">
            <label className="flex flex-col gap-ds-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
                Group name
              </span>
              <input
                type="text"
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. NQ Scalps"
                className="h-9 w-full rounded-md border border-border-ds-default bg-[#111] px-ds-3 text-sm text-ink-primary outline-none focus:border-gold-border"
              />
            </label>

            <label className="relative flex flex-col gap-ds-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
                Symbol
              </span>
              <input
                type="text"
                value={newGroupSymbol}
                onChange={(e) => { setNewGroupSymbol(e.target.value.toUpperCase()); setShowNewGroupSuggestions(true); }}
                onFocus={() => setShowNewGroupSuggestions(true)}
                onBlur={() => setTimeout(() => setShowNewGroupSuggestions(false), 150)}
                placeholder="e.g. NQ"
                className="h-9 w-full rounded-md border border-border-ds-default bg-[#111] px-ds-3 text-sm font-semibold uppercase text-ink-primary outline-none focus:border-gold-border"
              />
              {showNewGroupSuggestions && newGroupSymbol.trim().length > 0 && (
                <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border-ds-default bg-[#111] shadow-lg">
                  {POPULAR_CONTRACTS.filter((c) =>
                    c.symbol.toUpperCase().includes(newGroupSymbol.trim().toUpperCase()),
                  ).slice(0, 6).map((c) => (
                    <button
                      key={c.symbol}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setNewGroupSymbol(c.symbol); setShowNewGroupSuggestions(false); }}
                      className="flex w-full items-center justify-between px-ds-3 py-ds-2 text-left hover:bg-gold-primary/10"
                    >
                      <span className="text-sm font-semibold text-ink-primary">{c.symbol}</span>
                      <span className="ml-ds-2 truncate text-[11px] text-ink-tertiary">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </label>

            <label className="flex flex-col gap-ds-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
                Leader account
              </span>
              <select
                value={newGroupLeaderId ?? ''}
                onChange={(e) => setNewGroupLeaderId(e.target.value || null)}
                className="h-9 w-full rounded-md border border-border-ds-default bg-[#111] px-ds-3 text-sm text-ink-primary outline-none focus:border-gold-border"
              >
                <option value="" disabled>Select an account…</option>
                {brokerAccountPortfolios
                  .filter((p) => p.tradovate_account_id != null)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </label>
          </div>

          <div className="mt-ds-2 flex justify-end gap-ds-3">
            <button
              type="button"
              onClick={() => setShowNewGroupDialog(false)}
              className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 text-sm text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={!canCreateNewGroup || isSavingRoute}
              className="flex items-center gap-ds-2 rounded-md border border-gold-border/60 bg-gold-primary/15 px-ds-4 py-ds-2 text-sm font-semibold text-gold-primary transition-colors hover:border-gold-border hover:bg-gold-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              {isSavingRoute ? 'Creating…' : 'Create group'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Group confirm modal ── */}
      <Dialog
        open={deleteGroupConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteGroupConfirm(null); }}
      >
        <DialogContent className="max-w-md border-red-600/40 bg-[#0d0f14]">
          <DialogTitle className="flex items-center gap-ds-2 text-red-400">
            <AlertOctagon className="h-5 w-5 flex-shrink-0" />
            Delete "{deleteGroupConfirm?.label}"?
          </DialogTitle>

          <p className="text-sm text-ink-secondary leading-relaxed">
            This permanently deletes the group <span className="font-semibold text-ink-primary">{deleteGroupConfirm?.label}</span>{' '}
            and stops copying between its leader and followers. This cannot be undone.
          </p>

          {deleteGroupConfirm && groupHasOpenExposure(deleteGroupConfirm) && (
            <p className="text-sm text-red-400 leading-relaxed">
              <AlertOctagon className="mr-ds-1 inline h-4 w-4 flex-shrink-0" />
              One or more accounts in this group still have live exposure (open position and/or
              working orders). Deleting the group stops the copier from managing them — any open
              position and pending orders will remain and will <span className="font-semibold">NOT</span> be
              closed automatically.
            </p>
          )}

          <div className="mt-ds-2 flex justify-end gap-ds-3">
            <button
              type="button"
              onClick={() => setDeleteGroupConfirm(null)}
              className="rounded-md border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 text-sm text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteGroupConfirm && void handleDeleteGroupConfirmed(deleteGroupConfirm)}
              className="flex items-center gap-ds-2 rounded-md border border-red-600/60 bg-red-600/15 px-ds-4 py-ds-2 text-sm font-semibold text-red-400 transition-colors hover:border-red-500 hover:bg-red-600/25 hover:text-red-300"
            >
              <AlertOctagon className="h-4 w-4 flex-shrink-0" />
              Yes, Delete Group
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default CopyTradingDashboard;
