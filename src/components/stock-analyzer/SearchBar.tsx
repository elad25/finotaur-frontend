// src/components/stock-analyzer/SearchBar.tsx
// =====================================================
// 🔍 STOCK ANALYZER — Search Bar v2.0
// =====================================================
// v2.0 CHANGES:
//   ✅ LOCAL SEARCH — No API calls, instant results
//   ✅ SPY + QQQ + IWM universe (~1500 stocks)
//   ✅ ETF/Index BLOCKING — Cannot search SPY, QQQ, XLF, etc.
//   ✅ Index badges — Shows which indices the stock belongs to
//   ✅ Sector filtering — Can type sector name to filter
//   ❌ No ETFs, no sectors, no indices allowed
// =====================================================

import { memo, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ChevronRight, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardStyle } from '@/constants/stock-analyzer.constants';
import {
  searchUniverse,
  isBlockedTicker,
  getIndexLabel,
  type UniverseStock,
} from '@/constants/stock-universe';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (ticker: string) => void;
  isLoading: boolean;
}

// Index badge colors
const INDEX_COLORS: Record<string, { bg: string; text: string }> = {
  'S&P 500':      { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA' },
  'NASDAQ-100':   { bg: 'rgba(168,85,247,0.15)', text: '#C084FC' },
  'Russell 2000': { bg: 'rgba(34,197,94,0.15)',   text: '#4ADE80' },
};

export const SearchBar = memo(({ value, onChange, onSelect, isLoading }: SearchBarProps) => {
  const [isFocused, setIsFocused] = useState(false);

  // Local search — instant, no API calls
  const results = useMemo(() => {
    if (!value.trim() || value.trim().length < 1) return [];
    return searchUniverse(value, 10);
  }, [value]);

  // Check if user is trying to search for a blocked ticker
  const isBlocked = useMemo(() => {
    return value.trim().length >= 2 && isBlockedTicker(value.trim());
  }, [value]);

  const handleSelect = useCallback((ticker: string) => {
    onSelect(ticker);
    // Don't clear — let the parent handle it
  }, [onSelect]);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Glow effect */}
      <div
        className={cn(
          'absolute -inset-1 rounded-2xl transition-opacity duration-500',
          isFocused ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          background:
            'linear-gradient(135deg, rgba(201,166,70,0.3), rgba(244,217,123,0.1), rgba(201,166,70,0.3))',
          filter: 'blur(20px)',
        }}
      />

      {/* Input */}
      <div
        className={cn(
          'relative flex items-center rounded-xl transition-all duration-300',
          isFocused
            ? 'bg-[#151210] border-2 border-[#C9A646]/50'
            : 'bg-[#0d0b08] border border-[#C9A646]/20 hover:border-[#C9A646]/40'
        )}
      >
        <Search
          className={cn(
            'absolute left-5 h-5 w-5 transition-colors',
            isFocused ? 'text-[#C9A646]' : 'text-[#8B8B8B]'
          )}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search by ticker or company name..."
          className="w-full bg-transparent py-5 pl-14 pr-5 text-white placeholder-[#6B6B6B] focus:outline-none text-lg"
        />
        {isLoading && (
          <Loader2 className="absolute right-5 h-5 w-5 text-[#C9A646] animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isFocused && (results.length > 0 || isBlocked) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-3 rounded-xl overflow-hidden z-50"
            style={{ ...cardStyle(), boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}
          >
            {/* Blocked ticker message */}
            {isBlocked && (
              <div className="flex items-center gap-3 px-5 py-4 text-[#EF4444]/80">
                <Ban className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {value.trim().toUpperCase()} is an ETF/Index — not available
                  </p>
                  <p className="text-xs text-[#8B8B8B] mt-0.5">
                    Search for individual stocks within SPY, QQQ, or IWM
                  </p>
                </div>
              </div>
            )}

            {/* Results */}
            {results.map((stock, idx) => {
              const indices = getIndexLabel(stock.i);
              return (
                <button
                  key={stock.t}
                  onClick={() => handleSelect(stock.t)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#C9A646]/10 transition-all text-left group"
                  style={{
                    borderBottom:
                      idx < results.length - 1
                        ? '1px solid rgba(201,166,70,0.1)'
                        : 'none',
                  }}
                >
                  {/* Ticker icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                      border: '1px solid rgba(201,166,70,0.2)',
                    }}
                  >
                    <span className="text-[#C9A646] font-bold text-sm">
                      {stock.t.slice(0, 2)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white group-hover:text-[#C9A646] transition-colors">
                        {stock.t}
                      </span>
                      <span className="text-xs text-[#6B6B6B] px-2 py-0.5 rounded bg-white/5">
                        {stock.e}
                      </span>
                      {/* Index badges */}
                      {indices.map((idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            background: INDEX_COLORS[idx]?.bg || 'rgba(255,255,255,0.05)',
                            color: INDEX_COLORS[idx]?.text || '#8B8B8B',
                          }}
                        >
                          {idx}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-[#8B8B8B] truncate">{stock.n}</p>
                  </div>

                  {/* Sector */}
                  <span className="text-xs text-[#C9A646]/70 hidden md:block flex-shrink-0">
                    {stock.s}
                  </span>

                  <ChevronRight className="h-4 w-4 text-[#6B6B6B] group-hover:text-[#C9A646] group-hover:translate-x-1 transition-all flex-shrink-0" />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';