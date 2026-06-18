/**
 * Trading Arena — Order Flow tab
 *
 * Renders the live Bookmap-style rolling liquidity heatmap using the
 * existing <BookmapChart> component wired with useBinanceOrderBook.
 * The canvas fills the remaining height below the top bar.
 */

import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { BookmapChart } from '@/pages/app/crypto/scanner/BookmapChart';

interface OrderFlowTabProps {
  symbol: string;
}

export function OrderFlowTab({ symbol }: OrderFlowTabProps) {
  const book = useBinanceOrderBook(symbol);

  return (
    <div className="flex-1 min-h-0 w-full overflow-hidden">
      <BookmapChart hook={book} symbol={symbol} />
    </div>
  );
}
