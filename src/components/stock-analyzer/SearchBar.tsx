// src/components/stock-analyzer/SearchBar.tsx
// =====================================================
// STOCK ANALYZER - Search Bar v2.1
// =====================================================

import { memo, useState, useMemo, useCallback, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ChevronRight, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardStyle } from '@/constants/stock-analyzer.constants';
import {
  searchUniverse,
  isBlockedTicker,
  getIndexLabel,
} from '@/constants/stock-universe';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (ticker: string) => void;
  isLoading: boolean;
  variant?: 'default' | 'hero';
  showAnalyzeButton?: boolean;
}

const INDEX_COLORS: Record<string, { bg: string; text: string }> = {
  'S&P 500': { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-secondary)' },
  'NASDAQ-100': { bg: 'rgba(201,166,70,0.10)', text: 'var(--gold-primary)' },
  'Russell 2000': { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.65)' },
};

export const SearchBar = memo(({
  value,
  onChange,
  onSelect,
  isLoading,
  variant = 'default',
  showAnalyzeButton = false,
}: SearchBarProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const trimmedValue = value.trim().toUpperCase();
  const isHero = variant === 'hero';

  const results = useMemo(() => {
    if (!value.trim() || value.trim().length < 1) return [];
    return searchUniverse(value, 10);
  }, [value]);

  const isBlocked = useMemo(() => {
    return value.trim().length >= 2 && isBlockedTicker(value.trim());
  }, [value]);

  const handleSelect = useCallback((ticker: string) => {
    onSelect(ticker);
  }, [onSelect]);

  const handleAnalyze = useCallback(() => {
    if (!trimmedValue || isBlocked || isLoading) return;
    if (results[0]) {
      handleSelect(results[0].t);
      return;
    }
    handleSelect(trimmedValue);
  }, [handleSelect, isBlocked, isLoading, results, trimmedValue]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleAnalyze();
  }, [handleAnalyze]);

  return (
    <div className={cn('relative w-full mx-auto', isHero ? 'max-w-none stock-analyzer-premium-search' : 'max-w-4xl')}>
      <div
        className={cn(
          'absolute -inset-1 rounded-2xl transition-opacity duration-500',
          isFocused ? 'opacity-100' : 'opacity-0',
          isHero && (isFocused ? 'opacity-70' : 'opacity-35'),
        )}
        style={{
          background: isHero
            ? 'radial-gradient(ellipse at 28% 50%, rgba(255,255,255,0.045), transparent 48%), radial-gradient(ellipse at 82% 50%, rgba(201,166,70,0.055), transparent 50%)'
            : 'linear-gradient(135deg, rgba(201,166,70,0.3), rgba(244,217,123,0.1), rgba(201,166,70,0.3))',
          filter: isHero ? 'blur(38px)' : 'blur(20px)',
        }}
      />

      <div
        className={cn(
          'relative flex items-center overflow-hidden rounded-[12px] transition-all duration-300',
          isHero && 'min-h-[68px] shadow-[0_18px_46px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.075)]',
          isFocused
            ? isHero
              ? 'border border-white/[0.14] bg-white/[0.055]'
              : 'border-2 border-gold-primary/50 bg-surface-2'
            : isHero
              ? 'border border-white/[0.075] bg-white/[0.035] hover:border-white/[0.12]'
              : 'border border-gold-border bg-surface-1 hover:border-gold-primary/40',
        )}
        style={isHero ? {
          backdropFilter: 'blur(16px) saturate(130%)',
          WebkitBackdropFilter: 'blur(16px) saturate(130%)',
        } : undefined}
      >
        {isHero && (
          <>
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.052) 0%, transparent 48%), radial-gradient(ellipse at 18% 50%, rgba(255,255,255,0.04) 0%, transparent 44%)',
              }}
            />
          </>
        )}
        <Search
          className={cn(
            'absolute z-10 h-5 w-5 transition-colors',
            isHero ? 'left-6' : 'left-5',
            isFocused ? 'text-gold-primary' : isHero ? 'text-ink-secondary' : 'text-ink-tertiary',
          )}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Search by ticker or company name..."
          className={cn(
            'relative z-10 w-full bg-transparent text-ink-primary placeholder:text-ink-muted focus:outline-none',
            isHero ? 'py-5 pl-[70px] pr-[142px] text-[16px] font-medium md:pr-[158px]' : 'py-5 pl-14 pr-5 text-lg',
          )}
        />
        {isLoading && (
          <Loader2
            className={cn(
              'absolute h-5 w-5 animate-spin text-gold-primary',
              showAnalyzeButton ? 'right-[118px] md:right-[134px]' : 'right-5',
            )}
          />
        )}
        {showAnalyzeButton && (
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!trimmedValue || isBlocked || isLoading}
            className={cn(
              'absolute bottom-2 right-2 top-2 z-10 rounded-[12px] px-ds-5 text-small font-semibold text-ink-on-gold',
              'transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-50',
              'hover:scale-[1.015] active:scale-[0.99] md:px-ds-6',
            )}
            style={{
              background:
                'linear-gradient(135deg, rgba(168,136,56,1) 0%, rgba(232,199,102,1) 48%, rgba(201,166,70,1) 100%)',
              boxShadow:
                  '0 8px 22px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -1px 0 rgba(0,0,0,0.22)',
            }}
          >
            Analyze
          </button>
        )}
      </div>

      {isHero && (
        <style>{`
          .stock-analyzer-premium-search input::selection {
            background: rgba(201,166,70,0.28);
          }
        `}</style>
      )}

      <AnimatePresence>
        {isFocused && (results.length > 0 || isBlocked) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-[12px]"
            style={{ ...cardStyle(), boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}
          >
            {isBlocked && (
              <div className="flex items-center gap-3 px-5 py-4 text-num-negative/80">
                <Ban className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {trimmedValue} is an ETF/Index - not available
                  </p>
                  <p className="mt-0.5 text-xs text-ink-tertiary">
                    Search for individual stocks within SPY, QQQ, or IWM
                  </p>
                </div>
              </div>
            )}

            {results.map((stock, index) => {
              const indices = getIndexLabel(stock.i);
              return (
                <button
                  key={stock.t}
                  type="button"
                  onClick={() => handleSelect(stock.t)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-all hover:bg-gold-primary/10"
                  style={{
                    borderBottom:
                      index < results.length - 1
                        ? '1px solid rgba(201,166,70,0.1)'
                        : 'none',
                  }}
                >
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[12px]"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                      border: '1px solid rgba(201,166,70,0.2)',
                    }}
                  >
                    <span className="text-sm font-bold text-gold-primary">
                      {stock.t.slice(0, 2)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink-primary transition-colors group-hover:text-gold-primary">
                        {stock.t}
                      </span>
                      <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-ink-muted">
                        {stock.e}
                      </span>
                      {indices.map((idx) => (
                        <span
                          key={idx}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            background: INDEX_COLORS[idx]?.bg || 'rgba(255,255,255,0.05)',
                            color: INDEX_COLORS[idx]?.text || 'rgba(255,255,255,0.45)',
                          }}
                        >
                          {idx}
                        </span>
                      ))}
                    </div>
                    <p className="truncate text-sm text-ink-tertiary">{stock.n}</p>
                  </div>

                  <span className="hidden flex-shrink-0 text-xs text-gold-primary/70 md:block">
                    {stock.s}
                  </span>

                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-muted transition-all group-hover:translate-x-1 group-hover:text-gold-primary" />
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
