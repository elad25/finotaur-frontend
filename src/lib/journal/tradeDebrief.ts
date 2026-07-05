// src/lib/journal/tradeDebrief.ts
// =====================================================
// Trade Debrief — deterministic, rule-based per-trade coaching layer.
// Pure function: no React, no I/O, no network calls.
// Reads the recorded stop, target, and the trader's actual behaviour on a
// SINGLE trade, and produces ranked, honest conclusions + "next time" actions.
// Mirrors the style of shadowInsight.ts (mentor voice, deterministic, no LLM).
// =====================================================

import type { Trade } from '@/hooks/useTradesData';
import type { PlannedResult } from '@/lib/journal/plannedScenarios';

// ─── Public types ─────────────────────────────────────────────────────────────

export type DebriefPointKind = 'plan' | 'discipline' | 'exit' | 'risk' | 'journal';
export type DebriefTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface DebriefPoint {
  kind: DebriefPointKind;
  tone: DebriefTone;
  text: string;
}

/** One row of the compact "small report" rendering (Result/Stop/Target/…). */
export interface DebriefReportLine {
  label: string;
  text: string;
  tone: DebriefTone;
}

/** One cell of the numbers scorecard (Result, Planned risk, Actual R, Planned R:R, Left on table). */
export interface DebriefStat {
  label: string;
  value: string;
  tone: DebriefTone;
}

/** One row of the discipline checklist. */
export interface DebriefCheck {
  label: string;
  status: 'pass' | 'fail' | 'na';
}

export interface TradeDebrief {
  verdict: string;
  headline: string;
  points: DebriefPoint[];
  nextTime: string[];
  /** 4-7 short report lines: Result, Stop, Target, [Behavior], [Risk], Verdict, Next time. */
  reportLines: DebriefReportLine[];
  /** The single most important "do this next" action — never empty. */
  primaryAction: string;
  /** One short sentence tying primaryAction to the dominant finding; '' when there's nothing to explain. */
  actionWhy: string;
  /** 3-5 scorecard cells (Result, Planned risk, Actual R, Planned R:R, [Left on table]). */
  stats: DebriefStat[];
  /** 4 discipline checks (stop set, stop respected, target defined, held to target). */
  checklist: DebriefCheck[];
}

export interface TradeDebriefExtras {
  /** Number of times the stop was moved during the trade's lifetime, if known. */
  stopMoves?: number;
  /** Max favourable excursion in $, if known (from bar-derived what-if data). */
  mfeUsd?: number | null;
}

// ─── Formatting helper (mirrors shadowInsight.ts's `money`) ──────────────────

function money(n: number): string {
  return (n >= 0 ? '+' : '-') + '$' + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function absMoney(n: number): string {
  return '$' + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtR(r: number): string {
  return `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`;
}

// ─── Tone ranking (for capping + sorting) ────────────────────────────────────

const TONE_RANK: Record<DebriefTone, number> = {
  bad: 3,
  warn: 2,
  good: 1,
  neutral: 0,
};

// ─── Multiplier resolution (mirrors plannedScenarios.ts) ─────────────────────

const ASSET_MULTIPLIERS: Record<string, number> = {
  ES: 50, MES: 5, NQ: 20, MNQ: 2, YM: 5,
  RTY: 50, CL: 1000, GC: 100, SI: 5000, ZB: 1000, ZN: 1000,
};

function resolveMultiplier(trade: Trade): number {
  if (trade.multiplier != null && trade.multiplier > 0) return trade.multiplier;
  const sym = (trade.symbol ?? '').toUpperCase().trim().replace(/\d+$/, '');
  return ASSET_MULTIPLIERS[sym] ?? 1;
}

// ─── Core function ────────────────────────────────────────────────────────────

export function buildTradeDebrief(
  trade: Trade,
  scenarios: PlannedResult,
  extras?: TradeDebriefExtras,
): TradeDebrief {
  const mult = resolveMultiplier(trade);
  const scenarioMap = Object.fromEntries(scenarios.scenarios.map((s) => [s.key, s]));
  const stopScenario = scenarioMap['stop'];
  const targetScenario = scenarioMap['target'];

  const pnl = scenarios.actualPnl;
  const isWin = pnl > 0;
  const isLoss = pnl < 0;

  const hasStop = !!stopScenario?.available;
  const hasTarget = !!targetScenario?.available;

  // ── Planned risk/reward in $ ────────────────────────────────────────────────
  const plannedRiskUsd = hasStop
    ? Math.abs(trade.entry_price - trade.stop_price) * trade.quantity * mult
    : (trade.risk_usd ?? null);

  const plannedRewardUsd =
    hasTarget && trade.take_profit_price != null
      ? Math.abs(trade.take_profit_price - trade.entry_price) * trade.quantity * mult
      : null;

  const plannedRR =
    plannedRiskUsd != null && plannedRiskUsd > 0 && plannedRewardUsd != null
      ? plannedRewardUsd / plannedRiskUsd
      : null;

  // Scratch threshold: |pnl| < $1 or < 5% of planned risk.
  const scratchThreshold =
    plannedRiskUsd != null && plannedRiskUsd > 0 ? Math.max(1, plannedRiskUsd * 0.05) : 1;
  const isScratch = Math.abs(pnl) < scratchThreshold;

  const points: DebriefPoint[] = [];
  const nextTime: string[] = [];

  // ── Own-words next_time entry goes FIRST, always ───────────────────────────
  if (trade.next_time && trade.next_time.trim().length > 0) {
    nextTime.push(`Your note: "${trade.next_time.trim()}".`);
  }

  // ── JOURNAL BEHAVIOR ─────────────────────────────────────────────────────────
  if (trade.emotion && trade.emotion.trim().length > 0) {
    points.push({
      kind: 'journal',
      tone: 'neutral',
      text: `You logged your state as "${trade.emotion.trim()}" — factor that into the read above.`,
    });
  }
  if (trade.mistake && trade.mistake.trim().length > 0) {
    points.push({
      kind: 'journal',
      tone: 'warn',
      text: `Your own note flags: "${trade.mistake.trim()}".`,
    });
  }

  // ── PLAN QUALITY ─────────────────────────────────────────────────────────────
  let planBreach = false;
  if (!hasStop) {
    planBreach = true;
    points.push({
      kind: 'plan',
      tone: 'bad',
      text: 'You traded without a recorded stop.',
    });
    nextTime.push('Set a hard stop in the market before entry — no stop means undefined risk.');
  }

  if (!hasTarget) {
    points.push({
      kind: 'plan',
      tone: 'warn',
      text: 'You exited on feel, with no plan target recorded.',
    });
    nextTime.push("Define a profit target (or trailing rule) before entry so exits aren't improvised.");
  }

  if (hasStop && hasTarget && plannedRR != null && plannedRR < 1) {
    points.push({
      kind: 'plan',
      tone: 'warn',
      text: `Your plan risked more than it aimed to make (R:R ${plannedRR.toFixed(2)}:1).`,
    });
  }

  // ── WINNER ───────────────────────────────────────────────────────────────────
  let metOrExceededTarget = false;
  let earlyExitWinner = false;

  if (isWin) {
    if (hasTarget && targetScenario?.pnl != null) {
      const targetPnl = targetScenario.pnl;
      const gapAbs = targetPnl - pnl;
      const meaningfulGap = gapAbs > Math.abs(targetPnl) * 0.05;

      if (pnl < targetPnl && meaningfulGap) {
        earlyExitWinner = true;
        const pct = targetPnl !== 0 ? Math.max(0, Math.round((pnl / targetPnl) * 100)) : 0;
        const actualR =
          plannedRiskUsd != null && plannedRiskUsd > 0 ? pnl / plannedRiskUsd : null;
        const plannedRTarget =
          plannedRiskUsd != null && plannedRiskUsd > 0 ? targetPnl / plannedRiskUsd : null;
        const rPhrase =
          actualR != null && plannedRTarget != null
            ? ` at ${fmtR(actualR)} when the plan aimed for ${fmtR(plannedRTarget)}`
            : '';
        points.push({
          kind: 'exit',
          tone: 'warn',
          text: `You captured ${pct}% of the planned move, leaving ${absMoney(gapAbs)} on the table by exiting early${rPhrase} — if price had reached your target.`,
        });
        nextTime.push('Hold to the plan target or manage with a predefined trailing rule instead of an impulse exit.');
      } else if (pnl >= targetPnl) {
        metOrExceededTarget = true;
        points.push({
          kind: 'exit',
          tone: 'good',
          text: 'You met or exceeded the plan target.',
        });
      }
    }

    if (hasStop && plannedRiskUsd != null && plannedRiskUsd > 0) {
      const actualR = pnl / plannedRiskUsd;
      points.push({
        kind: 'risk',
        tone: 'good',
        text: `You made ${fmtR(actualR)} on ${absMoney(plannedRiskUsd)} of planned risk.`,
      });
    }

    if (extras?.mfeUsd != null && extras.mfeUsd > pnl && extras.mfeUsd - pnl > Math.abs(pnl) * 0.05) {
      const pct = extras.mfeUsd !== 0 ? Math.max(0, Math.round((pnl / extras.mfeUsd) * 100)) : 0;
      points.push({
        kind: 'exit',
        tone: 'warn',
        text: `Peak open profit was ${absMoney(extras.mfeUsd)}, you kept ${pct}% of it.`,
      });
    }
  }

  // ── LOSER ────────────────────────────────────────────────────────────────────
  let tookStopAsPlanned = false;
  let lossBeyondPlan = false;
  let lossCutEarly = false;

  if (isLoss && !isScratch) {
    const absPnl = Math.abs(pnl);

    if (hasStop && plannedRiskUsd != null && plannedRiskUsd > 0) {
      if (absPnl > plannedRiskUsd * 1.1) {
        lossBeyondPlan = true;
        const overage = absPnl - plannedRiskUsd;
        points.push({
          kind: 'discipline',
          tone: 'bad',
          text: `You lost ${absMoney(overage)} MORE than planned risk — the stop was moved or ignored.`,
        });
        nextTime.push("Your stop is a contract — once it's set, it only moves in your favor.");
      } else if (absPnl >= plannedRiskUsd * 0.9) {
        tookStopAsPlanned = true;
        points.push({
          kind: 'discipline',
          tone: 'good',
          text: 'Planned loss — you took the stop as designed. Good process; losses like this are the cost of doing business.',
        });
      } else {
        lossCutEarly = true;
        points.push({
          kind: 'exit',
          tone: 'neutral',
          text: `You cut before the stop — that saved money if the stop would have been hit, but exiting early second-guesses the plan.`,
        });
      }
    }

    if (extras?.stopMoves != null && extras.stopMoves > 0) {
      points.push({
        kind: 'discipline',
        tone: 'bad',
        text: `You moved your stop ${extras.stopMoves} time${extras.stopMoves === 1 ? '' : 's'} during this trade.`,
      });
    }
  }

  // ── VERDICT selection ───────────────────────────────────────────────────────
  let verdict: string;
  if (!hasStop) {
    verdict = 'No plan on record';
  } else if (isScratch) {
    verdict = 'Scratch';
  } else if (isWin && metOrExceededTarget) {
    verdict = 'Disciplined win';
  } else if (isWin && earlyExitWinner) {
    verdict = 'Win — early exit';
  } else if (isWin) {
    verdict = 'Win outside plan';
  } else if (isLoss && tookStopAsPlanned) {
    verdict = 'Planned loss — good process';
  } else if (isLoss && lossBeyondPlan) {
    verdict = 'Loss beyond plan';
  } else if (isLoss && lossCutEarly) {
    verdict = 'Loss — cut early';
  } else {
    verdict = isLoss ? 'Loss outside plan' : 'Win outside plan';
  }

  // ── HEADLINE ─────────────────────────────────────────────────────────────────
  const actualR =
    plannedRiskUsd != null && plannedRiskUsd > 0 ? pnl / plannedRiskUsd : null;
  const rSuffix = actualR != null ? ` (${fmtR(actualR)})` : '';
  let headline = `${trade.side} ${trade.symbol} closed ${money(pnl)}${rSuffix}`;
  if (earlyExitWinner) {
    headline += ' — you exited before your target.';
  } else if (lossBeyondPlan) {
    headline += ' — you lost more than your plan risked.';
  } else if (tookStopAsPlanned) {
    headline += ' — your stop worked as designed.';
  } else if (!hasStop) {
    headline += ' — no stop was recorded.';
  } else {
    headline += '.';
  }
  if (headline.length > 140) {
    headline = headline.slice(0, 137) + '...';
  }

  // ── Rank + cap points ────────────────────────────────────────────────────────
  // bad > warn > good > neutral; ties broken by $ magnitude (points don't carry
  // raw $ so we approximate using plannedRiskUsd/pnl magnitude as a stable proxy
  // via original insertion order, which already reflects narrative importance).
  const rankedPoints = [...points].sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone]);
  const cappedPoints = rankedPoints.slice(0, 5);

  // ── REPORT LINES ─────────────────────────────────────────────────────────────
  // Short, deterministic "small report" rows composed from the same findings
  // above. Always 4-7 lines: Result, Stop, Target, [Behavior], [Risk], Verdict,
  // Next time. Every text is capped to a single short sentence.
  function capLine(s: string, hardCap = 110): string {
    return s.length > hardCap ? s.slice(0, hardCap - 1).trimEnd() + '…' : s;
  }

  const reportLines: DebriefReportLine[] = [];

  // 1) Result — always
  reportLines.push({
    label: 'Result',
    tone: isWin ? 'good' : isLoss ? 'bad' : 'neutral',
    text: capLine(`${trade.side} ${trade.symbol} — closed ${money(pnl)}${rSuffix}.`),
  });

  // 2) Stop — always
  {
    let stopText: string;
    let stopTone: DebriefTone;
    if (!hasStop) {
      stopText = 'None recorded — risk was undefined.';
      stopTone = 'bad';
    } else if (isLoss && lossBeyondPlan && plannedRiskUsd != null) {
      const overage = Math.abs(pnl) - plannedRiskUsd;
      stopText = `Ignored — cost you an extra ${absMoney(overage)} vs the planned risk.`;
      stopTone = 'bad';
    } else if (isLoss && tookStopAsPlanned) {
      stopText = 'Taken as designed. Good process.';
      stopTone = 'good';
    } else if (isLoss && lossCutEarly) {
      stopText = `Set at ${trade.stop_price}; you cut before it was hit.`;
      stopTone = 'neutral';
    } else {
      stopText = `Set at ${trade.stop_price}; never needed.`;
      stopTone = 'good';
    }
    reportLines.push({ label: 'Stop', tone: stopTone, text: capLine(stopText) });
  }

  // 3) Target — always
  {
    let targetText: string;
    let targetTone: DebriefTone;
    if (!hasTarget) {
      targetText = 'None recorded — the exit was improvised.';
      targetTone = 'warn';
    } else if (isWin && earlyExitWinner && targetScenario?.pnl != null) {
      const gapAbs = targetScenario.pnl - pnl;
      targetText = `Exited early — left ~${absMoney(gapAbs)} on the table if price had reached it.`;
      targetTone = 'warn';
    } else if (isWin && metOrExceededTarget) {
      targetText = 'Met. Plan followed.';
      targetTone = 'good';
    } else {
      targetText = `Set at ${trade.take_profit_price}; not reached.`;
      targetTone = 'neutral';
    }
    reportLines.push({ label: 'Target', tone: targetTone, text: capLine(targetText) });
  }

  // 4) Behavior — only when there's material (emotion / mistake / stopMoves / MFE give-back)
  {
    const behaviorBits: string[] = [];
    if (trade.mistake && trade.mistake.trim().length > 0) {
      behaviorBits.push(`logged mistake: "${trade.mistake.trim()}"`);
    } else if (trade.emotion && trade.emotion.trim().length > 0) {
      behaviorBits.push(`logged "${trade.emotion.trim()}"`);
    }
    if (extras?.stopMoves != null && extras.stopMoves > 0) {
      behaviorBits.push(`moved stop ${extras.stopMoves}x`);
    }
    if (extras?.mfeUsd != null && extras.mfeUsd > pnl && extras.mfeUsd - pnl > Math.abs(pnl) * 0.05) {
      const pct = extras.mfeUsd !== 0 ? Math.max(0, Math.round((pnl / extras.mfeUsd) * 100)) : 0;
      behaviorBits.push(`peak profit ${absMoney(extras.mfeUsd)}, kept ${pct}%`);
    }
    if (behaviorBits.length > 0) {
      const tone: DebriefTone =
        trade.mistake && trade.mistake.trim().length > 0
          ? 'warn'
          : (extras?.stopMoves ?? 0) > 0
            ? 'bad'
            : 'neutral';
      reportLines.push({
        label: 'Behavior',
        tone,
        text: capLine(behaviorBits.map((b) => b[0].toUpperCase() + b.slice(1)).join('; ') + '.'),
      });
    }
  }

  // 5) Risk — only when plannedRR < 1
  if (hasStop && hasTarget && plannedRR != null && plannedRR < 1) {
    reportLines.push({
      label: 'Risk',
      tone: 'warn',
      text: capLine(`Plan risked more than it aimed to make (R:R ${plannedRR.toFixed(2)}:1).`),
    });
  }

  // 6) Verdict — always, short conclusion sentence
  {
    let verdictText: string;
    if (!hasStop) {
      verdictText = 'No plan on record — risk was left to chance.';
    } else if (isScratch) {
      verdictText = 'A scratch — no real read either way.';
    } else if (isWin && metOrExceededTarget) {
      verdictText = 'A clean, disciplined win.';
    } else if (isWin && earlyExitWinner) {
      verdictText = 'A win, but nerves — not the plan — capped it.';
    } else if (isLoss && tookStopAsPlanned) {
      verdictText = 'A planned loss — the process worked.';
    } else if (isLoss && lossBeyondPlan) {
      verdictText = 'A loss made worse by management, not the market.';
    } else if (isLoss && lossCutEarly) {
      verdictText = 'A loss — but you second-guessed your own plan.';
    } else {
      verdictText = isLoss ? 'A loss outside the original plan.' : 'A win, but outside the original plan.';
    }
    reportLines.push({ label: 'Verdict', tone: 'neutral', text: capLine(verdictText) });
  }

  // 7) Next time — always, ONE compact action (user's own note wins)
  {
    const topNextTime = nextTime[0] ?? 'Keep the same process — nothing to change here.';
    reportLines.push({ label: 'Next time', tone: 'neutral', text: capLine(topNextTime) });
  }

  // ── STATS (numbers scorecard) ───────────────────────────────────────────────
  const stats: DebriefStat[] = [];

  // Result — always computable.
  stats.push({
    label: 'Result',
    value: money(pnl),
    tone: isWin ? 'good' : isLoss ? 'bad' : 'neutral',
  });

  // Planned risk — '—' (and bad tone) when no stop is recorded.
  stats.push({
    label: 'Planned risk',
    value: plannedRiskUsd != null && plannedRiskUsd > 0 ? absMoney(plannedRiskUsd) : '—',
    tone: hasStop ? 'neutral' : 'bad',
  });

  // Actual R — prefer the trade's own recorded actual_r, else derive from pnl/plannedRiskUsd.
  {
    const derivedActualR =
      trade.actual_r != null
        ? trade.actual_r
        : plannedRiskUsd != null && plannedRiskUsd > 0
          ? pnl / plannedRiskUsd
          : null;
    stats.push({
      label: 'Actual R',
      value: derivedActualR != null ? fmtR(derivedActualR) : '—',
      tone: derivedActualR == null ? 'neutral' : derivedActualR > 0 ? 'good' : derivedActualR < 0 ? 'bad' : 'neutral',
    });
  }

  // Planned R:R — only when both stop and target are present.
  stats.push({
    label: 'Planned R:R',
    value: plannedRR != null ? `${plannedRR.toFixed(1)}:1` : '—',
    tone: plannedRR != null && plannedRR < 1 ? 'warn' : 'neutral',
  });

  // Left on table — only for a winner who exited before target (estimate, phrased as such).
  if (isWin && earlyExitWinner && targetScenario?.pnl != null) {
    const gapAbs = targetScenario.pnl - pnl;
    stats.push({
      label: 'Left on table (est.)',
      value: absMoney(gapAbs),
      tone: 'warn',
    });
  }

  // ── CHECKLIST (discipline) ──────────────────────────────────────────────────
  const checklist: DebriefCheck[] = [];

  // 1) Stop set before entry
  checklist.push({ label: 'Stop set before entry', status: hasStop ? 'pass' : 'fail' });

  // 2) Stop respected
  if (!hasStop) {
    checklist.push({ label: 'Stop respected', status: 'na' });
  } else if (isLoss && !isScratch) {
    checklist.push({ label: 'Stop respected', status: lossBeyondPlan ? 'fail' : 'pass' });
  } else {
    // Winner (or scratch) with a stop on record — never breached it.
    checklist.push({ label: 'Stop respected', status: 'pass' });
  }

  // 3) Target defined
  checklist.push({ label: 'Target defined', status: hasTarget ? 'pass' : 'fail' });

  // 4) Held to target
  if (!hasTarget || targetScenario?.pnl == null) {
    checklist.push({ label: 'Held to target', status: 'na' });
  } else {
    checklist.push({ label: 'Held to target', status: pnl >= targetScenario.pnl ? 'pass' : 'fail' });
  }

  // ── PRIMARY ACTION + WHY ─────────────────────────────────────────────────────
  const GENERIC_FALLBACK_ACTION =
    'Keep logging stop, target and reason on every trade so Shadow can grade the next one.';

  let primaryAction: string;
  if (trade.next_time && trade.next_time.trim().length > 0) {
    primaryAction = trade.next_time.trim();
  } else if (nextTime.length > 0) {
    primaryAction = nextTime[0];
  } else {
    primaryAction = GENERIC_FALLBACK_ACTION;
  }

  let actionWhy = '';
  if (isScratch) {
    actionWhy = '';
  } else if (!hasStop) {
    actionWhy = 'No stop was on record, so risk on this trade was undefined.';
  } else if (lossBeyondPlan) {
    actionWhy = 'The loss ran past your planned risk — the stop was moved or ignored.';
  } else if (earlyExitWinner) {
    actionWhy = 'You exited before your target, capping a winner early.';
  } else if (!hasTarget) {
    actionWhy = 'No target was on record, so the exit was improvised.';
  } else if (lossCutEarly) {
    actionWhy = 'You cut the loss before the stop was hit, second-guessing the plan.';
  }

  return {
    verdict,
    headline,
    points: cappedPoints,
    nextTime: nextTime.slice(0, 3),
    reportLines,
    primaryAction,
    actionWhy,
    stats,
    checklist,
  };
}
