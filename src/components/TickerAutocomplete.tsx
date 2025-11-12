import React, { useState, useRef, useEffect } from 'react';
import { useTickerSearch, TickerSymbol } from '@/hooks/useTickerSearch';
import { Search, TrendingUp } from 'lucide-react';

interface TickerAutocompleteProps {
  value?: string;
  onSelect: (ticker: TickerSymbol) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function TickerAutocomplete({
  value = '',
  onSelect,
  placeholder = 'AAPL, ES, NQ, BTCUSDT...',
  className = '',
  error
}: TickerAutocompleteProps) {
  const { search, setSearch, suggestions, loading } = useTickerSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update display value when prop changes
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  // Handle ESC key to close dropdown
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setDisplayValue(newValue);
    setSearch(newValue);
    setIsOpen(true);
  };

  const handleSelect = (ticker: TickerSymbol) => {
    setDisplayValue(ticker.symbol);
    setSearch('');
    setIsOpen(false);
    onSelect(ticker);
  };

  const handleFocus = () => {
    if (displayValue) {
      setSearch(displayValue);
    }
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 pr-10
            bg-black/50 border rounded-lg
            text-white placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50
            transition-all duration-200
            ${error ? 'border-red-500' : 'border-[hsl(var(--gold))]/20'}
          `}
          autoComplete="off"
        />
        
        {/* Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {loading ? (
            <div className="ticker-loading-spinner h-5 w-5 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[hsl(var(--base-900))] border border-[hsl(var(--gold))]/20 rounded-lg shadow-luxury ticker-dropdown-animate overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto ticker-dropdown-scrollbar">
            {suggestions.map((ticker) => (
              <button
                key={ticker.symbol}
                onClick={() => handleSelect(ticker)}
                className="w-full px-4 py-3 text-left ticker-item-hover border-b border-[hsl(var(--gold))]/10 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left side: Symbol + Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-base">
                        {ticker.symbol}
                      </span>
                      <span className="ticker-badge text-xs px-1.5 py-0.5 rounded">
                        {ticker.asset_class.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate mt-0.5">
                      {ticker.name}
                    </p>
                  </div>

                  {/* Right side: Multiplier + Exchange */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1 text-[hsl(var(--gold))] font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-gray-500">
                      {ticker.exchange}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 bg-black/50 border-t border-[hsl(var(--gold))]/10">
            <p className="text-xs text-gray-500 text-center">
              {suggestions.length} results • Press ESC to close
            </p>
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && search && !loading && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[hsl(var(--base-900))] border border-[hsl(var(--gold))]/20 rounded-lg p-4 text-center ticker-dropdown-animate">
          <p className="text-gray-400 text-sm">
            No results for "<span className="text-white">{search}</span>"
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Try AAPL, ES, NQ, TSLA, BTCUSDT...
          </p>
        </div>
      )}
    </div>
  );
}