/**
 * TradeDetailPanel — full detail for the currently selected trade.
 *
 * Renders only when `selectedTradeIndex` is set. Shows entry/SL/TP/exit, R,
 * P&L, and the originating pattern zone. The "Inspect in Replay" button
 * navigates to the manual backtest replay surface, carrying the
 * symbol/timeframe/detection in router state.
 */

import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';
import {
  useAutoBacktestStore,
  selectAutoResult,
  selectAutoSetup,
  selectSelectedTradeIndex,
} from '@/store/useAutoBacktestStore';
import type { AutoPosition } from '@/core/auto/signalToPosition';
import type { Detection } from '@/core/auto/types';
import type { ReplayHandoff } from '@/core/auto/replayBridge';

function fmtTime(sec?: number): string {
  if (!sec) return '—';
  return new Date(sec * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtPrice(v?: number): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function DetailRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-ink-tertiary">{label}</span>
      <span className={cn('text-sm tabular-nums text-ink-primary', tone)}>{value}</span>
    </div>
  );
}

export function TradeDetailPanel() {
  const navigate = useNavigate();
  const result = useAutoBacktestStore(selectAutoResult);
  const setup = useAutoBacktestStore(selectAutoSetup);
  const selectedIndex = useAutoBacktestStore(selectSelectedTradeIndex);

  if (!result || selectedIndex == null) return null;

  const trade: AutoPosition | undefined = result.trades[selectedIndex];
  if (!trade) return null;

  // Best-effort originating detection (first of the run's pattern family).
  const detection: Detection | undefined = result.detections[0];

  const r =
    trade.realizedPnl != null && trade.riskAmount && trade.riskAmount > 0
      ? trade.realizedPnl / trade.riskAmount
      : null;
  const pnl = trade.realizedPnl ?? 0;
  const pnlTone = pnl > 0 ? 'text-emerald-500' : pnl < 0 ? 'text-num-negative' : 'text-ink-primary';

  const handleInspect = () => {
    // Trade times are in SECONDS (journal convention). The handoff carries ms.
    const entryMs = trade.entryTime * 1000;
    const exitMs = (trade.exitTime ?? trade.entryTime) * 1000;
    // Pad the window so context bars are visible on either side of the trade.
    const padMs = 30 * 24 * 60 * 60 * 1000; // 30 days of context

    const handoff: ReplayHandoff = {
      symbol: setup.instrument.symbol,
      timeframe: setup.instrument.timeframe,
      source: setup.instrument.source,
      windowFrom: entryMs - padMs,
      windowTo: exitMs + padMs,
      focusTime: entryMs,
      ...(detection ? { detection } : {}),
    };

    // Consumed by useBacktestStore.loadHandoff on the manual replay surface.
    navigate('/app/journal/backtest/chart', { state: { handoff } });
  };

  return (
    <Card padding="default">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-primary">
          Trade #{selectedIndex + 1} detail
        </h3>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[11px] font-medium uppercase',
            trade.type === 'long'
              ? 'bg-emerald-500/15 text-emerald-500'
              : 'bg-num-negative/15 text-num-negative',
          )}
        >
          {trade.type}
        </span>
      </div>

      <div className="grid gap-x-6 sm:grid-cols-2">
        <div className="divide-y divide-border-ds-subtle">
          <DetailRow label="Pattern" value={detection?.patternType ?? '—'} />
          <DetailRow label="Symbol" value={setup.instrument.symbol} />
          <DetailRow label="Entry time" value={fmtTime(trade.entryTime)} />
          <DetailRow label="Entry price" value={fmtPrice(trade.entryPrice)} />
          <DetailRow label="Stop loss" value={fmtPrice(trade.stopLoss)} />
          <DetailRow label="Take profit" value={fmtPrice(trade.takeProfit)} />
        </div>
        <div className="divide-y divide-border-ds-subtle">
          <DetailRow label="Exit time" value={fmtTime(trade.exitTime)} />
          <DetailRow label="Exit price" value={fmtPrice(trade.exitPrice)} />
          <DetailRow
            label="Exit reason"
            value={
              trade.exitReason === 'stop_loss'
                ? 'Stop loss'
                : trade.exitReason === 'take_profit'
                ? 'Take profit'
                : trade.exitReason === 'manual'
                ? 'Manual'
                : '—'
            }
          />
          <DetailRow
            label="R-multiple"
            value={r == null ? '—' : `${r >= 0 ? '+' : '−'}${Math.abs(r).toFixed(2)}R`}
            tone={r == null ? undefined : r >= 0 ? 'text-emerald-500' : 'text-num-negative'}
          />
          <DetailRow
            label="P&L"
            value={`${pnl >= 0 ? '+' : '−'}$${Math.abs(pnl).toLocaleString('en-US', {
              maximumFractionDigits: 2,
            })}`}
            tone={pnlTone}
          />
          {detection && (
            <DetailRow
              label="Pattern zone"
              value={`${fmtPrice(detection.zone.bottom)} – ${fmtPrice(detection.zone.top)}`}
            />
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="goldOutline" size="sm" onClick={handleInspect}>
          Inspect in Replay
        </Button>
      </div>
    </Card>
  );
}

export default TradeDetailPanel;
