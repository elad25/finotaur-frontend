/**
 * emotionDetection.ts
 *
 * Retroactive emotion detection from real behavioral signals already present on
 * each trade. No new user input is required. R values are NOT recomputed here —
 * they are computed by the canonical aggregator and passed in via EmotionTradeInput.
 *
 * Detection rules (fully documented per rule below):
 *
 * PER-TRADE emotions (evaluated in sequence with a running loss-streak counter):
 *   - revenge   : quick re-entry after a loss with an oversized position
 *   - tilt      : escalating size during a loss streak (pressing after consecutive losses)
 *   - fear      : shrunken position immediately after a loss (risk aversion from pain)
 *   - fomo      : mistake field explicitly signals late entry or FOMO
 *   - greed     : outsized winner position OR mistake explicitly flags over-sizing
 *   - disciplined : no negative signal AND stop was set AND session is recorded
 *
 * POST-TRADE (day-level) emotion:
 *   - overtrading : day trade count exceeds max(3, medianTradesPerDay * 2)
 *
 * confidence modifiers:
 *   - base 0.6 when any emotion detected, 0 when none
 *   - +0.2 (capped at 1.0) when mental_state <= 2 and a negative emotion is present
 *   - 'disciplined': 0.7 if mental_state >= 4, else 0.6
 *
 * priority order for `primary`:
 *   revenge > tilt > fomo > greed > fear > overtrading > disciplined
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type TradeEmotion =
  | 'revenge'
  | 'overtrading'
  | 'tilt'
  | 'fear'
  | 'fomo'
  | 'greed'
  | 'disciplined';

export interface EmotionTradeInput {
  id: string;                  // stable trade id; caller guarantees uniqueness
  open_at: string;             // entry timestamp ISO
  close_at?: string | null;    // exit timestamp ISO
  quantity?: number | null;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN' | null;
  pnl?: number | null;
  session?: string | null;
  mistake?: string | null;
  mental_state?: number | null; // 1..5 self-report (optional enrichment)
  stop_price?: number | null;
  risk_usd?: number | null;
}

export interface TradeEmotionResult {
  tradeId: string;
  date: string;                // YYYY-MM-DD derived from open_at (UTC slice)
  emotions: TradeEmotion[];    // all detected; empty => treat as neutral
  primary: TradeEmotion | null;
  negativeFlag: boolean;       // true if any negative emotion (everything except 'disciplined')
  confidence: number;          // 0..1
}

export interface EmotionSummary {
  perTrade: Map<string, TradeEmotionResult>;        // keyed by tradeId
  counts: Record<TradeEmotion, number>;             // count of trades whose PRIMARY === emotion
  negativeRate: number;                             // share of trades with negativeFlag (0..1), 0 if no trades
  emotionalTradeIds: Set<string>;                   // ids with negativeFlag
  byDate: Map<string, { negativeFlag: boolean; primary: TradeEmotion | null; count: number }>; // day rollup
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Population median of a non-empty number array. Returns null for empty arrays. */
function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Parse an ISO string to a Date. Returns null when parsing yields NaN. */
function parseDate(iso: string): Date | null {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Minutes between two valid Date objects. Returns null if either is null. */
function minutesBetween(a: Date | null, b: Date | null): number | null {
  if (a === null || b === null) return null;
  return (b.getTime() - a.getTime()) / 60_000;
}

/** Extract YYYY-MM-DD from ISO string (UTC slice). Falls back to empty string. */
function toDateKey(iso: string): string {
  return iso.slice(0, 10); // safe for full ISO-8601 strings
}

/** Priority order used to select `primary` from a set of detected emotions. */
const PRIORITY_ORDER: TradeEmotion[] = [
  'revenge',
  'tilt',
  'fomo',
  'greed',
  'fear',
  'overtrading',
  'disciplined',
];

/** All emotions classified as negative (anything except 'disciplined'). */
const NEGATIVE_EMOTIONS: Set<TradeEmotion> = new Set([
  'revenge',
  'overtrading',
  'tilt',
  'fear',
  'fomo',
  'greed',
]);

/** Zero-initialised counts record for all 7 emotion keys. */
function zeroCountRecord(): Record<TradeEmotion, number> {
  return {
    revenge: 0,
    overtrading: 0,
    tilt: 0,
    fear: 0,
    fomo: 0,
    greed: 0,
    disciplined: 0,
  };
}

// ---------------------------------------------------------------------------
// Core analysis
// ---------------------------------------------------------------------------

/**
 * Analyse a list of trades and return an EmotionSummary.
 *
 * @param trades - Raw trade inputs; may be in any order.
 * @returns     A fully populated EmotionSummary.
 *
 * Steps:
 *  1. Sort ascending by open_at.
 *  2. Compute medianSize from quantity (or risk_usd as fallback).
 *  3. Per-trade pass: evaluate revenge / tilt / fear / fomo / greed / disciplined.
 *  4. Day-level pass: add overtrading to every trade on busy days.
 *  5. Derive primary, negativeFlag, confidence for each trade.
 *  6. Aggregate into summary.
 */
export function analyzeEmotions(trades: EmotionTradeInput[]): EmotionSummary {
  // --- 1. Sort ascending by open_at ---
  const sorted = [...trades].sort((a, b) =>
    a.open_at.localeCompare(b.open_at)
  );

  // --- 2. Compute medianSize ---
  // Primary: median of positive quantity values.
  // Fallback: median of positive risk_usd values when quantity data absent.
  const quantities = sorted
    .map(t => t.quantity ?? null)
    .filter((q): q is number => q !== null && q > 0);

  let medianSize: number | null = median(quantities);

  if (medianSize === null) {
    const risks = sorted
      .map(t => t.risk_usd ?? null)
      .filter((r): r is number => r !== null && r > 0);
    medianSize = median(risks);
  }

  // --- 3. Per-trade emotion detection pass ---
  // Intermediate results: emotion sets (overtrading added later).
  const intermediateResults: Array<{
    trade: EmotionTradeInput;
    dateKey: string;
    emotionSet: Set<TradeEmotion>;
  }> = [];

  let lossStreak = 0; // consecutive LOSS outcomes up to current trade

  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const dateKey = toDateKey(trade.open_at);
    const emotionSet = new Set<TradeEmotion>();

    // Resolve the size proxy for this trade (quantity, else risk_usd, else null).
    const tradeSize =
      (trade.quantity !== null && trade.quantity !== undefined && trade.quantity > 0)
        ? trade.quantity
        : (trade.risk_usd !== null && trade.risk_usd !== undefined && trade.risk_usd > 0)
          ? trade.risk_usd
          : null;

    // Resolve previous trade's size proxy.
    const prevSize =
      prev === null
        ? null
        : (prev.quantity !== null && prev.quantity !== undefined && prev.quantity > 0)
          ? prev.quantity
          : (prev.risk_usd !== null && prev.risk_usd !== undefined && prev.risk_usd > 0)
            ? prev.risk_usd
            : null;

    // --- Rule: revenge ---
    // Fired when the PREVIOUS trade was a LOSS, the current trade opened within
    // 15 minutes of the previous trade's CLOSE, and the current size is MORE
    // than 1.5× the session median — classic "trying to win it back fast".
    if (
      prev !== null &&
      prev.outcome === 'LOSS' &&
      medianSize !== null &&
      tradeSize !== null &&
      tradeSize > 1.5 * medianSize
    ) {
      const prevClose = parseDate(prev.close_at ?? '');
      const currOpen = parseDate(trade.open_at);
      const mins = minutesBetween(prevClose, currOpen);
      if (mins !== null && mins >= 0 && mins < 15) {
        emotionSet.add('revenge');
      }
    }

    // --- Rule: tilt ---
    // Fired when there is an ONGOING loss streak (>= 2 consecutive losses ending
    // at the PREVIOUS trade) AND the trader is INCREASING size vs the prior trade —
    // escalating into a losing streak signals emotional pressure (tilt/desperation).
    if (
      lossStreak >= 2 &&
      prevSize !== null &&
      tradeSize !== null &&
      tradeSize > prevSize
    ) {
      emotionSet.add('tilt');
    }

    // --- Rule: fear ---
    // Fired when the PREVIOUS trade was a LOSS and the current size has shrunk to
    // BELOW 60% of the median — the trader pulled back significantly, indicating
    // loss aversion or fear of repeating the pain.
    if (
      prev !== null &&
      prev.outcome === 'LOSS' &&
      medianSize !== null &&
      tradeSize !== null &&
      tradeSize < 0.6 * medianSize
    ) {
      emotionSet.add('fear');
    }

    // --- Rule: fomo ---
    // Driven entirely by the user's own mistake field. A value of 'late' means
    // the trader entered a move they knew they were chasing; 'fomo' is a direct
    // self-label. Both indicate fear-of-missing-out entry behaviour.
    if (
      trade.mistake === 'late' ||
      trade.mistake === 'fomo'
    ) {
      emotionSet.add('fomo');
    }

    // --- Rule: greed ---
    // Two sub-triggers:
    //   a) The trader rode a winner AND the position was over 1.8× the median
    //      (doubling down on success / not taking reasonable profit).
    //   b) The trader explicitly flagged 'size' as their mistake (self-aware oversizing).
    if (
      (trade.outcome === 'WIN' &&
        medianSize !== null &&
        tradeSize !== null &&
        tradeSize > 1.8 * medianSize) ||
      trade.mistake === 'size'
    ) {
      emotionSet.add('greed');
    }

    // --- Rule: disciplined ---
    // Assigned ONLY when NO negative emotion fired.
    // Requires: stop level was set AND the trader recorded a session label.
    // Signals that the trader followed process: had a plan, tracked session context.
    const hasStop =
      trade.stop_price !== null &&
      trade.stop_price !== undefined;
    const hasSession =
      typeof trade.session === 'string' &&
      trade.session.trim().length > 0;

    const hasAnyNegative = [...emotionSet].some(e => NEGATIVE_EMOTIONS.has(e));
    if (!hasAnyNegative && hasStop && hasSession) {
      emotionSet.add('disciplined');
    }

    // --- Update loss streak ---
    // Counts CONSECUTIVE losses up to and INCLUDING the current trade.
    // Resets on WIN, BE, OPEN, or null.
    if (trade.outcome === 'LOSS') {
      lossStreak++;
    } else {
      lossStreak = 0;
    }

    intermediateResults.push({ trade, dateKey, emotionSet });
  }

  // --- 4. Day-level overtrading pass ---
  // Count trades per calendar day, then compute medianTradesPerDay.
  // Any day whose count exceeds max(3, medianTradesPerDay * 2) is considered
  // "overtrade" day — every trade on that day gets 'overtrading' added.
  const tradesPerDay = new Map<string, number>();
  for (const { dateKey } of intermediateResults) {
    tradesPerDay.set(dateKey, (tradesPerDay.get(dateKey) ?? 0) + 1);
  }

  const dayCounts = [...tradesPerDay.values()];
  const medianTradesPerDay = median(dayCounts) ?? 0;
  const overtradingThreshold = Math.max(3, medianTradesPerDay * 2);

  for (const item of intermediateResults) {
    const dayCount = tradesPerDay.get(item.dateKey) ?? 0;
    if (dayCount > overtradingThreshold) {
      item.emotionSet.add('overtrading');
      // 'disciplined' is incompatible with a negative emotion — remove it if now present.
      item.emotionSet.delete('disciplined');
    }
  }

  // --- 5. Derive final per-trade results ---
  const perTrade = new Map<string, TradeEmotionResult>();

  for (const { trade, dateKey, emotionSet } of intermediateResults) {
    const emotions: TradeEmotion[] = [...emotionSet];

    // primary: first match in canonical priority order
    const primary =
      PRIORITY_ORDER.find(e => emotionSet.has(e)) ?? null;

    // negativeFlag: any emotion other than 'disciplined' (and list is non-empty)
    const negativeFlag = emotions.some(e => NEGATIVE_EMOTIONS.has(e));

    // confidence
    let confidence = 0;
    if (emotions.length > 0) {
      if (emotionSet.has('disciplined') && !negativeFlag) {
        // 'disciplined' confidence: boosted by self-reported good mental state.
        confidence =
          trade.mental_state !== null &&
          trade.mental_state !== undefined &&
          trade.mental_state >= 4
            ? 0.7
            : 0.6;
      } else {
        // Base confidence for any negative detection.
        confidence = 0.6;
        // mental_state <= 2 corroborates a negative emotion → add 0.2, cap at 1.
        if (
          negativeFlag &&
          trade.mental_state !== null &&
          trade.mental_state !== undefined &&
          trade.mental_state <= 2
        ) {
          confidence = Math.min(1, confidence + 0.2);
        }
      }
    }

    perTrade.set(trade.id, {
      tradeId: trade.id,
      date: dateKey,
      emotions,
      primary,
      negativeFlag,
      confidence,
    });
  }

  // --- 6. Build aggregate summary ---
  const counts = zeroCountRecord();
  const emotionalTradeIds = new Set<string>();
  const byDate = new Map<string, { negativeFlag: boolean; primary: TradeEmotion | null; count: number }>();

  for (const result of perTrade.values()) {
    // Increment counts for the primary emotion.
    if (result.primary !== null) {
      counts[result.primary]++;
    }

    // Collect ids with a negative emotion.
    if (result.negativeFlag) {
      emotionalTradeIds.add(result.tradeId);
    }

    // Day rollup: track whether the worst trade on that day was negative,
    // and the primary of the highest-priority trade seen so far on that day.
    const existing = byDate.get(result.date);
    if (existing === undefined) {
      byDate.set(result.date, {
        negativeFlag: result.negativeFlag,
        primary: result.primary,
        count: 1,
      });
    } else {
      // negativeFlag is true for the day if ANY trade on that day is negative.
      existing.negativeFlag = existing.negativeFlag || result.negativeFlag;
      existing.count++;
      // Replace primary with higher-priority emotion if needed.
      if (result.primary !== null) {
        const existingPriority =
          existing.primary !== null
            ? PRIORITY_ORDER.indexOf(existing.primary)
            : Infinity;
        const newPriority = PRIORITY_ORDER.indexOf(result.primary);
        if (newPriority < existingPriority) {
          existing.primary = result.primary;
        }
      }
    }
  }

  const totalTrades = perTrade.size;
  const negativeRate =
    totalTrades === 0 ? 0 : emotionalTradeIds.size / totalTrades;

  return {
    perTrade,
    counts,
    negativeRate,
    emotionalTradeIds,
    byDate,
  };
}
