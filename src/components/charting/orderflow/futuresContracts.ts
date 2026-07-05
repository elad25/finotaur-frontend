// src/components/charting/orderflow/futuresContracts.ts
// CME futures contract specs + front-month resolver for the Trading Arena's
// admin-only Futures tab. Scope: NQ, ES, MNQ, MES (Nasdaq-100 / S&P 500,
// standard + micro) — the four contracts the founder actively trades.

export type FuturesRoot = 'NQ' | 'ES' | 'MNQ' | 'MES';

export interface FuturesContractSpec {
  root: FuturesRoot;
  /** Display name shown in the contract selector pills. */
  displayName: string;
  /** Minimum price increment. */
  tickSize: number;
  /** Dollar value of one full point move, per contract. */
  pointValue: number;
}

export const FUTURES_CONTRACTS: Record<FuturesRoot, FuturesContractSpec> = {
  NQ:  { root: 'NQ',  displayName: 'Nasdaq-100 (NQ)',       tickSize: 0.25, pointValue: 20 },
  ES:  { root: 'ES',  displayName: 'S&P 500 (ES)',          tickSize: 0.25, pointValue: 50 },
  MNQ: { root: 'MNQ', displayName: 'Micro Nasdaq-100 (MNQ)', tickSize: 0.25, pointValue: 2 },
  MES: { root: 'MES', displayName: 'Micro S&P 500 (MES)',   tickSize: 0.25, pointValue: 5 },
};

export const FUTURES_ROOTS: FuturesRoot[] = ['NQ', 'ES', 'MNQ', 'MES'];

// ─── Front-month resolution ──────────────────────────────────────────────
//
// NQ/ES/MNQ/MES all trade a standard quarterly cycle: March (H), June (M),
// September (U), December (Z). Tradovate/CME contract codes are
// `<ROOT><MonthCode><SingleDigitYear>` — e.g. September 2026 → "NQU6".
//
// Rollover approximation: liquidity (and CME's own volume-based roll signal)
// shifts to the next quarterly contract roughly 8 calendar days before the
// 3rd Friday of the expiring contract's month — NOT on expiration day itself.
// This is a simplification (the real roll date depends on daily volume
// crossover between contracts, which isn't computable client-side without a
// live quote feed) but is close enough for a dev-only front-month default;
// the contract selector still lets the user override if the guess is off by
// a few days near a roll.

const QUARTERLY_MONTHS = [3, 6, 9, 12] as const; // Mar, Jun, Sep, Dec
const QUARTERLY_MONTH_CODES: Record<number, string> = {
  3: 'H',
  6: 'M',
  9: 'U',
  12: 'Z',
};

/** 3rd Friday of a given (1-indexed) month/year — CME's standard quarterly expiration anchor. */
function thirdFriday(year: number, month1Indexed: number): Date {
  // month1Indexed is 1-12; Date() month param is 0-11.
  const d = new Date(Date.UTC(year, month1Indexed - 1, 1));
  const firstDayOfWeek = d.getUTCDay(); // 0 = Sunday
  const FRIDAY = 5;
  const offsetToFirstFriday = (FRIDAY - firstDayOfWeek + 7) % 7;
  const firstFridayDate = 1 + offsetToFirstFriday;
  const thirdFridayDate = firstFridayDate + 14;
  return new Date(Date.UTC(year, month1Indexed - 1, thirdFridayDate));
}

const ROLLOVER_LEAD_DAYS = 8;

/**
 * Resolve the front-month contract code for a futures root at a given date.
 * Walks the quarterly cycle forward from `now` and picks the first quarterly
 * month whose approximate roll date (3rd-Friday-minus-8-days) has not yet
 * passed. Falls back to December of `now`'s year + wraps to next year's
 * March if `now` is already past this year's December roll.
 */
export function frontMonthContract(root: FuturesRoot, now: Date = new Date()): string {
  const year = now.getUTCFullYear();

  for (let i = 0; i < 5; i += 1) {
    // Walk up to 5 quarters ahead (covers a full year + margin) starting
    // from the current year's first quarterly month. Quarters already fully
    // behind `now` still get evaluated (cheap) — the rollDate comparison
    // below is what actually filters them out.
    const candidateYear = year + Math.floor(i / QUARTERLY_MONTHS.length);
    const monthIdx = i % QUARTERLY_MONTHS.length;
    const month = QUARTERLY_MONTHS[monthIdx];

    const expiry = thirdFriday(candidateYear, month);
    const rollDate = new Date(expiry.getTime() - ROLLOVER_LEAD_DAYS * 24 * 60 * 60 * 1000);

    if (now.getTime() < rollDate.getTime()) {
      const monthCode = QUARTERLY_MONTH_CODES[month];
      const yearDigit = candidateYear % 10;
      return `${root}${monthCode}${yearDigit}`;
    }
  }

  // Should be unreachable (5 quarters always covers the roll window), but
  // keep a defensive fallback rather than returning undefined-shaped string.
  const monthCode = QUARTERLY_MONTH_CODES[12];
  const yearDigit = year % 10;
  return `${root}${monthCode}${yearDigit}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Self-test — guarded, never runs in production. Mirrors flowBinStore.selftest.
// ─────────────────────────────────────────────────────────────────────────
export function selftest(): void {
  if (!import.meta.env.DEV) return;

  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`futuresContracts.selftest failed: ${msg}`);
  };

  // Well inside the June 2026 contract's active window (>8 days before its
  // 3rd-Friday roll) → should resolve to NQM6.
  const midCycle = new Date(Date.UTC(2026, 3, 15)); // 2026-04-15
  assert(
    frontMonthContract('NQ', midCycle) === 'NQM6',
    `expected NQM6, got ${frontMonthContract('NQ', midCycle)}`,
  );

  // Just past the June 2026 roll window (June 3rd Friday is 2026-06-19;
  // roll date = 2026-06-11) → should have rolled to September (NQU6).
  const postRoll = new Date(Date.UTC(2026, 5, 12)); // 2026-06-12
  assert(
    frontMonthContract('NQ', postRoll) === 'NQU6',
    `expected NQU6, got ${frontMonthContract('NQ', postRoll)}`,
  );

  // Late in the year, near the December roll → should still resolve within
  // the same year (ZDecember) before finally wrapping to next year's March.
  const lateDec = new Date(Date.UTC(2026, 11, 25)); // 2026-12-25, past Dec roll
  const resolved = frontMonthContract('ES', lateDec);
  assert(
    resolved === 'ESH7',
    `expected ESH7, got ${resolved}`,
  );

  // Root substitution sanity across all 4 supported roots.
  for (const root of FUTURES_ROOTS) {
    const code = frontMonthContract(root, midCycle);
    assert(code.startsWith(root), `expected code to start with ${root}, got ${code}`);
  }

  // eslint-disable-next-line no-console
  console.info('[futuresContracts.selftest] all assertions passed');
}
