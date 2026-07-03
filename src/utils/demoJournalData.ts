import dayjs from 'dayjs';
import type { Trade } from '@/hooks/useTradesData';

// Deterministic pseudo-random in [0,1) — stable across reloads (no Math.random,
// so the preview looks identical every render/session).
function rand(i: number, salt = 1): number {
  const x = Math.sin((i + 1) * 12.9898 * salt + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const SYMBOLS = ['ES', 'NQ', 'MES', 'MNQ'] as const;
const MULT: Record<string, number> = { ES: 50, NQ: 20, MES: 5, MNQ: 2 };
const BASE_PRICE: Record<string, number> = { ES: 5300, NQ: 18500, MES: 5300, MNQ: 18500 };
const STOP_PTS: Record<string, number> = { ES: 6, NQ: 25, MES: 6, MNQ: 25 };

export const DEMO_STRATEGY_IDS = ['demo-strat-mss', 'demo-strat-fvg', 'demo-strat-orb'];
const STRAT_NAMES = ['ICT MSS', 'FVG Sniper', 'Opening Range Break'];
const SETUPS = ['Breaker + FVG', 'Liquidity sweep', 'Range breakout', 'Trend continuation', 'Reversal'];
const SESSIONS = ['London', 'NY AM', 'NY PM'];
const EMOTIONS = ['Calm', 'Focused', 'Confident', 'Anxious', 'FOMO'];
const QUALITY = ['A+', 'A', 'B', 'C'];
const NOTES = [
  'Clean setup, followed the plan and let it run to target.',
  'Entered on the retest after the sweep. Textbook execution.',
  'Slightly early entry — should have waited for confirmation.',
  'Cut it at break-even when momentum stalled.',
  'Scaled out at 2R and trailed the runner.',
  'Patient entry at the discount array. Let winners run.',
];

function buildDemoTrades(): Trade[] {
  const trades: Trade[] = [];
  const COUNT = 46;
  const nowIso = dayjs().toISOString();

  for (let i = 0; i < COUNT; i++) {
    const sym = SYMBOLS[Math.floor(rand(i, 3) * SYMBOLS.length)];
    const mult = MULT[sym];
    const side: 'LONG' | 'SHORT' = rand(i, 5) > 0.5 ? 'LONG' : 'SHORT';
    const stratIdx = Math.floor(rand(i, 7) * 3);
    const win = rand(i, 11) < 0.6;
    const isBE = !win && rand(i, 13) < 0.12;
    const isOpen = i < 2;

    const stopPts = +(STOP_PTS[sym] * (0.8 + rand(i, 17) * 0.6)).toFixed(2);
    const rTarget = 1.2 + rand(i, 19) * 2.3;
    const rMult = isOpen || isBE ? 0 : win ? rTarget : -1;
    const qty = sym.startsWith('M') ? 2 + Math.floor(rand(i, 23) * 8) : 1 + Math.floor(rand(i, 23) * 3);

    const basePx = BASE_PRICE[sym];
    const entry = +(basePx + (rand(i, 29) - 0.5) * basePx * 0.02).toFixed(2);
    const stop = +(side === 'LONG' ? entry - stopPts : entry + stopPts).toFixed(2);
    const profitPts = rMult * stopPts;
    const exit = isOpen ? undefined : +(side === 'LONG' ? entry + profitPts : entry - profitPts).toFixed(2);
    const takeProfit = +(side === 'LONG' ? entry + stopPts * 2 : entry - stopPts * 2).toFixed(2);

    const fees = +(qty * 2.1).toFixed(2);
    const riskUSD = +(stopPts * qty * mult).toFixed(2);
    const pnl = isOpen ? 0 : +(profitPts * qty * mult - fees).toFixed(2);
    const actualR = isOpen ? undefined : riskUSD > 0 ? +(pnl / riskUSD).toFixed(2) : undefined;
    const outcome: Trade['outcome'] = isOpen ? 'OPEN' : isBE ? 'BE' : win ? 'WIN' : 'LOSS';

    const daysAgo = isOpen ? 0 : 1 + Math.floor((i / COUNT) * 86 + rand(i, 31) * 3);
    const openAt = dayjs().subtract(daysAgo, 'day').hour(9 + Math.floor(rand(i, 37) * 6)).minute(Math.floor(rand(i, 41) * 59));
    const closeAt = isOpen ? undefined : openAt.add(20 + Math.floor(rand(i, 43) * 180), 'minute');

    trades.push({
      id: `demo-${i}`,
      user_id: '',
      symbol: sym,
      side,
      entry_price: entry,
      exit_price: exit,
      stop_price: stop,
      take_profit_price: takeProfit,
      quantity: qty,
      fees,
      pnl,
      outcome,
      open_at: openAt.toISOString(),
      close_at: closeAt?.toISOString(),
      session: SESSIONS[Math.floor(rand(i, 47) * SESSIONS.length)],
      strategy_id: DEMO_STRATEGY_IDS[stratIdx],
      strategy_name: STRAT_NAMES[stratIdx],
      setup: SETUPS[Math.floor(rand(i, 53) * SETUPS.length)],
      emotion: EMOTIONS[Math.floor(rand(i, 59) * EMOTIONS.length)],
      notes: rand(i, 61) > 0.45 ? NOTES[Math.floor(rand(i, 67) * NOTES.length)] : undefined,
      asset_class: 'futures',
      quality_tag: QUALITY[Math.floor(rand(i, 71) * QUALITY.length)],
      multiplier: mult,
      input_mode: 'summary',
      risk_usd: riskUSD,
      actual_r: actualR,
      metrics: { rr: 2, riskUSD, rewardUSD: pnl > 0 ? pnl : undefined, actual_r: actualR },
      created_at: openAt.toISOString(),
      updated_at: nowIso,
    } as Trade);
  }

  const optSeed = [
    { sym: 'SPY', type: 'CALL' as const, strike: 540, r: 2.4, win: true },
    { sym: 'QQQ', type: 'PUT' as const, strike: 460, r: -1, win: false },
    { sym: 'AAPL', type: 'CALL' as const, strike: 220, r: 1.6, win: true },
  ];
  optSeed.forEach((o, k) => {
    const qty = 3 + k;
    const entry = +(2.5 + k).toFixed(2);
    const riskUSD = +(entry * qty * 100 * 0.5).toFixed(2);
    const pnl = +(o.r * riskUSD).toFixed(2);
    const exit = +(entry + pnl / (qty * 100)).toFixed(2);
    const openAt = dayjs().subtract(4 + k * 3, 'day').hour(10).minute(15);
    trades.push({
      id: `demo-opt-${k}`,
      user_id: '',
      symbol: o.sym,
      side: 'LONG',
      entry_price: entry,
      exit_price: exit,
      stop_price: +(entry * 0.5).toFixed(2),
      quantity: qty,
      fees: +(qty * 0.65).toFixed(2),
      pnl,
      outcome: o.win ? 'WIN' : 'LOSS',
      open_at: openAt.toISOString(),
      close_at: openAt.add(2, 'hour').toISOString(),
      session: 'NY AM',
      strategy_id: DEMO_STRATEGY_IDS[0],
      strategy_name: STRAT_NAMES[0],
      setup: 'Earnings momentum',
      emotion: 'Focused',
      asset_class: 'options',
      quality_tag: o.win ? 'A' : 'C',
      multiplier: 100,
      input_mode: 'summary',
      risk_usd: riskUSD,
      actual_r: o.r,
      option_type: o.type,
      strike_price: o.strike,
      underlying_symbol: o.sym,
      expiration_date: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      metrics: { rr: 2, riskUSD, rewardUSD: pnl > 0 ? pnl : undefined, actual_r: o.r },
      created_at: openAt.toISOString(),
      updated_at: nowIso,
    } as Trade);
  });

  return trades.sort((a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime());
}

let _cache: Trade[] | null = null;
export function getDemoTrades(): Trade[] {
  if (!_cache) _cache = buildDemoTrades();
  return _cache;
}

export function getDemoStrategies(): any[] {
  return [
    { id: DEMO_STRATEGY_IDS[0], name: STRAT_NAMES[0], description: 'Market-structure shift continuation off HTF liquidity.', strategyCategory: 'ICT', expectedWinRate: 61, avgRRGoal: 2.5, planned1rUsd: 300, planned1rMode: 'fixed', standardQuantity: 2, checklist: [], components: null, confirmationSignals: [], matchRules: [], createdAt: dayjs().subtract(80, 'day').toISOString(), updatedAt: dayjs().toISOString() },
    { id: DEMO_STRATEGY_IDS[1], name: STRAT_NAMES[1], description: 'Fair-value-gap retracement entries in the NY session.', strategyCategory: 'ICT', expectedWinRate: 55, avgRRGoal: 2.0, planned1rUsd: 250, planned1rMode: 'fixed', standardQuantity: 1, checklist: [], components: null, confirmationSignals: [], matchRules: [], createdAt: dayjs().subtract(70, 'day').toISOString(), updatedAt: dayjs().toISOString() },
    { id: DEMO_STRATEGY_IDS[2], name: STRAT_NAMES[2], description: 'Opening-range breakout with a higher-timeframe trend filter.', strategyCategory: 'Momentum', expectedWinRate: 58, avgRRGoal: 1.8, planned1rUsd: 300, planned1rMode: 'fixed', standardQuantity: 2, checklist: [], components: null, confirmationSignals: [], matchRules: [], createdAt: dayjs().subtract(60, 'day').toISOString(), updatedAt: dayjs().toISOString() },
  ];
}
