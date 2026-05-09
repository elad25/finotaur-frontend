// src/components/copyTrading/CopyTradingDashboard.tsx
// ═══════════════════════════════════════════════════════════════
// Copy Trading Dashboard — Sprint #3b
// TradeSyncer-style table: leader crown, asset selector,
// summary bar, FLATTEN ALL placeholder.
// Live data and per-row actions wire in Sprint 3c/3d.
// ═══════════════════════════════════════════════════════════════

import { memo, useMemo, useState } from 'react';
import { AlertOctagon, Crown, Search, Users } from 'lucide-react';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { useEngineSessions } from '@/hooks/useEngineSessions';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useAccountSnapshots } from '@/hooks/useAccountSnapshots';
import type { PositionEntry } from '@/hooks/useAccountSnapshots';

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
  avgPrice: number | null;
  dayPnL: number | null;
  openPnL: number | null;
  qty: number | null;
  ratio: number | null;
  crossSymbol: string | null;
  following: boolean;
}

// ─── Table column grid (shared by header + rows) ──────────────

const GRID_COLS =
  'grid-cols-[40px_60px_120px_minmax(160px,1fr)_80px_90px_100px_100px_100px_100px_60px_60px_60px_80px]';

// ─── Internal AccountRow (named CopyAccountRow to avoid collision
//     with existing copyTrading/AccountRow.tsx) ─────────────────

const CopyAccountRow = memo(function CopyAccountRow({
  row,
  isLeader,
}: {
  row: AccountRowData;
  isLeader: boolean;
}) {
  return (
    <div
      className={`grid ${GRID_COLS} gap-ds-2 px-ds-3 py-ds-3 border-b border-border-ds-subtle last:border-b-0 hover:bg-surface-2 transition-colors duration-base`}
    >
      {/* Crown col */}
      <div className="flex items-center justify-center">
        {isLeader && <Crown className="w-4 h-4 text-gold-primary" />}
      </div>

      {/* Follow toggle (placeholder — only shown for followers) */}
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

      {/* Avg Price */}
      <div className="text-sm font-mono tabular-nums text-right text-ink-primary">
        {row.avgPrice != null ? row.avgPrice.toFixed(2) : '—'}
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

      {/* Ratio */}
      <div className="text-sm font-mono tabular-nums text-right text-ink-primary">
        {isLeader ? '—' : `${row.ratio ?? 1}×`}
      </div>

      {/* Cross */}
      <div className="text-sm font-mono tabular-nums text-ink-secondary truncate">
        {row.crossSymbol ?? '—'}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-start">
        <button
          onClick={() => {
            /* TODO Sprint 3d: per-row flatten */
          }}
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

  // Build rows from broker_connections filtered to tradovate + portfolios.
  // Live fields (position, balance, avgPrice, dayPnL, openPnL, qty) wired
  // from /api/copy-engine/accounts snapshot in Sprint 3c.
  const rows = useMemo<AccountRowData[]>(() => {
    return connections
      .filter((c) => c.broker === 'tradovate')
      .map((c) => {
        // Cast: Portfolio.tradovate_account_id is a number, c.account_id is string
        const port = portfolios.find(
          (p) =>
            p.id === c.id ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p as any).tradovate_account_id?.toString() === c.account_id,
          // (p as any) needed because Portfolio type predates broker_connections join field
        );
        void port; // Sprint 3c-extension will use portfolio fields
        const tokenExpired = c.token_expires_at
          ? new Date(c.token_expires_at) < new Date()
          : false;
        const live = liveCredentialIds.has(c.id);
        const issue = !live && ((c.is_active && c.status === 'connected') || tokenExpired);

        const snap = snapshotFor(c.id);

        // Pick position matching the selected instrument (case-insensitive contains).
        // When no instrument typed, use the largest absolute position.
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
          position:    activePosition?.netPos   ?? null,
          balance:     snap?.cashBalance        ?? null,
          avgPrice:    activePosition?.avgPrice ?? null,
          dayPnL:      snap?.realizedPnL        ?? null,
          openPnL:     snap?.openPnL            ?? null,
          qty:
            activePosition && activePosition.netPos != null
              ? Math.abs(activePosition.netPos)
              : null,
          ratio:       1,    // TODO Sprint 3c-extension: read from copy_rules
          crossSymbol: null, // TODO Sprint 3c-extension
          following:   c.is_active,
        };
      });
  }, [connections, liveCredentialIds, portfolios, snapshotFor, instrument]);

  // Leader heuristic: first connection by created_at (server returns ascending order).
  // Sprint 3c will read leader_portfolio_id from copy_rules instead.
  const leaderId = rows[0]?.id ?? null;

  // Summary bar — derived from live snapshots
  const totalDayPnL        = rows.reduce((s, r) => s + (r.dayPnL  ?? 0), 0);
  const totalOpenPnL       = rows.reduce((s, r) => s + (r.openPnL ?? 0), 0);
  const totalBalance       = rows.reduce((s, r) => s + (r.balance ?? 0), 0);
  const openPositionsCount = rows.filter((r) => (r.position ?? 0) !== 0).length;

  // FLATTEN ALL placeholder — Sprint 3d wires confirmation dialog + POST /api/copy-engine/flatten-all
  const handleFlattenAll = () => {
    alert('FLATTEN ALL — coming in Sprint 3d');
  };

  return (
    <div>
      {/* ── 1. Asset selector bar ── */}
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
          <button className="px-ds-3 py-ds-2 rounded-md text-sm border border-border-ds-default text-ink-secondary hover:text-ink-primary hover:bg-surface-2 transition-colors duration-base">
            Change leader
          </button>
          <button className="px-ds-3 py-ds-2 rounded-md text-sm border border-border-ds-default text-ink-secondary hover:text-ink-primary hover:bg-surface-2 transition-colors duration-base">
            Enable all
          </button>
          <button className="px-ds-3 py-ds-2 rounded-md text-sm border border-border-ds-default text-ink-secondary hover:text-ink-primary hover:bg-surface-2 transition-colors duration-base">
            Cancel all orders
          </button>
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
          <div className="text-right">Position</div>
          <div className="text-right">Balance</div>
          <div className="text-right">Avg Price</div>
          <div className="text-right">Day PnL</div>
          <div className="text-right">Open PnL</div>
          <div className="text-right">Qty</div>
          <div className="text-right">Ratio</div>
          <div>Cross</div>
          <div>Actions</div>
        </div>

        {/* Rows */}
        {rows.map((row) => (
          <CopyAccountRow key={row.id} row={row} isLeader={row.id === leaderId} />
        ))}

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
    </div>
  );
}

export default CopyTradingDashboard;
