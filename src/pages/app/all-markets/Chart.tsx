// src/pages/app/all-markets/Chart.tsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartBoard } from '@/components/markets/ChartBoard';

/**
 * All Markets → Chart (v4)
 * - Reads ?symbol= or ?ticker= from the URL and passes it to ChartBoard.
 * - No design/flow changes.
 */
export default function AllMarketsChart() {
  const [params] = useSearchParams();
  const urlSymbol = (params.get('symbol') || params.get('ticker') || '').trim();

  return (
    <div className="w-full h-[85vh] min-h-[560px] overflow-hidden">
      <ChartBoard initialSymbol={urlSymbol || undefined} />
    </div>
  );
}
