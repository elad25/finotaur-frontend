// src/lib/portfolio/currencies.ts
// ═══════════════════════════════════════════════════════════════
// Shared currency reference for the portfolio builder.
// Single source of truth consumed by PortfolioSettingsPanel,
// CashPositionInput, and PositionsTable.
// ═══════════════════════════════════════════════════════════════

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

/** Comprehensive list of major world + commonly-traded currencies. */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$',    name: 'US Dollar' },
  { code: 'EUR', symbol: '€',    name: 'Euro' },
  { code: 'GBP', symbol: '£',    name: 'British Pound' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'Fr',   name: 'Swiss Franc' },
  { code: 'CAD', symbol: 'C$',   name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar' },
  { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee' },
  { code: 'ILS', symbol: '₪',    name: 'Israeli Shekel' },
  { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr',   name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł',   name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč',   name: 'Czech Koruna' },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'KRW', symbol: '₩',    name: 'South Korean Won' },
  { code: 'TWD', symbol: 'NT$',  name: 'Taiwan Dollar' },
  { code: 'TRY', symbol: '₺',    name: 'Turkish Lira' },
  { code: 'AED', symbol: 'د.إ',  name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼',    name: 'Saudi Riyal' },
  { code: 'THB', symbol: '฿',    name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp',   name: 'Indonesian Rupiah' },
  { code: 'RUB', symbol: '₽',    name: 'Russian Ruble' },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

const SYMBOL_BY_CODE: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol]),
);

/** Returns the symbol for a currency code, falling back to the code itself. */
export function currencySymbol(code: string): string {
  return SYMBOL_BY_CODE[code] ?? code;
}
