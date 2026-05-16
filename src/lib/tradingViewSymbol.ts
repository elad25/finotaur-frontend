// Maps a broker symbol (the raw ticker recorded against the trade) to a
// TradingView widget symbol so the chart resolves to the right contract.

const FUTURES_ROOT_TO_EXCHANGE: Record<string, string> = {
  // CME E-minis
  ES: 'CME_MINI',
  NQ: 'CME_MINI',
  RTY: 'CME_MINI',
  YM: 'CBOT_MINI',
  // CME Micros
  MES: 'CME_MINI',
  MNQ: 'CME_MINI',
  M2K: 'CME_MINI',
  MYM: 'CBOT_MINI',
  // CME currencies / metals / energy (common day-trader contracts)
  GC: 'COMEX',
  MGC: 'COMEX',
  SI: 'COMEX',
  CL: 'NYMEX',
  MCL: 'NYMEX',
  NG: 'NYMEX',
  ZN: 'CBOT',
  ZB: 'CBOT',
};

const FUTURES_PATTERN = /^([A-Z]{1,4})([FGHJKMNQUVXZ])(\d{1,2})$/;
const CRYPTO_PATTERN = /^[A-Z]{3,10}(USDT|USDC|USD|BUSD)$/;

function expandYearDigit(digits: string): string {
  // Broker contract codes use 1-2 trailing digits for the year.
  //   "6"  → 2026
  //   "26" → 2026
  // Always anchored in 2020s — futures further out aren't traded by retail.
  if (digits.length === 1) return `202${digits}`;
  return `20${digits}`;
}

export function toTradingViewSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const symbol = raw.trim().toUpperCase();
  if (!symbol) return null;

  // 1. Futures contract: <ROOT><MONTH_CODE><YEAR_DIGITS>
  //    e.g. MNQM6 → CME_MINI:MNQM2026
  const futuresMatch = symbol.match(FUTURES_PATTERN);
  if (futuresMatch) {
    const [, root, monthCode, yearDigits] = futuresMatch;
    const exchange = FUTURES_ROOT_TO_EXCHANGE[root];
    if (exchange) {
      const year = expandYearDigit(yearDigits);
      return `${exchange}:${root}${monthCode}${year}`;
    }
    // Unknown root — let TradingView try to autocomplete from the raw code.
    return symbol;
  }

  // 2. Crypto pair: e.g. BTCUSDT → BINANCE:BTCUSDT
  if (CRYPTO_PATTERN.test(symbol)) {
    return `BINANCE:${symbol}`;
  }

  // 3. Equity / index / anything else: pass raw, widget's symbol search resolves.
  return symbol;
}

// Pick a reasonable bar interval given the trade's wall-clock duration.
// TradingView accepts: "1", "5", "15", "60", "240", "D", "W", "M".
export function pickTradeInterval(openAt: string, closeAt: string | null | undefined): string {
  const start = new Date(openAt).getTime();
  const end = closeAt ? new Date(closeAt).getTime() : Date.now();
  const ms = Math.max(end - start, 0);
  const hours = ms / (1000 * 60 * 60);
  if (hours < 2) return '1';
  if (hours < 8) return '5';
  if (hours < 24) return '15';
  if (hours < 24 * 7) return '60';
  if (hours < 24 * 30) return '240';
  return 'D';
}
