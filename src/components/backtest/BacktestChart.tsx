/**
 * BacktestChart — interactive paper-trading chart for the Backtest tab.
 *
 * Wraps the FinotaurChart primitive (futures via Yahoo, equities via Yahoo,
 * crypto via Binance) and layers a paper-trading panel on top. Position
 * entry/exit markers paint directly on candles via lightweight-charts native
 * setMarkers().
 *
 * Phase 1 scope:
 *   - Symbol + barInterval pickers (3 asset classes)
 *   - Manual LONG / SHORT with SL/TP
 *   - Live unrealized P&L tracker for the open position
 *   - Side panel: stats summary + recent trade history
 *   - Markers: entry arrow (green up / red down) + exit dot (P&L-colored)
 *
 * Out of Phase 1 scope (Phase 2/3):
 *   - Playback / replay (open question if needed — current chart shows live
 *     historical, latest candle = "now". Replay still available via the
 *     Immersive Mode button which loads the legacy ReplayChart.)
 *   - Save session to Supabase (Phase 2)
 *   - Rule-based strategy executor (Phase 3)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { UTCTimestamp } from 'lightweight-charts';
import { TrendingUp, TrendingDown, X, RotateCcw, Save, Check, AlertCircle, Play, ChevronDown, ArrowLeft } from 'lucide-react';

import { pickDataSource, isCryptoSymbol } from '@/components/charting/dataSources';
import type { Bar, ChartMarker, Interval } from '@/components/charting/types';
import {
  useBacktestSession,
  computeStatsByStrategy,
  type PaperPosition,
  type PaperSide,
  type PendingOrder,
  type PendingOrderType,
} from '@/hooks/useBacktestSession';
import { useBacktestPersistence } from '@/hooks/useBacktestPersistence';
import { useStrategyLibrary } from '@/hooks/useStrategyLibrary';
import { runStrategy } from '@/core/backtest/runStrategy';
import { BacktestReplayChart, type ContextMenuPriceInfo } from './BacktestReplayChart';
import { DateTimePicker } from './DateTimePicker';

// ─── Asset class presets ────────────────────────────────────────
// Each preset resolves to a source-native symbol. Yahoo handles futures
// (continuous front-month via =F suffix) and equities (bare ticker). Binance
// handles crypto. Pickers default to the most common contracts/tickers per
// class — power users can type freely.
type AssetClass = 'futures' | 'stocks' | 'forex' | 'crypto';

// Searchable symbol universe per asset class. `ticker` is what the trader
// types/sees (e.g. "ES"); `symbol` is the source-native form passed to the
// data layer (Yahoo futures use a "=F" suffix, equities are bare, Binance
// crypto are "<BASE>USDT"). The first entry per class is the default symbol
// when the trader switches asset class. The picker also accepts free-form
// tickers not in this list (normalized per class on commit).
interface SymbolEntry { ticker: string; label: string; symbol: string }

const SYMBOL_UNIVERSE: Record<AssetClass, SymbolEntry[]> = {
  futures: [
    { ticker: 'MNQ', label: 'Micro E-mini Nasdaq-100', symbol: 'MNQ=F' },
    { ticker: 'MES', label: 'Micro E-mini S&P 500', symbol: 'MES=F' },
    { ticker: 'NQ', label: 'E-mini Nasdaq-100', symbol: 'NQ=F' },
    { ticker: 'ES', label: 'E-mini S&P 500', symbol: 'ES=F' },
    { ticker: 'YM', label: 'E-mini Dow', symbol: 'YM=F' },
    { ticker: 'MYM', label: 'Micro E-mini Dow', symbol: 'MYM=F' },
    { ticker: 'RTY', label: 'E-mini Russell 2000', symbol: 'RTY=F' },
    { ticker: 'M2K', label: 'Micro E-mini Russell 2000', symbol: 'M2K=F' },
    { ticker: 'GC', label: 'Gold', symbol: 'GC=F' },
    { ticker: 'MGC', label: 'Micro Gold', symbol: 'MGC=F' },
    { ticker: 'SI', label: 'Silver', symbol: 'SI=F' },
    { ticker: 'HG', label: 'Copper', symbol: 'HG=F' },
    { ticker: 'CL', label: 'Crude Oil (WTI)', symbol: 'CL=F' },
    { ticker: 'MCL', label: 'Micro Crude Oil', symbol: 'MCL=F' },
    { ticker: 'NG', label: 'Natural Gas', symbol: 'NG=F' },
    { ticker: 'ZB', label: '30-Year T-Bond', symbol: 'ZB=F' },
    { ticker: 'ZN', label: '10-Year T-Note', symbol: 'ZN=F' },
    { ticker: 'ZC', label: 'Corn', symbol: 'ZC=F' },
    { ticker: 'ZS', label: 'Soybeans', symbol: 'ZS=F' },
    { ticker: 'ZW', label: 'Wheat', symbol: 'ZW=F' },
    { ticker: '6E', label: 'Euro FX', symbol: '6E=F' },
    { ticker: '6J', label: 'Japanese Yen', symbol: '6J=F' },
    { ticker: '6B', label: 'British Pound', symbol: '6B=F' },
  ],
  stocks: [
    { ticker: 'AAPL', label: 'Apple', symbol: 'AAPL' },
    { ticker: 'NVDA', label: 'Nvidia', symbol: 'NVDA' },
    { ticker: 'MSFT', label: 'Microsoft', symbol: 'MSFT' },
    { ticker: 'AMZN', label: 'Amazon', symbol: 'AMZN' },
    { ticker: 'GOOGL', label: 'Alphabet (Class A)', symbol: 'GOOGL' },
    { ticker: 'META', label: 'Meta Platforms', symbol: 'META' },
    { ticker: 'TSLA', label: 'Tesla', symbol: 'TSLA' },
    { ticker: 'NFLX', label: 'Netflix', symbol: 'NFLX' },
    { ticker: 'AMD', label: 'Advanced Micro Devices', symbol: 'AMD' },
    { ticker: 'JPM', label: 'JPMorgan Chase', symbol: 'JPM' },
    { ticker: 'V', label: 'Visa', symbol: 'V' },
    { ticker: 'DIS', label: 'Walt Disney', symbol: 'DIS' },
    { ticker: 'BA', label: 'Boeing', symbol: 'BA' },
    { ticker: 'XOM', label: 'Exxon Mobil', symbol: 'XOM' },
    { ticker: 'WMT', label: 'Walmart', symbol: 'WMT' },
    { ticker: 'COST', label: 'Costco', symbol: 'COST' },
    // S&P 100 mega/large caps
    { ticker: 'BRK-B', label: 'Berkshire Hathaway (Class B)', symbol: 'BRK-B' },
    { ticker: 'UNH', label: 'UnitedHealth Group', symbol: 'UNH' },
    { ticker: 'LLY', label: 'Eli Lilly', symbol: 'LLY' },
    { ticker: 'JNJ', label: 'Johnson & Johnson', symbol: 'JNJ' },
    { ticker: 'PG', label: 'Procter & Gamble', symbol: 'PG' },
    { ticker: 'HD', label: 'Home Depot', symbol: 'HD' },
    { ticker: 'MA', label: 'Mastercard', symbol: 'MA' },
    { ticker: 'ABBV', label: 'AbbVie', symbol: 'ABBV' },
    { ticker: 'MRK', label: 'Merck', symbol: 'MRK' },
    { ticker: 'AVGO', label: 'Broadcom', symbol: 'AVGO' },
    { ticker: 'PEP', label: 'PepsiCo', symbol: 'PEP' },
    { ticker: 'KO', label: 'Coca-Cola', symbol: 'KO' },
    { ticker: 'ORCL', label: 'Oracle', symbol: 'ORCL' },
    { ticker: 'CRM', label: 'Salesforce', symbol: 'CRM' },
    { ticker: 'ADBE', label: 'Adobe', symbol: 'ADBE' },
    { ticker: 'ACN', label: 'Accenture', symbol: 'ACN' },
    { ticker: 'MCD', label: "McDonald's", symbol: 'MCD' },
    { ticker: 'CSCO', label: 'Cisco Systems', symbol: 'CSCO' },
    { ticker: 'INTC', label: 'Intel', symbol: 'INTC' },
    { ticker: 'QCOM', label: 'Qualcomm', symbol: 'QCOM' },
    { ticker: 'TXN', label: 'Texas Instruments', symbol: 'TXN' },
    { ticker: 'NKE', label: 'Nike', symbol: 'NKE' },
    { ticker: 'PFE', label: 'Pfizer', symbol: 'PFE' },
    { ticker: 'TMO', label: 'Thermo Fisher Scientific', symbol: 'TMO' },
    { ticker: 'ABT', label: 'Abbott Laboratories', symbol: 'ABT' },
    { ticker: 'DHR', label: 'Danaher', symbol: 'DHR' },
    { ticker: 'LIN', label: 'Linde', symbol: 'LIN' },
    { ticker: 'UPS', label: 'United Parcel Service', symbol: 'UPS' },
    { ticker: 'PM', label: 'Philip Morris International', symbol: 'PM' },
    { ticker: 'RTX', label: 'RTX Corporation', symbol: 'RTX' },
    { ticker: 'HON', label: 'Honeywell', symbol: 'HON' },
    { ticker: 'GS', label: 'Goldman Sachs', symbol: 'GS' },
    { ticker: 'MS', label: 'Morgan Stanley', symbol: 'MS' },
    { ticker: 'BAC', label: 'Bank of America', symbol: 'BAC' },
    { ticker: 'WFC', label: 'Wells Fargo', symbol: 'WFC' },
    { ticker: 'C', label: 'Citigroup', symbol: 'C' },
    { ticker: 'AXP', label: 'American Express', symbol: 'AXP' },
    { ticker: 'CAT', label: 'Caterpillar', symbol: 'CAT' },
    { ticker: 'DE', label: 'Deere & Company', symbol: 'DE' },
    { ticker: 'GE', label: 'GE Aerospace', symbol: 'GE' },
    { ticker: 'LMT', label: 'Lockheed Martin', symbol: 'LMT' },
    { ticker: 'CVX', label: 'Chevron', symbol: 'CVX' },
    { ticker: 'COP', label: 'ConocoPhillips', symbol: 'COP' },
    { ticker: 'T', label: 'AT&T', symbol: 'T' },
    { ticker: 'VZ', label: 'Verizon Communications', symbol: 'VZ' },
    { ticker: 'CMCSA', label: 'Comcast', symbol: 'CMCSA' },
    { ticker: 'IBM', label: 'IBM', symbol: 'IBM' },
    { ticker: 'NOW', label: 'ServiceNow', symbol: 'NOW' },
    { ticker: 'INTU', label: 'Intuit', symbol: 'INTU' },
    { ticker: 'AMAT', label: 'Applied Materials', symbol: 'AMAT' },
    { ticker: 'MU', label: 'Micron Technology', symbol: 'MU' },
    { ticker: 'LRCX', label: 'Lam Research', symbol: 'LRCX' },
    { ticker: 'KLAC', label: 'KLA Corporation', symbol: 'KLAC' },
    { ticker: 'MDT', label: 'Medtronic', symbol: 'MDT' },
    { ticker: 'ISRG', label: 'Intuitive Surgical', symbol: 'ISRG' },
    { ticker: 'REGN', label: 'Regeneron Pharmaceuticals', symbol: 'REGN' },
    { ticker: 'GILD', label: 'Gilead Sciences', symbol: 'GILD' },
    { ticker: 'BMY', label: 'Bristol-Myers Squibb', symbol: 'BMY' },
    { ticker: 'AMGN', label: 'Amgen', symbol: 'AMGN' },
    { ticker: 'CI', label: 'Cigna', symbol: 'CI' },
    { ticker: 'CVS', label: 'CVS Health', symbol: 'CVS' },
    { ticker: 'LOW', label: "Lowe's", symbol: 'LOW' },
    { ticker: 'TGT', label: 'Target', symbol: 'TGT' },
    { ticker: 'SBUX', label: 'Starbucks', symbol: 'SBUX' },
    { ticker: 'BLK', label: 'BlackRock', symbol: 'BLK' },
    { ticker: 'SCHW', label: 'Charles Schwab', symbol: 'SCHW' },
    { ticker: 'AMT', label: 'American Tower', symbol: 'AMT' },
    { ticker: 'PLD', label: 'Prologis', symbol: 'PLD' },
    { ticker: 'NEE', label: 'NextEra Energy', symbol: 'NEE' },
    { ticker: 'DUK', label: 'Duke Energy', symbol: 'DUK' },
    { ticker: 'SO', label: 'Southern Company', symbol: 'SO' },
    // Leading ETFs
    { ticker: 'SPY', label: 'SPDR S&P 500 ETF', symbol: 'SPY' },
    { ticker: 'QQQ', label: 'Invesco QQQ (Nasdaq-100)', symbol: 'QQQ' },
    { ticker: 'IWM', label: 'iShares Russell 2000 ETF', symbol: 'IWM' },
    { ticker: 'DIA', label: 'SPDR Dow Jones Industrial ETF', symbol: 'DIA' },
    { ticker: 'VTI', label: 'Vanguard Total Stock Market ETF', symbol: 'VTI' },
    { ticker: 'VOO', label: 'Vanguard S&P 500 ETF', symbol: 'VOO' },
    { ticker: 'XLF', label: 'Financial Select Sector SPDR', symbol: 'XLF' },
    { ticker: 'XLE', label: 'Energy Select Sector SPDR', symbol: 'XLE' },
    { ticker: 'XLK', label: 'Technology Select Sector SPDR', symbol: 'XLK' },
    { ticker: 'SMH', label: 'VanEck Semiconductor ETF', symbol: 'SMH' },
    { ticker: 'ARKK', label: 'ARK Innovation ETF', symbol: 'ARKK' },
    { ticker: 'GLD', label: 'SPDR Gold Shares ETF', symbol: 'GLD' },
    { ticker: 'TLT', label: 'iShares 20+ Year Treasury Bond ETF', symbol: 'TLT' },
    // Indices
    { ticker: 'SPX', label: 'S&P 500 Index', symbol: '^GSPC' },
    { ticker: 'NDX', label: 'Nasdaq-100 Index', symbol: '^NDX' },
    { ticker: 'VIX', label: 'CBOE Volatility Index', symbol: '^VIX' },
  ],
  forex: [
    // Majors
    { ticker: 'EURUSD', label: 'EUR/USD', symbol: 'EURUSD=X' },
    { ticker: 'GBPUSD', label: 'GBP/USD', symbol: 'GBPUSD=X' },
    { ticker: 'USDJPY', label: 'USD/JPY', symbol: 'USDJPY=X' },
    { ticker: 'AUDUSD', label: 'AUD/USD', symbol: 'AUDUSD=X' },
    { ticker: 'USDCAD', label: 'USD/CAD', symbol: 'USDCAD=X' },
    { ticker: 'USDCHF', label: 'USD/CHF', symbol: 'USDCHF=X' },
    { ticker: 'NZDUSD', label: 'NZD/USD', symbol: 'NZDUSD=X' },
    // Crosses
    { ticker: 'EURGBP', label: 'EUR/GBP', symbol: 'EURGBP=X' },
    { ticker: 'EURJPY', label: 'EUR/JPY', symbol: 'EURJPY=X' },
    { ticker: 'GBPJPY', label: 'GBP/JPY', symbol: 'GBPJPY=X' },
    { ticker: 'EURCHF', label: 'EUR/CHF', symbol: 'EURCHF=X' },
    { ticker: 'EURAUD', label: 'EUR/AUD', symbol: 'EURAUD=X' },
    { ticker: 'EURCAD', label: 'EUR/CAD', symbol: 'EURCAD=X' },
    { ticker: 'AUDJPY', label: 'AUD/JPY', symbol: 'AUDJPY=X' },
    { ticker: 'GBPCHF', label: 'GBP/CHF', symbol: 'GBPCHF=X' },
    { ticker: 'CADJPY', label: 'CAD/JPY', symbol: 'CADJPY=X' },
    { ticker: 'CHFJPY', label: 'CHF/JPY', symbol: 'CHFJPY=X' },
    { ticker: 'AUDNZD', label: 'AUD/NZD', symbol: 'AUDNZD=X' },
    { ticker: 'NZDJPY', label: 'NZD/JPY', symbol: 'NZDJPY=X' },
    { ticker: 'GBPAUD', label: 'GBP/AUD', symbol: 'GBPAUD=X' },
    { ticker: 'AUDCAD', label: 'AUD/CAD', symbol: 'AUDCAD=X' },
  ],
  crypto: [
    { ticker: 'BTC', label: 'Bitcoin', symbol: 'BTCUSDT' },
    { ticker: 'ETH', label: 'Ethereum', symbol: 'ETHUSDT' },
    { ticker: 'SOL', label: 'Solana', symbol: 'SOLUSDT' },
    { ticker: 'BNB', label: 'BNB', symbol: 'BNBUSDT' },
    { ticker: 'XRP', label: 'XRP', symbol: 'XRPUSDT' },
    { ticker: 'ADA', label: 'Cardano', symbol: 'ADAUSDT' },
    { ticker: 'DOGE', label: 'Dogecoin', symbol: 'DOGEUSDT' },
    { ticker: 'AVAX', label: 'Avalanche', symbol: 'AVAXUSDT' },
    { ticker: 'LINK', label: 'Chainlink', symbol: 'LINKUSDT' },
    { ticker: 'DOT', label: 'Polkadot', symbol: 'DOTUSDT' },
    { ticker: 'MATIC', label: 'Polygon', symbol: 'MATICUSDT' },
    { ticker: 'LTC', label: 'Litecoin', symbol: 'LTCUSDT' },
    { ticker: 'TRX', label: 'TRON', symbol: 'TRXUSDT' },
    { ticker: 'BCH', label: 'Bitcoin Cash', symbol: 'BCHUSDT' },
    { ticker: 'NEAR', label: 'NEAR Protocol', symbol: 'NEARUSDT' },
    { ticker: 'APT', label: 'Aptos', symbol: 'APTUSDT' },
    { ticker: 'ARB', label: 'Arbitrum', symbol: 'ARBUSDT' },
    { ticker: 'OP', label: 'Optimism', symbol: 'OPUSDT' },
    { ticker: 'FIL', label: 'Filecoin', symbol: 'FILUSDT' },
    { ticker: 'ICP', label: 'Internet Computer', symbol: 'ICPUSDT' },
  ],
};

// Combined searchable universe across all asset classes, each tagged with its class.
const ALL_SYMBOLS: (SymbolEntry & { assetClass: AssetClass })[] = (
  Object.entries(SYMBOL_UNIVERSE) as [AssetClass, SymbolEntry[]][]
).flatMap(([ac, entries]) => entries.map((e) => ({ ...e, assetClass: ac })));

// Detect the asset class implied by a source-native symbol.
function detectAssetClass(sym: string): AssetClass {
  if (isCryptoSymbol(sym)) return 'crypto';
  if (sym.endsWith('=F')) return 'futures';
  if (sym.endsWith('=X')) return 'forex';
  return 'stocks';
}

// Normalize a free-typed ticker to a source-native symbol given an explicit
// asset class. Returns the class-appropriate native form (e.g. adds =X for
// forex pairs that don't already carry the suffix).
function normalizeRawSymbol(raw: string, assetClass: AssetClass): string {
  const t = raw.trim().toUpperCase();
  if (!t) return t;
  if (assetClass === 'forex') return t.endsWith('=X') ? t : `${t}=X`;
  return t;
}

// Normalize a free-typed ticker to a source-native symbol WITHOUT an explicit
// class. Exact-match the combined universe first (covers futures roots like ES,
// indices like SPX->^GSPC, crypto bases like BTC->BTCUSDT); otherwise infer
// from the raw shape (=F => futures, crypto pair => crypto, =X => forex, else
// bare equity).
function normalizeSymbolAuto(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (!t) return t;
  const hit = ALL_SYMBOLS.find((u) => u.ticker.toUpperCase() === t);
  if (hit) return hit.symbol;
  // For raw strings not in the universe, infer class from shape so that
  // e.g. a manually-typed "EURUSD" without a universe entry stays as-is
  // (forex detection relies on =X suffix already present or a universe hit).
  return t;
}

const INTERVALS: Interval[] = ['1m', '5m', '15m', '60m', '1d'];

// Lookback windows tuned to Yahoo's per-barInterval limits (1m → 7d, 5m → 60d,
// 1d → unlimited). Crypto from Binance has no equivalent ceiling but we keep
// the same windows for UX consistency.
function lookbackSeconds(barInterval: Interval): number {
  switch (barInterval) {
    case '1m': return 7 * 24 * 60 * 60;       // 7 days
    case '5m': return 30 * 24 * 60 * 60;      // 30 days
    case '15m': return 60 * 24 * 60 * 60;     // 60 days
    case '60m':
    case '1h':
    case '4h': return 180 * 24 * 60 * 60;     // 180 days
    case '1d':
    case '1wk':
    case '1mo': return 5 * 365 * 24 * 60 * 60; // 5 years
    default: return 30 * 24 * 60 * 60;
  }
}

// ─── Markers ───────────────────────────────────────────────────
function positionToMarkers(p: PaperPosition): ChartMarker[] {
  const entryMarker: ChartMarker = {
    time: p.entryTime as UTCTimestamp,
    position: p.side === 'LONG' ? 'belowBar' : 'aboveBar',
    shape: p.side === 'LONG' ? 'arrowUp' : 'arrowDown',
    color: p.side === 'LONG' ? '#22c55e' : '#dc2626',
    text: `${p.side} ${p.entryPrice.toFixed(2)}`,
  };
  if (p.exitTime != null && p.exitPrice != null) {
    const exitMarker: ChartMarker = {
      time: p.exitTime as UTCTimestamp,
      position: 'aboveBar',
      shape: 'circle',
      color: (p.pnl ?? 0) >= 0 ? '#22c55e' : '#dc2626',
      text: `EXIT ${p.exitPrice.toFixed(2)}`,
    };
    return [entryMarker, exitMarker];
  }
  return [entryMarker];
}


// ─── SymbolAutocomplete — type-ahead ticker picker (replaces native <select>) ─
// Trader types a ticker (e.g. "E" → suggests ES, ES=F-backed); arrow keys +
// Enter select; Enter on no-match commits a custom symbol. Matches the toolbar
// styling (gold #C9A646 accent on dark zinc) like ActiveStrategyDropdown.
function SymbolAutocomplete({ symbol, assetClass, onSelect }: { symbol: string; assetClass?: AssetClass; onSelect: (symbol: string) => void; }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const universe = ALL_SYMBOLS;

  // Best-effort reverse lookup: show the human ticker for the active symbol;
  // fall back to the raw source symbol if it isn't in the universe.
  const currentTicker = useMemo(() => {
    const hit = universe.find((u) => u.symbol === symbol);
    return hit?.ticker ?? symbol;
  }, [universe, symbol]);

  const matches = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return universe.slice(0, 8);
    return universe
      .filter((u) => u.ticker.toUpperCase().includes(q) || u.label.toUpperCase().includes(q))
      .slice(0, 8);
  }, [universe, query]);

  // Reset the keyboard highlight whenever the visible match list changes.
  useEffect(() => { setHighlight(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const commit = (entry: SymbolEntry) => {
    onSelect(entry.symbol);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const commitRaw = () => {
    const next = assetClass
      ? normalizeRawSymbol(normalizeSymbolAuto(query), assetClass)
      : normalizeSymbolAuto(query);
    if (!next) return;
    onSelect(next);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : currentTicker}
        placeholder="Search ticker…"
        spellCheck={false}
        autoComplete="off"
        onFocus={() => { setQuery(''); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (matches[highlight]) commit(matches[highlight]);
            else commitRaw();
          } else if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        className="w-32 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm font-medium uppercase text-zinc-200 placeholder:normal-case placeholder:text-zinc-600 focus:border-[#C9A646] focus:outline-none"
      />
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-64 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 shadow-2xl">
          {matches.length === 0 ? (
            <button
              type="button"
              // onMouseDown (not onClick) fires before the input blur that would
              // otherwise close the dropdown and drop the click.
              onMouseDown={(e) => { e.preventDefault(); commitRaw(); }}
              className="block w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-900"
            >
              Use <span className="font-mono font-semibold text-[#C9A646]">{normalizeSymbolAuto(query) || '—'}</span> as a custom symbol
            </button>
          ) : (
            matches.map((m, i) => (
              <button
                key={m.symbol}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); commit(m); }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left transition-colors ${
                  i === highlight ? 'bg-[#C9A646]/10' : 'hover:bg-zinc-900'
                }`}
              >
                <span className={`font-mono text-sm font-semibold ${m.symbol === symbol ? 'text-[#C9A646]' : 'text-zinc-200'}`}>
                  {m.ticker}
                </span>
                <span className="rounded bg-zinc-800 px-1 text-[9px] uppercase tracking-wider text-zinc-500">{m.assetClass}</span>
                <span className="truncate text-[11px] text-zinc-500">{m.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────
export interface BacktestChartProps {
  initialSymbol?: string;
  initialInterval?: Interval;
  startingBalance?: number;
  theme?: 'dark' | 'light';
}

export function BacktestChart({
  initialSymbol = 'MNQ=F',
  initialInterval = '5m',
  startingBalance = 10000,
  theme = 'dark',
}: BacktestChartProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  // Asset class is derived from the symbol — no separate user control.
  const assetClass = useMemo<AssetClass>(() => detectAssetClass(symbol), [symbol]);
  // Avoid shadowing the global setInterval — use barInterval / setBarInterval.
  const [barInterval, setBarInterval] = useState<Interval>(initialInterval);
  const [size, setSize] = useState(1);
  const [slInput, setSlInput] = useState('');
  const [tpInput, setTpInput] = useState('');
  // Current price tracked from the chart by listening to the last fetched bar
  // — but FinotaurChart doesn't expose hover/last-bar yet. For Phase 1 we use
  // a manual "current price" input that the user types or accepts the default.
  // The chart visualizes; the trader picks the entry price.
  const [livePrice, setLivePrice] = useState('');

  const session = useBacktestSession(startingBalance);
  const {
    state,
    openPosition,
    closePosition,
    updateStopLoss,
    updateTakeProfit,
    reset,
    loadTrades,
    loadSession,
    addPendingOrder,
    cancelPendingOrder,
    fillPendingOrder,
  } = session;

  // Phase 2: Supabase persistence for "Save Session" button.
  const persistence = useBacktestPersistence();
  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Phase 3: rule-based strategy executor.
  const strategyLib = useStrategyLibrary();
  type RunStatus = 'idle' | 'running' | 'done' | 'error';
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [runError, setRunError] = useState<string | null>(null);
  const [runSummary, setRunSummary] = useState<string | null>(null);
  const [strategyPickerOpen, setStrategyPickerOpen] = useState(false);

  const navigate = useNavigate();


  // Phase 5: Chart link goes straight to fullscreen immersive — covers
  // app topnav + journal sub-nav. Exit button returns user to backtest
  // overview (= the dashboard listing). Toggle exists for power users who
  // want a windowed view (rare).
  const [isFullScreen, setIsFullScreen] = useState(true);

  // Phase 5: inline error message replaces the blocking alert() calls.
  // Native alert() freezes the renderer in browser-automation contexts
  // and is poor UX. This shows below the trade buttons for ~3s.
  const [tradeError, setTradeError] = useState<string | null>(null);
  const flashTradeError = useCallback((msg: string) => {
    setTradeError(msg);
    setTimeout(() => setTradeError(null), 3000);
  }, []);

  // Floating stats popup collapse state — starts open.
  const [statsPanelOpen, setStatsPanelOpen] = useState(true);

  // Phase 6: right-click context menu for pending order types. Position
  // captured from the chart click; menu closes on outside click or after
  // a selection is made.
  const [contextMenu, setContextMenu] = useState<ContextMenuPriceInfo | null>(null);

  // Phase 4: replay start moment. Defaults to "now − 4 hours" so the trader
  // immediately sees recent history with room to PLAY forward.
  const [replayStart, setReplayStart] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getTime() - 4 * 60 * 60 * 1000);
  });

  // Phase 4: active strategy tag. Every trade opened while this is set will
  // be attributed to the strategy in stats breakdown + saved session record.
  const [activeStrategyId] = useState<string | null>(null);
  const activeStrategy = useMemo(
    () => strategyLib.strategies.find((s) => s.id === activeStrategyId) ?? null,
    [strategyLib.strategies, activeStrategyId],
  );

  const dataSource = useMemo(() => pickDataSource(symbol), [symbol]);

  // Bar window for the Run Strategy fetch (data-driven, mode-independent).
  const { from, to } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return { from: now - lookbackSeconds(barInterval), to: now };
  }, [barInterval]);

  const markers = useMemo(() => {
    const all: ChartMarker[] = [];
    for (const p of state.closedPositions) all.push(...positionToMarkers(p));
    if (state.activePosition) all.push(...positionToMarkers(state.activePosition));
    return all.sort((a, b) => (a.time as number) - (b.time as number));
  }, [state.activePosition, state.closedPositions]);

  // Holds the most-recent cursor bar reported by BacktestReplayChart — used to
  // fill MARKET orders at the correct close price without requiring manual input.
  const currentBarRef = useRef<Bar | null>(null);

  // Phase 7: load a saved session from the URL ?sessionId= param.
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const hydratedRef = useRef<string | null>(null);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionIdParam) return;
    if (hydratedRef.current === sessionIdParam) return; // prevent double-hydrate
    hydratedRef.current = sessionIdParam;
    let cancelled = false;
    (async () => {
      try {
        const detail = await persistence.loadSession(sessionIdParam);
        if (cancelled) return;
        // 1. Restore chart context (asset/symbol/interval).
        setSymbol(detail.session.symbol);
        setBarInterval(detail.session.interval as Interval);
        // 2. Map DB rows (snake_case) → in-memory shapes (camelCase).
        const closedPositions: PaperPosition[] = detail.trades.map((t) => ({
          id: t.id,
          side: t.side,
          entryTime: Math.floor(new Date(t.entry_time).getTime() / 1000),
          entryPrice: t.entry_price,
          size: t.size,
          stopLoss: t.stop_loss ?? undefined,
          takeProfit: t.take_profit ?? undefined,
          exitTime: t.exit_time != null ? Math.floor(new Date(t.exit_time).getTime() / 1000) : undefined,
          exitPrice: t.exit_price ?? undefined,
          pnl: t.pnl ?? undefined,
          pnlPercent: t.pnl_percent ?? undefined,
          exitReason: t.exit_reason ?? undefined,
          strategyId: t.strategy_id ?? null,
        }));
        // D8 (Sprint D, 2026-05-30): anchor the replay window to the first
        // trade rather than the session's start_date — otherwise the markers
        // can land outside the initially-loaded bar window and look missing.
        // Falls back to the session start_date when there are no trades.
        const firstTradeTime = closedPositions.reduce<number | null>(
          (min, p) => (min === null || p.entryTime < min ? p.entryTime : min),
          null,
        );
        setReplayStart(
          firstTradeTime !== null
            ? new Date(firstTradeTime * 1000)
            : new Date(detail.session.start_date),
        );
        const pendingOrders: PendingOrder[] = (detail.session.pending_orders ?? []).map((o) => ({
          id: o.id,
          side: o.side,
          type: o.type,
          triggerPrice: o.trigger_price,
          size: o.size,
          stopLoss: o.stop_loss ?? undefined,
          takeProfit: o.take_profit ?? undefined,
          strategyId: o.strategy_id ?? null,
          createdAt: o.created_at,
        }));
        // 3. Hydrate the session reducer.
        loadSession({
          startingBalance: detail.session.initial_balance,
          closedPositions,
          pendingOrders,
        });
        setHydrateError(null);
      } catch (err) {
        if (!cancelled) setHydrateError(err instanceof Error ? err.message : 'Failed to load saved session');
      }
    })();
    return () => { cancelled = true; };
  }, [sessionIdParam, persistence, loadSession]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleOpen = (side: PaperSide) => {
    const cur = currentBarRef.current;
    const manual = parseFloat(livePrice);
    const price = (!isNaN(manual) && manual > 0) ? manual : cur?.close;
    if (price == null || !(price > 0)) {
      flashTradeError('No price yet — let the replay chart load a bar first.');
      return;
    }
    openPosition({
      side,
      price,
      time: (cur?.time as number) ?? Math.floor(Date.now() / 1000),
      size,
      stopLoss: slInput ? parseFloat(slInput) : undefined,
      takeProfit: tpInput ? parseFloat(tpInput) : undefined,
      strategyId: activeStrategyId,
    });
    setSlInput('');
    setTpInput('');
  };

  // ─── Phase 4 handlers ──────────────────────────────────────
  // Replay: open a position at the clicked bar's close. SL/TP come from the
  // side-panel inputs, size from the size input. Strategy tag from active.
  const handleReplayBarClick = useCallback((bar: Bar) => {
    if (state.activePosition) {
      // Single-position-at-a-time invariant — don't auto-stack. UI just
      // ignores the click; trader closes or waits for SL/TP first.
      return;
    }
    // Default to LONG on bar click. Future tweak: shift+click for SHORT.
    openPosition({
      side: 'LONG',
      price: bar.close,
      time: bar.time as number,
      size,
      stopLoss: slInput ? parseFloat(slInput) : undefined,
      takeProfit: tpInput ? parseFloat(tpInput) : undefined,
      strategyId: activeStrategyId,
    });
    setLivePrice(bar.close.toString());
  }, [state.activePosition, openPosition, size, slInput, tpInput, activeStrategyId]);

  // Replay: each bar revealed by the playback cursor.
  //   Phase 4: check SL/TP for any active position; auto-close on hit.
  //   Phase 6: check pending order triggers (LIMIT/STOP); auto-fill on hit
  //            ONLY when no position is open (single-position invariant).
  // Same-bar-as-entry skip mirrors runStrategy.ts to avoid phantom stopouts
  // on the entry bar.
  const handleReplayBarReveal = useCallback((bar: Bar) => {
    // Phase 6: pending order fills come FIRST. If a fill happens, the new
    // position is the entry bar — same-bar skip prevents same-bar SL/TP.
    if (!state.activePosition && state.pendingOrders.length > 0) {
      for (const order of state.pendingOrders) {
        let triggered = false;
        let fillPrice = order.triggerPrice;
        if (order.type === 'LIMIT') {
          if (order.side === 'LONG' && bar.low <= order.triggerPrice) {
            triggered = true; fillPrice = order.triggerPrice;
          } else if (order.side === 'SHORT' && bar.high >= order.triggerPrice) {
            triggered = true; fillPrice = order.triggerPrice;
          }
        } else { // STOP
          if (order.side === 'LONG' && bar.high >= order.triggerPrice) {
            triggered = true; fillPrice = order.triggerPrice;
          } else if (order.side === 'SHORT' && bar.low <= order.triggerPrice) {
            triggered = true; fillPrice = order.triggerPrice;
          }
        }
        if (triggered) {
          fillPendingOrder(order.id, fillPrice, bar.time as number);
          return; // single-position invariant — skip SL/TP this bar
        }
      }
    }

    const pos = state.activePosition;
    if (!pos) return;
    if ((pos.entryTime as number) === (bar.time as number)) return; // same-bar skip

    if (pos.side === 'LONG') {
      if (pos.stopLoss != null && bar.low <= pos.stopLoss) {
        closePosition({ price: pos.stopLoss, time: bar.time as number, reason: 'sl' });
        return;
      }
      if (pos.takeProfit != null && bar.high >= pos.takeProfit) {
        closePosition({ price: pos.takeProfit, time: bar.time as number, reason: 'tp' });
        return;
      }
    } else {
      if (pos.stopLoss != null && bar.high >= pos.stopLoss) {
        closePosition({ price: pos.stopLoss, time: bar.time as number, reason: 'sl' });
        return;
      }
      if (pos.takeProfit != null && bar.low <= pos.takeProfit) {
        closePosition({ price: pos.takeProfit, time: bar.time as number, reason: 'tp' });
        return;
      }
    }
  }, [state.activePosition, state.pendingOrders, closePosition, fillPendingOrder]);

  // Phase 6: place a pending order from the context-menu selection. SL/TP
  // come from the side-panel inputs (same as MARKET orders). Size from the
  // size input. Strategy tag from active.
  const handlePlacePendingOrder = useCallback((side: PaperSide, type: PendingOrderType, info: ContextMenuPriceInfo) => {
    addPendingOrder({
      side,
      type,
      triggerPrice: info.price,
      size,
      stopLoss: slInput ? parseFloat(slInput) : undefined,
      takeProfit: tpInput ? parseFloat(tpInput) : undefined,
      strategyId: activeStrategyId,
      time: Math.floor(Date.now() / 1000),
    });
    setContextMenu(null);
  }, [addPendingOrder, size, slInput, tpInput, activeStrategyId]);

  // Stats breakdown by strategy — only show panel when ≥1 trade has been
  // tagged with a (non-manual) strategy id, so live-only sessions stay clean.
  const statsByStrategy = useMemo(
    () => computeStatsByStrategy(state.closedPositions, state.startingBalance),
    [state.closedPositions, state.startingBalance],
  );
  const strategyBreakdown = useMemo(() => {
    const rows: Array<{ key: string; label: string; trades: number; winRate: number; netPnl: number }> = [];
    for (const [key, stats] of statsByStrategy) {
      const label = key === 'manual'
        ? 'Manual'
        : strategyLib.strategies.find((s) => s.id === key)?.name ?? 'Unknown';
      rows.push({ key, label, trades: stats.totalTrades, winRate: stats.winRate, netPnl: stats.netPnl });
    }
    // Largest contributor first.
    rows.sort((a, b) => Math.abs(b.netPnl) - Math.abs(a.netPnl));
    return rows;
  }, [statsByStrategy, strategyLib.strategies]);

  // True when no trades have been made yet — used to allow editing starting balance.
  const sessionEmpty = state.closedPositions.length === 0 && !state.activePosition;

  const handleClose = (reason: 'manual' | 'sl' | 'tp' = 'manual') => {
    const price = parseFloat(livePrice);
    if (!price || isNaN(price) || price <= 0) {
      flashTradeError('Enter the exit price before closing the position.');
      return;
    }
    closePosition({ price, time: Math.floor(Date.now() / 1000), reason });
  };

  const handleSaveSession = async () => {
    if (state.closedPositions.length === 0 && !state.activePosition) {
      setSaveError('Nothing to save — open or close a trade first.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2500);
      return;
    }
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const finalBalance = state.startingBalance + state.stats.netPnl;
      await persistence.saveSession({
        symbol,
        interval: barInterval,
        asset_class: assetClass,
        startDate: new Date(from * 1000),
        endDate: new Date(to * 1000),
        initialBalance: state.startingBalance,
        finalBalance,
        statistics: state.stats,
        trades: state.closedPositions,
        pendingOrders: state.pendingOrders,
        // Auto-name: "<symbol> · <interval> · <date>"
        name: `${symbol} · ${barInterval} · ${new Date().toLocaleDateString()}`,
        // Session-level strategy link — last active strategy at save time.
        // Per-trade strategy_id is already persisted via trades[].strategy_id.
        // Enables FINOTAUR AI Phase F compare_live_vs_backtest. 2026-05-29.
        strategyId: activeStrategyId,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save session');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const handleRunStrategy = async (strategyId: string) => {
    const strategy = strategyLib.strategies.find((s) => s.id === strategyId);
    if (!strategy) {
      setRunError('Strategy not found');
      setRunStatus('error');
      return;
    }
    setStrategyPickerOpen(false);
    setRunStatus('running');
    setRunError(null);
    setRunSummary(null);
    try {
      // Fetch the same bar window the chart is currently showing.
      const bars = await dataSource.getBars(symbol, barInterval, from as never, to as never);
      if (!bars || bars.length < 2) {
        throw new Error('Not enough bars in window to run strategy');
      }
      const result = runStrategy(strategy, bars);
      loadTrades(result.trades);
      setRunSummary(
        `Ran "${strategy.name}" → ${result.trades.length} trade${result.trades.length === 1 ? '' : 's'} on ${result.barsScanned} bars` +
        (result.unusedRuleIds.length > 0 ? ` (${result.unusedRuleIds.length} rule${result.unusedRuleIds.length === 1 ? '' : 's'} never fired)` : ''),
      );
      setRunStatus('done');
      setTimeout(() => { setRunStatus('idle'); setRunSummary(null); }, 8000);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Strategy run failed');
      setRunStatus('error');
      setTimeout(() => setRunStatus('idle'), 4000);
    }
  };

  const activePos = state.activePosition;
  const unrealizedPnl = useMemo(() => {
    if (!activePos) return null;
    const exit = parseFloat(livePrice);
    if (!exit || isNaN(exit)) return null;
    const direction = activePos.side === 'LONG' ? 1 : -1;
    return (exit - activePos.entryPrice) * direction * activePos.size;
  }, [activePos, livePrice]);

  // ─── Render ──────────────────────────────────────────────────
  // Phase 5: fullscreen-by-default. position:fixed inset-0 covers the
  // app-level topnav + journal sub-nav. Exit button returns to overview.
  const containerCls = isFullScreen
    ? 'fixed inset-0 z-[100] flex flex-col bg-[#08080a] text-zinc-100'
    : 'flex h-full w-full flex-col bg-[#08080a] text-zinc-100';

  return (
    <div className={containerCls}>
      {/* Session hydration error — shown when ?sessionId= fetch fails */}
      {hydrateError && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-md border border-rose-800 bg-rose-950/60 px-3 py-2 text-xs text-rose-300">
          <span><AlertCircle size={12} className="mr-1.5 inline" />Failed to load saved session: {hydrateError}</span>
          <button onClick={() => setHydrateError(null)} className="shrink-0 text-rose-400 hover:text-rose-200"><X size={12} /></button>
        </div>
      )}
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        {/* Exit fullscreen — back to backtest overview (only in fullscreen) */}
        {isFullScreen && (
          <button
            onClick={() => navigate('/app/journal/backtest/overview')}
            title="Exit chart — back to Backtest dashboard"
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-[#C9A646]/40 hover:text-[#C9A646]"
          >
            <ArrowLeft size={12} />
            Exit
          </button>
        )}

        {/* Symbol picker — type-ahead autocomplete across all asset classes
            (Tier 1 2026-05-30). Asset class auto-detected from chosen symbol. */}
        <SymbolAutocomplete
          symbol={symbol}
          assetClass={assetClass}
          onSelect={(next) => { setSymbol(next); setLivePrice(''); }}
        />

        {/* Interval picker */}
        <div className="flex rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => setBarInterval(iv)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                barInterval === iv
                  ? 'bg-[#C9A646] text-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {iv}
            </button>
          ))}
        </div>

        {/* Date picker */}
        <DateTimePicker
          value={replayStart}
          interval={barInterval}
          onChange={setReplayStart}
        />

        {/* Run Strategy — moved left (after DateTimePicker) so balance group stays clean */}
        <div className="relative">
          <button
            onClick={() => setStrategyPickerOpen((v) => !v)}
            disabled={runStatus === 'running'}
            className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              runStatus === 'done'
                ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
                : runStatus === 'error'
                ? 'border-rose-700 bg-rose-950 text-rose-400'
                : runStatus === 'running'
                ? 'border-zinc-700 bg-zinc-900 text-zinc-500 cursor-wait'
                : 'border-emerald-700/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/60'
            }`}
            title={runError ?? runSummary ?? 'Run a saved strategy on this chart'}
          >
            <Play size={12} />
            {runStatus === 'running' ? 'Running…' : runStatus === 'done' ? 'Ran' : runStatus === 'error' ? 'Failed' : 'Run Strategy'}
            <ChevronDown size={12} />
          </button>
          {strategyPickerOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
              {strategyLib.strategies.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-zinc-500">
                  No saved strategies. Build one in the
                  <span className="ml-1 text-[#C9A646]">Builder</span> tab first.
                </div>
              ) : (
                <>
                  <div className="mb-1 px-2 text-[10px] uppercase tracking-wider text-zinc-500">
                    Saved strategies ({strategyLib.strategies.length})
                  </div>
                  {strategyLib.strategies.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleRunStrategy(s.id)}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-900"
                    >
                      {s.name}
                      <span className="ml-2 text-[10px] text-zinc-600">
                        {s.rules.length} rule{s.rules.length !== 1 && 's'}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Balance display */}
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            {sessionEmpty ? (
              <>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Starting</div>
                <input
                  type="number"
                  value={state.startingBalance}
                  min="1"
                  step="any"
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n > 0) reset(n);
                  }}
                  className="mt-1 w-28 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 focus:border-[#C9A646] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Starting</div>
                <div
                  className="text-sm font-semibold text-zinc-200"
                  title="Reset the session to edit the starting balance"
                >
                  ${state.startingBalance.toLocaleString()}
                </div>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Net P&L</div>
            <div className={`text-sm font-semibold ${state.stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {state.stats.netPnl >= 0 ? '+' : ''}${state.stats.netPnl.toFixed(2)}
            </div>
          </div>
          <button
            onClick={handleSaveSession}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              saveStatus === 'saved'
                ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
                : saveStatus === 'error'
                ? 'border-rose-700 bg-rose-950 text-rose-400'
                : saveStatus === 'saving'
                ? 'border-zinc-700 bg-zinc-900 text-zinc-500 cursor-wait'
                : 'border-[#C9A646]/40 bg-[#C9A646]/5 text-[#C9A646] hover:bg-[#C9A646]/10'
            }`}
            title={saveError ?? 'Save this session to your journal'}
          >
            {saveStatus === 'saved' ? (
              <><Check size={12} />Saved</>
            ) : saveStatus === 'error' ? (
              <><AlertCircle size={12} />Error</>
            ) : (
              <><Save size={12} />{saveStatus === 'saving' ? 'Saving…' : 'Save'}</>
            )}
          </button>
          <button
            onClick={() => reset()}
            className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-rose-700 hover:text-rose-400"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Main: full-width chart with floating stats popup + bottom trading bar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="relative flex-1 min-w-0 bg-[#08080a]">
          <BacktestReplayChart
            symbol={symbol}
            interval={barInterval}
            dataSource={dataSource}
            replayStartTime={Math.floor(replayStart.getTime() / 1000)}
            activePosition={state.activePosition}
            closedPositions={state.closedPositions}
            pendingOrders={state.pendingOrders}
            onBarReveal={handleReplayBarReveal}
            onBarClick={handleReplayBarClick}
            onCurrentBarChange={(b) => { currentBarRef.current = b; }}
            onContextMenu={(info) => setContextMenu(info)}
            onJumpToTime={(date) => setReplayStart(date)}
            showReplayCursor
            height="100%"
          />
          {/* Floating Session Stats popup — top-right */}
          <div className="absolute right-3 top-3 z-20 w-72 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-sm">
            <button type="button" onClick={() => setStatsPanelOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#C9A646] hover:bg-zinc-900/60">
              <span>Session Stats</span>
              <ChevronDown size={14} className={`transition-transform ${statsPanelOpen ? '' : '-rotate-90'}`} />
            </button>
            {statsPanelOpen && (
              <div className="max-h-[70vh] overflow-y-auto border-t border-zinc-800">
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <StatRow label="Trades" value={state.stats.totalTrades.toString()} />
                    <StatRow
                      label="Win rate"
                      value={`${state.stats.winRate.toFixed(1)}%`}
                      tone={state.stats.winRate >= 50 ? 'positive' : 'neutral'}
                    />
                    <StatRow label="Winners" value={state.stats.winners.toString()} tone="positive" />
                    <StatRow label="Losers" value={state.stats.losers.toString()} tone="negative" />
                    <StatRow
                      label="Profit factor"
                      value={state.stats.profitFactor === Infinity ? '∞' : state.stats.profitFactor.toFixed(2)}
                      tone="brand"
                    />
                    <StatRow
                      label="Avg R:R"
                      value={state.stats.avgRR > 0 ? `1:${state.stats.avgRR.toFixed(2)}` : '—'}
                      tone="brand"
                    />
                    <StatRow
                      label="Avg win"
                      value={`$${state.stats.avgWin.toFixed(2)}`}
                      tone="positive"
                    />
                    <StatRow
                      label="Avg loss"
                      value={`$${state.stats.avgLoss.toFixed(2)}`}
                      tone="negative"
                    />
                    <StatRow
                      label="Largest win"
                      value={`$${state.stats.largestWin.toFixed(2)}`}
                      tone="positive"
                    />
                    <StatRow
                      label="Largest loss"
                      value={`$${state.stats.largestLoss.toFixed(2)}`}
                      tone="negative"
                    />
                    <StatRow label="Win streak" value={state.stats.longestWinStreak.toString()} />
                    <StatRow label="Loss streak" value={state.stats.longestLossStreak.toString()} />
                  </div>
                </div>
                {strategyBreakdown.length > 0 && (
                  <div className="border-t border-zinc-800 p-3">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#C9A646]">By Strategy</h3>
                    <div className="space-y-1.5 text-xs">
                      {strategyBreakdown.map((row) => (
                        <div
                          key={row.key}
                          className="flex items-center justify-between rounded-md border border-zinc-900 bg-zinc-900/40 px-2 py-1.5"
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium text-zinc-300">{row.label}</span>
                            <span className="text-[10px] text-zinc-600">
                              {row.trades} trade{row.trades !== 1 && 's'} · {row.winRate.toFixed(0)}% win
                            </span>
                          </div>
                          <span className={`font-bold tabular-nums ${row.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.netPnl >= 0 ? '+' : ''}${row.netPnl.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t border-zinc-800 p-3">
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#C9A646]">Trade History</h3>
                  {/* History panel removed per Elad — closed trades land in My Trades */}
                  <div className="flex-1" />
                </div>
              </div>
            )}
          </div>
          {/* Floating trading bar — bottom-center, overlaid on the chart */}
          <div className="absolute bottom-8 left-1/2 z-20 max-w-[95%] -translate-x-1/2">
            <div className="relative rounded-[14px] border border-[#C9A646]/30 bg-gradient-to-b from-[#15151c]/95 to-[#0a0a0c]/95 px-6 py-3.5 shadow-[0_8px_40px_-8px_rgba(201,166,70,0.22)] ring-1 ring-inset ring-white/5 backdrop-blur-md">
              {/* top-edge gold light bar (flagship accent) */}
              <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px w-2/3 bg-gradient-to-r from-transparent via-[#C9A646]/80 to-transparent" />
              {/* corner brackets — premium terminal frame */}
              <span className="pointer-events-none absolute left-2 top-2 h-2.5 w-2.5 border-l border-t border-[#C9A646]/60" />
              <span className="pointer-events-none absolute right-2 top-2 h-2.5 w-2.5 border-r border-t border-[#C9A646]/60" />
              <span className="pointer-events-none absolute bottom-2 left-2 h-2.5 w-2.5 border-b border-l border-[#C9A646]/60" />
              <span className="pointer-events-none absolute bottom-2 right-2 h-2.5 w-2.5 border-b border-r border-[#C9A646]/60" />
              <div className="flex flex-wrap items-end justify-center gap-4">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Current price</span>
                    <div className="flex items-center rounded-md border border-white/10 bg-black/50 px-2.5 transition-colors focus-within:border-[#C9A646]/70">
                      <span className="mr-1 text-sm text-zinc-500">$</span>
                      <input type="number" value={livePrice} onChange={(e) => setLivePrice(e.target.value)} placeholder="market" step="any"
                        className="w-24 bg-transparent py-1.5 font-mono text-sm tabular-nums text-zinc-100 placeholder:font-sans placeholder:text-zinc-600 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Size</span>
                    <input type="number" value={size} onChange={(e) => setSize(Math.max(0.01, Number(e.target.value)))} min="0.01" step="any"
                      className="w-16 rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 text-center font-mono text-sm tabular-nums text-zinc-100 transition-colors focus:border-[#C9A646]/70 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-rose-400/80">Stop loss</span>
                    <input type="number" value={slInput} onChange={(e) => setSlInput(e.target.value)} placeholder="optional" step="any"
                      className="w-24 rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono text-sm tabular-nums text-zinc-100 placeholder:font-sans placeholder:text-zinc-600 transition-colors focus:border-rose-500/60 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/80">Take profit</span>
                    <input type="number" value={tpInput} onChange={(e) => setTpInput(e.target.value)} placeholder="optional" step="any"
                      className="w-24 rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono text-sm tabular-nums text-zinc-100 placeholder:font-sans placeholder:text-zinc-600 transition-colors focus:border-emerald-500/60 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </label>
                </div>
                <div className="hidden h-10 w-px self-center bg-white/10 sm:block" />
                {state.activePosition && (
                  <span className={`flex items-center gap-2 self-center rounded-md border bg-black/40 px-3 py-2 ${state.activePosition.side === 'LONG' ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                    <span className={`h-2 w-2 rounded-full ${state.activePosition.side === 'LONG' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className={`text-sm font-bold ${state.activePosition.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{state.activePosition.side}</span>
                    <span className="font-mono text-xs tabular-nums text-zinc-400">{state.activePosition.size}× @ ${state.activePosition.entryPrice.toFixed(2)}</span>
                  </span>
                )}
                <div className="flex items-stretch gap-2">
                  <button onClick={() => handleOpen('LONG')} className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 px-4 py-2 transition-all hover:border-emerald-400/60 hover:from-emerald-500/25"><TrendingUp size={15} className="text-emerald-400" /><span className="text-sm font-bold text-emerald-400">BUY</span><span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/90">Market</span></button>
                  <button onClick={() => handleOpen('SHORT')} className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-gradient-to-b from-rose-500/15 to-rose-500/5 px-4 py-2 transition-all hover:border-rose-400/60 hover:from-rose-500/25"><TrendingDown size={15} className="text-rose-400" /><span className="text-sm font-bold text-rose-400">SELL</span><span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600/90">Market</span></button>
                  <button onClick={() => handleClose('manual')} disabled={!state.activePosition} className={`flex items-center gap-2 rounded-md border px-4 py-2 transition-all ${state.activePosition ? 'border-zinc-700 bg-black hover:border-zinc-600 hover:bg-zinc-900' : 'cursor-not-allowed border-white/10 bg-black/40'}`}><X size={15} strokeWidth={2.5} className={state.activePosition ? 'text-zinc-100' : 'text-zinc-600'} /><span className={`text-sm font-bold ${state.activePosition ? 'text-zinc-100' : 'text-zinc-600'}`}>CLOSE</span><span className={`text-[10px] font-semibold uppercase tracking-wider ${state.activePosition ? 'text-zinc-500' : 'text-zinc-700'}`}>{state.activePosition ? `$${livePrice || '—'}` : 'Flat'}</span></button>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-center gap-1.5 border-t border-white/5 pt-2 text-[11px] text-zinc-500">
                <span>💡</span><span>Right-click the chart for <span className="text-zinc-400">LIMIT</span> / <span className="text-zinc-400">STOP</span> orders</span>
              </div>
              {tradeError && <p className="mt-1.5 text-center text-xs text-rose-400">{tradeError}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Phase 6: right-click context menu for pending order types.
          Position is fixed to the screen coords from the click. Two options
          are valid depending on price vs current: above current → BUY STOP
          + SELL LIMIT; below current → BUY LIMIT + SELL STOP. */}
      {contextMenu && (
        <>
          {/* Backdrop catches outside clicks to close the menu */}
          <div
            className="fixed inset-0 z-[110]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="fixed z-[120] min-w-[200px] rounded-md border border-zinc-700 bg-zinc-950 p-1 shadow-2xl"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 220),
              top: Math.min(contextMenu.y, window.innerHeight - 160),
            }}
          >
            <div className="mb-1 border-b border-zinc-800 px-2 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              Place order @ <span className="font-mono text-[#C9A646]">${contextMenu.price.toFixed(2)}</span>
            </div>
            {contextMenu.price > contextMenu.currentPrice ? (
              <>
                <button
                  onClick={() => handlePlacePendingOrder('LONG', 'STOP', contextMenu)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-emerald-400 hover:bg-emerald-950/60"
                >
                  <span className="font-bold">BUY STOP</span>
                  <span className="ml-2 text-[10px] text-zinc-500">(breakout buy)</span>
                </button>
                <button
                  onClick={() => handlePlacePendingOrder('SHORT', 'LIMIT', contextMenu)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-rose-400 hover:bg-rose-950/60"
                >
                  <span className="font-bold">SELL LIMIT</span>
                  <span className="ml-2 text-[10px] text-zinc-500">(sell into rally)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handlePlacePendingOrder('LONG', 'LIMIT', contextMenu)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-emerald-400 hover:bg-emerald-950/60"
                >
                  <span className="font-bold">BUY LIMIT</span>
                  <span className="ml-2 text-[10px] text-zinc-500">(buy the dip)</span>
                </button>
                <button
                  onClick={() => handlePlacePendingOrder('SHORT', 'STOP', contextMenu)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-rose-400 hover:bg-rose-950/60"
                >
                  <span className="font-bold">SELL STOP</span>
                  <span className="ml-2 text-[10px] text-zinc-500">(breakdown short)</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Local helpers ───────────────────────────────────────────────
interface StatRowProps {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'brand' | 'neutral';
}

function StatRow({ label, value, tone = 'neutral' }: StatRowProps) {
  const toneClass =
    tone === 'positive' ? 'text-emerald-400'
    : tone === 'negative' ? 'text-rose-400'
    : tone === 'brand' ? 'text-[#C9A646]'
    : 'text-zinc-200';
  return (
    <div className="flex justify-between border-b border-zinc-900 pb-1">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

export default BacktestChart;
