// symbols/SymbolSearch.tsx
import React, { useState, useMemo } from 'react';
import { Search, X, Star } from 'lucide-react';
import { Theme } from '../types';
import { DEFAULT_SYMBOLS } from '../constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface SymbolSearchProps {
  isOpen: boolean;
  currentSymbol: string;
  availableSymbols?: string[];
  recentSymbols?: string[];
  favoriteSymbols?: string[];
  theme: Theme;
  onSelect: (symbol: string) => void;
  onClose: () => void;
  onToggleFavorite?: (symbol: string) => void;
}

export const SymbolSearch: React.FC<SymbolSearchProps> = ({
  isOpen,
  currentSymbol,
  availableSymbols,
  recentSymbols = [],
  favoriteSymbols = [],
  theme,
  onSelect,
  onClose,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isDark = theme === 'dark';

  const symbols = useMemo(() => {
    return availableSymbols || DEFAULT_SYMBOLS.map(s => s.symbol);
  }, [availableSymbols]);

  const filteredSymbols = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return symbols.slice(0, 50);

    return symbols
      .filter(symbol => symbol.toLowerCase().includes(query))
      .slice(0, 50);
  }, [searchQuery, symbols]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 backdrop-blur-sm flex items-center justify-center',
        isDark ? 'bg-black/60' : 'bg-white/60'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'rounded-lg border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col',
          isDark
            ? 'bg-black border-[#C9A646]/30'
            : 'bg-white border-gray-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-current/10">
          <div className="flex items-center gap-3">
            <Search
              className={cn(
                'h-5 w-5',
                isDark ? 'text-[#C9A646]' : 'text-gray-400'
              )}
            />
            <Input
              autoFocus
              type="text"
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'flex-1 border-0 bg-transparent focus-visible:ring-0',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className={cn(
                'h-8 w-8 p-0',
                isDark ? 'hover:bg-[#C9A646]/10 text-[#C9A646]' : 'hover:bg-gray-100'
              )}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {recentSymbols.length > 0 && !searchQuery && (
            <div className="mb-6">
              <h3
                className={cn(
                  'text-xs font-semibold mb-2',
                  isDark ? 'text-[#C9A646]' : 'text-gray-600'
                )}
              >
                Recent
              </h3>
              <div className="space-y-1">
                {recentSymbols.slice(0, 5).map(symbol => (
                  <button
                    key={symbol}
                    onClick={() => handleSelect(symbol)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg flex items-center justify-between',
                      symbol === currentSymbol
                        ? isDark
                          ? 'bg-[#C9A646]/20'
                          : 'bg-blue-50'
                        : isDark
                        ? 'hover:bg-[#C9A646]/10'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <span
                      className={cn(
                        'font-medium',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {symbol}
                    </span>
                    {favoriteSymbols.includes(symbol) && (
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {favoriteSymbols.length > 0 && !searchQuery && (
            <div className="mb-6">
              <h3
                className={cn(
                  'text-xs font-semibold mb-2',
                  isDark ? 'text-[#C9A646]' : 'text-gray-600'
                )}
              >
                Favorites
              </h3>
              <div className="space-y-1">
                {favoriteSymbols.map(symbol => (
                  <button
                    key={symbol}
                    onClick={() => handleSelect(symbol)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg flex items-center justify-between',
                      symbol === currentSymbol
                        ? isDark
                          ? 'bg-[#C9A646]/20'
                          : 'bg-blue-50'
                        : isDark
                        ? 'hover:bg-[#C9A646]/10'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <span
                      className={cn(
                        'font-medium',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {symbol}
                    </span>
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3
              className={cn(
                'text-xs font-semibold mb-2',
                isDark ? 'text-[#C9A646]' : 'text-gray-600'
              )}
            >
              {searchQuery ? 'Search Results' : 'All Symbols'}
            </h3>
            <div className="space-y-1">
              {filteredSymbols.map(symbol => (
                <button
                  key={symbol}
                  onClick={() => handleSelect(symbol)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg flex items-center justify-between',
                    symbol === currentSymbol
                      ? isDark
                        ? 'bg-[#C9A646]/20'
                        : 'bg-blue-50'
                      : isDark
                      ? 'hover:bg-[#C9A646]/10'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <span
                    className={cn(
                      'font-medium',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    {symbol}
                  </span>
                  {onToggleFavorite && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(symbol);
                      }}
                    >
                      <Star
                        className={cn(
                          'h-4 w-4',
                          favoriteSymbols.includes(symbol)
                            ? 'fill-yellow-500 text-yellow-500'
                            : isDark
                            ? 'text-[#C9A646]/40 hover:text-[#C9A646]'
                            : 'text-gray-400 hover:text-gray-600'
                        )}
                      />
                    </button>
                  )}
                </button>
              ))}
            </div>

            {filteredSymbols.length === 0 && (
              <div
                className={cn(
                  'text-center py-8 text-sm',
                  isDark ? 'text-[#C9A646]/60' : 'text-gray-500'
                )}
              >
                No symbols found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};