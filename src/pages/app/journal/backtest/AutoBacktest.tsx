/**
 * AutoBacktest — THE central tab for automated ICT pattern-detection backtests.
 *
 * One cohesive page that consolidates everything:
 *   - Setup builder (all 5 ICT patterns + entry/stop/target/filters/risk)
 *   - Instrument + timeframe + date range
 *   - Run + live progress
 *   - Results: stats, equity curve, trade list, trade detail
 *   - Saved setups / runs library
 *
 * Founder's requirement: "one central place / one tab with everything defined
 * here." All state lives in useAutoBacktestStore.
 */

import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import {
  POPULAR_CRYPTO_SYMBOLS,
  SUPPORTED_TIMEFRAMES,
} from '@/services/backtest/candleSource';
import {
  useAutoBacktestStore,
  selectAutoSetup,
  selectAutoStatus,
  selectAutoResult,
} from '@/store/useAutoBacktestStore';
import { SetupBuilderForm } from '@/components/backtest/auto/SetupBuilderForm';
import { RunProgress } from '@/components/backtest/auto/RunProgress';
import { TradeListTable } from '@/components/backtest/auto/TradeListTable';
import { TradeDetailPanel } from '@/components/backtest/auto/TradeDetailPanel';
import { SavedSetupsPanel } from '@/components/backtest/auto/SavedSetupsPanel';
import { Field, SelectField } from '@/components/backtest/auto/formControls';
import { NLSetupInput } from './components/NLSetupInput';
import { PnlHeroChart } from './components/PnlHeroChart';
import { AIResultAnalysis } from './components/AIResultAnalysis';

// ---------------------------------------------------------------------------
// Date helpers (ms epoch ↔ yyyy-mm-dd for <input type="date">)
// ---------------------------------------------------------------------------

function msToDateInput(ms: number): string {
  // Guard against NaN / invalid epochs — new Date(NaN).toISOString() throws
  // RangeError and would crash the whole page via the Error Boundary.
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function dateInputToMs(value: string, endOfDay = false): number {
  // Empty or unparseable input → NaN (the caller validates before running).
  if (!value) return NaN;
  const base = new Date(`${value}T00:00:00Z`).getTime();
  if (Number.isNaN(base)) return NaN;
  return endOfDay ? base + (24 * 60 * 60 * 1000 - 1) : base;
}

/** A from/to range is runnable only when both ends are finite and ordered. */
function isValidDateRange(from: number, to: number): boolean {
  return Number.isFinite(from) && Number.isFinite(to) && from < to;
}

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
  const from = useAutoBacktestStore((s) => s.from);
  const to = useAutoBacktestStore((s) => s.to);
  const setInstrument = useAutoBacktestStore((s) => s.setInstrument);
  const setDateRange = useAutoBacktestStore((s) => s.setDateRange);
  const runBacktest = useAutoBacktestStore((s) => s.runBacktest);

  const isBusy = status === 'loading-data' || status === 'running';
  const hasResult = status === 'done' && !!result;
  const dateRangeValid = isValidDateRange(from, to);
  const canRun = setup.patterns.length > 0 && !isBusy && dateRangeValid;

  const { symbol, timeframe, source } = setup.instrument;

  const setupSummary = buildSetupSummary(setup);

  return (
    <div className="min-h-screen bg-surface-base px-4 py-6 text-ink-primary sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gold-primary sm:text-3xl">Automated Backtest</h1>
          <p className="mt-1 text-sm text-ink-tertiary">
            Define an ICT setup, scan history, get results.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ── Main column ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* AI natural-language setup generation — above the manual builder */}
            <NLSetupInput />

            <SetupBuilderForm />

            {/* Instrument + range + run */}
            <Card padding="default">
              <h3 className="mb-4 text-sm font-semibold text-ink-primary">Instrument & range</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SelectField
                  label="Symbol"
                  value={symbol}
                  options={POPULAR_CRYPTO_SYMBOLS.map((s) => ({ value: s, label: s }))}
                  onChange={(next) => setInstrument(next, timeframe, source)}
                />
                <SelectField
                  label="Timeframe"
                  value={timeframe}
                  options={SUPPORTED_TIMEFRAMES.map((t) => ({ value: t, label: t }))}
                  onChange={(next) => setInstrument(symbol, next, source)}
                />
                <Field label="From">
                  <input
                    type="date"
                    value={msToDateInput(from)}
                    max={msToDateInput(to)}
                    onChange={(e) => setDateRange(dateInputToMs(e.target.value), to)}
                    className="w-full rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 text-sm text-ink-primary transition-colors focus:border-gold-primary focus:outline-none"
                  />
                </Field>
                <Field label="To">
                  <input
                    type="date"
                    value={msToDateInput(to)}
                    min={msToDateInput(from)}
                    onChange={(e) => setDateRange(from, dateInputToMs(e.target.value, true))}
                    className="w-full rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 text-sm text-ink-primary transition-colors focus:border-gold-primary focus:outline-none"
                  />
                </Field>
              </div>

              <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                {setup.patterns.length === 0 && (
                  <p className="text-[12px] text-ink-tertiary">
                    Select a pattern above to enable the run.
                  </p>
                )}
                {setup.patterns.length > 0 && !dateRangeValid && (
                  <p className="text-[12px] text-red-400">
                    Invalid date range — pick a valid From and To (From must be before To).
                  </p>
                )}
                <div className="sm:ml-auto">
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={() => void runBacktest()}
                    disabled={!canRun}
                    showArrow={false}
                  >
                    {isBusy ? 'Running…' : 'Run Backtest'}
                  </Button>
                </div>
              </div>
            </Card>

            <RunProgress />

            {/* ── Results ──────────────────────────────────────────── */}
            {hasResult ? (
              <div className="flex flex-col gap-6">
                <PnlHeroChart />
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
                    Choose one of the five ICT patterns, tune how it is detected, and set your
                    entry, stop, and target rules. Pick an instrument and date range, then run the
                    scan. You will get win rate, profit factor, expectancy, an equity curve, and a
                    full trade-by-trade breakdown — no coding required.
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
