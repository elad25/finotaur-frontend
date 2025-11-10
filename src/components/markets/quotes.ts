// src/components/markets/quotes.ts
export type Quote = {
  price: number | null;   // last
  ch: number | null;      // absolute change vs previous close (or open for FX)
  chp: number | null;     // percent change
  isPremarket?: boolean;
};

export async function fetchQuote(symbol: string): Promise<Quote> {
  try {
    const r = await fetch("/api/quote?symbol=" + encodeURIComponent(symbol));
    return await r.json();
  } catch {
    return { price: null, ch: null, chp: null };
  }
}

export function shortLabel(sym: string) {
  const i = sym.indexOf(":");
  const raw = i >= 0 ? sym.slice(i+1) : sym;
  if (sym.startsWith("BINANCE:")) {
    if (raw.endsWith("USDT")) return raw.replace("USDT","");
    if (raw.endsWith("USD")) return raw.replace("USD","");
  }
  return raw;
}
