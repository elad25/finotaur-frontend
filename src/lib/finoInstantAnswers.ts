// src/lib/finoInstantAnswers.ts
// =====================================================
// FINO AI — Instant Answers: compute-first responses for a small set of
// high-frequency journal questions. When the user's message matches one of
// INSTANT_QUESTIONS exactly, the drawer answers from the trader's own trades
// (client-side, deterministic, zero API cost) instead of calling the AI.
// A follow-up button lets the user still ask FINO "why" (spends 1 question).
// =====================================================

export interface InstantStat {
  label: string;
  value: string;
  tone: 'neutral' | 'good' | 'warn';
}

export interface InstantAnswer {
  key: string;
  title: string;
  stats: InstantStat[];
  verdict: string;
  followUp: string;
  /** Button label — defaults to "Ask FINO why" in the card. */
  followUpLabel?: string;
}

export const INSTANT_QUESTIONS: { key: string; question: string }[] = [
  { key: 'overtrading', question: 'Am I overtrading?' },
  { key: 'win-rate', question: "What's my win rate this month?" },
];

/** Minimal structural shape — works with the app's real Trade type. */
export interface InstantTrade {
  open_at?: string | null;
  close_at?: string | null;
  pnl?: number | null;
  outcome?: string | null;
}

export function matchInstantQuestion(message: string): string | null {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed) return null;
  const hit = INSTANT_QUESTIONS.find((q) => q.question.trim().toLowerCase() === trimmed);
  return hit?.key ?? null;
}

function formatSignedDollars(n: number): string {
  const rounded = Math.round(n);
  if (rounded === 0) return '$0';
  const sign = rounded > 0 ? '+' : '−'; // minus sign, matches "−$212" style
  return `${sign}$${Math.abs(rounded).toLocaleString('en-US')}`;
}

function dayKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC calendar day)
}

function computeOvertrading(trades: InstantTrade[]): InstantAnswer | null {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const last30 = trades.filter((t) => {
    if (!t.open_at) return false;
    const d = new Date(t.open_at);
    return !Number.isNaN(d.getTime()) && d >= thirtyDaysAgo && d <= now;
  });

  if (last30.length < 3) return null;

  const byDay = new Map<string, InstantTrade[]>();
  for (const t of last30) {
    const key = t.open_at ? dayKey(t.open_at) : null;
    if (!key) continue;
    const arr = byDay.get(key) ?? [];
    arr.push(t);
    byDay.set(key, arr);
  }

  const allActiveDays = Array.from(byDay.entries());
  const baselineActiveDayCount = allActiveDays.length;
  const baselinePerDay =
    baselineActiveDayCount > 0
      ? last30.length / baselineActiveDayCount
      : 0;

  const last7Days = allActiveDays.filter(([key]) => {
    const d = new Date(key);
    return d >= sevenDaysAgo && d <= now;
  });
  const last7TradeCount = last7Days.reduce((sum, [, arr]) => sum + arr.length, 0);
  const last7PerDay = last7Days.length > 0 ? last7TradeCount / last7Days.length : 0;

  let pnlOnHeavyDays = 0;
  let pnlOnLightDays = 0;
  for (const [, arr] of allActiveDays) {
    const dayPnl = arr.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    if (arr.length >= 5) pnlOnHeavyDays += dayPnl;
    else if (arr.length <= 3) pnlOnLightDays += dayPnl;
  }

  const isElevated = last7PerDay > baselinePerDay * 1.5;

  const stats: InstantStat[] = [
    {
      label: 'Trades / day (7d)',
      value: last7PerDay.toFixed(1),
      tone: isElevated ? 'warn' : 'neutral',
    },
    {
      label: 'Baseline (30d)',
      value: baselinePerDay.toFixed(1),
      tone: 'neutral',
    },
    {
      label: 'P&L on 5+ days',
      value: formatSignedDollars(pnlOnHeavyDays),
      tone: pnlOnHeavyDays < 0 ? 'warn' : pnlOnHeavyDays > 0 ? 'good' : 'neutral',
    },
  ];

  const rateSentence = isElevated
    ? `You're trading ${last7PerDay.toFixed(1)}/day this week vs a ${baselinePerDay.toFixed(1)}/day baseline over the last 30 days — that's a real pickup in activity.`
    : `You're trading ${last7PerDay.toFixed(1)}/day this week, close to your ${baselinePerDay.toFixed(1)}/day baseline over the last 30 days — no obvious overtrading pattern.`;

  const pnlSentence =
    pnlOnHeavyDays < 0 && pnlOnLightDays >= 0
      ? ` Your high-volume days (5+ trades) net ${formatSignedDollars(pnlOnHeavyDays)}, while lighter days (≤3 trades) net ${formatSignedDollars(pnlOnLightDays)} — the extra trades aren't paying off.`
      : ` High-volume days (5+ trades) net ${formatSignedDollars(pnlOnHeavyDays)}, lighter days (≤3 trades) net ${formatSignedDollars(pnlOnLightDays)}.`;

  return {
    key: 'overtrading',
    title: 'Overtrading check — last 30 days',
    stats,
    verdict: rateSentence + pnlSentence,
    followUp: 'Why am I overtrading and how do I stop it?',
  };
}

function computeWinRate(trades: InstantTrade[]): InstantAnswer | null {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const isClosedThisMonth = (t: InstantTrade) => {
    if (!t.close_at) return false;
    const d = new Date(t.close_at);
    if (Number.isNaN(d.getTime())) return false;
    const outcome = (t.outcome ?? '').toUpperCase();
    if (outcome !== 'WIN' && outcome !== 'LOSS' && outcome !== 'BE') return false;
    return d >= monthStart && d <= now;
  };

  const thisMonth = trades.filter(isClosedThisMonth);
  if (thisMonth.length < 3) return null;

  const wins = thisMonth.filter((t) => (t.outcome ?? '').toUpperCase() === 'WIN').length;
  const losses = thisMonth.filter((t) => (t.outcome ?? '').toUpperCase() === 'LOSS').length;
  const breakEven = thisMonth.filter((t) => (t.outcome ?? '').toUpperCase() === 'BE').length;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const netPnl = thisMonth.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const stats: InstantStat[] = [
    {
      label: 'Win rate',
      value: `${winRate.toFixed(1)}%`,
      tone: winRate >= 50 ? 'good' : 'warn',
    },
    {
      label: 'W / L / BE',
      value: `${wins} / ${losses} / ${breakEven}`,
      tone: 'neutral',
    },
    {
      label: 'Net P&L',
      value: formatSignedDollars(netPnl),
      tone: netPnl > 0 ? 'good' : netPnl < 0 ? 'warn' : 'neutral',
    },
  ];

  let verdict = `You're at a ${winRate.toFixed(1)}% win rate this month across ${thisMonth.length} closed trades, netting ${formatSignedDollars(netPnl)}.`;

  const prevMonth = trades.filter((t) => {
    if (!t.close_at) return false;
    const d = new Date(t.close_at);
    if (Number.isNaN(d.getTime())) return false;
    const outcome = (t.outcome ?? '').toUpperCase();
    if (outcome !== 'WIN' && outcome !== 'LOSS' && outcome !== 'BE') return false;
    return d >= prevMonthStart && d < monthStart;
  });

  if (prevMonth.length >= 3) {
    const prevWins = prevMonth.filter((t) => (t.outcome ?? '').toUpperCase() === 'WIN').length;
    const prevLosses = prevMonth.filter((t) => (t.outcome ?? '').toUpperCase() === 'LOSS').length;
    const prevWinRate = prevWins + prevLosses > 0 ? (prevWins / (prevWins + prevLosses)) * 100 : 0;
    const diff = winRate - prevWinRate;
    const direction = diff >= 0 ? 'up' : 'down';
    verdict += ` That's ${direction} from ${prevWinRate.toFixed(1)}% last month.`;
  }

  return {
    key: 'win-rate',
    title: 'Win rate — this month',
    stats,
    verdict,
    followUp: 'How can I improve my win rate?',
  };
}

// Rendered when the question matched but the journal doesn't have enough
// trades to compute a real answer. Still zero-cost: without this, the match
// would fall through to the AI and burn a quota question on an answer the
// model can't ground in data anyway.
function insufficientDataAnswer(key: string, title: string, question: string): InstantAnswer {
  return {
    key,
    title,
    stats: [],
    verdict:
      'Not enough journal data yet — log at least 3 trades and this answer is computed instantly from your own journal, free.',
    followUp: question,
    followUpLabel: 'Ask FINO anyway',
  };
}

export function computeInstantAnswer(key: string, trades: InstantTrade[]): InstantAnswer | null {
  if (key === 'overtrading') {
    return (
      computeOvertrading(trades) ??
      insufficientDataAnswer(key, 'Overtrading check', 'Am I overtrading?')
    );
  }
  if (key === 'win-rate') {
    return (
      computeWinRate(trades) ??
      insufficientDataAnswer(key, 'Win rate — this month', "What's my win rate this month?")
    );
  }
  return null;
}
