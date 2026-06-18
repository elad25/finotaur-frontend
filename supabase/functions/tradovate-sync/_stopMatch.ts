// Pure stop-order matching for Tradovate sync. No I/O, unit-testable.
export interface StopOrder {
  orderId: number;
  symbol: string;          // resolved from contractId by the caller
  action: 'Buy' | 'Sell';
  orderType: string;       // 'Stop' | 'StopLimit' | ...
  stopPrice: number | null;
  timestamp: string;       // ISO
  parentId?: number | null;
}

export interface PositionForStop {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  openAt: string;                 // ISO
  closeAt?: string | null;        // ISO or null (still open)
  entryOrderId?: number | null;   // the entry fill's orderId, for bracket linkage
}

const WINDOW_MS = 5 * 60 * 1000; // tolerance around the position window

// Returns the FIRST protective stop the trader placed for this position, or null.
export function matchStop(pos: PositionForStop, stops: StopOrder[]): StopOrder | null {
  const wantAction = pos.side === 'LONG' ? 'Sell' : 'Buy'; // protective stop is opposite side
  const openMs = Date.parse(pos.openAt);
  const closeMs = pos.closeAt ? Date.parse(pos.closeAt) : Number.POSITIVE_INFINITY;

  const candidates = stops.filter((s) => {
    if (s.symbol !== pos.symbol) return false;
    if (s.action !== wantAction) return false;
    if (s.orderType !== 'Stop' && s.orderType !== 'StopLimit') return false;
    if (s.stopPrice == null || !(Number(s.stopPrice) > 0)) return false;
    const t = Date.parse(s.timestamp);
    if (Number.isNaN(t)) return false;
    if (t < openMs - WINDOW_MS) return false;          // belongs to an earlier position
    if (t > closeMs + WINDOW_MS) return false;         // placed after this position closed
    // sanity: a protective stop must sit on the correct side of entry
    if (pos.side === 'SHORT' && !(Number(s.stopPrice) > pos.entryPrice)) return false;
    if (pos.side === 'LONG'  && !(Number(s.stopPrice) < pos.entryPrice)) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  const byTime = (a: StopOrder, b: StopOrder) => Date.parse(a.timestamp) - Date.parse(b.timestamp);

  // Prefer a bracket child directly linked to the entry order.
  if (pos.entryOrderId != null) {
    const linked = candidates.filter((s) => s.parentId === pos.entryOrderId);
    if (linked.length > 0) { linked.sort(byTime); return linked[0]; }
  }
  // Otherwise the earliest qualifying stop = the first one placed.
  candidates.sort(byTime);
  return candidates[0];
}
