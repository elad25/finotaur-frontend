// symbols/SymbolManager.ts
import { SymbolMeta } from '../types'; // ✅ תוקן
import { DEFAULT_SYMBOLS, STORAGE_KEYS } from '../constants'; // ✅ תוקן

interface SymbolStorage {
  recents: SymbolMeta[];
  favorites: string[]; // Just symbol names
}

/**
 * ===================================
 * SYMBOL MANAGER
 * Manages favorites, recents, and symbol metadata
 * ===================================
 */
export class SymbolManager {
  private availableSymbols: SymbolMeta[];
  private recentSymbols: SymbolMeta[] = [];
  private favoriteSymbols: Set<string> = new Set();
  private maxRecents: number = 10;

  constructor(symbols: SymbolMeta[] = DEFAULT_SYMBOLS) {
    this.availableSymbols = symbols;
    this.loadFromStorage();
  }

  // ===================================
  // GETTERS
  // ===================================

  getAllSymbols(): SymbolMeta[] {
    return [...this.availableSymbols];
  }

  getRecentSymbols(): SymbolMeta[] {
    return [...this.recentSymbols];
  }

  getFavoriteSymbols(): SymbolMeta[] {
    return this.availableSymbols.filter(s => 
      this.favoriteSymbols.has(s.symbol)
    );
  }

  getSymbolByName(symbol: string): SymbolMeta | undefined {
    return this.availableSymbols.find(s => s.symbol === symbol);
  }

  getSymbolsByCategory(category: string): SymbolMeta[] {
    return this.availableSymbols.filter(s => s.category === category);
  }

  // ===================================
  // SEARCH
  // ===================================

  searchSymbols(query: string): SymbolMeta[] {
    if (!query.trim()) {
      return this.getAllSymbols();
    }

    const lowerQuery = query.toLowerCase();
    
    return this.availableSymbols.filter(s =>
      s.symbol.toLowerCase().includes(lowerQuery) ||
      s.displayName.toLowerCase().includes(lowerQuery) ||
      s.name.toLowerCase().includes(lowerQuery) ||
      s.exchange.toLowerCase().includes(lowerQuery)
    );
  }

  // ===================================
  // RECENTS
  // ===================================

  addToRecents(symbolOrName: SymbolMeta | string): void {
    const symbol = typeof symbolOrName === 'string'
      ? this.getSymbolByName(symbolOrName)
      : symbolOrName;

    if (!symbol) return;

    // Remove if already exists
    this.recentSymbols = this.recentSymbols.filter(
      s => s.symbol !== symbol.symbol
    );

    // Add to front
    this.recentSymbols.unshift(symbol);

    // Limit size
    if (this.recentSymbols.length > this.maxRecents) {
      this.recentSymbols = this.recentSymbols.slice(0, this.maxRecents);
    }

    this.saveToStorage();
  }

  clearRecents(): void {
    this.recentSymbols = [];
    this.saveToStorage();
  }

  // ===================================
  // FAVORITES
  // ===================================

  toggleFavorite(symbolOrName: SymbolMeta | string): boolean {
    const symbolName = typeof symbolOrName === 'string'
      ? symbolOrName
      : symbolOrName.symbol;

    if (this.favoriteSymbols.has(symbolName)) {
      this.favoriteSymbols.delete(symbolName);
      this.saveToStorage();
      return false;
    } else {
      this.favoriteSymbols.add(symbolName);
      this.saveToStorage();
      return true;
    }
  }

  isFavorite(symbolOrName: SymbolMeta | string): boolean {
    const symbolName = typeof symbolOrName === 'string'
      ? symbolOrName
      : symbolOrName.symbol;

    return this.favoriteSymbols.has(symbolName);
  }

  clearFavorites(): void {
    this.favoriteSymbols.clear();
    this.saveToStorage();
  }

  // ===================================
  // BULK OPERATIONS
  // ===================================

  addSymbols(symbols: SymbolMeta[]): void {
    this.availableSymbols = [
      ...this.availableSymbols,
      ...symbols.filter(newSymbol => 
        !this.availableSymbols.some(existing => 
          existing.symbol === newSymbol.symbol
        )
      )
    ];
  }

  removeSymbol(symbolName: string): void {
    this.availableSymbols = this.availableSymbols.filter(
      s => s.symbol !== symbolName
    );
  }

  // ===================================
  // CATEGORIES
  // ===================================

  getCategories(): string[] {
    const categories = new Set(
      this.availableSymbols.map(s => s.category)
    );
    return Array.from(categories);
  }

  getSymbolCount(): number {
    return this.availableSymbols.length;
  }

  getCategoryCount(category: string): number {
    return this.availableSymbols.filter(
      s => s.category === category
    ).length;
  }

  // ===================================
  // PERSISTENCE
  // ===================================

  private saveToStorage(): void {
    try {
      const data: SymbolStorage = {
        recents: this.recentSymbols,
        favorites: Array.from(this.favoriteSymbols),
      };

      localStorage.setItem(STORAGE_KEYS.symbols, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save symbols to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.symbols);
      if (!stored) return;

      const data: SymbolStorage = JSON.parse(stored);

      // Validate and restore recents
      if (Array.isArray(data.recents)) {
        this.recentSymbols = data.recents.filter(symbol =>
          this.availableSymbols.some(s => s.symbol === symbol.symbol)
        ).slice(0, this.maxRecents);
      }

      // Restore favorites
      if (Array.isArray(data.favorites)) {
        this.favoriteSymbols = new Set(
          data.favorites.filter(symbolName =>
            this.availableSymbols.some(s => s.symbol === symbolName)
          )
        );
      }
    } catch (error) {
      console.error('Failed to load symbols from storage:', error);
    }
  }

  clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.symbols);
    } catch (error) {
      console.error('Failed to clear symbol storage:', error);
    }
  }

  // ===================================
  // EXPORT / IMPORT
  // ===================================

  exportData(): SymbolStorage {
    return {
      recents: this.recentSymbols,
      favorites: Array.from(this.favoriteSymbols),
    };
  }

  importData(data: SymbolStorage): void {
    if (data.recents) {
      this.recentSymbols = data.recents.slice(0, this.maxRecents);
    }
    if (data.favorites) {
      this.favoriteSymbols = new Set(data.favorites);
    }
    this.saveToStorage();
  }
}

/**
 * ===================================
 * SINGLETON INSTANCE
 * ===================================
 */
export const symbolManager = new SymbolManager();