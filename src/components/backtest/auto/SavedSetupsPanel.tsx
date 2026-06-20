/**
 * SavedSetupsPanel — library of saved setups and past runs.
 *
 *   - Save the current setup (saveCurrentSetup).
 *   - Saved setups: load (loadSetup) / delete (deleteSetup).
 *   - Saved runs (newest first): load (loadRun) / delete (deleteRun).
 */

import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import {
  useAutoBacktestStore,
  selectSavedSetups,
  selectSavedRuns,
} from '@/store/useAutoBacktestStore';
import type { SetupDefinition } from '@/core/auto/types';
import type { SavedRun } from '@/services/backtest/setupRepository';

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function runWinRate(run: SavedRun): string {
  const wr = run.statistics?.winRate;
  return typeof wr === 'number' && Number.isFinite(wr) ? `${wr.toFixed(0)}% win` : '—';
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function LibraryRow({
  title,
  subtitle,
  onLoad,
  onDelete,
}: {
  title: string;
  subtitle: string;
  onLoad: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border-ds-subtle bg-surface-1 px-3 py-2">
      <button
        type="button"
        onClick={onLoad}
        className="min-w-0 flex-1 text-left"
        title="Load"
      >
        <p className="truncate text-sm font-medium text-ink-primary">{title}</p>
        <p className="truncate text-[11px] text-ink-tertiary">{subtitle}</p>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${title}`}
        className="shrink-0 rounded p-1.5 text-ink-tertiary transition-colors hover:bg-num-negative/10 hover:text-num-negative"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SavedSetupsPanel() {
  const savedSetups: SetupDefinition[] = useAutoBacktestStore(selectSavedSetups);
  const savedRuns: SavedRun[] = useAutoBacktestStore(selectSavedRuns);
  const saveCurrentSetup = useAutoBacktestStore((s) => s.saveCurrentSetup);
  const loadSetup = useAutoBacktestStore((s) => s.loadSetup);
  const deleteSetup = useAutoBacktestStore((s) => s.deleteSetup);
  const loadRun = useAutoBacktestStore((s) => s.loadRun);
  const deleteRun = useAutoBacktestStore((s) => s.deleteRun);

  return (
    <div className="flex flex-col gap-6">
      {/* Saved setups */}
      <Card padding="default">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-primary">Saved setups</h3>
          <Button variant="goldOutline" size="sm" onClick={saveCurrentSetup}>
            Save current
          </Button>
        </div>
        {savedSetups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-ds-subtle bg-surface-1 p-4 text-center text-[12px] text-ink-tertiary">
            No saved setups yet. Save the current setup to reuse it later.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {savedSetups.map((s) => (
              <LibraryRow
                key={s.id}
                title={s.name}
                subtitle={`${s.instrument.symbol} · ${s.instrument.timeframe} · updated ${fmtDate(s.updatedAt)}`}
                onLoad={() => loadSetup(s.id)}
                onDelete={() => deleteSetup(s.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Saved runs */}
      <Card padding="default">
        <h3 className="mb-4 text-sm font-semibold text-ink-primary">Recent runs</h3>
        {savedRuns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-ds-subtle bg-surface-1 p-4 text-center text-[12px] text-ink-tertiary">
            No runs yet. Run a backtest to see it here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {savedRuns.map((run) => (
              <LibraryRow
                key={run.id}
                title={`${run.symbol} · ${run.timeframe}`}
                subtitle={`${runWinRate(run)} · ${fmtDate(run.createdAt)}`}
                onLoad={() => loadRun(run.id)}
                onDelete={() => deleteRun(run.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default SavedSetupsPanel;
