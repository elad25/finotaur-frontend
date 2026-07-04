/**
 * RunProgress — status surface for the Automated Backtest run lifecycle.
 *
 *   idle         → renders nothing
 *   loading-data → spinner + "Loading candles…"
 *   running      → determinate progress bar (scanned / total) + live found count
 *   error        → English error card
 *   done         → renders nothing (results take over)
 */

import { Card } from '@/components/ds/Card';
import { Spinner } from '@/components/ds/Spinner';
import {
  useAutoBacktestStore,
  selectAutoStatus,
  selectAutoProgress,
  selectAutoError,
} from '@/store/useAutoBacktestStore';

export function RunProgress() {
  const status = useAutoBacktestStore(selectAutoStatus);
  const progress = useAutoBacktestStore(selectAutoProgress);
  const error = useAutoBacktestStore(selectAutoError);

  if (status === 'idle' || status === 'done') return null;

  if (status === 'loading-data') {
    return (
      <Card padding="default">
        <div className="flex items-center gap-3">
          <Spinner size="sm" />
          <span className="text-sm text-ink-secondary">Loading candles…</span>
        </div>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card padding="default" className="border-num-negative/40 bg-num-negative/5">
        <h3 className="text-sm font-semibold text-num-negative">Backtest failed</h3>
        <p className="mt-1 text-sm text-ink-secondary">
          {error ?? 'Something went wrong while running the backtest.'}
        </p>
      </Card>
    );
  }

  // status === 'running'
  const { scanned, total, found } = progress;
  const pct = total > 0 ? Math.min(100, Math.round((scanned / total) * 100)) : 0;

  return (
    <Card padding="default">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Spinner size="sm" />
          <span className="text-sm text-ink-secondary">Scanning history…</span>
        </div>
        <span className="text-sm font-medium tabular-nums text-gold-primary">{pct}%</span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gold-primary transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[12px] text-ink-tertiary tabular-nums">
        <span>
          {scanned.toLocaleString('en-US')} / {total.toLocaleString('en-US')} bars
        </span>
        <span>
          <span className="font-medium text-ink-secondary">{found.toLocaleString('en-US')}</span>{' '}
          {found === 1 ? 'detection' : 'detections'} found
        </span>
      </div>
    </Card>
  );
}

export default RunProgress;
