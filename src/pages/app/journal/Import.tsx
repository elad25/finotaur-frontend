// ================================================
// FINOTAUR JOURNAL — CSV IMPORT WIZARD
// 3-step: Upload → Map → Confirm/Import
// Reuses: importTrades(), parseCSV(), detectJournalSource(),
//         autoMapColumns(), useImportTrades()
// ================================================

import { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ChevronRight, ChevronLeft, Check, AlertCircle, Loader2, FileText, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ds/Skeleton';
import { toast } from 'sonner';

import PageTitle from '@/components/PageTitle';
import { FinoExplains } from '@/components/fino/FinoExplains';
import { useAuth } from '@/providers/AuthProvider';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useImportTrades } from '@/hooks/useImportTrades';
import {
  importTrades as parseImportTrades,
  parseCSV,
  detectJournalSource,
  autoMapColumns,
  type ColumnMapping,
  type JournalSource,
} from '@/utils/importUtils';

// ================================================
// TYPES
// ================================================

type WizardStep = 1 | 2 | 3;

interface ImportState {
  step: WizardStep;
  // Step 1
  fileName: string;
  csvString: string;
  headers: string[];
  // Step 2
  source: JournalSource;
  mapping: ColumnMapping;
  previewRows: Record<string, string>[];
  // Step 3
  imported: number;
  duplicates: number;
  errors: string[];
  done: boolean;
}

const BROKER_OPTIONS: { label: string; value: JournalSource }[] = [
  { label: 'Tradovate', value: 'tradovate' },
  { label: 'NinjaTrader', value: 'ninjatrader' },
  { label: 'TradeZella', value: 'tradezella' },
  { label: 'TraderSync', value: 'tradervue' },
  { label: 'Edgewonk', value: 'edgewonk' },
  { label: 'Generic CSV', value: 'generic' },
];

const MAPPING_FIELD_LABELS: (keyof ColumnMapping)[] = [
  'symbol', 'side', 'quantity', 'entry_price', 'exit_price',
  'open_at', 'close_at', 'pnl', 'commission', 'notes',
  'setup', 'stop_loss', 'take_profit', 'asset_type', 'tags',
];

const FIELD_DISPLAY_NAMES: Record<keyof ColumnMapping, string> = {
  symbol: 'Symbol',
  side: 'Side (Long/Short)',
  quantity: 'Quantity',
  entry_price: 'Entry Price',
  exit_price: 'Exit Price',
  open_at: 'Open Date/Time',
  close_at: 'Close Date/Time',
  pnl: 'P&L',
  commission: 'Commission',
  notes: 'Notes',
  setup: 'Setup',
  stop_loss: 'Stop Loss',
  take_profit: 'Take Profit',
  asset_type: 'Asset Type',
  tags: 'Tags',
};

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['symbol', 'open_at'];

const INITIAL_STATE: ImportState = {
  step: 1,
  fileName: '',
  csvString: '',
  headers: [],
  source: 'generic',
  mapping: {
    symbol: '', side: '', quantity: '', entry_price: '', exit_price: '',
    open_at: '', close_at: '', pnl: '', commission: '', notes: '',
    setup: '', stop_loss: '', take_profit: '', asset_type: '', tags: '',
  },
  previewRows: [],
  imported: 0,
  duplicates: 0,
  errors: [],
  done: false,
};

// ================================================
// STEP INDICATOR
// ================================================

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { n: 1, label: 'Upload' },
    { n: 2, label: 'Map Columns' },
    { n: 3, label: 'Import' },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                current > s.n
                  ? 'bg-yellow-500 text-black'
                  : current === s.n
                  ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-400'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-500'
              }`}
            >
              {current > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span
              className={`text-sm font-medium ${
                current === s.n ? 'text-yellow-300' : current > s.n ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-12 h-px mx-3 ${current > s.n ? 'bg-yellow-500/40' : 'bg-zinc-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ================================================
// STEP 1 — UPLOAD
// ================================================

function Step1Upload({
  onFileReady,
}: {
  onFileReady: (csvString: string, fileName: string, headers: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error('The CSV file appears to be empty or has no data rows');
        return;
      }
      const headers = Object.keys(rows[0]);
      onFileReady(text, file.name, headers);
    } catch (err) {
      toast.error('Failed to read file. Make sure it is a valid CSV.');
    } finally {
      setLoading(false);
    }
  }, [onFileReady]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all cursor-pointer ${
          drag
            ? 'border-yellow-400/60 bg-yellow-900/10 scale-[1.01]'
            : 'border-yellow-700/30 bg-zinc-950/40 hover:border-yellow-600/40 hover:bg-zinc-900/60'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInput}
        />
        <div className="flex flex-col items-center gap-4">
          {loading ? (
            <>
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="h-4 w-32 mt-2" />
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Upload className="w-7 h-7 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-zinc-200 font-medium">
                  Drop your CSV file here — or click to upload
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Supports Tradovate, NinjaTrader, TradeZella, Edgewonk, and generic CSV exports
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Help text */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500 space-y-1">
        <p className="text-zinc-400 font-medium">Tips for best results</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Export your trades as CSV directly from your broker or journal app</li>
          <li>The file must include at least a symbol and a date/time column</li>
          <li>You can re-map columns on the next step if auto-detection is off</li>
        </ul>
      </div>
    </div>
  );
}

// ================================================
// STEP 2 — MAP COLUMNS
// ================================================

function Step2Map({
  fileName,
  headers,
  source,
  mapping,
  previewRows,
  onSourceChange,
  onMappingChange,
}: {
  fileName: string;
  headers: string[];
  source: JournalSource;
  mapping: ColumnMapping;
  previewRows: Record<string, string>[];
  onSourceChange: (src: JournalSource) => void;
  onMappingChange: (m: ColumnMapping) => void;
}) {
  const handleBrokerSelect = (value: JournalSource) => {
    onSourceChange(value);
    const newMapping = autoMapColumns(headers, value);
    onMappingChange(newMapping);
  };

  const handleFieldChange = (field: keyof ColumnMapping, col: string) => {
    onMappingChange({ ...mapping, [field]: col });
  };

  const preview5 = previewRows.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* File badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 w-fit">
        <FileText className="w-4 h-4 text-yellow-400 shrink-0" />
        <span className="text-sm text-zinc-300 truncate max-w-[300px]">{fileName}</span>
        <span className="text-xs text-zinc-500 ml-1">({headers.length} columns)</span>
      </div>

      {/* Broker selector */}
      <div>
        <p className="text-xs text-zinc-400 font-medium mb-2">Select your broker / journal source</p>
        <div className="flex flex-wrap gap-2">
          {BROKER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleBrokerSelect(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                source === opt.value
                  ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column mapping table */}
      <div>
        <p className="text-xs text-zinc-400 font-medium mb-2">Column mapping</p>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="px-4 py-2.5 text-left text-xs text-zinc-500 font-medium w-1/2">
                  FINOTAUR Field
                </th>
                <th className="px-4 py-2.5 text-left text-xs text-zinc-500 font-medium w-1/2">
                  CSV Column
                </th>
              </tr>
            </thead>
            <tbody>
              {MAPPING_FIELD_LABELS.map((field, i) => {
                const isRequired = REQUIRED_FIELDS.includes(field);
                const isUnmapped = !mapping[field];
                return (
                  <tr
                    key={field}
                    className={`border-b border-zinc-800/60 ${i % 2 === 0 ? 'bg-zinc-950/40' : 'bg-zinc-900/30'}`}
                  >
                    <td className="px-4 py-2 text-zinc-300 text-xs">
                      {FIELD_DISPLAY_NAMES[field]}
                      {isRequired && (
                        <span className="ml-1 text-yellow-500 text-[10px]">required</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={mapping[field]}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className={`w-full bg-zinc-800 border rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 transition ${
                          isRequired && isUnmapped
                            ? 'border-red-500/60'
                            : 'border-zinc-700'
                        }`}
                      >
                        <option value="">— not mapped —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview table */}
      {preview5.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 font-medium mb-2">
            Preview — first {preview5.length} rows
          </p>
          <div className="rounded-xl border border-zinc-800 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  {headers.slice(0, 8).map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-zinc-500 font-medium whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                  {headers.length > 8 && (
                    <th className="px-3 py-2 text-zinc-600">+{headers.length - 8} more</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {preview5.map((row, ri) => (
                  <tr
                    key={ri}
                    className={`border-b border-zinc-800/40 ${ri % 2 === 0 ? 'bg-zinc-950/40' : 'bg-zinc-900/20'}`}
                  >
                    {headers.slice(0, 8).map((h) => (
                      <td
                        key={h}
                        className="px-3 py-1.5 text-zinc-400 whitespace-nowrap max-w-[120px] truncate"
                      >
                        {row[h] || '—'}
                      </td>
                    ))}
                    {headers.length > 8 && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================
// STEP 3 — CONFIRM / IMPORT
// ================================================

function Step3Import({
  csvString,
  userId,
  userTimezone,
  mapping,
  source,
  onReset,
}: {
  csvString: string;
  userId: string;
  userTimezone: string;
  mapping: ColumnMapping;
  source: JournalSource;
  onReset: () => void;
}) {
  const navigate = useNavigate();
  const { importTrades, isImporting, progress } = useImportTrades();

  const [result, setResult] = useState<{
    imported: number;
    duplicates: number;
    errors: string[];
  } | null>(null);

  const handleImport = async () => {
    // 1. Parse CSV → FinotaurTrade[]
    let parseResult;
    try {
      parseResult = await parseImportTrades(csvString, userId, mapping, source, userTimezone);
    } catch (err) {
      toast.error('Failed to parse CSV. Check your column mapping and try again.');
      return;
    }

    if (!parseResult.success || parseResult.trades.length === 0) {
      const errorSummary =
        parseResult.errors.length > 0
          ? parseResult.errors
              .slice(0, 3)
              .map((e) => `Row ${e.row}: ${e.message}`)
              .join('; ')
          : 'No valid trades found. Check your column mapping.';
      toast.error(errorSummary);
      return;
    }

    // 2. Insert via hook (handles dedup + idempotency)
    const insertResult = await importTrades(parseResult.trades);

    setResult({
      imported: insertResult.imported,
      duplicates: insertResult.duplicates,
      errors: insertResult.errors,
    });

    if (insertResult.imported > 0) {
      toast.success(`Imported ${insertResult.imported} trade${insertResult.imported !== 1 ? 's' : ''}`);
    }
  };

  if (result !== null) {
    // Result summary screen
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          {/* Counts */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
              <p className="text-xs text-zinc-400 mt-1">Imported</p>
            </div>
            <div className="rounded-xl bg-zinc-800/60 border border-zinc-700 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-300">{result.duplicates}</p>
              <p className="text-xs text-zinc-400 mt-1">Duplicates skipped</p>
            </div>
            <div
              className={`rounded-xl border p-4 text-center ${
                result.errors.length > 0
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-zinc-800/60 border-zinc-700'
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  result.errors.length > 0 ? 'text-red-400' : 'text-zinc-300'
                }`}
              >
                {result.errors.length}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Errors</p>
            </div>
          </div>

          {/* Errors list */}
          {result.errors.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4" />
                Import errors
              </div>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-zinc-400">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/app/journal/my-trades')}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #B8944E, #E6C675)' }}
          >
            Go to My Trades
          </button>
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-300 border border-zinc-700 hover:bg-zinc-800 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Import Another File
          </button>
        </div>
      </div>
    );
  }

  // Pre-import confirmation screen
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
        <p className="text-sm text-zinc-300 font-medium">Ready to import</p>
        <div className="text-xs text-zinc-500 space-y-1">
          <p>Source: <span className="text-zinc-300">{source}</span></p>
          <p>Mapped fields: <span className="text-zinc-300">{Object.values(mapping).filter(Boolean).length} / {MAPPING_FIELD_LABELS.length}</span></p>
        </div>
        <p className="text-xs text-zinc-500">
          Duplicate trades (same symbol + date + entry price + quantity) will be skipped automatically.
        </p>
      </div>

      {/* Progress bar — shown while importing */}
      {isImporting && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Importing…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #B8944E, #E6C675)',
              }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={isImporting}
        className="w-full py-3 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{ background: 'linear-gradient(135deg, #B8944E, #E6C675)' }}
      >
        {isImporting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Importing…
          </span>
        ) : (
          'Start Import'
        )}
      </button>
    </div>
  );
}

// ================================================
// MAIN WIZARD COMPONENT
// ================================================

export default function JournalImport() {
  const { user } = useAuth();
  const userTimezone = useTimezone();
  const [state, setState] = useState<ImportState>(INITIAL_STATE);

  // ── helpers ───────────────────────────────────

  const goToStep = (step: WizardStep) =>
    setState((s) => ({ ...s, step }));

  const reset = () => setState(INITIAL_STATE);

  // ── Step 1 callback ───────────────────────────

  const handleFileReady = useCallback(
    (csvString: string, fileName: string, headers: string[]) => {
      const detectedSource = detectJournalSource(headers);
      const detectedMapping = autoMapColumns(headers, detectedSource);
      const previewRows = parseCSV(csvString).slice(0, 5);

      setState((s) => ({
        ...s,
        step: 2,
        fileName,
        csvString,
        headers,
        source: detectedSource,
        mapping: detectedMapping,
        previewRows,
      }));

      toast.success(`Detected source: ${detectedSource}`, { duration: 2500 });
    },
    [],
  );

  // ── Step 2 callbacks ──────────────────────────

  const handleSourceChange = useCallback((src: JournalSource) => {
    setState((s) => ({ ...s, source: src }));
  }, []);

  const handleMappingChange = useCallback((mapping: ColumnMapping) => {
    setState((s) => ({ ...s, mapping }));
  }, []);

  // ── Step 2 → 3 validation ─────────────────────

  const canProceedToStep3 = REQUIRED_FIELDS.every((f) => !!state.mapping[f]);

  // ── Auth guard ────────────────────────────────

  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-400 text-sm">
          Please log in to import trades.
        </div>
      </div>
    );
  }

  // ================================================
  // RENDER
  // ================================================

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="relative">
        <PageTitle title="Import Trades" subtitle="Upload a CSV export from your broker or journal" />
        <FinoExplains
          title="How do I import trades?"
          className="mt-ds-3 ml-auto w-fit"
        >
          Bring your existing trades into FINOTAUR. Upload a CSV or JSON from your broker, map the
          columns, preview the result, and import everything in one go.
        </FinoExplains>
      </div>

      {/* Step indicator */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-4">
        <StepIndicator current={state.step} />
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        {state.step === 1 && (
          <Step1Upload onFileReady={handleFileReady} />
        )}

        {state.step === 2 && (
          <Step2Map
            fileName={state.fileName}
            headers={state.headers}
            source={state.source}
            mapping={state.mapping}
            previewRows={state.previewRows}
            onSourceChange={handleSourceChange}
            onMappingChange={handleMappingChange}
          />
        )}

        {state.step === 3 && (
          <Step3Import
            csvString={state.csvString}
            userId={user.id}
            userTimezone={userTimezone}
            mapping={state.mapping}
            source={state.source}
            onReset={reset}
          />
        )}
      </div>

      {/* Navigation footer */}
      {state.step !== 3 && (
        <div className="flex justify-between">
          {state.step > 1 ? (
            <button
              type="button"
              onClick={() => goToStep((state.step - 1) as WizardStep)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-300 border border-zinc-700 hover:bg-zinc-800 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {state.step === 2 && (
            <button
              type="button"
              onClick={() => goToStep(3)}
              disabled={!canProceedToStep3}
              title={!canProceedToStep3 ? 'Map the required fields (Symbol, Open Date) first' : undefined}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: 'linear-gradient(135deg, #B8944E, #E6C675)' }}
            >
              Review & Import
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
