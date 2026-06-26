/**
 * Trading Arena — Chart tab
 *
 * Layout: two-pane flex row.
 *   Left  — FinotaurChart (BinanceSource, crypto only) or a placeholder for
 *            non-crypto symbols.
 *   Right — 320 px PaperTradeRail (paper-trading panel driven by live tick
 *            price from useBinanceOrderBook).
 *
 * useBinanceOrderBook is called unconditionally (rules of hooks). For non-crypto
 * symbols it connects to Binance with a malformed pair and will sit in 'error'
 * or 'connecting' state — livePrice stays null, which disables the rail.
 */

import { useMemo } from 'react';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { BinanceSource } from '@/components/charting/dataSources';
import type { Indicator, Interval } from '@/components/charting/types';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { PaperTradeRail } from '../components/PaperTradeRail';

interface ChartTabProps {
  symbol: string;
  interval: Interval;
  /** Detected asset class for the current symbol. Controls chart source and rail enabled state. */
  assetClass: string;
}

// Singleton — BinanceSource is stateless; one instance is fine.
const binanceSource = new BinanceSource();

// Default indicators rendered in the arena chart.
const DEFAULT_INDICATORS: Indicator[] = [
  { type: 'EMA', period: 50 },
  { type: 'RSI', period: 14 },
];

// Rolling 24-hour window for the chart (from = now − 24h, to = now).
function nowWindow(): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 24 * 60 * 60;
  return { from, to };
}

export function ChartTab({ symbol, interval, assetClass }: ChartTabProps) {
  const { from, to } = useMemo(nowWindow, [symbol, interval]);

  const isCrypto = assetClass === 'crypto';

  // Always called unconditionally (hooks rule). For non-crypto, the symbol
  // won't match a Binance pair — lastPrice will stay null, disabling the rail.
  const book = useBinanceOrderBook(symbol);
  const livePrice = book.lastPrice;

  return (
    <div className="flex flex-1 min-h-0 w-full">
      {/* Chart pane */}
      <div className="relative flex-1 min-w-0">
        {isCrypto ? (
          <FinotaurChart
            symbol={symbol}
            interval={interval}
            from={from}
            to={to}
            dataSource={binanceSource}
            indicators={DEFAULT_INDICATORS}
            theme="dark"
            height="100%"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-[13px] text-zinc-600">
              Live chart data — crypto only for now
            </p>
          </div>
        )}
      </div>

      {/* Paper-trading right rail */}
      <div className="w-80 flex-shrink-0 border-l border-white/10 bg-[#0A0A0A] overflow-y-auto">
        <PaperTradeRail
          key={symbol}
          symbol={symbol}
          livePrice={livePrice}
          enabled={isCrypto}
        />
      </div>
    </div>
  );
}
