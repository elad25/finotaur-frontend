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
  { key: 'pnl-week', question: "What's my P&L this week?" },
  { key: 'pnl-today', question: "What's my P&L today?" },
  { key: 'best-setup', question: "What's my best setup?" },
  { key: 'most-traded-symbol', question: "What's my most traded symbol?" },
  { key: 'avg-r-multiple', question: "What's my average R multiple?" },
  { key: 'current-streak', question: "What's my current streak?" },
];

/** Minimal structural shape — works with the app's real Trade type. */
export interface InstantTrade {
  open_at?: string | null;
  close_at?: string | null;
  pnl?: number | null;
  outcome?: string | null;
  symbol?: string | null;
  setup?: string | null;
  strategy_name?: string | null;
  actual_r?: number | null;
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

function formatR(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  if (rounded === 0) return '0.00R';
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}${Math.abs(rounded).toFixed(2)}R`;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcWeek(d: Date): Date {
  const day = startOfUtcDay(d);
  const dow = day.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? 6 : dow - 1; // days since Monday
  return new Date(day.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
}

function isClosedOutcome(t: InstantTrade): boolean {
  if (!t.close_at) return false;
  const outcome = (t.outcome ?? '').toUpperCase();
  return outcome === 'WIN' || outcome === 'LOSS' || outcome === 'BE';
}

function summarizeLastTen(closedSortedDesc: InstantTrade[]): string {
  const last10 = closedSortedDesc.slice(0, 10);
  const wins = last10.filter((t) => (t.outcome ?? '').toUpperCase() === 'WIN').length;
  const losses = last10.filter((t) => (t.outcome ?? '').toUpperCase() === 'LOSS').length;
  return `${wins}W-${losses}L`;
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

function computePnlForPeriod(trades: InstantTrade[], period: 'week' | 'today'): InstantAnswer | null {
  const now = new Date();
  const periodStart = period === 'today' ? startOfUtcDay(now) : startOfUtcWeek(now);
  const minTrades = period === 'today' ? 1 : 2;

  const closed = trades.filter((t) => {
    if (!isClosedOutcome(t)) return false;
    const d = new Date(t.close_at as string);
    return !Number.isNaN(d.getTime()) && d >= periodStart && d <= now;
  });

  if (closed.length < minTrades) return null;

  const wins = closed.filter((t) => (t.outcome ?? '').toUpperCase() === 'WIN').length;
  const losses = closed.filter((t) => (t.outcome ?? '').toUpperCase() === 'LOSS').length;
  const netPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const periodLabel = period === 'today' ? 'today' : 'this week';

  const stats: InstantStat[] = [
    {
      label: 'Net P&L',
      value: formatSignedDollars(netPnl),
      tone: netPnl > 0 ? 'good' : netPnl < 0 ? 'warn' : 'neutral',
    },
    { label: 'Trades closed', value: String(closed.length), tone: 'neutral' },
    { label: 'Win rate', value: `${winRate.toFixed(0)}%`, tone: winRate >= 50 ? 'good' : 'warn' },
  ];

  const verdict = `You're ${netPnl >= 0 ? 'up' : 'down'} ${formatSignedDollars(netPnl)} ${periodLabel} across ${closed.length} closed trade${closed.length === 1 ? '' : 's'}, at a ${winRate.toFixed(0)}% win rate.`;

  return {
    key: period === 'today' ? 'pnl-today' : 'pnl-week',
    title: period === 'today' ? 'P&L — today' : 'P&L — this week',
    stats,
    verdict,
    followUp: period === 'today' ? 'Why is my P&L today what it is?' : 'Why is my P&L this week what it is?',
  };
}

function computeBestSetup(trades: InstantTrade[]): InstantAnswer | null {
  const closed = trades.filter(isClosedOutcome);

  const byGroup = new Map<string, InstantTrade[]>();
  for (const t of closed) {
    const label = (t.setup ?? t.strategy_name ?? '')?.trim();
    if (!label) continue;
    const arr = byGroup.get(label) ?? [];
    arr.push(t);
    byGroup.set(label, arr);
  }

  const qualifying = Array.from(byGroup.entries()).filter(([, arr]) => arr.length >= 3);
  if (qualifying.length === 0) return null;

  const ranked = qualifying
    .map(([label, arr]) => {
      const netPnl = arr.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
      const wins = arr.filter((t) => (t.outcome ?? '').toUpperCase() === 'WIN').length;
      const losses = arr.filter((t) => (t.outcome ?? '').toUpperCase() === 'LOSS').length;
      const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
      return { label, netPnl, winRate, count: arr.length };
    })
    .sort((a, b) => b.netPnl - a.netPnl);

  const best = ranked[0];

  const stats: InstantStat[] = [
    {
      label: 'Net P&L',
      value: formatSignedDollars(best.netPnl),
      tone: best.netPnl > 0 ? 'good' : best.netPnl < 0 ? 'warn' : 'neutral',
    },
    { label: 'Win rate', value: `${best.winRate.toFixed(0)}%`, tone: best.winRate >= 50 ? 'good' : 'warn' },
    { label: 'Trades', value: String(best.count), tone: 'neutral' },
  ];

  const verdict = `"${best.label}" is your best setup — ${best.count} trades netting ${formatSignedDollars(best.netPnl)} at a ${best.winRate.toFixed(0)}% win rate.`;

  return {
    key: 'best-setup',
    title: 'Best setup',
    stats,
    verdict,
    followUp: `Why does "${best.label}" work so well for me?`,
  };
}

function computeMostTradedSymbol(trades: InstantTrade[]): InstantAnswer | null {
  if (trades.length < 3) return null;

  const bySymbol = new Map<string, InstantTrade[]>();
  for (const t of trades) {
    const sym = (t.symbol ?? '')?.trim().toUpperCase();
    if (!sym) continue;
    const arr = bySymbol.get(sym) ?? [];
    arr.push(t);
    bySymbol.set(sym, arr);
  }

  const ranked = Array.from(bySymbol.entries()).sort((a, b) => b[1].length - a[1].length);
  if (ranked.length === 0 || ranked[0][1].length < 3) return null;

  const [topSymbol, topTrades] = ranked[0];
  const closed = topTrades.filter(isClosedOutcome);
  const netPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const pctOfJournal = (topTrades.length / trades.length) * 100;

  const stats: InstantStat[] = [
    { label: 'Trades', value: String(topTrades.length), tone: 'neutral' },
    { label: '% of journal', value: `${pctOfJournal.toFixed(0)}%`, tone: 'neutral' },
    {
      label: 'Net P&L',
      value: formatSignedDollars(netPnl),
      tone: netPnl > 0 ? 'good' : netPnl < 0 ? 'warn' : 'neutral',
    },
  ];

  const verdict = `${topSymbol} is your most-traded symbol — ${topTrades.length} trades (${pctOfJournal.toFixed(0)}% of your journal), netting ${formatSignedDollars(netPnl)}.`;

  return {
    key: 'most-traded-symbol',
    title: 'Most traded symbol',
    stats,
    verdict,
    followUp: `What's my performance breakdown on ${topSymbol}?`,
  };
}

function computeAvgRMultiple(trades: InstantTrade[]): InstantAnswer | null {
  const withR = trades.filter(
    (t) => isClosedOutcome(t) && typeof t.actual_r === 'number' && Number.isFinite(t.actual_r),
  );

  if (withR.length < 3) return null;

  const avgR = withR.reduce((sum, t) => sum + (t.actual_r ?? 0), 0) / withR.length;
  const positiveR = withR.filter((t) => (t.actual_r ?? 0) > 0);
  const negativeR = withR.filter((t) => (t.actual_r ?? 0) < 0);
  const avgWinR =
    positiveR.length > 0 ? positiveR.reduce((s, t) => s + (t.actual_r ?? 0), 0) / positiveR.length : 0;
  const avgLossR =
    negativeR.length > 0 ? negativeR.reduce((s, t) => s + (t.actual_r ?? 0), 0) / negativeR.length : 0;

  const stats: InstantStat[] = [
    { label: 'Avg R multiple', value: formatR(avgR), tone: avgR > 0 ? 'good' : avgR < 0 ? 'warn' : 'neutral' },
    { label: 'Avg win R', value: formatR(avgWinR), tone: 'good' },
    { label: 'Avg loss R', value: formatR(avgLossR), tone: 'warn' },
  ];

  const verdict = `Across ${withR.length} trades with recorded R, you're averaging ${formatR(avgR)} per trade — winners average ${formatR(avgWinR)}, losers average ${formatR(avgLossR)}.`;

  return {
    key: 'avg-r-multiple',
    title: 'Average R multiple',
    stats,
    verdict,
    followUp: 'How can I improve my average R multiple?',
  };
}

function computeCurrentStreak(trades: InstantTrade[]): InstantAnswer | null {
  const closed = trades
    .filter(isClosedOutcome)
    .sort((a, b) => new Date(b.close_at as string).getTime() - new Date(a.close_at as string).getTime());

  if (closed.length < 3) return null;

  const mostRecentOutcome = (closed[0].outcome ?? '').toUpperCase();
  if (mostRecentOutcome !== 'WIN' && mostRecentOutcome !== 'LOSS') {
    return {
      key: 'current-streak',
      title: 'Current streak',
      stats: [
        { label: 'Current streak', value: '—', tone: 'neutral' },
        { label: 'Last trade', value: 'Break-even', tone: 'neutral' },
        { label: 'Last 10 trades', value: summarizeLastTen(closed), tone: 'neutral' },
      ],
      verdict:
        "Your most recent trade closed break-even, so there's no active winning or losing streak right now.",
      followUp: 'How do I build a winning streak?',
    };
  }

  let streakLength = 0;
  const streakTrades: InstantTrade[] = [];
  for (const t of closed) {
    const outcome = (t.outcome ?? '').toUpperCase();
    if (outcome !== mostRecentOutcome) break;
    streakLength++;
    streakTrades.push(t);
  }

  const streakPnl = streakTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const isWinStreak = mostRecentOutcome === 'WIN';

  const stats: InstantStat[] = [
    {
      label: 'Current streak',
      value: `${streakLength}${isWinStreak ? 'W' : 'L'}`,
      tone: isWinStreak ? 'good' : 'warn',
    },
    {
      label: 'Streak P&L',
      value: formatSignedDollars(streakPnl),
      tone: streakPnl > 0 ? 'good' : streakPnl < 0 ? 'warn' : 'neutral',
    },
    { label: 'Last 10 trades', value: summarizeLastTen(closed), tone: 'neutral' },
  ];

  const verdict = isWinStreak
    ? `You're on a ${streakLength}-trade winning streak, netting ${formatSignedDollars(streakPnl)} across those trades.`
    : `You're on a ${streakLength}-trade losing streak, down ${formatSignedDollars(streakPnl)} across those trades.`;

  return {
    key: 'current-streak',
    title: 'Current streak',
    stats,
    verdict,
    followUp: isWinStreak
      ? "What's driving this winning streak so I can keep it going?"
      : 'Why am I on this losing streak and how do I break it?',
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
    verdict: "Not enough journal data yet — log at least 3 trades and I'll have this for you.",
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
  if (key === 'pnl-week') {
    return (
      computePnlForPeriod(trades, 'week') ??
      insufficientDataAnswer(key, 'P&L — this week', "What's my P&L this week?")
    );
  }
  if (key === 'pnl-today') {
    return (
      computePnlForPeriod(trades, 'today') ??
      insufficientDataAnswer(key, 'P&L — today', "What's my P&L today?")
    );
  }
  if (key === 'best-setup') {
    return (
      computeBestSetup(trades) ??
      insufficientDataAnswer(key, 'Best setup', "What's my best setup?")
    );
  }
  if (key === 'most-traded-symbol') {
    return (
      computeMostTradedSymbol(trades) ??
      insufficientDataAnswer(key, 'Most traded symbol', "What's my most traded symbol?")
    );
  }
  if (key === 'avg-r-multiple') {
    return (
      computeAvgRMultiple(trades) ??
      insufficientDataAnswer(key, 'Average R multiple', "What's my average R multiple?")
    );
  }
  if (key === 'current-streak') {
    return (
      computeCurrentStreak(trades) ??
      insufficientDataAnswer(key, 'Current streak', "What's my current streak?")
    );
  }
  return null;
}
