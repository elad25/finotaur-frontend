// src/components/brokers/ManualPortfolioPopup.tsx
// 📝 Manual Portfolio — COPILOT data source alternative to Interactive Brokers.
// Lets a user hand-enter positions (or import a CSV) and saves them into the
// SAME broker_connections.connection_data shape the IBRIT sync writes, so
// every COPILOT surface (dashboard, holdings, risk, verdicts, drawers) works
// identically off a manual row. See src/hooks/brokers/copilotSource.ts for
// the source-preference rule (IBKR wins when both exist).

import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import {
  X,
  Plus,
  Trash2,
  Upload,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SkeletonText } from '@/components/ds/Skeleton';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

type AssetClass = 'STK' | 'OPT';

interface PositionRow {
  key: string;
  symbol: string;
  quantity: string;   // bound to text input, parsed on save
  costBasis: string;  // per-share cost, bound to text input, parsed on save
  assetClass: AssetClass;
}

/** IBRIT-shape position as written into connection_data.last_positions. */
interface IBRITPositionOut {
  Symbol: string;
  Quantity: string;
  MarkPrice: string;
  PositionValue: string;
  CostBasisPrice: string;
  CostBasisMoney: string;
  FifoPnlUnrealized: string;
  CurrencyPrimary: string;
  AssetClass: string;
}

interface ManualConnectionData {
  last_positions?: IBRITPositionOut[];
  last_account_summary?: {
    netliquidation?: { amount: number };
    totalcashvalue?: { amount: number };
  };
  [key: string]: unknown;
}

interface Props {
  onClose: () => void;
  onSuccess?: (connectionId: string) => void;
}

const OPTION_MULTIPLIER = 100;
const todayIso = () => new Date().toISOString().slice(0, 10);
const newRow = (): PositionRow => ({
  key: crypto.randomUUID(),
  symbol: '',
  quantity: '',
  costBasis: '',
  assetClass: 'STK',
});

// ============================================================================
// CSV IMPORT — headers (case-insensitive): Symbol, Quantity, CostBasis, AssetClass (optional)
// ============================================================================

function parsePositionsCsv(file: File): Promise<{ rows: PositionRow[]; errors: string[] }> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        if (!fields.includes('symbol') || !fields.includes('quantity') || !fields.includes('costbasis')) {
          resolve({
            rows: [],
            errors: ['CSV must include Symbol, Quantity, and CostBasis columns (AssetClass is optional).'],
          });
          return;
        }

        const parsedRows: PositionRow[] = [];
        const errors: string[] = [];

        results.data.forEach((raw, idx) => {
          const rowNum = idx + 2; // +1 header, +1 1-indexed
          const symbol = (raw['symbol'] || '').trim().toUpperCase();
          const quantity = parseFloat(raw['quantity'] ?? '');
          const costBasis = parseFloat(raw['costbasis'] ?? '');
          const assetClassRaw = (raw['assetclass'] || 'STK').trim().toUpperCase();

          if (!symbol) { errors.push(`Row ${rowNum}: missing Symbol.`); return; }
          if (!Number.isFinite(quantity) || quantity === 0) { errors.push(`Row ${rowNum}: invalid Quantity.`); return; }
          if (!Number.isFinite(costBasis) || costBasis < 0) { errors.push(`Row ${rowNum}: invalid CostBasis.`); return; }

          parsedRows.push({
            key: crypto.randomUUID(),
            symbol,
            quantity: String(quantity),
            costBasis: String(costBasis),
            assetClass: assetClassRaw === 'OPT' ? 'OPT' : 'STK',
          });
        });

        resolve({ rows: parsedRows, errors });
      },
      error: (err) => resolve({ rows: [], errors: [`Failed to parse CSV: ${err.message}`] }),
    });
  });
}

function downloadCsvTemplate() {
  const csv = 'Symbol,Quantity,CostBasis,AssetClass\nAAPL,10,150.25,STK\nSPY 450C,2,4.10,OPT\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'manual-portfolio-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// LIVE QUOTES — reuses the same GET /api/portfolio-quotes endpoint usePortfolioData
// polls for intraday marks. Missing/failed quotes fall back to cost basis (spec).
// ============================================================================

async function fetchMarkPrices(symbols: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (symbols.length === 0) return map;
  try {
    const res = await fetch(`/api/portfolio-quotes?symbols=${symbols.join(',')}`);
    if (!res.ok) return map;
    const json = (await res.json()) as { quotes?: Array<{ symbol: string; price: number }> };
    for (const q of json.quotes ?? []) {
      if (typeof q.price === 'number' && q.price > 0) map.set(q.symbol.toUpperCase(), q.price);
    }
  } catch {
    // Network/endpoint failure — every row falls back to cost basis below.
  }
  return map;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ManualPortfolioPopup({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<PositionRow[]>([newRow()]);
  const [cash, setCash] = useState('0');
  const [existingConnectionId, setExistingConnectionId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // ── Edit mode: pre-populate from the existing manual row, if any ──────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) { setLoadingExisting(false); return; }

      const { data, error: fetchErr } = await supabase
        .from('broker_connections')
        .select('id,connection_data')
        .eq('user_id', user.id)
        .eq('broker', 'manual')
        .maybeSingle();

      if (cancelled) return;
      if (fetchErr || !data) { setLoadingExisting(false); return; }

      setExistingConnectionId(data.id);
      const cd = (data.connection_data ?? null) as ManualConnectionData | null;
      const positions = cd?.last_positions ?? [];
      const cashRow = positions.find((p) => (p.AssetClass ?? '').toUpperCase() === 'CASH');
      const equityRows = positions.filter((p) => (p.AssetClass ?? '').toUpperCase() !== 'CASH');

      if (cashRow) setCash(String(Number(cashRow.Quantity) || 0));
      if (equityRows.length > 0) {
        setRows(
          equityRows.map((p) => ({
            key: crypto.randomUUID(),
            symbol: p.Symbol,
            quantity: p.Quantity,
            costBasis: p.CostBasisPrice,
            assetClass: (p.AssetClass ?? 'STK').toUpperCase() === 'OPT' ? 'OPT' : 'STK',
          })),
        );
      }
      setLoadingExisting(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  // ── Row editing ─────────────────────────────────────────────────────────
  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (key: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  const updateRow = (key: string, patch: Partial<PositionRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // ── CSV import ──────────────────────────────────────────────────────────
  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const { rows: parsedRows, errors } = await parsePositionsCsv(file);
    setCsvErrors(errors);
    if (parsedRows.length === 0) return;

    setRows((prev) => {
      const onlyEmptyStarter = prev.length === 1 && !prev[0].symbol.trim();
      return onlyEmptyStarter ? parsedRows : [...prev, ...parsedRows];
    });
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) { setError('Please sign in to save your portfolio'); return; }

    const validationErrors: string[] = [];
    const validRows: { symbol: string; quantity: number; costBasis: number; assetClass: AssetClass }[] = [];

    rows.forEach((r, idx) => {
      const symbol = r.symbol.trim().toUpperCase();
      if (!symbol) return; // skip fully-blank rows silently
      const quantity = parseFloat(r.quantity);
      const costBasis = parseFloat(r.costBasis);
      if (!Number.isFinite(quantity) || quantity === 0) {
        validationErrors.push(`Row ${idx + 1} (${symbol}): quantity must be a non-zero number.`);
        return;
      }
      if (!Number.isFinite(costBasis) || costBasis < 0) {
        validationErrors.push(`Row ${idx + 1} (${symbol}): cost basis must be a non-negative number.`);
        return;
      }
      validRows.push({ symbol, quantity, costBasis, assetClass: r.assetClass });
    });

    const cashNum = parseFloat(cash) || 0;

    if (validationErrors.length > 0) { setError(validationErrors.join(' ')); return; }
    if (validRows.length === 0 && cashNum === 0) {
      setError('Add at least one position or a cash balance.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const symbols = [...new Set(validRows.map((r) => r.symbol))];
      const quoteMap = await fetchMarkPrices(symbols);

      const positions: IBRITPositionOut[] = validRows.map((r) => {
        const multiplier = r.assetClass === 'OPT' ? OPTION_MULTIPLIER : 1;
        const markPrice = quoteMap.get(r.symbol) ?? r.costBasis; // fallback: no live quote → cost basis
        const positionValue = r.quantity * markPrice * multiplier;
        const costBasisMoney = r.quantity * r.costBasis * multiplier;
        const fifoPnlUnrealized = positionValue - costBasisMoney;
        return {
          Symbol: r.symbol,
          Quantity: String(r.quantity),
          MarkPrice: String(markPrice),
          PositionValue: String(positionValue),
          CostBasisPrice: String(r.costBasis),
          CostBasisMoney: String(costBasisMoney),
          FifoPnlUnrealized: String(fifoPnlUnrealized),
          CurrencyPrimary: 'USD',
          AssetClass: r.assetClass,
        };
      });

      const totalEquityValue = positions.reduce((sum, p) => sum + Number(p.PositionValue), 0);

      // Mirror IBKR's own last_positions shape: cash is its own CASH-class row
      // (Quantity = balance, MarkPrice = 1) so PortfolioSnapshotCard's cash
      // derivation (filters holdings by AssetClass === 'CASH') works unchanged.
      if (cashNum !== 0) {
        positions.push({
          Symbol: 'CASH',
          Quantity: String(cashNum),
          MarkPrice: '1',
          PositionValue: String(cashNum),
          CostBasisPrice: '1',
          CostBasisMoney: String(cashNum),
          FifoPnlUnrealized: '0',
          CurrencyPrimary: 'USD',
          AssetClass: 'CASH',
        });
      }

      const nowIso = new Date().toISOString();
      const connectionData: ManualConnectionData = {
        integration_type: 'manual',
        last_positions: positions,
        last_account_summary: {
          netliquidation: { amount: totalEquityValue + cashNum },
          totalcashvalue: { amount: cashNum },
        },
        last_synced_date: todayIso(),
      };

      // UPDATE-first, INSERT-fallback — same pattern as IBConnectionPopup.
      const { data: updated, error: updateErr } = await supabase
        .from('broker_connections')
        .update({
          status: 'connected',
          is_active: true,
          account_name: 'Manual Portfolio',
          last_sync_at: nowIso,
          connection_data: connectionData,
        })
        .eq('user_id', user.id)
        .eq('broker', 'manual')
        .select('id');

      if (updateErr) throw new Error(updateErr.message);

      let connId: string;
      if (updated && updated.length > 0) {
        connId = updated[0].id;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('broker_connections')
          .insert({
            user_id: user.id,
            broker: 'manual',
            purpose: 'journal',
            status: 'connected',
            is_active: true,
            account_name: 'Manual Portfolio',
            connected_at: nowIso,
            last_sync_at: nowIso,
            connection_data: connectionData,
          })
          .select('id')
          .single();
        if (insertErr || !inserted) throw new Error(insertErr?.message || 'Failed to save manual portfolio');
        connId = inserted.id;
      }

      // Refresh every COPILOT surface reading this row (see copilotSource.ts / usePortfolioData.ts).
      qc.invalidateQueries({ queryKey: ['ib-connection'] });
      qc.invalidateQueries({ queryKey: ['portfolio-ib'] });
      qc.invalidateQueries({ queryKey: ['portfolio-snapshots'] });
      qc.invalidateQueries({ queryKey: ['portfolio-live-quotes'] });

      if (onSuccess) onSuccess(connId);
      onClose();
    } catch (err: any) {
      console.error('Manual portfolio save error:', err);
      setError(err.message || 'Failed to save your portfolio');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-24px)] max-w-[720px] overflow-hidden rounded-[16px] border bg-[#141414] p-0 text-white [&>button]:hidden" style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}>
        <div className="relative flex max-h-[92dvh] flex-col overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3 pr-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9A646]/30 bg-[#C9A646]/10">
                <span className="text-xl font-bold text-[#C9A646]">$</span>
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {existingConnectionId ? 'Update Manual Portfolio' : 'Manual Portfolio'}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-zinc-400">
                  Track holdings you manage yourself — no broker connection required.
                </DialogDescription>
              </div>
            </div>

            {loadingExisting ? (
              <div className="py-6"><SkeletonText lines={4} /></div>
            ) : (
              <>
                {/* Cash balance */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">Cash balance (USD)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full max-w-[220px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#C9A646]/50 focus:outline-none"
                  />
                </div>

                {/* Positions editor */}
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Positions</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={downloadCsvTemplate}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-[#C9A646]"
                    >
                      <Download className="h-3 w-3" /> Template
                    </button>
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="inline-flex items-center gap-1 text-[11px] text-[#C9A646] hover:text-[#E5C158]"
                    >
                      <Upload className="h-3 w-3" /> Upload CSV
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="sr-only"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <p className="mb-3 text-[11px] text-zinc-500">
                  CSV columns: Symbol, Quantity, CostBasis, AssetClass (optional — STK or OPT, defaults to STK).
                </p>

                {csvErrors.length > 0 && (
                  <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
                    {csvErrors.length} row{csvErrors.length !== 1 ? 's' : ''} skipped during import — {csvErrors.slice(0, 3).join(' ')}
                    {csvErrors.length > 3 ? ' …' : ''}
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-2 font-medium">Symbol</th>
                        <th className="px-3 py-2 font-medium">Quantity</th>
                        <th className="px-3 py-2 font-medium">Cost / share</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key} className="border-b border-zinc-800/60 last:border-b-0">
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.symbol}
                              onChange={(e) => updateRow(row.key, { symbol: e.target.value.toUpperCase() })}
                              placeholder="AAPL"
                              className="w-24 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white placeholder:text-zinc-600 focus:border-[#C9A646]/50 focus:outline-none"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row.quantity}
                              onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                              placeholder="10"
                              className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white placeholder:text-zinc-600 focus:border-[#C9A646]/50 focus:outline-none"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row.costBasis}
                              onChange={(e) => updateRow(row.key, { costBasis: e.target.value })}
                              placeholder="150.00"
                              className="w-24 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white placeholder:text-zinc-600 focus:border-[#C9A646]/50 focus:outline-none"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={row.assetClass}
                              onChange={(e) => updateRow(row.key, { assetClass: e.target.value as AssetClass })}
                              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white focus:border-[#C9A646]/50 focus:outline-none"
                            >
                              <option value="STK">Stock</option>
                              <option value="OPT">Option</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeRow(row.key)}
                              disabled={rows.length === 1}
                              className="rounded p-1 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Remove row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addRow}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-[#C9A646]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add row
                </button>

                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-xs text-red-200">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 border-t border-zinc-800 p-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loadingExisting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C9A646] to-[#E5C158] px-5 py-2.5 text-sm font-bold text-black transition-all hover:from-[#B39540] hover:to-[#D4B55E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {existingConnectionId ? 'Save Changes' : 'Save Portfolio'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
