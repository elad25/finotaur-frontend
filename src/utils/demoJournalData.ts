import dayjs from 'dayjs';
import type { Trade } from '@/hooks/useTradesData';

// Deterministic pseudo-random in [0,1) — stable across reloads (no Math.random),
// so the preview looks identical every render/session.
function rand(i: number, salt = 1): number {
  const x = Math.sin((i + 1) * 12.9898 * salt + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const SYMBOLS = ['ES', 'NQ', 'MES', 'MNQ'] as const;
type Sym = (typeof SYMBOLS)[number];
const MULT: Record<Sym, number> = { ES: 50, NQ: 20, MES: 5, MNQ: 2 };
const BASE_PRICE: Record<Sym, number> = { ES: 5300, NQ: 18500, MES: 5300, MNQ: 18500 };
const STOP_PTS: Record<Sym, number> = { ES: 6, NQ: 25, MES: 6, MNQ: 25 };

export const DEMO_STRATEGY_IDS = ['demo-strat-mss', 'demo-strat-fvg', 'demo-strat-orb'];
const STRAT_NAMES = ['ICT MSS', 'FVG Sniper', 'Opening Range Break'];
const SETUPS = ['Breaker + FVG', 'Liquidity sweep', 'Range breakout', 'Trend continuation', 'Reversal'];
const SESSIONS = ['London', 'NY AM', 'NY PM'];
const EMOTIONS = ['Calm', 'Focused', 'Confident', 'Disciplined', 'Patient'];
const QUALITY = ['A+', 'A', 'B', 'C'];
const NOTES = [
  'Clean setup, followed the plan and let it run to target.',
  'Entered on the retest after the sweep. Textbook execution.',
  'Slightly early entry — should have waited for confirmation.',
  'Scaled out at 2R and trailed the runner.',
  'Patient entry at the discount array. Let winners run.',
  'Cut it fast when the structure broke against me.',
];

let _id = 0;
function nextId(): string {
  return `demo-${_id++}`;
}

interface BuildArgs {
  open: dayjs.Dayjs;
  holdMin: number;
  sym: Sym;
  side: 'LONG' | 'SHORT';
  stratIdx: number;
  rMult: number; // realized R (negative = loss, 0 = BE/open)
  qtyMul?: number; // size multiplier (revenge escalation)
  mistake?: string;
  emotion?: string;
  isOpen?: boolean;
  seed: number;
}

function build({
  open,
  holdMin,
  sym,
  side,
  stratIdx,
  rMult,
  qtyMul = 1,
  mistake,
  emotion,
  isOpen,
  seed,
}: BuildArgs): Trade {
  const mult = MULT[sym];
  const stopPts = +(STOP_PTS[sym] * (0.85 + rand(seed, 17) * 0.5)).toFixed(2);
  const baseQty = sym.startsWith('M')
    ? 3 + Math.floor(rand(seed, 23) * 6)
    : 1 + Math.floor(rand(seed, 23) * 2);
  const qty = Math.max(1, Math.round(baseQty * qtyMul));
  const basePx = BASE_PRICE[sym];
  const entry = +(basePx + (rand(seed, 29) - 0.5) * basePx * 0.02).toFixed(2);
  const stop = +(side === 'LONG' ? entry - stopPts : entry + stopPts).toFixed(2);
  const profitPts = rMult * stopPts;
  const exit = isOpen
    ? undefined
    : +(side === 'LONG' ? entry + profitPts : entry - profitPts).toFixed(2);
  const takeProfit = +(side === 'LONG' ? entry + stopPts * 2 : entry - stopPts * 2).toFixed(2);
  const fees = +(qty * 2.1).toFixed(2);
  const riskUSD = +(stopPts * qty * mult).toFixed(2);
  const pnl = isOpen ? 0 : +(profitPts * qty * mult - fees).toFixed(2);
  const actualR = isOpen ? undefined : riskUSD > 0 ? +(pnl / riskUSD).toFixed(2) : undefined;
  const outcome: Trade['outcome'] = isOpen ? 'OPEN' : rMult === 0 ? 'BE' : rMult > 0 ? 'WIN' : 'LOSS';
  const close = isOpen ? undefined : open.add(holdMin, 'minute');

  return {
    id: nextId(),
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
    open_at: open.toISOString(),
    close_at: close?.toISOString(),
    session: SESSIONS[Math.floor(rand(seed, 47) * SESSIONS.length)],
    strategy_id: DEMO_STRATEGY_IDS[stratIdx],
    strategy_name: STRAT_NAMES[stratIdx],
    setup: SETUPS[Math.floor(rand(seed, 53) * SETUPS.length)],
    emotion: emotion ?? EMOTIONS[Math.floor(rand(seed, 59) * EMOTIONS.length)],
    notes: mistake
      ? 'Broke my rules — chased the loss instead of stepping away.'
      : rand(seed, 61) > 0.5
      ? NOTES[Math.floor(rand(seed, 67) * NOTES.length)]
      : undefined,
    mistake,
    asset_class: 'futures',
    quality_tag: mistake ? 'C' : QUALITY[Math.floor(rand(seed, 71) * QUALITY.length)],
    multiplier: mult,
    input_mode: 'summary',
    risk_usd: riskUSD,
    actual_r: actualR,
    metrics: { rr: 2, riskUSD, rewardUSD: pnl > 0 ? pnl : undefined, actual_r: actualR },
    created_at: open.toISOString(),
    updated_at: dayjs().toISOString(),
  } as Trade;
}

function buildDemoTrades(): Trade[] {
  _id = 0;
  const trades: Trade[] = [];

  // Dense coverage over the last ~72 days, weekdays only, so the Calendar's
  // current-month view and every recent week are richly populated.
  let k = 0;
  for (let dayOffset = 72; dayOffset >= 0; dayOffset--) {
    const day = dayjs().subtract(dayOffset, 'day');
    const dow = day.day(); // 0 = Sun, 6 = Sat
    if (dow === 0 || dow === 6) continue; // markets closed on weekends
    k++;

    // A few recent weekdays become a "revenge / tilt" sequence: one loss then
    // several escalating-size losses within minutes of each other (the
    // Psychology tab flags consecutive losses < 30 min apart as revenge).
    const isRevengeDay = dayOffset === 3 || dayOffset === 11 || dayOffset === 24;
    if (isRevengeDay) {
      const sym = SYMBOLS[Math.floor(rand(k, 3) * SYMBOLS.length)];
      let t = day.hour(10).minute(5);
      const seqR = [-1, -1, -1, -0.8];
      seqR.forEach((r, j) => {
        const hold = 6 + Math.floor(rand(k * 10 + j, 5) * 10);
        trades.push(
          build({
            open: t,
            holdMin: hold,
            sym,
            side: rand(k * 10 + j, 9) > 0.5 ? 'LONG' : 'SHORT',
            stratIdx: 1,
            rMult: r,
            qtyMul: 1 + j * 0.8,
            mistake: j === 0 ? 'emotional' : 'revenge',
            emotion: j === 0 ? 'Frustrated' : 'Tilted',
            seed: k * 10 + j,
          }),
        );
        // Next entry opens shortly after this one closes (gap < 30 min → revenge).
        t = t.add(hold + 8 + Math.floor(rand(k * 10 + j, 7) * 10), 'minute');
      });
      continue;
    }

    // Normal weekday: 1–3 trades spaced through the session.
    const nTrades = 1 + Math.floor(rand(k, 13) * 3); // 1..3
    let t = day.hour(9 + Math.floor(rand(k, 37) * 2)).minute(30 + Math.floor(rand(k, 41) * 25));
    for (let j = 0; j < nTrades; j++) {
      const s = k * 7 + j;
      const win = rand(s, 11) < 0.58;
      const be = !win && rand(s, 13) < 0.1;
      const rMult = be ? 0 : win ? +(1.2 + rand(s, 19) * 2.3).toFixed(2) : -1;
      const hold = 15 + Math.floor(rand(s, 43) * 150);
      const sym = SYMBOLS[Math.floor(rand(s, 3) * SYMBOLS.length)];
      const occasionalFomo = !win && rand(s, 71) > 0.85;
      trades.push(
        build({
          open: t,
          holdMin: hold,
          sym,
          side: rand(s, 5) > 0.5 ? 'LONG' : 'SHORT',
          stratIdx: Math.floor(rand(s, 17) * 3),
          rMult,
          mistake: occasionalFomo ? 'fomo' : undefined,
          seed: s,
        }),
      );
      t = t.add(hold + 25 + Math.floor(rand(s, 31) * 120), 'minute');
    }
  }

  // Two open positions today (so the "open trades" surfaces have data).
  const today = dayjs();
  [0, 1].forEach((o) => {
    const sym = SYMBOLS[o % SYMBOLS.length];
    trades.push(
      build({
        open: today.hour(9).minute(45 + o * 20),
        holdMin: 0,
        sym,
        side: o ? 'SHORT' : 'LONG',
        stratIdx: o % 3,
        rMult: 0,
        isOpen: true,
        seed: 900 + o,
      }),
    );
  });

  // A few options trades for the Options analytics tab.
  const optSeed = [
    { sym: 'SPY', type: 'CALL' as const, strike: 540, r: 2.4, win: true, d: 5 },
    { sym: 'QQQ', type: 'PUT' as const, strike: 460, r: -1, win: false, d: 12 },
    { sym: 'AAPL', type: 'CALL' as const, strike: 220, r: 1.6, win: true, d: 18 },
  ];
  optSeed.forEach((o, kk) => {
    const qty = 3 + kk;
    const entry = +(2.5 + kk).toFixed(2);
    const riskUSD = +(entry * qty * 100 * 0.5).toFixed(2);
    const pnl = +(o.r * riskUSD).toFixed(2);
    const exit = +(entry + pnl / (qty * 100)).toFixed(2);
    const open = dayjs().subtract(o.d, 'day').hour(10).minute(15);
    trades.push({
      id: nextId(),
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
      open_at: open.toISOString(),
      close_at: open.add(2, 'hour').toISOString(),
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
      created_at: open.toISOString(),
      updated_at: dayjs().toISOString(),
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
