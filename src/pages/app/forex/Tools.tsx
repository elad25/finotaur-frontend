// ============================================================
// src/pages/app/forex/Tools.tsx
// FOREX Calculators — purely client-side, no API calls
//   a. Currency Converter  (uses live rates from useForexHeatmap)
//   b. Pip Value Calculator
//   c. Position Size Calculator
// ============================================================

import { useState, useMemo } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { useForexHeatmap } from './_shared/hooks';
import { GlassCard, SectionHeader } from '@/pages/app/crypto/_shared/GlassUI';
import { cn } from '@/lib/utils';
import { FinoExplains } from '@/components/fino/FinoExplains';

// ── Currency lists ───────────────────────────────────────────
const MAJORS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'] as const;
const EXTENDED = [
  ...MAJORS,
  'MXN', 'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'ZAR', 'TRY',
] as const;
type ExtCurrency = typeof EXTENDED[number];

// ── Helpers ──────────────────────────────────────────────────

/** Build a USD-rate table from heatmap pairs.
 *  Each entry = how many units of that currency per 1 USD.
 *  USD itself = 1.
 */
function buildUsdRates(
  pairs: Array<{ symbol: string; base: string; quote: string; price: number }>,
): Record<string, number> {
  const rates: Record<string, number> = { USD: 1 };

  for (const p of pairs) {
    const base = p.base.toUpperCase();
    const quote = p.quote.toUpperCase();
    // e.g. EURUSD price = EUR per USD → EUR rate = 1/price
    if (quote === 'USD') {
      rates[base] = 1 / p.price;   // units of base per 1 USD
    }
    if (base === 'USD') {
      rates[quote] = p.price;       // units of quote per 1 USD
    }
  }

  return rates;
}

/** Convert `amount` from `from` to `to` via USD cross.
 *  Returns null if either rate is unavailable.
 */
function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number | null {
  const rFrom = rates[from];
  const rTo = rates[to];
  if (!rFrom || !rTo) return null;
  // amount / rFrom = USD value, then * rTo = target currency
  return (amount / rFrom) * rTo;
}

// ── Shared input style ───────────────────────────────────────
const inputCls =
  'w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/85 ' +
  'placeholder-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-colors font-mono';

const selectCls =
  'w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/85 ' +
  'focus:outline-none focus:border-white/20 transition-colors cursor-pointer appearance-none ' +
  '[&>option]:bg-[#0d0d0d]';

const labelCls = 'block text-[11px] uppercase tracking-wider text-white/35 mb-1.5 font-medium';

const resultCls =
  'mt-4 rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-center';

// ── A. Currency Converter ────────────────────────────────────
function CurrencyConverter({
  rates,
  ratesLoading,
}: {
  rates: Record<string, number>;
  ratesLoading: boolean;
}) {
  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState<ExtCurrency>('USD');
  const [to, setTo] = useState<ExtCurrency>('EUR');

  const parsed = parseFloat(amount);
  const result = useMemo(() => {
    if (!isFinite(parsed) || parsed <= 0) return null;
    return convert(parsed, from, to, rates);
  }, [parsed, from, to, rates]);

  const resultStr = useMemo(() => {
    if (ratesLoading) return 'Rates loading…';
    if (result === null) return 'Rate unavailable';
    return result.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: to === 'JPY' ? 1 : 4,
    });
  }, [result, ratesLoading, to]);

  return (
    <GlassCard padding="md">
      <SectionHeader title="Currency Converter" subtitle="Cross via USD mid-rate" />
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Amount</label>
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
            placeholder="1000"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>From</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value as ExtCurrency)}
              className={selectCls}
            >
              {EXTENDED.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>To</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as ExtCurrency)}
              className={selectCls}
            >
              {EXTENDED.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={resultCls}>
          <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">
            {isFinite(parsed) ? parsed.toLocaleString('en-US') : '—'} {from} =
          </p>
          <p className={cn(
            'text-2xl font-bold font-mono',
            result !== null && !ratesLoading ? 'text-amber-400' : 'text-white/30',
          )}>
            {resultStr}
          </p>
          {result !== null && !ratesLoading && (
            <p className="text-xs text-white/30 mt-0.5">{to}</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// ── B. Pip Value Calculator ──────────────────────────────────
// Standard pip = 0.0001 for most pairs; 0.01 for JPY pairs.
// Pip Value per lot (100,000 units) in USD:
//   pip = pipSize * lotSize
//   if quote = USD: pipValue = pip
//   else: pipValue = pip / quotePerUSD (convert to USD)

const PIP_PAIRS = [
  'EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCHF', 'USDCAD', 'USDJPY',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCAD', 'EURCHF', 'GBPCAD', 'GBPCHF',
  'CADJPY', 'CHFJPY', 'AUDCAD', 'AUDCHF', 'AUDJPY', 'NZDJPY',
] as const;
type PipPair = typeof PIP_PAIRS[number];

function PipValueCalculator({ rates }: { rates: Record<string, number> }) {
  const [pair, setPair] = useState<PipPair>('EURUSD');
  const [lotSize, setLotSize] = useState('1');

  const result = useMemo(() => {
    const lots = parseFloat(lotSize);
    if (!isFinite(lots) || lots <= 0) return null;

    const s = pair.toUpperCase();
    const isJpy = s.includes('JPY');
    const pipSize = isJpy ? 0.01 : 0.0001;
    const units = lots * 100_000;
    const quoteCurrency = s.slice(3);  // last 3 chars

    // Pip value in quote currency
    const pipInQuote = pipSize * units;

    // Convert to USD
    let pipInUsd: number;
    if (quoteCurrency === 'USD') {
      pipInUsd = pipInQuote;
    } else {
      const quotePerUsd = rates[quoteCurrency];
      if (!quotePerUsd) return null;
      // quotePerUsd = units of quote per 1 USD
      pipInUsd = pipInQuote / quotePerUsd;
    }

    return pipInUsd;
  }, [pair, lotSize, rates]);

  return (
    <GlassCard padding="md">
      <SectionHeader title="Pip Value" subtitle="USD value per pip for a standard lot" />
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Currency Pair</label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value as PipPair)}
            className={selectCls}
          >
            {PIP_PAIRS.map((p) => (
              <option key={p} value={p}>{p.slice(0, 3)}/{p.slice(3)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Lot Size</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            className={inputCls}
            placeholder="1"
          />
          <p className="text-[10px] text-white/25 mt-1">1 lot = 100,000 units · 0.01 = micro lot</p>
        </div>

        <div className={resultCls}>
          <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">
            Pip value
          </p>
          <p className={cn(
            'text-2xl font-bold font-mono',
            result !== null ? 'text-amber-400' : 'text-white/30',
          )}>
            {result !== null
              ? `$${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : 'Rate unavailable'}
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            {pair.slice(0, 3)}/{pair.slice(3)} · {pair.includes('JPY') ? '0.01' : '0.0001'} pip
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

// ── C. Position Size Calculator ──────────────────────────────
// position_size (lots) = (balance × riskPct/100) / (stopPips × pipValuePerLot)

function PositionSizeCalculator({ rates }: { rates: Record<string, number> }) {
  const [balance, setBalance] = useState('10000');
  const [riskPct, setRiskPct] = useState('1');
  const [stopPips, setStopPips] = useState('20');
  const [pair, setPair] = useState<PipPair>('EURUSD');

  const result = useMemo(() => {
    const bal = parseFloat(balance);
    const risk = parseFloat(riskPct);
    const stop = parseFloat(stopPips);
    if (!isFinite(bal) || !isFinite(risk) || !isFinite(stop)) return null;
    if (bal <= 0 || risk <= 0 || risk > 100 || stop <= 0) return null;

    const s = pair.toUpperCase();
    const isJpy = s.includes('JPY');
    const pipSize = isJpy ? 0.01 : 0.0001;
    const quoteCurrency = s.slice(3);

    // Pip value per 1 lot in USD
    const pipInQuote = pipSize * 100_000;
    let pipValuePerLot: number;
    if (quoteCurrency === 'USD') {
      pipValuePerLot = pipInQuote;
    } else {
      const quotePerUsd = rates[quoteCurrency];
      if (!quotePerUsd) return null;
      pipValuePerLot = pipInQuote / quotePerUsd;
    }

    const riskAmount = bal * (risk / 100);
    const lots = riskAmount / (stop * pipValuePerLot);
    const units = lots * 100_000;

    return { lots, units, riskAmount, pipValuePerLot };
  }, [balance, riskPct, stopPips, pair, rates]);

  return (
    <GlassCard padding="md">
      <SectionHeader title="Position Size" subtitle="Max lot size based on account risk" />
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Currency Pair</label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value as PipPair)}
            className={selectCls}
          >
            {PIP_PAIRS.map((p) => (
              <option key={p} value={p}>{p.slice(0, 3)}/{p.slice(3)}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Balance ($)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className={inputCls}
              placeholder="10000"
            />
          </div>
          <div>
            <label className={labelCls}>Risk %</label>
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={riskPct}
              onChange={(e) => setRiskPct(e.target.value)}
              className={inputCls}
              placeholder="1"
            />
          </div>
          <div>
            <label className={labelCls}>Stop (pips)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={stopPips}
              onChange={(e) => setStopPips(e.target.value)}
              className={inputCls}
              placeholder="20"
            />
          </div>
        </div>

        <div className={resultCls}>
          {result ? (
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">
                Position size
              </p>
              <p className="text-2xl font-bold font-mono text-amber-400">
                {result.lots.toFixed(2)} lots
              </p>
              <p className="text-xs text-white/40">
                {Math.round(result.units).toLocaleString('en-US')} units ·{' '}
                ${ result.riskAmount.toFixed(2)} at risk
              </p>
              <p className="text-[10px] text-white/25 mt-1">
                Pip value: ${result.pipValuePerLot.toFixed(2)}/lot
              </p>
            </div>
          ) : (
            <p className="text-white/30 text-sm">Enter valid inputs</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function ForexTools() {
  const { data, loading } = useForexHeatmap();

  const rates = useMemo(
    () => (data?.pairs ? buildUsdRates(data.pairs) : {}),
    [data],
  );

  return (
    <PageTemplate
      title="Forex Calculators"
      description="Currency converter, pip value, and position-size tools."
    >
      <FinoExplains title="What are the Forex Tools?" className="mt-ds-3 ml-auto w-fit">
        Essential forex calculators in one place — pip value, position size, margin and risk. Plug
        in your trade and see the numbers instantly.
      </FinoExplains>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CurrencyConverter rates={rates} ratesLoading={loading} />
        <PipValueCalculator rates={rates} />
        <PositionSizeCalculator rates={rates} />
      </div>
    </PageTemplate>
  );
}
