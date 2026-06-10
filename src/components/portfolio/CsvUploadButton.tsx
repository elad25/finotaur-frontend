// src/components/portfolio/CsvUploadButton.tsx
// ═══════════════════════════════════════════════════════════════
// Hidden file input triggered by a visible button.
// Parses selected CSV, shows a preview panel with valid-row count
// + per-row errors, then calls onRowsParsed on confirm.
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { parsePortfolioCsv, CsvParseResult } from '@/lib/portfolio/csv';
import { Lot } from '@/lib/portfolio/types';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';

export interface CsvUploadButtonProps {
  onRowsParsed: (lots: Lot[]) => void;
}

type PreviewState =
  | { phase: 'idle' }
  | { phase: 'preview'; result: CsvParseResult; fileName: string };

export function CsvUploadButton({ onRowsParsed }: CsvUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<PreviewState>({ phase: 'idle' });
  const [readError, setReadError] = useState<string | null>(null);

  function openPicker() {
    setReadError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected after cancel
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) {
        setReadError('Could not read file — it appears to be empty.');
        return;
      }
      const result = parsePortfolioCsv(text);
      setState({ phase: 'preview', result, fileName: file.name });
    };
    reader.onerror = () => setReadError('Failed to read the selected file. Please try again.');
    reader.readAsText(file);
  }

  function handleImport() {
    if (state.phase !== 'preview') return;

    const lots: Lot[] = state.result.rows.map((row) => ({
      ticker: row.ticker,
      quantity: row.quantity ?? 0,
      costPerShare: row.costPerShare,
      purchaseDate: row.purchaseDate,
    }));

    onRowsParsed(lots);
    setState({ phase: 'idle' });
  }

  function handleCancel() {
    setState({ phase: 'idle' });
  }

  const validCount = state.phase === 'preview' ? state.result.rows.length : 0;
  const errorCount = state.phase === 'preview' ? state.result.errors.length : 0;

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Trigger button */}
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary transition-colors px-2 py-1 rounded border border-border-ds-subtle hover:border-border-ds-default"
      >
        <Upload className="h-3 w-3" />
        Upload CSV
      </button>

      {/* File read error */}
      {readError && (
        <p className="mt-1 text-xs text-num-negative">{readError}</p>
      )}

      {/* Preview panel */}
      {state.phase === 'preview' && (
        <CsvPreviewPanel
          fileName={state.fileName}
          result={state.result}
          validCount={validCount}
          errorCount={errorCount}
          onImport={handleImport}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

// ── Preview panel (inline expandable) ───────────────────────────

interface CsvPreviewPanelProps {
  fileName: string;
  result: CsvParseResult;
  validCount: number;
  errorCount: number;
  onImport: () => void;
  onCancel: () => void;
}

function CsvPreviewPanel({
  fileName,
  result,
  validCount,
  errorCount,
  onImport,
  onCancel,
}: CsvPreviewPanelProps) {
  const [showErrors, setShowErrors] = useState(false);

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-80 rounded-[12px] border border-border-ds-subtle bg-surface-1 shadow-xl overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-ds-subtle bg-surface-base">
        <span className="text-xs text-ink-primary font-medium truncate max-w-[200px]">{fileName}</span>
        <button
          type="button"
          onClick={onCancel}
          className="text-ink-secondary hover:text-ink-primary transition-colors"
          aria-label="Cancel CSV import"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Summary */}
      <div className="px-3 py-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-gold-primary shrink-0" />
          <span className="text-sm text-ink-primary">
            {validCount} valid row{validCount !== 1 ? 's' : ''} ready to import
          </span>
        </div>

        {errorCount > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowErrors(!showErrors)}
              className="flex items-center gap-2 text-num-negative hover:text-ink-primary transition-colors"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                {errorCount} row{errorCount !== 1 ? 's' : ''} skipped —{' '}
                <span className="underline">{showErrors ? 'hide' : 'show'} details</span>
              </span>
            </button>

            {showErrors && (
              <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-ink-secondary space-y-1 pl-6">
                {result.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.rowIndex}, {err.field}: {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {validCount === 0 && errorCount === 0 && (
          <p className="text-sm text-ink-secondary">The file appears to be empty.</p>
        )}
      </div>

      {/* Actions */}
      <div className={cn('flex items-center justify-end gap-2 px-3 py-2 border-t border-border-ds-subtle')}>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink-secondary hover:text-ink-primary transition-colors px-2 py-1"
        >
          Cancel
        </button>
        <Button
          variant="gold"
          size="sm"
          onClick={onImport}
          disabled={validCount === 0}
          showArrow={false}
          className="text-xs"
        >
          Import {validCount} position{validCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
