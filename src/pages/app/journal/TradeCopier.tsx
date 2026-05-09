// src/pages/app/journal/TradeCopier.tsx
// ═══════════════════════════════════════════════════════════════
// Trade Copier — FINOTAUR design
//   1. Broker Connection Status (Tradovate live/demo)
//   2. Copy Panel: Leader + Instrument (smart futures) + Followers table
//   3. Copy Trade History (audit log)
// Premium-only page. Consistent glassmorphism design.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, memo, useMemo, useRef, useEffect } from 'react';
import {
  Link2, RefreshCw, AlertCircle, Clock,
  Copy, History, Zap, Shield, WifiOff,
  TrendingUp, AlertOctagon, ArrowLeftRight, Search, X, Plus,
} from 'lucide-react';
import { useTradovate } from '@/hooks/useTradovate';
import { useCopyEngineHealth } from '@/hooks/useCopyEngineHealth';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useCopyTradeLog } from '@/hooks/useCopyTradeLog';
import TradovateConnectModal from '@/components/TradovateConnectModal';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { useEngineSessions } from '@/hooks/useEngineSessions';
import { BrokerAccordion } from '@/components/copyTrading/BrokerAccordion';
import { BROKER_CONFIGS, type BrokerName } from '@/lib/brokers/types';
import type { BrokerConnection } from '@/lib/brokers/types';

// ─────────────────────────────────────────────────────────────
// FUTURES CONTRACT EXPIRY LOGIC
// Tradovate/TradingView month codes: F=Jan G=Feb H=Mar J=Apr
// K=May M=Jun N=Jul Q=Aug U=Sep V=Oct X=Nov Z=Dec
// ─────────────────────────────────────────────────────────────
const MONTH_CODES = ['F','G','H','J','K','M','N','Q','U','V','X','Z'] as const;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Most CME equity index futures expire quarterly: Mar/Jun/Sep/Dec
const QUARTERLY = [2, 5, 8, 11]; // 0-indexed

// Roll window: switch to next contract ~1 week before 3rd Friday expiry
const ROLL_DAYS_BEFORE_EXPIRY = 7;

// 9-month forward window for contract suggestions
const CONTRACT_WINDOW_MONTHS = 9;

interface ContractSlot {
  root: string;
  code: string;       // month letter e.g. "M"
  full: string;       // e.g. "M26"
  ticker: string;     // e.g. "NQM26"
  monthName: string;  // e.g. "Jun"
  year: number;
  label: string;      // e.g. "Jun 2026"
  expiryDate: Date;
  isFront: boolean;   // is this the currently active front month?
}

function getThirdFriday(year: number, month: number): Date {
  const d = new Date(year, month, 1);
  let fridays = 0;
  while (fridays < 3) {
    if (d.getDay() === 5) fridays++;
    if (fridays < 3) d.setDate(d.getDate() + 1);
  }
  return d;
}

// Returns front month only (used for badge display and active ticker)
function getFrontMonth(contractMonths: number[]): { code: string; label: string; full: string } {
  const now = new Date();
  const year = now.getFullYear();
  for (let offset = 0; offset < 24; offset++) {
    const testDate = new Date(year, now.getMonth() + offset, 1);
    const m = testDate.getMonth();
    const y = testDate.getFullYear();
    if (!contractMonths.includes(m)) continue;
    const expiry   = getThirdFriday(y, m);
    const rollDate = new Date(expiry);
    rollDate.setDate(rollDate.getDate() - ROLL_DAYS_BEFORE_EXPIRY);
    if (now <= rollDate) {
      const code = MONTH_CODES[m];
      return { code, label: `${MONTH_NAMES[m]} ${y}`, full: `${code}${String(y).slice(-2)}` };
    }
  }
  const m = contractMonths[0];
  return { code: MONTH_CODES[m], label: MONTH_NAMES[m], full: `${MONTH_CODES[m]}${String(year).slice(-2)}` };
}

// Returns all contract slots within the 9-month window (front + upcoming)
function getUpcomingContracts(root: string, contractMonths: number[]): ContractSlot[] {
  const now      = new Date();
  const year     = now.getFullYear();
  const slots: ContractSlot[] = [];
  let frontFound = false;

  for (let offset = 0; offset < CONTRACT_WINDOW_MONTHS + 12; offset++) {
    const testDate = new Date(year, now.getMonth() + offset, 1);
    const m = testDate.getMonth();
    const y = testDate.getFullYear();
    if (!contractMonths.includes(m)) continue;

    const expiry   = getThirdFriday(y, m);
    const rollDate = new Date(expiry);
    rollDate.setDate(rollDate.getDate() - ROLL_DAYS_BEFORE_EXPIRY);

    // Skip contracts already rolled off
    if (now > rollDate) continue;

    // Check if this is within 9-month window from now
    const monthsAhead = (y - year) * 12 + m - now.getMonth();
    if (monthsAhead > CONTRACT_WINDOW_MONTHS) break;

    const code = MONTH_CODES[m];
    const isFront = !frontFound;
    frontFound = true;

    slots.push({
      root,
      code,
      full:       `${code}${String(y).slice(-2)}`,
      ticker:     `${root}${code}${String(y).slice(-2)}`,
      monthName:  MONTH_NAMES[m],
      year:       y,
      label:      `${MONTH_NAMES[m]} ${y}`,
      expiryDate: expiry,
      isFront,
    });
  }

  return slots;
}

// ─── Instrument catalogue ─────────────────────────────────────
interface FuturesInstrument {
  root: string;
  name: string;
  exchange: string;
  contractMonths: number[];
  micro?: string; // cross-instrument counterpart
}

const FUTURES_CATALOGUE: FuturesInstrument[] = [
  { root: 'NQ',  name: 'Nasdaq-100 Futures',        exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'MNQ' },
  { root: 'MNQ', name: 'Micro Nasdaq-100 Futures',  exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'NQ'  },
  { root: 'ES',  name: 'E-mini S&P 500 Futures',    exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'MES' },
  { root: 'MES', name: 'Micro E-mini S&P 500',      exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'ES'  },
  { root: 'RTY', name: 'Russell 2000 Futures',      exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'M2K' },
  { root: 'M2K', name: 'Micro Russell 2000',        exchange: 'CME',   contractMonths: QUARTERLY,                  micro: 'RTY' },
  { root: 'YM',  name: 'Dow Jones Futures',         exchange: 'CBOT',  contractMonths: QUARTERLY,                  micro: 'MYM' },
  { root: 'MYM', name: 'Micro Dow Jones Futures',   exchange: 'CBOT',  contractMonths: QUARTERLY,                  micro: 'YM'  },
  { root: 'CL',  name: 'Crude Oil Futures',         exchange: 'NYMEX', contractMonths: [0,1,2,3,4,5,6,7,8,9,10,11] },
  { root: 'QM',  name: 'Micro Crude Oil',           exchange: 'NYMEX', contractMonths: [0,1,2,3,4,5,6,7,8,9,10,11] },
  { root: 'NG',  name: 'Natural Gas Futures',       exchange: 'NYMEX', contractMonths: [0,1,2,3,4,5,6,7,8,9,10,11] },
  { root: 'GC',  name: 'Gold Futures',              exchange: 'COMEX', contractMonths: [1,3,5,7,9,11],             micro: 'MGC' },
  { root: 'MGC', name: 'Micro Gold Futures',        exchange: 'COMEX', contractMonths: [1,3,5,7,9,11],             micro: 'GC'  },
  { root: 'SI',  name: 'Silver Futures',            exchange: 'COMEX', contractMonths: [2,4,6,8,11] },
  { root: 'HG',  name: 'Copper Futures',            exchange: 'COMEX', contractMonths: [2,4,6,8,11] },
  { root: 'ZB',  name: '30-Year T-Bond Futures',   exchange: 'CBOT',  contractMonths: QUARTERLY },
  { root: 'ZN',  name: '10-Year T-Note Futures',   exchange: 'CBOT',  contractMonths: QUARTERLY },
  { root: 'ZF',  name: '5-Year T-Note Futures',    exchange: 'CBOT',  contractMonths: QUARTERLY },
  { root: 'ZT',  name: '2-Year T-Note Futures',    exchange: 'CBOT',  contractMonths: QUARTERLY },
  { root: '6E',  name: 'Euro FX Futures',           exchange: 'CME',   contractMonths: QUARTERLY },
  { root: '6J',  name: 'Japanese Yen Futures',      exchange: 'CME',   contractMonths: QUARTERLY },
  { root: '6B',  name: 'British Pound Futures',     exchange: 'CME',   contractMonths: QUARTERLY },
  { root: '6A',  name: 'Australian Dollar Futures', exchange: 'CME',   contractMonths: QUARTERLY },
  { root: 'BTC', name: 'Bitcoin Futures',           exchange: 'CME',   contractMonths: QUARTERLY },
  { root: 'ETH', name: 'Ether Futures',             exchange: 'CME',   contractMonths: QUARTERLY },
];

// Build cross-instrument map from catalogue
const CROSS_MAP: Record<string, string> = {};
FUTURES_CATALOGUE.forEach(f => { if (f.micro) CROSS_MAP[f.root] = f.micro; });

// Get active contract ticker: root + month code + 2-digit year (e.g. "NQM25")
function getActiveTicker(root: string): string {
  const instr = FUTURES_CATALOGUE.find(f => f.root === root);
  if (!instr) return root;
  return `${root}${getFrontMonth(instr.contractMonths).full}`;
}

// Ratio presets
const RATIO_PRESETS = [25, 50, 75, 100, 200];

// ─── Premium Guard ────────────────────────────────────────────
function PremiumGate() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-[#C9A646]" />
        </div>
        <h2 className="text-xl font-bold text-white">Premium Feature</h2>
        <p className="text-zinc-400 text-sm">
          Auto-sync &amp; Copy Trading requires a Premium subscription.
        </p>
        <a
          href="/app/journal/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A646] to-[#E8C56A] text-black font-bold text-sm hover:opacity-90 transition-all"
        >
          <Zap className="w-4 h-4" /> Upgrade to Premium
        </a>
      </div>
    </div>
  );
}

// ─── Section Card wrapper ─────────────────────────────────────
const SectionCard = memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`
    relative bg-[#111111]/80 backdrop-blur-md
    border border-white/[0.06] rounded-2xl p-6
    shadow-[0_4px_24px_rgba(0,0,0,0.4)]
    hover:border-white/[0.10] transition-all duration-300
    ${className}
  `}>
    {children}
  </div>
));

// ─── Sync Status Badge ────────────────────────────────────────
const SyncBadge = memo(({ type, label }: { type: string; label: string }) => {
  const configs = {
    connected:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
    disconnected: { bg: 'bg-zinc-800/60',    border: 'border-zinc-700/40',    text: 'text-zinc-500',    dot: 'bg-zinc-600' },
    error:        { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     dot: 'bg-red-400' },
    pending:      { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   dot: 'bg-amber-400 animate-pulse' },
  };
  const c = configs[type as keyof typeof configs] ?? configs.disconnected;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
});

// ─── Copy Engine Health Pill ──────────────────────────────────
const EnginePill = memo(function EnginePill({ alive, sessions }: { alive: boolean; sessions: number }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${
        alive
          ? 'bg-status-success/10 border-status-success/30 text-status-success'
          : 'bg-status-offline border-border-ds-default text-ink-secondary'
      }`}
      title={alive ? `Copy engine live · ${sessions} session${sessions === 1 ? '' : 's'}` : 'Copy engine not running'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${alive ? 'bg-status-success animate-pulse' : 'bg-status-offline border border-border-ds-default'}`} />
      Engine {alive ? `· ${sessions}` : 'down'}
    </div>
  );
});


// ─── Instrument Search Input ──────────────────────────────────
// Smart typeahead: suggests futures from catalogue, shows active contract month.
// Accepts root (NQ) or full ticker (NQM25) — auto-extracts root from full ticker.
const InstrumentSearch = memo(({
  value,
  onChange,
}: {
  value: string;    // currently selected root (e.g. "NQ")
  onChange: (root: string) => void;
}) => {
  // ── All hooks must be declared before any early returns ──
  const [query, setQuery]                   = useState(value);
  const [open, setOpen]                     = useState(false);
  const [focused, setFocused]               = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>(() =>
    value ? getActiveTicker(value) : ''
  );
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep display in sync when value changes externally
  useEffect(() => { setQuery(value); }, [value]);

  // Keep selectedTicker in sync when value changes externally
  useEffect(() => {
    if (value) setSelectedTicker(getActiveTicker(value));
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filtered instrument matches based on query (root level)
  const matchedInstruments = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return FUTURES_CATALOGUE.slice(0, 6);
    return FUTURES_CATALOGUE.filter(f =>
      f.root.startsWith(q) ||
      f.name.toUpperCase().includes(q) ||
      f.root === q.replace(/[FGHJKMNQUVXZ]\d{2}$/, '')
    ).slice(0, 8);
  }, [query]);

  // For each matched instrument, compute upcoming contract slots (9-month window)
  const suggestionGroups = useMemo(() =>
    matchedInstruments.map(f => ({
      instrument: f,
      contracts: getUpcomingContracts(f.root, f.contractMonths),
    })),
    [matchedInstruments],
  );

  // Currently selected instrument + front month badge
  const selectedInstr = FUTURES_CATALOGUE.find(f => f.root === value);
  const frontMonth    = selectedInstr ? getFrontMonth(selectedInstr.contractMonths) : null;

  function selectContract(slot: ContractSlot) {
    onChange(slot.root);
    setSelectedTicker(slot.ticker);
    setQuery(slot.root);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleInput(raw: string) {
    setQuery(raw);
    setOpen(true);
    const upper = raw.trim().toUpperCase();

    // Full ticker e.g. "NQM26" → extract root
    const fullMatch = upper.match(/^([A-Z0-9]{1,4})[FGHJKMNQUVXZ]\d{2}$/);
    if (fullMatch) {
      const root = fullMatch[1];
      if (FUTURES_CATALOGUE.find(f => f.root === root)) { onChange(root); return; }
    }
    // Exact root match
    if (FUTURES_CATALOGUE.find(f => f.root === upper)) onChange(upper);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
        Instrument
      </label>

      {/* Search input */}
      <div className={`
        flex items-center gap-2 bg-zinc-900/80 border rounded-xl px-3 py-2.5
        transition-all duration-150
        ${focused
          ? 'border-[#C9A646]/50 shadow-[0_0_0_1px_rgba(201,166,70,0.12)]'
          : 'border-zinc-700/60'
        }
      `}>
        <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Search symbol… (NQ, ES, NQM26)"
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none uppercase"
          spellCheck={false}
          autoComplete="off"
        />
        {query && (
          <button
            onMouseDown={e => {
              e.preventDefault();
              setQuery('');
              onChange('');
              setSelectedTicker('');
              setOpen(true);
            }}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Active contract badge */}
      {selectedTicker && frontMonth && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-600">Active contract:</span>
          <span className="text-[10px] font-bold text-[#C9A646] bg-[#C9A646]/10 px-1.5 py-0.5 rounded">
            {selectedTicker}
          </span>
          <span className="text-[10px] text-zinc-600">· {frontMonth.label}</span>
        </div>
      )}

      {/* Suggestions dropdown — grouped by instrument, expanded contract list */}
      {open && suggestionGroups.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50
          bg-[#161616] border border-zinc-800 rounded-xl
          shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden max-h-80 overflow-y-auto
          scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
        >
          {suggestionGroups.map(({ instrument: f, contracts }) => {
            const isSelectedRoot = f.root === value;
            return (
              <div key={f.root}>
                {/* ── Instrument header row ── */}
                <div className={`
                  flex items-center gap-3 px-3 py-2 border-b border-zinc-800/60
                  ${isSelectedRoot ? 'bg-[#C9A646]/[0.04]' : 'bg-zinc-900/30'}
                `}>
                  <span className={`w-10 text-right flex-shrink-0 text-xs font-bold ${isSelectedRoot ? 'text-[#C9A646]' : 'text-white'}`}>
                    {f.root}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-zinc-400 truncate">{f.name}</span>
                    <span className="text-[10px] text-zinc-600 ml-2">{f.exchange}</span>
                  </div>
                  {f.micro && (
                    <span className="text-[9px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      ↔ {f.micro}
                    </span>
                  )}
                </div>

                {/* ── Contract rows: front + upcoming within 9-month window ── */}
                {contracts.length === 0 ? (
                  <div className="px-4 py-2 text-[10px] text-zinc-600">No contracts in window</div>
                ) : (
                  contracts.map(slot => {
                    const isSelectedContract = slot.ticker === selectedTicker;
                    return (
                      <button
                        key={slot.ticker}
                        onMouseDown={e => { e.preventDefault(); selectContract(slot); }}
                        className={`
                          w-full flex items-center gap-3 pl-[52px] pr-3 py-2 text-left
                          transition-colors duration-100 hover:bg-zinc-800/50
                          ${isSelectedContract
                            ? 'bg-[#C9A646]/[0.08] border-l-2 border-[#C9A646]'
                            : 'border-l-2 border-transparent'
                          }
                        `}
                      >
                        {/* Contract ticker */}
                        <span className={`text-xs font-bold font-mono flex-shrink-0 ${
                          isSelectedContract ? 'text-[#C9A646]' : 'text-zinc-200'
                        }`}>
                          {slot.ticker}
                        </span>

                        {/* Month label */}
                        <span className="text-[10px] text-zinc-500 flex-shrink-0">{slot.label}</span>

                        {/* Expiry info */}
                        <span className="text-[10px] text-zinc-700 ml-auto flex-shrink-0">
                          exp {format(slot.expiryDate, 'MMM d')}
                        </span>

                        {/* Front month badge */}
                        {slot.isFront && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">
                            FRONT
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ─── Follower Row ─────────────────────────────────────────────
const FollowerRow = memo(({
  name,
  enabled,
  ratio,
  crossEnabled,
  crossLabel,
  onToggle,
  onRatioChange,
  onCrossToggle,
  onFlatten,
  isLoading,
}: {
  name: string;
  enabled: boolean;
  ratio: number;
  crossEnabled: boolean;
  crossLabel?: string;
  onToggle: () => void;
  onRatioChange: (r: number) => void;
  onCrossToggle: () => void;
  onFlatten: () => void;
  isLoading: boolean;
}) => (
  <div
    className={`
      grid items-center px-4 py-3 transition-all duration-200
      ${enabled
        ? 'bg-zinc-900/20 hover:bg-zinc-900/40'
        : 'bg-zinc-900/5 hover:bg-zinc-900/20 opacity-55'
      }
    `}
    style={{ gridTemplateColumns: '1fr 80px 1fr 96px 80px' }}
  >
    {/* Account name */}
    <div className="flex items-center gap-2.5 min-w-0 pr-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
        enabled
          ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
          : 'bg-zinc-600'
      }`} />
      <span className="text-sm text-white font-medium truncate">{name}</span>
    </div>

    {/* ON/OFF toggle */}
    <div className="flex justify-center">
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`
          px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 disabled:opacity-50
          ${enabled
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
            : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
          }
        `}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>

    {/* Ratio presets */}
    <div className="flex justify-center">
      <div className="flex items-center gap-1">
        {RATIO_PRESETS.map(p => (
          <button
            key={p}
            onClick={() => onRatioChange(p)}
            className={`
              w-8 h-6 rounded text-[10px] font-bold transition-all active:scale-95
              ${ratio === p
                ? 'bg-[#C9A646] text-black shadow-[0_0_8px_rgba(201,166,70,0.4)]'
                : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-500 hover:border-[#C9A646]/30 hover:text-[#C9A646]'
              }
            `}
          >
            {p === 200 ? '2×' : `${p}%`}
          </button>
        ))}
      </div>
    </div>

    {/* Cross-instrument toggle */}
    <div className="flex justify-center">
      {crossLabel ? (
        <button
          onClick={onCrossToggle}
          title={`Route to ${crossLabel} instead of leader instrument`}
          className={`
            flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold
            transition-all duration-150 active:scale-95
            ${crossEnabled
              ? 'bg-violet-500/20 border border-violet-500/40 text-violet-400 hover:bg-violet-500/30'
              : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600'
            }
          `}
        >
          <ArrowLeftRight className="w-3 h-3" />
          {crossLabel}
        </button>
      ) : (
        <span className="text-[10px] text-zinc-700">—</span>
      )}
    </div>

    {/* Per-account FLATTEN */}
    <div className="flex justify-center">
      <button
        onClick={onFlatten}
        className="px-2.5 py-1.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-600/25 hover:border-red-500/50 active:scale-95 transition-all duration-150"
      >
        FLATTEN
      </button>
    </div>
  </div>
));

// ─── Flatten Confirm Modal ────────────────────────────────────
const FlattenConfirmModal = memo(({ target, onConfirm, onCancel }: {
  target: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="max-w-sm w-full mx-4 bg-[#111] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-[0_8px_40px_rgba(239,68,68,0.2)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertOctagon className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Confirm Flatten</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">This action closes all open positions</p>
        </div>
      </div>
      <p className="text-sm text-zinc-300">
        Are you sure you want to{' '}
        <span className="text-red-400 font-semibold">flatten {target}</span>?
        All open positions will be closed immediately.
      </p>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 active:scale-95 transition-all"
        >
          Yes, Flatten Now
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
));

// ─── Copy Panel ───────────────────────────────────────────────
const CopyPanel = memo(({ portfolios }: { portfolios: { id: string; name: string }[] }) => {
  const { copyRules, addCopyRule, toggleCopyRule, deleteCopyRule, isLoading } = useTradovate();

  const [leaderId, setLeaderId]             = useState(portfolios[0]?.id ?? '');
  const [instrumentRoot, setInstrumentRoot] = useState('NQ');
  const [flattenTarget, setFlattenTarget]   = useState<string | null>(null);

  // Per-follower override state: id → { enabled, ratio, crossEnabled }
  const [overrides, setOverrides] = useState<
    Record<string, { enabled: boolean; ratio: number; crossEnabled: boolean }>
  >({});

  const followers = useMemo(
    () => portfolios.filter(p => p.id !== leaderId),
    [portfolios, leaderId],
  );

  const getFollowerState = useCallback((id: string) => {
    if (overrides[id]) return overrides[id];
    const existing = copyRules.find(
      r => r.source_portfolio_id === leaderId && r.target_portfolio_id === id,
    );
    return {
      enabled: existing?.is_active ?? false,
      ratio: existing ? Math.round(existing.ratio * 100) : 100,
      crossEnabled: false,
    };
  }, [overrides, copyRules, leaderId]);

  const patchFollower = useCallback((id: string, patch: Partial<{ enabled: boolean; ratio: number; crossEnabled: boolean }>) => {
    setOverrides(prev => ({ ...prev, [id]: { ...getFollowerState(id), ...patch } }));
  }, [getFollowerState]);

  const handleToggle = useCallback(async (followerId: string) => {
    const cur = getFollowerState(followerId);
    const next = !cur.enabled;
    patchFollower(followerId, { enabled: next });
    const existing = copyRules.find(
      r => r.source_portfolio_id === leaderId && r.target_portfolio_id === followerId,
    );
    if (existing) {
      await toggleCopyRule(existing.id, next);
    } else if (next) {
      await addCopyRule(leaderId, followerId, cur.ratio / 100, undefined);
    }
  }, [getFollowerState, patchFollower, copyRules, leaderId, toggleCopyRule, addCopyRule]);

  const handleRatioChange = useCallback(async (followerId: string, ratio: number) => {
    patchFollower(followerId, { ratio });
    const existing = copyRules.find(
      r => r.source_portfolio_id === leaderId && r.target_portfolio_id === followerId,
    );
    if (existing) {
      await deleteCopyRule(existing.id);
      await addCopyRule(leaderId, followerId, ratio / 100, undefined);
    }
  }, [patchFollower, copyRules, leaderId, deleteCopyRule, addCopyRule]);

  const crossLabel  = CROSS_MAP[instrumentRoot];
  const flattenName = flattenTarget === 'ALL'
    ? 'ALL accounts'
    : (portfolios.find(p => p.id === flattenTarget)?.name ?? flattenTarget ?? '');

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center">
          <Copy className="w-4 h-4 text-[#C9A646]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Copy Trading Panel</h3>
          <p className="text-[11px] text-zinc-500">
            Configure leader account, instrument &amp; follower settings
          </p>
        </div>
      </div>

      {/* ── Leader + Instrument + FLATTEN ALL ── */}
      <div className="grid grid-cols-[1fr,1fr,auto] gap-3 items-start">

        {/* Leader account */}
        <div>
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
            Leader Account
          </label>
          <select
            value={leaderId}
            onChange={e => setLeaderId(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A646]/50 appearance-none h-[42px]"
          >
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Smart instrument search */}
        <InstrumentSearch value={instrumentRoot} onChange={setInstrumentRoot} />

        {/* FLATTEN ALL — aligned to input height */}
        <div className="pt-[22px]">
          <button
            onClick={() => setFlattenTarget('ALL')}
            className="flex items-center justify-center gap-2 px-5 rounded-xl h-[42px]
              bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-xs
              hover:bg-red-600/30 hover:border-red-500/60 hover:text-red-300
              active:scale-95 transition-all duration-150 whitespace-nowrap"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            FLATTEN ALL
          </button>
        </div>
      </div>

      {/* ── Followers Table ── */}
      {portfolios.length < 2 ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
          <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0" />
          Connect at least 2 portfolios to use copy rules.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/60 overflow-hidden">

          {/* Table header */}
          <div
            className="bg-zinc-900/60 border-b border-zinc-800/60 px-4 py-2.5"
            style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 96px 80px' }}
          >
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Account</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider text-center">Active</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider text-center">Ratio</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider text-center">
              {crossLabel ? `Cross → ${crossLabel}` : 'Cross'}
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider text-center">Flatten</span>
          </div>

          {/* Follower rows */}
          <div className="divide-y divide-zinc-800/40">
            {followers.map(f => {
              const s = getFollowerState(f.id);
              return (
                <FollowerRow
                  key={f.id}
                  name={f.name}
                  enabled={s.enabled}
                  ratio={s.ratio}
                  crossEnabled={s.crossEnabled}
                  crossLabel={crossLabel}
                  onToggle={() => handleToggle(f.id)}
                  onRatioChange={r => handleRatioChange(f.id, r)}
                  onCrossToggle={() => patchFollower(f.id, { crossEnabled: !s.crossEnabled })}
                  onFlatten={() => setFlattenTarget(f.id)}
                  isLoading={isLoading}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Flatten confirm modal ── */}
      {flattenTarget && (
        <FlattenConfirmModal
          target={flattenName}
          onConfirm={() => {
            // TODO: wire to actual broker flatten API
            setFlattenTarget(null);
          }}
          onCancel={() => setFlattenTarget(null)}
        />
      )}
    </div>
  );
});

// ─── Copy History Section ─────────────────────────────────────
const CopyHistorySection = memo(() => {
  const { log, isLoading, successCount, skippedCount, failedCount } = useCopyTradeLog(30);

  const statusConfig = {
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    skipped: { color: 'text-amber-400',   bg: 'bg-amber-500/10'  },
    failed:  { color: 'text-red-400',     bg: 'bg-red-500/10'    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
            <History className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Copy History</h3>
            <p className="text-[11px] text-zinc-500">Last 30 copy actions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {successCount > 0 && (
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {successCount} copied
            </span>
          )}
          {skippedCount > 0 && (
            <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              {skippedCount} skipped
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
              {failedCount} failed
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-zinc-900/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : log.length === 0 ? (
        <div className="text-center py-8 text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-xl">
          No copy actions yet. Enable a follower account above to start.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pr-1">
          {log.map(entry => {
            const cfg = statusConfig[entry.status as keyof typeof statusConfig] ?? statusConfig.failed;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/60 transition-all"
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${cfg.bg} ${cfg.color}`}>
                  {entry.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300">
                    {entry.original_quantity} → {entry.copied_quantity ?? 0} contracts
                    {entry.ratio_applied && (
                      <span className="text-zinc-600 ml-1">({Math.round(entry.ratio_applied * 100)}%)</span>
                    )}
                  </p>
                  {entry.error_message && (
                    <p className="text-[10px] text-red-400/70 truncate">{entry.error_message}</p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {format(new Date(entry.created_at), 'MMM d HH:mm')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ─── Manage Risk Placeholder (Tab 3) ─────────────────────────
const ManageRiskPlaceholder = memo(function ManageRiskPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-ds-8 gap-ds-3">
      <div className="w-12 h-12 rounded-lg bg-gold-primary/10 border border-gold-border flex items-center justify-center">
        <Shield className="w-6 h-6 text-gold-primary" />
      </div>
      <h3 className="text-base font-semibold text-ink-primary">Manage Risk</h3>
      <p className="text-sm text-ink-secondary text-center max-w-md">
        Per-account risk controls coming in the next iteration: max daily loss, max position size, kill switches, and time-based limits.
      </p>
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────
export default function TradeCopier() {
  const { isPremium, isAdmin } = useSubscription();
  const isPremiumUser = isPremium || isAdmin;

  const {
    hasAnyConnection, syncStatus, isLoading,
    disconnect,
  } = useTradovate();
  const { alive: engineAlive, sessions: engineSessions } = useCopyEngineHealth();

  const { connections, disconnect: disconnectBroker } = useBrokerConnections({ active: true });
  const { liveCredentialIds } = useEngineSessions();

  const byBroker = useMemo(() => {
    const m = new Map<BrokerName, BrokerConnection[]>();
    for (const b of (Object.keys(BROKER_CONFIGS) as BrokerName[])) {
      if (b === 'manual') continue;
      if (BROKER_CONFIGS[b].status !== 'available') continue;
      m.set(b, connections.filter((c: BrokerConnection) => c.broker === b));
    }
    return m;
  }, [connections]);

  const nonEmptyBrokerCount = [...byBroker.values()].filter(v => v.length > 0).length;

  const { portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'connections' | 'copy-trading' | 'manage-risk'>('connections');

  if (!isPremiumUser) return <PremiumGate />;

  // Only real broker accounts — no manual portfolios
  const brokerPortfolios = useMemo(
    () => (portfoliosLoading ? [] : portfolios.filter((p: any) => p.source !== 'manual')),
    [portfolios, portfoliosLoading],
  );

  return (
    <div className="min-h-screen bg-surface-base text-ink-primary">
      <div className="w-full max-w-[1600px] mx-auto px-ds-5 py-ds-6 space-y-ds-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-primary">Copy Trading</h1>
            <p className="text-sm text-ink-secondary mt-1">
              Configure your leader account, instrument and follower settings in real-time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EnginePill alive={engineAlive} sessions={engineSessions} />
            <SyncBadge type={syncStatus.type} label={syncStatus.label} />
          </div>
        </div>

        {/* ── Tab Navigation Bar ── */}
        <div className="flex items-center gap-ds-1 p-1 rounded-lg bg-surface-1 border border-border-ds-subtle w-fit">
          {([
            { id: 'connections',  label: 'Connections',  icon: Link2  },
            { id: 'copy-trading', label: 'Copy Trading', icon: Copy   },
            { id: 'manage-risk',  label: 'Manage Risk',  icon: Shield },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-ds-2 px-ds-4 py-ds-2 rounded-md text-sm font-medium transition-colors duration-base ${
                activeTab === tab.id
                  ? 'bg-gold-primary text-ink-on-gold'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-2'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab 1: Broker Connections ── */}
        {activeTab === 'connections' && (
          <SectionCard>
            <div className="flex items-center justify-between mb-ds-4">
              <div className="flex items-center gap-ds-3">
                <div className="w-9 h-9 rounded-lg bg-gold-primary/10 border border-gold-border flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-gold-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink-primary">Broker Connections</h2>
                  <p className="text-[11px] text-ink-secondary">Auto-syncing — no manual refresh needed</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-ds-2 rounded-lg bg-gold-primary hover:bg-[var(--gold-hover)] text-ink-on-gold px-ds-3 py-ds-2 text-sm font-medium transition-colors duration-base"
              >
                <Plus className="w-4 h-4" />
                Connect new broker
              </button>
            </div>

            <div className="flex items-center gap-ds-2 mb-ds-4 bg-surface-1 border border-border-ds-subtle rounded-md px-ds-3 py-ds-2">
              <Shield className="w-3.5 h-3.5 text-gold-primary flex-shrink-0" />
              <span className="text-xs text-ink-secondary">
                Credentials encrypted with AES-256 — we never store plaintext passwords.
              </span>
            </div>

            <div className="space-y-ds-2">
              {[...byBroker.entries()].map(([broker, conns]) => (
                <BrokerAccordion
                  key={broker}
                  broker={broker}
                  connections={conns}
                  liveCredentialIds={liveCredentialIds}
                  defaultExpanded={nonEmptyBrokerCount === 1 && conns.length > 0}
                  onDisconnect={disconnectBroker}
                />
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Tab 2: Copy Trading ── */}
        {activeTab === 'copy-trading' && (
          <>
            {hasAnyConnection ? (
              <>
                <SectionCard>
                  <CopyPanel portfolios={brokerPortfolios} />
                </SectionCard>
                <SectionCard>
                  <CopyHistorySection />
                </SectionCard>
              </>
            ) : (
              <SectionCard>
                <div className="text-center py-16 space-y-4">
                  <WifiOff className="w-12 h-12 text-zinc-700 mx-auto" />
                  <div>
                    <p className="text-ink-secondary font-medium">No accounts connected</p>
                    <p className="text-ink-secondary text-sm mt-1">
                      Connect a broker in the Connections tab to enable copy trading.
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* ── Tab 3: Manage Risk ── */}
        {activeTab === 'manage-risk' && (
          <SectionCard>
            <ManageRiskPlaceholder />
          </SectionCard>
        )}

      </div>

      {showModal && (
        <TradovateConnectModal
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}