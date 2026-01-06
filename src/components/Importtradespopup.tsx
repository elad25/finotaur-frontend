// ================================================
// FINOTAUR IMPORT TRADES POPUP
// Beautiful multi-step import wizard
// Supports: TradeZella, Tradervue, Edgewonk, and more
// ✅ UPDATED: Professional icons instead of emojis
// ================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  ArrowRight, ArrowLeft, Loader2, HelpCircle, Check, Eye, RefreshCw,
  BarChart3, LineChart, Target, TrendingUp, Briefcase, Activity,
  Layers, Zap, Database, FileText
} from 'lucide-react';

import {
  parseCSV,
  detectJournalSource,
  autoMapColumns,
  importTrades,
  type JournalSource,
  type ColumnMapping,
  type FinotaurTrade,
  type ImportResult,
} from '@/utils/importUtils';

// ================================================
// TYPES
// ================================================

interface ImportTradesPopupProps {
  onClose: () => void;
onImportComplete: (trades: FinotaurTrade[]) => Promise<any>;  userId: string;
  userTimezone?: string;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

// ================================================
// JOURNAL SOURCES CONFIG - WITH LUCIDE ICONS
// ================================================

const JOURNAL_SOURCES: { 
  id: JournalSource; 
  name: string; 
  icon: React.ReactNode;
  color: string;
  description: string;
}[] = [
  { 
    id: 'tradezella', 
    name: 'TradeZella', 
    icon: <Target className="w-4 h-4" />,
    color: 'text-emerald-400',
    description: 'Full support for TradeZella exports' 
  },
  { 
    id: 'tradervue', 
    name: 'Tradervue', 
    icon: <BarChart3 className="w-4 h-4" />,
    color: 'text-blue-400',
    description: 'Import from Tradervue journal' 
  },
  { 
    id: 'edgewonk', 
    name: 'Edgewonk', 
    icon: <Activity className="w-4 h-4" />,
    color: 'text-orange-400',
    description: 'Edgewonk 3 & 4 support' 
  },
  { 
    id: 'tradesviz', 
    name: 'TradesViz', 
    icon: <LineChart className="w-4 h-4" />,
    color: 'text-purple-400',
    description: 'TradesViz export format' 
  },
  { 
    id: 'kinfo', 
    name: 'Kinfo', 
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-cyan-400',
    description: 'Kinfo trading journal' 
  },
  { 
    id: 'tradingview', 
    name: 'TradingView', 
    icon: <Layers className="w-4 h-4" />,
    color: 'text-red-400',
    description: 'TradingView paper trading' 
  },
  { 
    id: 'thinkorswim', 
    name: 'thinkorswim', 
    icon: <Briefcase className="w-4 h-4" />,
    color: 'text-green-400',
    description: 'TD Ameritrade exports' 
  },
  { 
    id: 'tradovate', 
    name: 'Tradovate', 
    icon: <Zap className="w-4 h-4" />,
    color: 'text-yellow-400',
    description: 'Tradovate futures trades' 
  },
  { 
    id: 'ninjatrader', 
    name: 'NinjaTrader', 
    icon: <Database className="w-4 h-4" />,
    color: 'text-indigo-400',
    description: 'NinjaTrader 8 exports' 
  },
  { 
    id: 'generic', 
    name: 'Generic CSV', 
    icon: <FileText className="w-4 h-4" />,
    color: 'text-zinc-400',
    description: 'Any CSV/Excel file' 
  },
];

// ================================================
// MAIN COMPONENT
// ================================================

export default function ImportTradesPopup({
  onClose,
  onImportComplete,
  userId,
  userTimezone = 'UTC'
}: ImportTradesPopupProps) {
  // State
  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedSource, setSelectedSource] = useState<JournalSource | null>(null);
  const [rawData, setRawData] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ================================================
  // FILE HANDLING
  // ================================================

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);
    
    try {
      const validTypes = ['.csv', '.xlsx', '.xls', '.txt'];
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(extension)) {
        throw new Error('Please upload a CSV or Excel file');
      }
      
      let content: string;
      
      if (extension === '.csv' || extension === '.txt') {
        content = await file.text();
      } else {
        throw new Error('Please export as CSV from your spreadsheet application.');
      }
      
      const rows = parseCSV(content);
      
      if (rows.length === 0) {
        throw new Error('No data found in file');
      }
      
      const fileHeaders = Object.keys(rows[0]);
      setHeaders(fileHeaders);
      setRawData(content);
      setPreviewData(rows.slice(0, 10));
      
      if (!selectedSource) {
        const detected = detectJournalSource(fileHeaders);
        setSelectedSource(detected);
      }
      
      const source = selectedSource || detectJournalSource(fileHeaders);
      const autoMapping = autoMapColumns(fileHeaders, source);
      setMapping(autoMapping);
      
      setStep('mapping');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedSource]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  // ================================================
  // IMPORT HANDLING
  // ================================================

  const handleStartImport = useCallback(async () => {
    if (!mapping || !rawData || !selectedSource) return;
    
    setStep('importing');
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await importTrades(
        rawData,
        userId,
        mapping,
        selectedSource,
        userTimezone
      );
      
      setImportResult(result);
      
      if (result.success && result.trades.length > 0) {
        await onImportComplete(result.trades);
      }
      
      setStep('complete');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('mapping');
    } finally {
      setIsProcessing(false);
    }
  }, [mapping, rawData, selectedSource, userId, userTimezone, onImportComplete]);

  // ================================================
  // MAPPING HANDLERS
  // ================================================

  const updateMapping = useCallback((field: keyof ColumnMapping, value: string) => {
    setMapping(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  // ================================================
  // RENDER HELPERS
  // ================================================

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {(['upload', 'mapping', 'preview', 'complete'] as const).map((s, i) => {
        const isActive = step === s || (step === 'importing' && s === 'preview');
        const isPast = ['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i ||
          (step === 'importing' && i < 3);
        
        return (
          <React.Fragment key={s}>
            <div className={`
              w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
              ${isActive ? 'bg-[#C9A646] text-black scale-110' : ''}
              ${isPast && !isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''}
              ${!isActive && !isPast ? 'bg-zinc-800/80 text-zinc-500 border border-zinc-700/50' : ''}
            `}>
              {isPast && !isActive ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < 3 && (
              <div className={`w-12 h-0.5 rounded-full transition-all duration-300 ${
                isPast ? 'bg-emerald-500/40' : 'bg-zinc-800'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ================================================
  // STEP: UPLOAD
  // ================================================

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">
          Import Your Trading History
        </h3>
        <p className="text-zinc-400 text-sm">
          Migrate from any trading journal in seconds
        </p>
      </div>

      {/* Source Selection */}
      <div>
        <label className="text-sm text-zinc-400 mb-3 block">
          Select your current journal <span className="text-zinc-600">(optional)</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {JOURNAL_SOURCES.slice(0, 6).map(source => (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source.id)}
              className={`
                p-3 rounded-xl border text-left transition-all duration-200
                ${selectedSource === source.id 
                  ? 'border-[#C9A646] bg-[#C9A646]/10 shadow-[0_0_20px_rgba(201,166,70,0.15)]' 
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/50'}
              `}
            >
              <div className="flex items-center gap-2.5">
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${selectedSource === source.id 
                    ? 'bg-[#C9A646]/20 text-[#C9A646]' 
                    : `bg-zinc-800 ${source.color}`}
                `}>
                  {source.icon}
                </div>
                <span className={`text-sm font-medium ${
                  selectedSource === source.id ? 'text-[#C9A646]' : 'text-white'
                }`}>
                  {source.name}
                </span>
              </div>
            </button>
          ))}
        </div>
        
        {/* Show more sources */}
        <details className="mt-3 group">
          <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            More platforms
          </summary>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-800/50">
            {JOURNAL_SOURCES.slice(6).map(source => (
              <button
                key={source.id}
                onClick={() => setSelectedSource(source.id)}
                className={`
                  p-3 rounded-xl border text-left transition-all duration-200
                  ${selectedSource === source.id 
                    ? 'border-[#C9A646] bg-[#C9A646]/10' 
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${selectedSource === source.id 
                      ? 'bg-[#C9A646]/20 text-[#C9A646]' 
                      : `bg-zinc-800 ${source.color}`}
                  `}>
                    {source.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    selectedSource === source.id ? 'text-[#C9A646]' : 'text-white'
                  }`}>
                    {source.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </details>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-300
          ${dragActive 
            ? 'border-[#C9A646] bg-[#C9A646]/5 scale-[1.02]' 
            : 'border-zinc-700/70 hover:border-zinc-500 bg-zinc-900/20'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-[#C9A646] animate-spin" />
            <p className="text-zinc-400">Processing file...</p>
          </div>
        ) : (
          <>
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all
              ${dragActive ? 'bg-[#C9A646]/20' : 'bg-zinc-800/80'}
            `}>
              <Upload className={`w-7 h-7 ${dragActive ? 'text-[#C9A646]' : 'text-zinc-400'}`} />
            </div>
            <p className="text-white font-medium mb-1">
              Drop your file here or click to browse
            </p>
            <p className="text-zinc-500 text-sm">
              Supports CSV, Excel (.xlsx, .xls)
            </p>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">Error</p>
            <p className="text-red-300/70 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-4 h-4 text-[#C9A646]" />
          </div>
          <div>
            <p className="text-white text-sm font-medium mb-1">How to export from your journal</p>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Most trading journals have an export option in Settings or Reports. 
              Look for "Export Trades" or "Download CSV".
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ================================================
  // STEP: MAPPING
  // ================================================

  const renderMappingStep = () => {
    const requiredFields: (keyof ColumnMapping)[] = ['symbol', 'side', 'quantity', 'entry_price', 'open_at'];
    const optionalFields: (keyof ColumnMapping)[] = ['exit_price', 'close_at', 'pnl', 'commission', 'notes', 'setup', 'stop_loss', 'take_profit', 'tags'];
    
    const fieldLabels: Record<keyof ColumnMapping, string> = {
      symbol: 'Symbol / Ticker',
      side: 'Side (Long/Short)',
      quantity: 'Quantity / Size',
      entry_price: 'Entry Price',
      exit_price: 'Exit Price',
      open_at: 'Open Date/Time',
      close_at: 'Close Date/Time',
      pnl: 'P&L / Profit',
      commission: 'Commission / Fees',
      notes: 'Notes / Comments',
      setup: 'Setup / Strategy',
      stop_loss: 'Stop Loss',
      take_profit: 'Take Profit',
      asset_type: 'Asset Type',
      tags: 'Tags / Labels',
    };

    const selectedSourceInfo = JOURNAL_SOURCES.find(s => s.id === selectedSource);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Map Your Columns
          </h3>
          {selectedSourceInfo && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/50">
              <div className={selectedSourceInfo.color}>
                {selectedSourceInfo.icon}
              </div>
              <span className="text-zinc-300 text-sm">{selectedSourceInfo.name} format detected</span>
            </div>
          )}
        </div>

        {/* Preview Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
            <Eye className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-400">Data Preview</span>
            <span className="text-xs text-zinc-600">({previewData.length} rows)</span>
          </div>
          <div className="overflow-x-auto max-h-36">
            <table className="w-full text-xs">
              <thead className="bg-zinc-800/50 sticky top-0">
                <tr>
                  {headers.slice(0, 8).map((h, idx) => (
                    <th key={`header-${idx}-${h}`} className="px-3 py-2 text-left text-zinc-400 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, i) => (
                  <tr key={`row-${i}`} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                    {headers.slice(0, 8).map((h, idx) => (
                      <td key={`cell-${i}-${idx}`} className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                        {row[h]?.substring(0, 20) || <span className="text-zinc-600">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column Mapping */}
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              Required Fields
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {requiredFields.map((field) => (
                <div key={`required-${field}`}>
                  <label className="text-xs text-zinc-500 mb-1.5 block">
                    {fieldLabels[field]}
                  </label>
                  <select
                    value={mapping?.[field] || ''}
                    onChange={(e) => updateMapping(field, e.target.value)}
                    className={`
                      w-full bg-zinc-900 border rounded-lg px-3 py-2.5 text-sm text-white
                      focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30 focus:border-[#C9A646]/50 transition-all
                      ${mapping?.[field] ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-700'}
                    `}
                  >
                    <option value="">-- Select column --</option>
                    {headers.map((h, idx) => (
                      <option key={`opt-req-${field}-${idx}`} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
              Optional Fields
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {optionalFields.map((field) => (
                <div key={`optional-${field}`}>
                  <label className="text-xs text-zinc-500 mb-1.5 block">
                    {fieldLabels[field]}
                  </label>
                  <select
                    value={mapping?.[field] || ''}
                    onChange={(e) => updateMapping(field, e.target.value)}
                    className={`
                      w-full bg-zinc-900 border rounded-lg px-3 py-2.5 text-sm text-white
                      focus:outline-none focus:ring-2 focus:ring-[#C9A646]/30 focus:border-[#C9A646]/50 transition-all
                      ${mapping?.[field] ? 'border-zinc-600' : 'border-zinc-800'}
                    `}
                  >
                    <option value="">-- Not mapped --</option>
                    {headers.map((h, idx) => (
                      <option key={`opt-opt-${field}-${idx}`} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setStep('upload')}
            className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleStartImport}
            disabled={!mapping?.symbol || !mapping?.open_at}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#C9A646]/20"
          >
            Import Trades
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // ================================================
  // STEP: IMPORTING
  // ================================================

  const renderImportingStep = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-[#C9A646] blur-2xl opacity-20 animate-pulse"></div>
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 border border-[#C9A646]/30 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#C9A646] animate-spin" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">
        Importing Your Trades
      </h3>
      <p className="text-zinc-400 text-sm mb-6">
        This may take a moment...
      </p>
      
      <div className="w-full max-w-xs bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#C9A646] to-[#E5C158] rounded-full animate-progress"></div>
      </div>
    </div>
  );

  // ================================================
  // STEP: COMPLETE
  // ================================================

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center pt-4">
        {importResult?.success ? (
          <>
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Import Complete!
            </h3>
            <p className="text-zinc-400 text-sm">
              Successfully imported <span className="text-emerald-400 font-semibold">{importResult.imported}</span> trades
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Import Failed
            </h3>
            <p className="text-zinc-400 text-sm">
              No trades could be imported. Please check your file and mapping.
            </p>
          </>
        )}
      </div>

      {/* Stats */}
      {importResult && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{importResult.imported}</div>
            <div className="text-xs text-zinc-400 mt-1">Imported</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{importResult.warnings.length}</div>
            <div className="text-xs text-zinc-400 mt-1">Warnings</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{importResult.skipped}</div>
            <div className="text-xs text-zinc-400 mt-1">Skipped</div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {importResult?.warnings && importResult.warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400 text-sm font-medium mb-2">Warnings</p>
          <ul className="space-y-1">
            {importResult.warnings.map((w, i) => (
              <li key={`warning-${i}`} className="text-yellow-300/70 text-xs flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Errors */}
      {importResult?.errors && importResult.errors.length > 0 && (
        <details className="bg-red-500/10 border border-red-500/20 rounded-xl overflow-hidden">
          <summary className="p-4 cursor-pointer text-red-400 text-sm font-medium hover:bg-red-500/5 transition-colors">
            {importResult.errors.length} errors (click to expand)
          </summary>
          <div className="px-4 pb-4 max-h-40 overflow-y-auto border-t border-red-500/10">
            <ul className="space-y-1 pt-3">
              {importResult.errors.slice(0, 20).map((e, i) => (
                <li key={`error-${i}`} className="text-red-300/70 text-xs">
                  Row {e.row}: {e.message}
                </li>
              ))}
              {importResult.errors.length > 20 && (
                <li className="text-red-300/50 text-xs pt-2">
                  ...and {importResult.errors.length - 20} more
                </li>
              )}
            </ul>
          </div>
        </details>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => {
            setStep('upload');
            setRawData('');
            setHeaders([]);
            setMapping(null);
            setImportResult(null);
            setSelectedSource(null);
          }}
          className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Import More
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C9A646]/20"
        >
          Done
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ================================================
  // MAIN RENDER
  // ================================================

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#141414] border border-zinc-800/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 border border-[#C9A646]/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Import Trades</h2>
              <p className="text-xs text-zinc-500">Migrate from any journal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {renderStepIndicator()}
          
          {step === 'upload' && renderUploadStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'importing' && renderImportingStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-progress { animation: progress 3s ease-in-out; }
      `}</style>
    </div>
  );
}