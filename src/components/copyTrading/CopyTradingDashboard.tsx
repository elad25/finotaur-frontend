// src/components/copyTrading/CopyTradingDashboard.tsx
// ═══════════════════════════════════════════════════════════════
// Copy Trading Dashboard — Sprint #4a
// Leader dropdown, inline Ratio/Cross editing, FLATTEN double-check.
// ═══════════════════════════════════════════════════════════════

import { memo, useMemo, useState } from 'react';
import { AlertOctagon, Crown, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { useEngineSessions } from '@/hooks/useEngineSessions';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useAccountSnapshots } from '@/hooks/useAccountSnapshots';
import type { PositionEntry } from '@/hooks/useAccountSnapshots';
import { FlattenConfirmDialog } from './FlattenConfirmDialog';
import { useFlattenActions } from '@/hooks/useFlattenActions';
import { useCopyRules } from '@/hooks/useCopyRules';
import type { CopyRule } from '@/hooks/useCopyRules';

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

// ─── Table column grid (shared by header + rows) ──────────────
// 13 cols: crown · follow · connection · account · symbol · ratio · cross · position · balance · dayPnL · openPnL · qty · actions

const GRID_COLS =
  'grid-cols-[40px_60px_120px_minmax(160px,1fr)_80px_80px_60px_90px_100px_100px_100px_60px_80px]';

// ─── Internal AccountRow ──────────────────────────────────────

const CopyAccountRow = memo(function CopyAccountRow({
  row,
  isLeader,
  rule,
  onFlatten,
  onUpdateRule,
}: {
  row: AccountRowData;
  isLeader: boolean;
  rule: CopyRule | null;
  onFlatten: () => void;
  onUpdateRule: (patch: Partial<CopyRule>) => Promise<void>;
}) {
  const ratioValue = rule?.ratio ?? 1;

  return (
    <div
      className={`grid ${GRID_COLS} gap-ds-2 px-ds-3 py-ds-3 border-b border-border-ds-subtle last:border-b-0 hover:bg-surface-2 transition-colors duration-base`}
    >
      {/* Crown col */}
      <div className="flex items-center justify-center">
        {isLeader && <Crown className="w-4 h-4 text-gold-primary" />}
      </div>

      {/* Follow toggle */}
      <div className="flex items-center">
        {!isLeader && (
          <button
            onClick={() => {
              /* TODO Sprint 3c */
            }}
            className={`w-9 h-5 rounded-full transition-colors duration-base ${
              row.following
                ? 'bg-status-success'
                : 'bg-status-offline border border-border-ds-default'
            }`}
            aria-label="Toggle follow"
          >
            <span
              className={`block w-3 h-3 bg-ink-primary rounded-full transition-transform duration-base ${
                row.following ? 'translate-x-5' : 'translate-x-1'
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
        {isLeader && (
          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-sm bg-gold-primary/10 border border-gold-border text-gold-primary">
            Leader
          </span>
        )}
      </div>

      {/* Symbol */}
      <div className="text-sm font-mono tabular-nums text-ink-primary truncate">
        {row.symbol ?? '—'}
      </div>

      {/* Ratio — inline editable for followers, empty for leader */}
      <div className="flex items-center">
        {isLeader ? (
          <span className="text-sm font-mono tabular-nums text-ink-tertiary">—</span>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            defaultValue={String(ratioValue)}
            key={`ratio-${rule?.id ?? row.id}`}
            onBlur={async (e) => {
              const newRatio = Number(e.target.value);
              if (!Number.isNaN(newRatio) && newRatio > 0 && rule) {
                await onUpdateRule({ ratio: newRatio });
              }
            }}
            className="w-full px-2 py-1 rounded-sm bg-surface-base border border-border-ds-subtle text-xs font-mono tabular-nums text-ink-primary text-center focus:border-gold-border outline-none"
          />
        )}
      </div>

      {/* Cross toggle — for followers only */}
      <div className="flex items-center">
        {isLeader ? (
          <span className="text-sm font-mono tabular-nums text-ink-tertiary">—</span>
        ) : (
          <button
            onClick={async () => {
              if (rule) {
                await onUpdateRule({ cross_to_micro: !rule.cross_to_micro });
              }
            }}
            disabled={!rule}
            className={`relative w-9 h-5 rounded-full transition-colors duration-base ${
              rule?.cross_to_micro
                ? 'bg-status-success'
                : 'bg-status-offline border border-border-ds-default'
            } disabled:opacity-30`}
            aria-label="Cross-to-micro toggle"
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
        className={`text-sm font-mono tabular-nums text-right ${
          row.position != null && row.position < 0 ? 'text-num-negative' : 'text-ink-primary'
        }`}
      >
        {row.position ?? '—'}
      </div>

      {/* Balance */}
      <div className="text-sm font-mono tabular-nums text-right text-ink-primary">
        {row.balance != null ? `$${row.balance.toFixed(2)}` : '—'}
      </div>

      {/* Day PnL */}
      <div
        className={`text-sm font-mono tabular-nums text-right ${
          row.dayPnL != null && row.dayPnL < 0 ? 'text-num-negative' : 'text-ink-primary'
        }`}
      >
        {row.dayPnL != null
          ? (row.dayPnL >= 0 ? '$' : '−$') + Math.abs(row.dayPnL).toFixed(2)
          : '—'}
      </div>

      {/* Open PnL */}
      <div
        className={`text-sm font-mono tabular-nums text-right ${
          row.openPnL != null && row.openPnL < 0 ? 'text-num-negative' : 'text-ink-primary'
        }`}
      >
        {row.openPnL != null
          ? (row.openPnL >= 0 ? '$' : '−$') + Math.abs(row.openPnL).toFixed(2)
          : '—'}
      </div>

      {/* Qty */}
      <div className="text-sm font-mono tabular-nums text-right text-ink-primary">
        {row.qty ?? '—'}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-start">
        <button
          onClick={onFlatten}
          className="text-xs text-num-negative hover:text-num-negative/80 transition-colors duration-base"
        >
          Flatten
        </button>
      </div>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────

export function CopyTradingDashboard() {
  const { connections } = useBrokerConnections({ active: true });
  const { liveCredentialIds } = useEngineSessions();
  const { portfolios } = usePortfolios();
  const { snapshotFor } = useAccountSnapshots();
  const [instrument, setInstrument] = useState('NQ');
  const { flattenAll, flattenCredential, isLoading: flattenLoading } = useFlattenActions();
  const { rules, updateRule } = useCopyRules();
  const [flattenDialog, setFlattenDialog] = useState<{
    open: boolean;
    scope: 'all' | 'single';
    credentialId?: string;
    accountName?: string;
  } | null>(null);

  // Leader: user-controlled via dropdown, defaults to first tradovate connection
  const tradovateConnections = connections.filter(
    (c) => c.broker === 'tradovate' && c.is_active,
  );
  const [leaderId, setLeaderId] = useState<string | null>(
    tradovateConnections[0]?.id ?? null,
  );

  // Resolve leader's portfolio id for copy-rule lookup
  const leaderConnection = connections.find((c) => c.id === leaderId);
  const leaderPortfolio = portfolios.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p) => (p as any).tradovate_account_id?.toString() === leaderConnection?.account_id,
  );
  const leaderPortfolioId = leaderPortfolio?.id ?? null;

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

  // Build rows from broker_connections filtered to tradovate + portfolios
  const rows = useMemo<AccountRowData[]>(() => {
    return connections
      .filter((c) => c.broker === 'tradovate')
      .map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const port = portfolios.find(
          (p) =>
            p.id === c.id ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p as any).tradovate_account_id?.toString() === c.account_id,
        );
        const portfolioId = port?.id ?? null;

        const tokenExpired = c.token_expires_at
          ? new Date(c.token_expires_at) < new Date()
          : false;
        const live = liveCredentialIds.has(c.id);
        const issue = !live && ((c.is_active && c.status === 'connected') || tokenExpired);

        const snap = snapshotFor(c.id);

        let activePosition: PositionEntry | null = null;
        if (snap?.positions?.length) {
          if (instrument) {
            activePosition =
              snap.positions.find((p) =>
                p.contractName?.toUpperCase().includes(instrument.toUpperCase()),
              ) ?? null;
          }
          if (!activePosition) {
            activePosition =
              [...snap.positions].sort(
                (a, b) => Math.abs(b.netPos ?? 0) - Math.abs(a.netPos ?? 0),
              )[0] ?? null;
          }
        }

        return {
          id: c.id,
          connectionName: c.connection_name ?? c.broker,
          accountName:    c.account_name ?? c.account_id,
          symbol:         activePosition?.contractName ?? instrument,
          live,
          issue,
          position:    activePosition?.netPos ?? null,
          balance:     snap?.cashBalance     ?? null,
          dayPnL:      snap?.realizedPnL     ?? null,
          openPnL:     snap?.openPnL         ?? null,
          qty:
            activePosition && activePosition.netPos != null
              ? Math.abs(activePosition.netPos)
              : null,
          following:   c.is_active,
          portfolioId,
        };
      });
  }, [connections, liveCredentialIds, portfolios, snapshotFor, instrument]);

  // Summary bar
  const totalDayPnL        = rows.reduce((s, r) => s + (r.dayPnL  ?? 0), 0);
  const totalOpenPnL       = rows.reduce((s, r) => s + (r.openPnL ?? 0), 0);
  const totalBalance       = rows.reduce((s, r) => s + (r.balance ?? 0), 0);
  const openPositionsCount = rows.filter((r) => (r.position ?? 0) !== 0).length;
  const accountsWithPositions = rows.filter((r) => (r.position ?? 0) !== 0).length;

  // ── Flatten handlers ──────────────────────────────────────────
  const handleFlattenAll = () => {
    setFlattenDialog({ open: true, scope: 'all' });
  };

  const handleFlattenSingle = (credentialId: string, accountName: string) => {
    setFlattenDialog({ open: true, scope: 'single', credentialId, accountName });
  };

  const handleConfirmFlatten = async () => {
    if (!flattenDialog) return;
    const result =
      flattenDialog.scope === 'all'
        ? await flattenAll()
        : await flattenCredential(flattenDialog.credentialId!);

    if (result.ok) {
      toast.success(
        `Flattened ${result.positionsFlattened ?? 0} position${(result.positionsFlattened ?? 0) === 1 ? '' : 's'} across ${result.accountsAffected ?? 0} account${(result.accountsAffected ?? 0) === 1 ? '' : 's'}.`,
      );
      if (result.errors?.length) {
        toast.warning(`${result.errors.length} error${result.errors.length === 1 ? '' : 's'} during flatten.`);
      }
    } else {
      toast.error(result.error ?? 'Flatten failed.');
    }
    setFlattenDialog(null);
  };

  return (
    <div>
      {/* ── 1. Asset selector + action bar ── */}
      <div className="flex items-center justify-between mb-ds-4 gap-ds-4">
        <div className="flex items-center gap-ds-3">
          <span className="text-xs text-ink-secondary uppercase tracking-wider">
            Active Contract
          </span>
          <div className="flex items-center gap-1.5 px-ds-3 py-ds-2 rounded-md bg-surface-1 border border-border-ds-subtle">
            <Search className="w-3.5 h-3.5 text-ink-tertiary" />
            <input
              type="text"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value.toUpperCase())}
              placeholder="NQ, ES, GC..."
              className="bg-transparent border-0 outline-none text-sm text-ink-primary w-24 placeholder:text-ink-tertiary"
            />
          </div>
        </div>

        <div className="flex items-center gap-ds-2">
          {/* Leader dropdown */}
          <div className="flex items-center gap-ds-2">
            <span className="text-[10px] uppercase tracking-wider text-ink-secondary">Leader</span>
            <select
              value={leaderId ?? ''}
              onChange={(e) => setLeaderId(e.target.value || null)}
              className="px-ds-3 py-1.5 rounded-md bg-surface-1 border border-border-ds-subtle text-sm text-ink-primary focus:border-gold-border outline-none transition-colors duration-base min-w-[180px]"
            >
              {tradovateConnections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.account_name ?? c.account_id}
                </option>
              ))}
            </select>
          </div>

          {/* FLATTEN ALL */}
          <button
            onClick={handleFlattenAll}
            className="flex items-center gap-1.5 px-ds-4 py-ds-2 rounded-md bg-num-negative/10 border border-num-negative/30 text-num-negative hover:bg-num-negative/20 transition-colors duration-base font-semibold text-sm"
          >
            <AlertOctagon className="w-4 h-4" />
            FLATTEN ALL
          </button>
        </div>
      </div>

      {/* ── 2. Summary bar ── */}
      <div className="grid grid-cols-4 gap-ds-3 mb-ds-4">
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Total Day PnL
          </div>
          <div className="text-base font-mono tabular-nums text-ink-primary mt-1">
            {totalDayPnL >= 0 ? '$' : '−$'}
            {Math.abs(totalDayPnL).toFixed(2)}
          </div>
        </div>
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Total Open PnL
          </div>
          <div
            className={`text-base font-mono tabular-nums mt-1 ${
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
          <div className="text-base font-mono tabular-nums text-ink-primary mt-1">
            ${totalBalance.toFixed(2)}
          </div>
        </div>
        <div className="px-ds-4 py-ds-3 rounded-md bg-surface-1 border border-border-ds-subtle">
          <div className="text-[10px] text-ink-secondary uppercase tracking-wider">
            Open Positions
          </div>
          <div className="text-base font-mono tabular-nums text-ink-primary mt-1">
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
          <div></div>
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
          return (
            <CopyAccountRow
              key={row.id}
              row={row}
              isLeader={row.id === leaderId}
              rule={rule}
              onFlatten={() => handleFlattenSingle(row.id, row.accountName)}
              onUpdateRule={async (patch) => {
                if (rule) {
                  await updateRule({ id: rule.id, patch });
                }
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

      {/* ── 4. Flatten confirm dialog ── */}
      {flattenDialog && (
        <FlattenConfirmDialog
          open={flattenDialog.open}
          scope={flattenDialog.scope}
          accountName={flattenDialog.accountName}
          positionsCount={
            flattenDialog.scope === 'all'
              ? openPositionsCount
              : (rows.find((r) => r.id === flattenDialog.credentialId)?.position ?? 0) !== 0
                ? 1
                : 0
          }
          accountsCount={flattenDialog.scope === 'all' ? accountsWithPositions : 1}
          onConfirm={handleConfirmFlatten}
          onCancel={() => setFlattenDialog(null)}
          isLoading={flattenLoading}
        />
      )}
    </div>
  );
}

export default CopyTradingDashboard;
