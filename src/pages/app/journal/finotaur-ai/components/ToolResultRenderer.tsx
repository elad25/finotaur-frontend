// src/pages/app/journal/finotaur-ai/components/ToolResultRenderer.tsx
// Phase 5b — structured renderers for journal-ai read-tool results.
// Replaces the raw JSON dump for known actions: get_trades, find_trades,
// list_trades, get_score. Falls back to JSON for unknown shapes.

import * as React from 'react';
import { useState } from 'react';
import { Price, Change } from '@/components/ds/NumberDisplay';

// ── Trade shape (loose — backend may include extra fields) ───────────────────
interface TradeRow {
  id?: string | number;
  symbol?: string;
  side?: string;
  quantity?: number | string;
  entry_price?: number | string;
  exit_price?: number | string;
  fees?: number | string;
  pnl?: number | string;
  net_pnl?: number | string;
  open_at?: string;
  close_at?: string;
  tags?: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatDateShort(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ── Renderers ────────────────────────────────────────────────────────────────

function TradeList({ trades }: { trades: TradeRow[] }): JSX.Element {
  if (trades.length === 0) {
    return <p className="text-ink-secondary text-sm py-ds-2">No trades matched.</p>;
  }

  return (
    <ul className="flex flex-col gap-ds-2">
      {trades.map((t, idx) => {
        const pnl = toNumberOrNull(t.net_pnl ?? t.pnl);
        const entry = toNumberOrNull(t.entry_price);
        const exit = toNumberOrNull(t.exit_price);
        const dateLabel = formatDateShort(t.close_at ?? t.open_at);

        return (
          <li
            key={String(t.id ?? idx)}
            className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-ds-3 py-ds-2"
          >
            <div className="flex items-baseline justify-between gap-ds-3">
              <div className="flex items-baseline gap-ds-2 min-w-0">
                <span className="text-ink-primary font-medium text-sm">
                  {t.symbol ?? '—'}
                </span>
                {t.side && (
                  <span className="text-xs text-ink-secondary uppercase">
                    {String(t.side)}
                  </span>
                )}
                {dateLabel && (
                  <span className="text-xs text-ink-tertiary">{dateLabel}</span>
                )}
              </div>
              {pnl !== null && (
                <Change value={pnl} format="currency" decimals={2} />
              )}
            </div>
            {(entry !== null || exit !== null) && (
              <div className="mt-1 flex gap-ds-3 text-xs text-ink-secondary">
                {entry !== null && (
                  <span>
                    Entry <Price value={entry} size="small" />
                  </span>
                )}
                {exit !== null && (
                  <span>
                    Exit <Price value={exit} size="small" />
                  </span>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ScoreSummary({ payload }: { payload: Record<string, unknown> }): JSX.Element {
  const score = toNumberOrNull(payload.score);
  const totalTrades = toNumberOrNull(payload.total_trades);
  const winRate = toNumberOrNull(
    (payload.breakdown as Record<string, unknown> | undefined)?.win_rate,
  );
  const profitFactor = toNumberOrNull(
    (payload.breakdown as Record<string, unknown> | undefined)?.profit_factor,
  );

  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-ds-3 py-ds-2 text-sm">
      <div className="flex items-baseline gap-ds-3 flex-wrap">
        {score !== null && (
          <span>
            <span className="text-ink-secondary">Score </span>
            <span className="text-ink-primary font-medium">{score.toFixed(0)}</span>
          </span>
        )}
        {totalTrades !== null && (
          <span>
            <span className="text-ink-secondary">Trades </span>
            <span className="text-ink-primary">{totalTrades}</span>
          </span>
        )}
        {winRate !== null && (
          <span>
            <span className="text-ink-secondary">Win rate </span>
            <span className="text-ink-primary">{winRate.toFixed(0)}%</span>
          </span>
        )}
        {profitFactor !== null && (
          <span>
            <span className="text-ink-secondary">PF </span>
            <span className="text-ink-primary">{profitFactor.toFixed(2)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function JsonFallback({ json }: { json: string }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-ink-secondary hover:text-ink-primary transition-all duration-200 ease-out"
      >
        {open ? '▲ Hide details' : '▼ Show details'}
      </button>
      {open && (
        <pre className="overflow-x-auto text-xs mt-ds-2 text-ink-secondary bg-surface-2 rounded-md p-ds-3">
          {json}
        </pre>
      )}
    </div>
  );
}

// ── Main entry ───────────────────────────────────────────────────────────────

interface ToolResultRendererProps {
  result: unknown;
}

export default function ToolResultRenderer({
  result,
}: ToolResultRendererProps): JSX.Element {
  if (result === null || result === undefined || typeof result !== 'object') {
    return <p className="text-xs text-ink-tertiary">No result data.</p>;
  }

  const payload = result as Record<string, unknown>;
  const action = typeof payload.action === 'string' ? payload.action : 'tool';

  // Trade list actions
  const tradeListActions = new Set(['get_trades', 'find_trades', 'list_trades']);
  if (tradeListActions.has(action)) {
    const trades = Array.isArray(payload.trades)
      ? (payload.trades as TradeRow[])
      : Array.isArray(payload.items)
        ? (payload.items as TradeRow[])
        : [];
    return <TradeList trades={trades} />;
  }

  // Score action
  if (action === 'get_score') {
    return <ScoreSummary payload={payload} />;
  }

  // Fallback — keep the JSON visible for debugging / unknown actions
  return <JsonFallback json={JSON.stringify(payload, null, 2)} />;
}
