export type TradeStatus = "OPEN" | "CLOSED";
export type Direction = "LONG" | "SHORT";

export type Trade = {
  id: string;
  symbol: string;
  direction: Direction;
  entry: number;
  stop?: number;
  takeProfits?: { price: number; size?: number }[];
  exit?: number;           // if provided => CLOSED
  size: number;
  fees?: number;
  market?: string;         // Stocks / Futures / Forex / Crypto
  instrument?: string;     // e.g., NQ, ES, EURUSD
  openedAt: string;        // ISO
  closedAt?: string;       // ISO
  note?: string;
  screenshotDataUrl?: string;
  tags?: {
    strategy?: string;
    setup?: string;
    session?: string;
    timeframe?: string;
  };
  status: TradeStatus;
};

const KEY = "finotaur.journal.trades";

export function getTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Trade[]) : [];
  } catch {
    return [];
  }
}

export function setTrades(trades: Trade[]) {
  localStorage.setItem(KEY, JSON.stringify(trades));
}

export function addTrade(t: Trade) {
  const all = getTrades();
  all.unshift(t);
  setTrades(all);
}

export function nextId(): string {
  return "t_" + Math.random().toString(36).slice(2, 10);
}
