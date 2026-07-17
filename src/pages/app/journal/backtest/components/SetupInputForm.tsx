// src/pages/app/journal/backtest/components/SetupInputForm.tsx
// ============================================================================
// SETUP INPUT FORM — "Describe your strategy" card.
// Basics (symbol / timeframe / session) + a plain-English strategy box.
// On submit: parseSetupFromText(text) -> merge onto makeDefaultSetup() ->
// the dropdown values OVERRIDE the parsed instrument/session (dropdowns win)
// -> push into the store -> runBacktest(). The AI only ever produces the
// setup definition; it never produces statistics.
// ============================================================================

import { useState } from 'react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Field, NumberField, SelectField } from '@/components/backtest/auto/formControls';
import { useAutoBacktestStore } from '@/store/useAutoBacktestStore';
import { makeDefaultSetup, type SessionFilter } from '@/core/auto/types';
import { getContractSpec } from '@/core/auto/contractSpecs';
import { parseSetupFromText } from '@/services/backtest/aiSetupService';

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------

interface SymbolOption {
  value: string;
  label: string;
}

const FUTURES_SYMBOLS: SymbolOption[] = [
  { value: 'MNQ', label: 'MNQ — Micro Nasdaq' },
  { value: 'NQ', label: 'NQ — Nasdaq' },
  { value: 'MES', label: 'MES — Micro S&P 500' },
  { value: 'ES', label: 'ES — S&P 500' },
  { value: 'MYM', label: 'MYM — Micro Dow' },
  { value: 'YM', label: 'YM — Dow' },
  { value: 'M2K', label: 'M2K — Micro Russell 2000' },
  { value: 'RTY', label: 'RTY — Russell 2000' },
  { value: 'MGC', label: 'MGC — Micro Gold' },
  { value: 'GC', label: 'GC — Gold' },
  { value: 'SIL', label: 'SIL — Micro Silver' },
  { value: 'SI', label: 'SI — Silver' },
  { value: 'MCL', label: 'MCL — Micro Crude Oil' },
  { value: 'CL', label: 'CL — Crude Oil' },
];

const CRYPTO_SYMBOLS: SymbolOption[] = [
  { value: 'BTCUSDT', label: 'BTCUSDT — Bitcoin' },
  { value: 'ETHUSDT', label: 'ETHUSDT — Ethereum' },
  { value: 'SOLUSDT', label: 'SOLUSDT — Solana' },
  { value: 'BNBUSDT', label: 'BNBUSDT — BNB' },
  { value: 'XRPUSDT', label: 'XRPUSDT — XRP' },
];

const SYMBOL_OPTIONS: SymbolOption[] = [
  ...FUTURES_SYMBOLS.map((s) => ({ value: s.value, label: `Futures — ${s.label}` })),
  ...CRYPTO_SYMBOLS.map((s) => ({ value: s.value, label: `Crypto — ${s.label}` })),
];

const TIMEFRAME_OPTIONS: SymbolOption[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
];

/** Session presets, mapped to the SetupDefinition session/time-window field. */
const SESSION_PRESETS: ReadonlyArray<{
  value: string;
  label: string;
  session: SessionFilter;
}> = [
  {
    value: 'london-ny',
    label: 'London + NY (03:00–16:00 ET)',
    session: {
      enabled: true,
      timezone: 'America/New_York',
      windows: [{ start: '03:00', end: '16:00' }],
    },
  },
  {
    value: 'london',
    label: 'London (02:00–05:00 ET)',
    session: {
      enabled: true,
      timezone: 'America/New_York',
      windows: [{ start: '02:00', end: '05:00' }],
    },
  },
  {
    value: 'new-york',
    label: 'New York (08:00–16:00 ET)',
    session: {
      enabled: true,
      timezone: 'America/New_York',
      windows: [{ start: '08:00', end: '16:00' }],
    },
  },
  {
    value: 'asia',
    label: 'Asia (18:00–00:00 ET)',
    session: {
      enabled: true,
      timezone: 'America/New_York',
      windows: [{ start: '18:00', end: '23:59' }],
    },
  },
  {
    value: 'full',
    label: 'Full session (24h)',
    session: { enabled: false, timezone: 'America/New_York', windows: [] },
  },
];

const DEFAULT_SYMBOL = 'MNQ';
const DEFAULT_TIMEFRAME = '5m';
const DEFAULT_SESSION_VALUE = 'london-ny';

type SizingMode = 'risk-pct' | 'fixed-contracts';

const SIZING_MODE_OPTIONS: SymbolOption[] = [
  { value: 'risk-pct', label: 'Risk % of account' },
  { value: 'fixed-contracts', label: 'Fixed contracts' },
];

const DEFAULT_SIZING_MODE: SizingMode = 'risk-pct';
const DEFAULT_RISK_PCT = 1;
const DEFAULT_CONTRACTS = 1;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SetupInputForm() {
  const updateSetup = useAutoBacktestStore((s) => s.updateSetup);
  const applyAISetup = useAutoBacktestStore((s) => s.applyAISetup);
  const setInstrument = useAutoBacktestStore((s) => s.setInstrument);
  const runBacktest = useAutoBacktestStore((s) => s.runBacktest);
  const status = useAutoBacktestStore((s) => s.status);

  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME);
  const [sessionValue, setSessionValue] = useState(DEFAULT_SESSION_VALUE);
  const [sizingMode, setSizingMode] = useState<SizingMode>(DEFAULT_SIZING_MODE);
  const [riskPct, setRiskPct] = useState(DEFAULT_RISK_PCT);
  const [contracts, setContracts] = useState(DEFAULT_CONTRACTS);
  const [strategyText, setStrategyText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState<string[]>([]);

  const isBusy = parsing || status === 'loading-data' || status === 'running';
  const canSubmit = strategyText.trim().length > 0 && !isBusy;
  const contractSpec = getContractSpec(symbol);

  async function handleSubmit() {
    const trimmed = strategyText.trim();
    if (!trimmed) return;

    setParsing(true);
    setParseError(null);
    setUnsupported([]);

    // Reset to a clean default first so a previous run's setup (patterns,
    // entry/stop/target, etc.) never leaks into this one, then merge in
    // whatever the AI extracted via the store's field-safe merge (this is
    // the same path NLSetupInput used — it hydrates any partial pattern
    // object onto its full DEFAULT_PATTERN_PARAMS, so a partial AI pattern
    // never reaches the engine missing a required nested key).
    const base = makeDefaultSetup(symbol, timeframe);
    const chosenSession = SESSION_PRESETS.find((p) => p.value === sessionValue)?.session
      ?? base.session;
    // Sizing controls always win over the makeDefaultSetup risk-pct default.
    base.risk = {
      ...base.risk,
      sizingMode,
      riskPerTradePct: riskPct,
      contracts: sizingMode === 'fixed-contracts' ? contracts : undefined,
    };

    try {
      const parsed = await parseSetupFromText(trimmed);

      updateSetup(base);
      applyAISetup(parsed.definition);
      // Dropdowns always win over whatever the AI inferred for
      // instrument/session — apply them last so they are authoritative.
      setInstrument(symbol, timeframe, 'binance');
      updateSetup({ session: chosenSession });

      if (parsed.unsupported.length > 0) setUnsupported(parsed.unsupported);

      await runBacktest();
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setParsing(false);
    }
  }

  return (
    <Card padding="default">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-ink-primary">Describe your strategy</h3>
        <p className="mt-1 text-sm text-ink-tertiary">
          Fill the basics, then describe the logic in plain English.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Symbol"
          value={symbol}
          options={SYMBOL_OPTIONS}
          onChange={setSymbol}
        />
        <SelectField
          label="Timeframe"
          value={timeframe}
          options={TIMEFRAME_OPTIONS}
          onChange={setTimeframe}
        />
        <SelectField
          label="Trading session"
          value={sessionValue}
          options={SESSION_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          onChange={setSessionValue}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Position sizing"
          value={sizingMode}
          options={SIZING_MODE_OPTIONS}
          onChange={(v) => setSizingMode(v as SizingMode)}
        />
        {sizingMode === 'risk-pct' ? (
          <NumberField
            label="Risk per trade (%)"
            hint="Account percent risked on each trade."
            value={riskPct}
            min={0.1}
            max={10}
            step={0.1}
            onChange={setRiskPct}
          />
        ) : (
          <NumberField
            label="Contracts"
            hint="Fixed contract count per trade (futures only)."
            value={contracts}
            min={1}
            step={1}
            onChange={(v) => setContracts(Math.max(1, Math.floor(v)))}
          />
        )}
        {contractSpec && (
          <Field label="Contract spec">
            <p className="rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 text-sm text-ink-secondary">
              {contractSpec.root} · ${contractSpec.pointValue}/pt · tick {contractSpec.tickSize}
            </p>
          </Field>
        )}
      </div>

      <div className="mt-4">
        <Field label="Strategy logic">
          <textarea
            value={strategyText}
            onChange={(e) => setStrategyText(e.target.value)}
            disabled={isBusy}
            rows={4}
            placeholder="e.g. Wait for a sweep of the Asian range high, then short when a market-structure shift confirms. Stop above the sweep high, target the Asian low. Mirror for longs."
            className="w-full resize-none rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:border-gold-primary focus:outline-none disabled:opacity-50"
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {isBusy && (
          <span className="text-xs text-ink-tertiary animate-pulse">
            {parsing ? 'Reading your strategy…' : 'Running backtest…'}
          </span>
        )}
        <Button
          variant="gold"
          size="lg"
          showArrow={false}
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          Backtest strategy
        </Button>
      </div>

      {parseError && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {parseError}
        </div>
      )}

      {unsupported.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <p className="mb-1 font-semibold">Not modeled:</p>
          <ul className="list-inside list-disc space-y-0.5">
            {unsupported.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export default SetupInputForm;
