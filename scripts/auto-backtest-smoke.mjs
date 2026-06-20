// ============================================================================
// AUTO BACKTEST — REAL-DATA SMOKE RUN + EMPIRICAL LOOK-AHEAD AUDIT
// ============================================================================
//
// Fetches real BTCUSDT 15m candles from the public Binance data CDN
// (data-api.binance.vision — same host family the app's binanceDataService
// uses; falls back to api.binance.vision). If the network is unreachable, it
// generates a SYNTHETIC random-walk OHLC series and LABELS the output as such.
//
// Then it:
//   1. Runs runAutoBacktest with an FVG-only setup and an all-5-patterns setup.
//   2. Prints detections-per-pattern, trade stats, and the first 3 detections.
//   3. Runs an empirical look-ahead audit: for a sample of detections, re-runs
//      detection on candles[0..formedAtIndex] and confirms it still appears.
//
// Run:  npx tsx scripts/auto-backtest-smoke.mjs
// (tsx lets this .mjs import the engine's .ts sources directly.)
// ============================================================================

import { MarketContext } from '../src/core/auto/MarketContext.ts';
import { runDetectors } from '../src/core/auto/detectors/registry.ts';
import { runAutoBacktest } from '../src/core/auto/AutoBacktestEngine.ts';
import { makeDefaultSetup, DEFAULT_PATTERN_PARAMS } from '../src/core/auto/types.ts';

const SYMBOL = 'BTCUSDT';
const INTERVAL = '15m';
const TARGET = 3000; // candles to pull (binance.vision page cap is 1000/req)

// ----------------------------------------------------------------------------
// Data fetch (real -> synthetic fallback)
// ----------------------------------------------------------------------------

const HOSTS = [
  'https://data-api.binance.vision/api/v3', // public data CDN (matches app host family)
  'https://api.binance.vision/api/v3',
];

async function fetchKlinesPage(host, endTime) {
  const params = new URLSearchParams({
    symbol: SYMBOL,
    interval: INTERVAL,
    limit: '1000',
  });
  if (endTime) params.append('endTime', String(endTime));
  const res = await fetch(`${host}/klines?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const raw = await res.json();
  // Binance kline row: [openTime, open, high, low, close, volume, closeTime, ...]
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000), // seconds (journal convention)
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

async function fetchReal() {
  let lastErr = null;
  for (const host of HOSTS) {
    try {
      const all = [];
      let endTime = Date.now();
      while (all.length < TARGET) {
        const page = await fetchKlinesPage(host, endTime);
        if (page.length === 0) break;
        all.unshift(...page);
        endTime = page[0].time * 1000 - 1;
        await new Promise((r) => setTimeout(r, 200));
      }
      if (all.length > 0) {
        return { candles: all.slice(-TARGET), source: `REAL (${host})` };
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('no data');
}

function synthetic(n = TARGET) {
  // Deterministic seeded random walk so the run is reproducible.
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const candles = [];
  let price = 50000;
  let t = Math.floor(Date.now() / 1000) - n * 900;
  for (let i = 0; i < n; i++) {
    const drift = (rnd() - 0.5) * price * 0.004; // up to ~0.4% step
    const open = price;
    const close = Math.max(1, open + drift);
    const wick = price * 0.002 * rnd();
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;
    candles.push({ time: t, open, high, low, close, volume: 10 + rnd() * 100 });
    price = close;
    t += 900;
  }
  return { candles, source: 'SYNTHETIC (network unreachable)' };
}

// ----------------------------------------------------------------------------
// Reporting helpers
// ----------------------------------------------------------------------------

function fmtDate(sec) {
  return new Date(sec * 1000).toISOString().replace('T', ' ').slice(0, 16);
}

function countByType(detections) {
  const counts = {};
  for (const d of detections) counts[d.patternType] = (counts[d.patternType] ?? 0) + 1;
  return counts;
}

function num(x, d = 2) {
  return Number.isFinite(x) ? x.toFixed(d) : 'n/a';
}

function maxDrawdownPct(equityCurve, initialBalance) {
  if (!equityCurve || equityCurve.length === 0) return null;
  let peak = initialBalance;
  let maxDD = 0;
  for (const p of equityCurve) {
    const eq = p.equity ?? p.balance;
    if (eq > peak) peak = eq;
    const dd = peak > 0 ? ((peak - eq) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function expectancyR(trades) {
  const rs = trades
    .map((t) => (t.riskAmount > 0 ? (t.realizedPnl ?? 0) / t.riskAmount : null))
    .filter((r) => r !== null);
  if (rs.length === 0) return { avgR: null, expectancy: null, n: 0 };
  const avgR = rs.reduce((a, b) => a + b, 0) / rs.length;
  return { avgR, expectancy: avgR, n: rs.length };
}

function reportRun(label, setup, candles) {
  const result = runAutoBacktest(setup, candles);
  const det = result.detections;
  const trades = result.trades;
  const wins = trades.filter((t) => (t.realizedPnl ?? 0) > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const grossWin = trades
    .filter((t) => (t.realizedPnl ?? 0) > 0)
    .reduce((a, t) => a + t.realizedPnl, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => (t.realizedPnl ?? 0) < 0).reduce((a, t) => a + t.realizedPnl, 0),
  );
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const { avgR, expectancy, n: rCount } = expectancyR(trades);
  const maxDD = maxDrawdownPct(result.equityCurve, setup.risk.initialBalance);

  console.log(`\n=== ${label} ===`);
  console.log(`detections total : ${det.length}`);
  console.log(`detections / type: ${JSON.stringify(countByType(det))}`);
  console.log(`total trades     : ${trades.length}`);
  console.log(`win rate         : ${num(winRate)}%`);
  console.log(`profit factor    : ${profitFactor === Infinity ? 'Inf' : num(profitFactor)}`);
  console.log(`expectancy (R)   : ${expectancy === null ? 'n/a' : num(expectancy, 3)} (n=${rCount})`);
  console.log(`avg R            : ${avgR === null ? 'n/a' : num(avgR, 3)}`);
  console.log(`max drawdown     : ${maxDD === null ? 'n/a' : num(maxDD)}%`);
  console.log(`stats.totalPnl   : ${num(result.statistics.totalPnl)}`);
  console.log(`R distribution   : ${JSON.stringify(result.rMultipleDistribution)}`);

  console.log('first 3 detections:');
  for (const d of det.slice(0, 3)) {
    console.log(
      `  - ${d.patternType}/${d.direction} @${d.formedAtIndex} ` +
        `(${fmtDate(candles[d.formedAtIndex].time)}) ` +
        `zone[${num(d.zone.bottom)}, ${num(d.zone.top)}]`,
    );
  }

  // NaN / sanity guard.
  const anyNaN =
    Number.isNaN(winRate) ||
    trades.some((t) => Number.isNaN(t.realizedPnl ?? 0)) ||
    Number.isNaN(result.statistics.totalPnl);
  if (anyNaN) console.log('  ⚠️  WARNING: NaN encountered in stats/trades');

  return { result, anyNaN };
}

// ----------------------------------------------------------------------------
// Empirical look-ahead audit on the real series
// ----------------------------------------------------------------------------

function lookAheadAudit(candles, patterns, swingLookback, sampleN = 60) {
  const fullCtx = MarketContext.build(candles, { swingLookback, atrPeriod: 14 });
  const full = runDetectors(patterns, candles, fullCtx);
  if (full.length === 0) {
    console.log('\n=== LOOK-AHEAD AUDIT ===\nno detections to audit');
    return { pass: 0, fail: 0, total: 0, refViolations: 0 };
  }

  // Evenly sample across the detection list.
  const step = Math.max(1, Math.floor(full.length / sampleN));
  const sample = full.filter((_, i) => i % step === 0).slice(0, sampleN);

  let pass = 0;
  let fail = 0;
  let refViolations = 0;
  const failures = [];

  for (const d of sample) {
    // (a) referenced-index check.
    const refs = [];
    if (d.refSwing) refs.push(d.refSwing.index);
    for (const [k, v] of Object.entries(d.meta)) {
      if (typeof v === 'number' && /index|bar/i.test(k)) refs.push(v);
    }
    if (refs.some((idx) => idx > d.formedAtIndex)) {
      refViolations++;
      failures.push(`${d.patternType}@${d.formedAtIndex} references future index`);
    }

    // (b) re-derive from prefix [0..formedAtIndex].
    const prefix = candles.slice(0, d.formedAtIndex + 1);
    const prefixCtx = MarketContext.build(prefix, { swingLookback, atrPeriod: 14 });
    const prefixDets = runDetectors(patterns, prefix, prefixCtx);
    const found = prefixDets.some(
      (p) =>
        p.patternType === d.patternType &&
        p.direction === d.direction &&
        p.formedAtIndex === d.formedAtIndex &&
        Math.abs(p.zone.top - d.zone.top) < 1e-6 &&
        Math.abs(p.zone.bottom - d.zone.bottom) < 1e-6,
    );
    if (found) pass++;
    else {
      fail++;
      failures.push(
        `${d.patternType}/${d.direction}@${d.formedAtIndex} NOT reproducible from prefix`,
      );
    }
  }

  console.log('\n=== LOOK-AHEAD AUDIT ===');
  console.log(`detections total : ${full.length}`);
  console.log(`sampled          : ${sample.length}`);
  console.log(`reproducible     : ${pass}`);
  console.log(`NOT reproducible : ${fail}`);
  console.log(`future-ref bugs  : ${refViolations}`);
  const verdict = fail === 0 && refViolations === 0 ? 'PASS ✅' : 'FAIL ❌';
  console.log(`VERDICT          : ${verdict}`);
  if (failures.length) {
    console.log('failures (first 10):');
    for (const f of failures.slice(0, 10)) console.log(`  - ${f}`);
  }
  return { pass, fail, total: sample.length, refViolations };
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  let data;
  try {
    data = await fetchReal();
  } catch (e) {
    console.log(`(real fetch failed: ${e?.message ?? e}) -> using synthetic`);
    data = synthetic();
  }
  const { candles, source } = data;

  console.log('========================================================');
  console.log('AUTO BACKTEST SMOKE RUN');
  console.log('========================================================');
  console.log(`source     : ${source}`);
  console.log(`symbol/tf  : ${SYMBOL} ${INTERVAL}`);
  console.log(`candles    : ${candles.length}`);
  console.log(
    `date range : ${fmtDate(candles[0].time)} -> ${fmtDate(candles[candles.length - 1].time)}`,
  );

  // ---- Run 1: FVG only ----
  const fvgSetup = makeDefaultSetup(SYMBOL, INTERVAL);
  fvgSetup.patterns = [JSON.parse(JSON.stringify(DEFAULT_PATTERN_PARAMS.FVG))];
  reportRun('RUN 1 — FVG only', fvgSetup, candles);

  // ---- Run 2: all 5 patterns ----
  const allSetup = makeDefaultSetup(SYMBOL, INTERVAL);
  allSetup.patterns = [
    JSON.parse(JSON.stringify(DEFAULT_PATTERN_PARAMS.FVG)),
    JSON.parse(JSON.stringify(DEFAULT_PATTERN_PARAMS.IFVG)),
    JSON.parse(JSON.stringify(DEFAULT_PATTERN_PARAMS.OB)),
    JSON.parse(JSON.stringify(DEFAULT_PATTERN_PARAMS.LIQUIDITY)),
    JSON.parse(JSON.stringify(DEFAULT_PATTERN_PARAMS.BREAKER)),
  ];
  reportRun('RUN 2 — all 5 patterns', allSetup, candles);

  // ---- Look-ahead audit on the all-patterns detection set ----
  lookAheadAudit(candles, allSetup.patterns, 2, 60);

  console.log('\ndone.');
}

main().catch((e) => {
  console.error('SMOKE RUN ERROR:', e);
  process.exit(1);
});
