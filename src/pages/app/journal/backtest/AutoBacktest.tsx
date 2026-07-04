/**
 * AutoBacktest — THE central tab for automated ICT pattern-detection backtests.
 *
 * Two-section layout:
 *   1) "Describe your strategy" — symbol/timeframe/session basics + a plain-
 *      English strategy box. Submitting parses the setup via AI, merges it
 *      onto the defaults (dropdowns win over anything the AI inferred for
 *      instrument/session), and runs the backtest.
 *   2) "The results" — headline, $-denominated equity curve, and stat cards,
 *      all derived from the real trades the engine produced. Below that: the
 *      full trade list/detail and an on-demand AI read of the run.
 *
 * The manual builder (SetupBuilderForm — pattern cards, entry/stop/target,
 * tolerance sliders) is intentionally NOT rendered here anymore; the file is
 * untouched so nothing is deleted (Forward-Only). Saved setups/runs remain
 * available via SavedSetupsPanel ("Recent runs").
 *
 * All state lives in useAutoBacktestStore.
 */

import { Card } from '@/components/ds/Card';
import {
  useAutoBacktestStore,
  selectAutoSetup,
  selectAutoStatus,
  selectAutoResult,
} from '@/store/useAutoBacktestStore';
import { RunProgress } from '@/components/backtest/auto/RunProgress';
import { TradeListTable } from '@/components/backtest/auto/TradeListTable';
import { TradeDetailPanel } from '@/components/backtest/auto/TradeDetailPanel';
import { SavedSetupsPanel } from '@/components/backtest/auto/SavedSetupsPanel';
import { SetupInputForm } from './components/SetupInputForm';
import { ResultsSummary } from './components/ResultsSummary';
import { AIResultAnalysis } from './components/AIResultAnalysis';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** Build a short human-readable summary of the current setup for AI analysis. */
function buildSetupSummary(setup: ReturnType<typeof selectAutoSetup>): string {
  const { direction, patterns, instrument, stop, target } = setup;
  const patternNames = patterns.map((p) => p.type).join(', ') || 'no pattern';
  const targetDesc =
    target.basis === 'r-multiple' && target.rMultiple != null
      ? `${target.rMultiple}R`
      : target.basis;
  return `${direction} ${patternNames} on ${instrument.symbol} ${instrument.timeframe}, stop ${stop.basis}, target ${targetDesc}`;
}

export default function AutoBacktest() {
  const setup = useAutoBacktestStore(selectAutoSetup);
  const status = useAutoBacktestStore(selectAutoStatus);
  const result = useAutoBacktestStore(selectAutoResult);

  const hasResult = status === 'done' && !!result;

  const setupSummary = buildSetupSummary(setup);

  return (
    <div className="min-h-screen bg-surface-base px-4 py-6 text-ink-primary sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gold-primary sm:text-3xl">Automated Backtest</h1>
          <p className="mt-1 text-sm text-ink-tertiary">
            Describe an ICT setup in plain English, scan real history, get results.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ── Main column ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            <SetupInputForm />

            <RunProgress />

            {/* ── Results ──────────────────────────────────────────── */}
            {hasResult ? (
              <div className="flex flex-col gap-6">
                <ResultsSummary />
                <TradeListTable />
                <TradeDetailPanel />
                {/* AI analysis of the completed run — on-demand, after stats */}
                <AIResultAnalysis
                  statistics={result.statistics}
                  setupSummary={setupSummary}
                />
              </div>
            ) : (
              status === 'idle' && (
                <Card padding="spacious">
                  <h3 className="text-base font-semibold text-ink-primary">
                    Backtest any ICT setup against real history
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
                    Describe your strategy in plain English above — instrument, session, and
                    entry/stop/target logic. FINO parses it into a setup and runs it against real
                    history. You will get net P&amp;L, win rate, profit factor, max drawdown, an
                    equity curve, and a full trade-by-trade breakdown — no coding required.
                  </p>
                </Card>
              )
            )}
          </div>

          {/* ── Side column ─────────────────────────────────────────── */}
          <aside className="flex flex-col gap-6">
            <SavedSetupsPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
